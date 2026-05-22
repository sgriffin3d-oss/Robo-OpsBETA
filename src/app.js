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
  if (typeof initAuth === 'function') initAuth();
  if (typeof updateInstallCardVisibility === 'function') updateInstallCardVisibility();
}

function switchPage(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + view)?.classList.add('active');
  if (view === 'home')     displayNotes();
  if (view === 'notes')    { if (typeof initNotes === 'function') initNotes(); }
  if (view === 'rules'     && typeof initRules       === 'function') initRules();
  if (view === 'settings'  && typeof updateAccountUI === 'function') {
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

function initCanvas() {
  canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

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

  if (!sketches.length) {
    list.innerHTML = `<div class="saved-empty"><p>No strategies saved yet.</p><small>Draw on the field and tap Save.</small></div>`;
    return;
  }

  list.innerHTML = [...sketches].reverse().map(sketch => {
    const fieldPath = sketch.field === 'skills' ? 'assets/images/skills.png' : 'assets/images/field.png';
    return `
      <div class="saved-card" onclick="loadSketch('${sketch.id}')">
        <div class="saved-card-thumb" style="background-image:url('${fieldPath}')">
          <img src="${sketch.img}" alt="${sketch.name}" />
        </div>
        <div class="saved-card-info">
          <span class="saved-card-name">${sketch.name}</span>
          <span class="saved-card-meta">${sketch.date} · ${sketch.field.toUpperCase()}</span>
        </div>
        <button class="saved-card-del" onclick="event.stopPropagation();deleteSketch('${sketch.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>`;
  }).join('');
}

function deleteSketch(id) {
  if (!confirm('Delete this strategy?')) return;
  sketches = sketches.filter(s => s.id !== id);
  cloudDeleteSketch(id);
  displayDrawing();
}

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
  reader.onload = async e => {
    try {
      const raw = JSON.parse(e.target.result);
      db       = raw.db       || raw;
      sketches = raw.sketches || [];
      localStorage.setItem(STORAGE_KEYS.db,       JSON.stringify(db));
      localStorage.setItem(STORAGE_KEYS.sketches,  JSON.stringify(sketches));

      // Push all imported records to cloud for the signed-in user
      if (typeof cloudSaveReport === 'function') {
        for (const report of db)   await cloudSaveReport(report);
      }
      if (typeof cloudSaveSketch === 'function') {
        for (const sketch of sketches) await cloudSaveSketch(sketch);
      }

      displayNotes();
      alert('Import successful!' + (typeof currentUser !== 'undefined' && currentUser ? ' Data synced to cloud.' : ''));
    } catch {
      alert('Error: Invalid .paragon file.');
    }
  };
  reader.readAsText(file);
}

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
  if (LOCKED_DARK.includes(s.theme))  s.mode = 'mode-dark';
  if (LOCKED_LIGHT.includes(s.theme)) s.mode = 'mode-light';
  applySettings(s);
  renderSettingsUI();
}

function updateSettings() { loadSettings(); }

function renderSettingsUI() {
  const s            = getSettings();
  const currentTheme = s.theme || 'theme-gold';
  const currentStyle = s.style || 'style-classic';
  const currentMode  = s.mode  || 'mode-dark';
  const isLocked     = LOCKED_DARK.includes(currentTheme) || LOCKED_LIGHT.includes(currentTheme);

  const toggle = document.getElementById('mode-toggle');
  const noteEl = document.getElementById('mode-locked-note');
  toggle?.classList.toggle('locked', isLocked);
  if (noteEl) {
    noteEl.textContent   = '';
    noteEl.style.display = 'none';
  }

  document.getElementById('mode-btn-dark')?.classList.toggle( 'active', currentMode === 'mode-dark');
  document.getElementById('mode-btn-light')?.classList.toggle('active', currentMode === 'mode-light');

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

function toggleSettingsCard(name) {
  const wrap = document.getElementById('sc-wrap-' + name);
  const body = document.getElementById('sc-body-' + name);
  if (!wrap || !body) return;
  const isOpen = wrap.classList.contains('sc-wrap--open');
  wrap.classList.toggle('sc-wrap--open', !isOpen);
  body.classList.toggle('sc-body--closed', isOpen);
}

function openSettingsCard(name) {
  const wrap = document.getElementById('sc-wrap-' + name);
  const body = document.getElementById('sc-body-' + name);
  if (!wrap || !body) return;
  wrap.classList.add('sc-wrap--open');
  body.classList.remove('sc-body--closed');
}

function handleSignOutCard() {
  if (typeof signOut === 'function') signOut();
}
