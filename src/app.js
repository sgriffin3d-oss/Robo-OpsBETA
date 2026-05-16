// ─── App State ────────────────────────────────────────────────────────────────

let db       = JSON.parse(localStorage.getItem(STORAGE_KEYS.db))       || [];
let sketches = JSON.parse(localStorage.getItem(STORAGE_KEYS.sketches)) || [];
let currentSort     = 'team';
let currentField    = 'match';
let editingSketchId = null;
let detailOrigin    = 'home';
let canvas, ctx, drawing = false, penColor = 'white';

window.onload = function () {
  loadSettings();
  displayNotes();
  initCanvas();
  if (typeof maybeShowInstall === 'function') {
    maybeShowInstall(startAuth);
  } else {
    startAuth();
  }
};

function startAuth() {
  switchPage('hub');
  if (typeof initAuth === 'function') initAuth();
  if (typeof updateInstallCardVisibility === 'function') updateInstallCardVisibility();
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function switchPage(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + view)?.classList.add('active');
  if (view === 'home')     displayNotes();
  if (view === 'rules'    && typeof initRules       === 'function') initRules();
  if (view === 'settings' && typeof updateAccountUI === 'function') {
    updateAccountUI();
    renderSettingsUI();
  }
  window.scrollTo(0, 0);
  closeMenu();
}

function openEventsHub() {
  if (typeof clearEventState === 'function') clearEventState();
  switchPage('events');
  if (typeof loadEvents === 'function') loadEvents();
}

function navBack() {
  if (typeof clearEventState === 'function') clearEventState();
  if (detailOrigin === 'events') {
    switchPage('events');
    const list = document.getElementById('event-list');
    if (list && !list.children.length && typeof loadEvents === 'function') loadEvents();
  } else {
    switchPage('home');
  }
}

function toggleMenu() { document.getElementById('fabMenu').classList.toggle('show'); }
function closeMenu()  { document.getElementById('fabMenu').classList.remove('show'); }

// ─── Canvas ────────────────────────────────────────────────────────────────────

function initCanvas() {
  canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  // Size canvas to match the field image's rendered dimensions.
  // Falls back to 400×400 and corrects itself when setFieldMode('draw') is called.
  const fieldImg = document.getElementById('draw-map-img');
  if (fieldImg && fieldImg.offsetWidth > 0) {
    const rect    = fieldImg.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;
  } else {
    canvas.width  = 400;
    canvas.height = 400;
  }

  const getXY = e => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const startDrawing = e => { drawing = true; onDraw(e); };
  const stopDrawing  = () => { drawing = false; ctx.beginPath(); };
  const onDraw = e => {
    if (!drawing) return;
    const p = getXY(e);
    ctx.lineWidth   = 5;
    ctx.lineCap     = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  canvas.addEventListener('mousedown',  startDrawing);
  canvas.addEventListener('mousemove',  onDraw);
  canvas.addEventListener('mouseup',    stopDrawing);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); startDrawing(e); }, { passive: false });
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); onDraw(e); },       { passive: false });
  canvas.addEventListener('touchend',   stopDrawing);
}

function setPenColor(color) { penColor = color; }
function clearCanvas()      { ctx.clearRect(0, 0, canvas.width, canvas.height); }

// ─── Sketches ──────────────────────────────────────────────────────────────────

function saveSketch() {
  const name    = document.getElementById('sketch-name').value || 'Unnamed Strategy';
  const imgData = canvas.toDataURL();

  if (editingSketchId) {
    const idx = sketches.findIndex(s => s.id === editingSketchId);
    if (idx > -1) Object.assign(sketches[idx], { name, img: imgData, field: currentField });
    editingSketchId = null;
  } else {
    sketches.push({
      id:    Date.now().toString(),
      name,
      date:  new Date().toLocaleDateString(),
      field: currentField,
      img:   imgData,
    });
  }

  cloudSaveSketch(sketches.at(-1));
  clearCanvas();
  document.getElementById('sketch-name').value = '';
  setFieldMode('saved');
  displayDrawing();
}

function loadSketch(id) {
  const sketch = sketches.find(s => s.id === id);
  if (!sketch) return;

  editingSketchId = sketch.id;
  currentField    = sketch.field;
  document.getElementById('sketch-name').value = sketch.name;
  setFieldMode('draw');

  const img = new Image();
  img.onload = () => { clearCanvas(); ctx.drawImage(img, 0, 0); };
  img.src = sketch.img;
}

function displayDrawing() {
  const list = document.getElementById('sketch-list');
  if (!list) return;

  list.innerHTML = [...sketches].reverse().map(sketch => {
    const fieldPath = sketch.field === 'skills' ? 'assets/images/skills.png' : 'assets/images/field.png';
    return `
      <div class="sketch-item">
        <img src="${sketch.img}" class="sketch-preview sketch-preview--field"
             style="background-image:url('${fieldPath}')"
             onclick="loadSketch('${sketch.id}')" />
        <div class="sketch-info" onclick="loadSketch('${sketch.id}')">
          <strong class="sketch-name-label">${sketch.name}</strong>
          <small class="sketch-meta">${sketch.date} · ${sketch.field.toUpperCase()}</small>
        </div>
        <button class="btn-delete" onclick="deleteSketch('${sketch.id}')">Del</button>
      </div>`;
  }).join('');
}

function deleteSketch(id) {
  if (!confirm('Delete this strategy?')) return;
  sketches = sketches.filter(s => s.id !== id);
  cloudDeleteSketch(id);
  displayDrawing();
}

// ─── Scout Notes ───────────────────────────────────────────────────────────────

function setSortFilter(sort) {
  currentSort = sort;
  document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('sort-' + sort)?.classList.add('active');
  displayNotes();
}

function displayNotes() {
  const list  = document.getElementById('noteList');
  if (!list) return;
  const query = (document.getElementById('noteSearch')?.value || '').toUpperCase();
  const keys  = [...new Set(db.map(item => currentSort === 'team' ? item.team : item.event))].sort();

  list.innerHTML = keys
    .filter(k => k.toUpperCase().includes(query))
    .map(k => {
      const count = db.filter(d => (currentSort === 'team' ? d.team : d.event) === k).length;
      return `
        <div class="note-card" onclick="showDetailView('${k}')">
          <div>
            <strong>${k}</strong>
            <br>
            <small>${count} Report${count !== 1 ? 's' : ''}</small>
          </div>
          <span class="note-card-arrow">→</span>
        </div>`;
    }).join('');
}

function showDetailView(value) {
  detailOrigin = 'home';
  document.getElementById('detName').innerText = value;

  const reports = db
    .filter(d => (currentSort === 'team' ? d.team : d.event) === value)
    .reverse();

  document.getElementById('detHistory').innerHTML = reports.map(report => `
    <div class="note-card note-card--expanded">
      <div class="note-card-header">
        <strong>${report.res} (${report.score}–${report.oppscore})</strong>
        <small>${currentSort === 'team' ? report.event : report.team}</small>
      </div>
      <p class="note-card-body">${report.notes || 'No notes.'}</p>
      <div class="note-card-actions">
        <button class="btn-secondary" onclick="editScoutReport('${report.id}')">Edit</button>
        <button class="btn-delete"    onclick="deleteScoutReport('${report.id}', '${value}')">Del</button>
      </div>
    </div>`).join('');

  switchPage('detail');
}

// ─── Scout Report CRUD ─────────────────────────────────────────────────────────

function saveReport() {
  const id = document.getElementById('editIdx').value || Date.now().toString();
  const report = {
    id,
    team:     document.getElementById('f-team').value.toUpperCase(),
    event:    document.getElementById('f-event').value,
    res:      document.getElementById('f-res').value,
    autores:  document.getElementById('f-autores').value,
    partner:  document.getElementById('f-partner').value,
    opp:      document.getElementById('f-opp').value,
    score:    document.getElementById('f-score').value    || 0,
    oppscore: document.getElementById('f-oppscore').value || 0,
    notes:    document.getElementById('f-notes').value,
  };

  if (!report.team) return alert('Missing Team #');

  const existing = db.findIndex(x => x.id === id);
  if (existing > -1) db[existing] = report;
  else db.push(report);

  cloudSaveReport(report);
  switchPage('home');
}

function openNewNote() {
  document.getElementById('editIdx').value = '';
  document.querySelectorAll('#view-form input, #view-form textarea').forEach(el => el.value = '');
  switchPage('form');
}

function editScoutReport(id) {
  const report = db.find(x => x.id === id);
  if (!report) return;

  const fieldMap = {
    editIdx:      'id',
    'f-team':     'team',
    'f-event':    'event',
    'f-res':      'res',
    'f-autores':  'autores',
    'f-partner':  'partner',
    'f-opp':      'opp',
    'f-score':    'score',
    'f-oppscore': 'oppscore',
    'f-notes':    'notes',
  };

  Object.entries(fieldMap).forEach(([fieldId, key]) => {
    const el = document.getElementById(fieldId);
    if (el) el.value = report[key] ?? '';
  });

  switchPage('form');
}

function deleteScoutReport(id, value) {
  if (!confirm('Delete this report?')) return;
  db = db.filter(x => x.id !== id);
  cloudDeleteReport(id);
  showDetailView(value);
}

// ─── Import / Export ───────────────────────────────────────────────────────────

function exportData() {
  const blob = new Blob([JSON.stringify({ db, sketches })], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href     = URL.createObjectURL(blob);
  link.download = 'backup.paragon';
  link.click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const raw = JSON.parse(e.target.result);
      db       = raw.db       || raw;
      sketches = raw.sketches || [];
      localStorage.setItem(STORAGE_KEYS.db,      JSON.stringify(db));
      localStorage.setItem(STORAGE_KEYS.sketches, JSON.stringify(sketches));
      displayNotes();
      alert('Import successful!');
    } catch {
      alert('Error: Invalid .paragon file.');
    }
  };
  reader.readAsText(file);
}

// ─── Settings ──────────────────────────────────────────────────────────────────

function setTheme(theme) {
  const s = getSettings();
  s.theme = theme;
  if (LOCKED_DARK.includes(theme))  s.mode = 'mode-dark';
  if (LOCKED_LIGHT.includes(theme)) s.mode = 'mode-light';
  saveSettings(s);
  applySettings(s);
  renderSettingsUI();
}

function setMode(mode) {
  const s = getSettings();
  // Locked themes ignore mode changes
  if (LOCKED_DARK.includes(s.theme) || LOCKED_LIGHT.includes(s.theme)) return;
  s.mode = mode;
  saveSettings(s);
  applySettings(s);
  renderSettingsUI();
}

function setStyle(style) {
  const s = getSettings();
  s.style = style;
  saveSettings(s);
  applySettings(s);
  renderSettingsUI();
}

function getSettings() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)) || {};
}

function saveSettings(s) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s));
  if (typeof cloudSaveSettings === 'function') cloudSaveSettings(s);
}

function applySettings(s) {
  const theme = s.theme || 'theme-gold';
  const style = s.style || 'style-classic';
  const mode  = (s.mode || 'mode-dark') === 'mode-light' ? 'mode-light' : '';
  document.body.className = [theme, style, mode].filter(Boolean).join(' ');
}

function loadSettings() {
  const s = getSettings();
  // Enforce locked modes before applying — in case saved data has the wrong mode
  if (LOCKED_DARK.includes(s.theme))  s.mode = 'mode-dark';
  if (LOCKED_LIGHT.includes(s.theme)) s.mode = 'mode-light';
  applySettings(s);
  renderSettingsUI();
}

// Legacy alias
function updateSettings() { loadSettings(); }

function renderSettingsUI() {
  const s            = getSettings();
  const currentTheme = s.theme || 'theme-gold';
  const currentStyle = s.style || 'style-classic';
  const currentMode  = s.mode  || 'mode-dark';
  const isLocked     = LOCKED_DARK.includes(currentTheme) || LOCKED_LIGHT.includes(currentTheme);
  const lockNote     = LOCKED_DARK.includes(currentTheme)  ? 'Gold is always dark'
                     : LOCKED_LIGHT.includes(currentTheme) ? 'Arctic is always light' : '';

  const toggle = document.getElementById('mode-toggle');
  const noteEl = document.getElementById('mode-locked-note');
  toggle?.classList.toggle('locked', isLocked);
  if (noteEl) {
    noteEl.textContent   = lockNote;
    noteEl.style.display = lockNote ? 'block' : 'none';
  }
  document.getElementById('mode-btn-dark')?.classList.toggle( 'active', currentMode === 'mode-dark');
  document.getElementById('mode-btn-light')?.classList.toggle('active', currentMode === 'mode-light');

  // THEMES and STYLES come from constants.js — single source of truth
  const themeGrid = document.getElementById('theme-grid');
  if (themeGrid) {
    themeGrid.innerHTML = THEMES.map(t => `
      <div class="theme-swatch ${t.id === currentTheme ? 'active' : ''}"
           onclick="setTheme('${t.id}')"
           style="background:${t.bg}; border-color:${t.id === currentTheme ? t.accent : 'transparent'};">
        <div class="swatch-dot" style="background:${t.accent};"></div>
        <div class="swatch-info">
          <span class="swatch-name" style="color:${t.id === currentTheme ? t.accent : '#aaa'}">${t.name}</span>
          <span class="swatch-tag">${t.tag}</span>
        </div>
        <span class="swatch-check" style="color:${t.accent}">✓</span>
      </div>`).join('');
  }

  const styleGrid = document.getElementById('style-grid');
  if (styleGrid) {
    styleGrid.innerHTML = STYLES.map(st => `
      <div class="style-card ${st.id === currentStyle ? 'active' : ''}" onclick="setStyle('${st.id}')">
        <div class="style-preview">${st.icon}</div>
        <div class="style-name">${st.name}</div>
        <div class="style-desc">${st.desc}</div>
      </div>`).join('');
  }
}

function switchSettingsTab(_tab) {
  // Settings is now always-visible cards — no tab switching needed.
  // This function is kept for any legacy call sites.
  renderSettingsUI();
  window.scrollTo(0, 0);
}

function handleSignOutCard() {
  if (typeof isGuest !== 'undefined' && isGuest) {
    if (typeof showLoginScreen === 'function') showLoginScreen();
  } else {
    if (typeof signOut === 'function') signOut();
  }
}
