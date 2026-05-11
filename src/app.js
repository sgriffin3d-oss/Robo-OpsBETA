let db       = JSON.parse(localStorage.getItem('paragon_db'))       || [];
let sketches = JSON.parse(localStorage.getItem('paragon_sketches')) || [];
let currentSort  = 'team';
let currentField = 'match';
let editingSketchId = null;
let detailOrigin    = 'home';
let canvas, ctx, drawing = false, penColor = 'white';

window.onload = function () {
    loadSettings();
    drawNotes();
    initCanvas();
    if (typeof maybeShowInstall === 'function') {
        maybeShowInstall(_launchAuth);
    } else {
        _launchAuth();
    }
};

function _launchAuth() {
    nav('hub');
    if (typeof initAuth === 'function') initAuth();
    if (typeof updateInstallCardVisibility === 'function') updateInstallCardVisibility();
}

// ─── Navigation ────────────────────────────────────────────────────────────

function nav(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    document.getElementById('view-' + v)?.classList.add('active');
    if (v === 'home')     drawNotes();
    if (v === 'rules'    && typeof initRules       === 'function') initRules();
    if (v === 'settings' && typeof updateAccountUI === 'function') {
        updateAccountUI();
        switchSettingsTab('account');
    }
    window.scrollTo(0, 0);
    closeMenu();
}

function openEventsHub() {
    if (typeof clearEventState === 'function') clearEventState();
    nav('events');
    if (typeof loadEvents === 'function') loadEvents();
}

function navBack() {
    if (typeof clearEventState === 'function') clearEventState();
    if (detailOrigin === 'events') {
        nav('events');
        const list = document.getElementById('event-list');
        if (list && !list.children.length && typeof loadEvents === 'function') loadEvents();
    } else {
        nav('home');
    }
}

function toggleMenu() { document.getElementById('fabMenu').classList.toggle('show'); }
function closeMenu()  { document.getElementById('fabMenu').classList.remove('show'); }

// ─── Canvas ─────────────────────────────────────────────────────────────────

function initCanvas() {
    canvas = document.getElementById('sketch-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = 800; canvas.height = 500;

    const getXY = e => {
        const rect   = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const src    = e.touches ? e.touches[0] : e;
        return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
    };
    const start = e => { drawing = true; draw(e); };
    const end   = () => { drawing = false; ctx.beginPath(); };
    const draw  = e => {
        if (!drawing) return;
        const p = getXY(e);
        ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = penColor;
        ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
    };
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup',   end);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); start(e); }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); draw(e);  }, { passive: false });
    canvas.addEventListener('touchend',   end);
}

function setPen(c)    { penColor = c; }
function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

// ─── Sketches ────────────────────────────────────────────────────────────────

function saveSketch() {
    const name    = document.getElementById('sketch-name').value || 'Unnamed Strategy';
    const imgData = canvas.toDataURL();
    if (editingSketchId) {
        const idx = sketches.findIndex(s => s.id === editingSketchId);
        if (idx > -1) Object.assign(sketches[idx], { name, img: imgData, field: currentField });
        editingSketchId = null;
    } else {
        sketches.push({ id: Date.now().toString(), name, date: new Date().toLocaleDateString(), field: currentField, img: imgData });
    }
    cloudSaveSketch(sketches.at(-1));
    clearCanvas();
    document.getElementById('sketch-name').value = '';
    setFieldMode('saved');
    drawSketches();
}

function loadSketch(id) {
    const s = sketches.find(sk => sk.id === id);
    if (!s) return;
    editingSketchId = s.id; currentField = s.field;
    document.getElementById('sketch-name').value = s.name;
    setFieldMode('draw');
    const img = new Image();
    img.onload = () => { clearCanvas(); ctx.drawImage(img, 0, 0); };
    img.src = s.img;
}

function drawSketches() {
    const list = document.getElementById('sketch-list');
    if (!list) return;
    list.innerHTML = [...sketches].reverse().map(s => {
        const fieldPath = s.field === 'skills' ? 'images/skills.png' : 'images/field.png';
        return `
            <div class="sketch-item">
                <img src="${s.img}" class="sketch-preview" onclick="loadSketch('${s.id}')"
                     style="background-image:url('${fieldPath}'); background-size:cover; cursor:pointer;">
                <div style="flex:1; cursor:pointer;" onclick="loadSketch('${s.id}')">
                    <b style="font-size:0.9rem;">${s.name}</b><br>
                    <small style="color:var(--sub-text)">${s.date} • ${s.field.toUpperCase()}</small>
                </div>
                <button onclick="deleteSketch('${s.id}')" style="background:#400; color:white; border:none; padding:5px 8px; border-radius:5px; font-size:0.7rem;">Del</button>
            </div>`;
    }).join('');
}

function deleteSketch(id) {
    if (confirm('Delete this strategy?')) {
        sketches = sketches.filter(s => s.id !== id);
        cloudDeleteSketch(id);
        drawSketches();
    }
}

// ─── Scout Notes ─────────────────────────────────────────────────────────────

function setSort(s) {
    currentSort = s;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('sort-' + s)?.classList.add('active');
    drawNotes();
}

function drawNotes() {
    const list  = document.getElementById('noteList');
    if (!list) return;
    const query = (document.getElementById('noteSearch')?.value || '').toUpperCase();
    const keys  = [...new Set(db.map(item => currentSort === 'team' ? item.team : item.event))].sort();
    list.innerHTML = keys
        .filter(k => k.toUpperCase().includes(query))
        .map(k => {
            const count = db.filter(d => (currentSort === 'team' ? d.team : d.event) === k).length;
            return `
                <div class="note-card" onclick="showDet('${k}')">
                    <div><b>${k}</b><br><small>${count} Reports</small></div>
                    <div style="color:var(--primary)">→</div>
                </div>`;
        }).join('');
}

function showDet(val) {
    detailOrigin = 'home';
    document.getElementById('detName').innerText = val;
    document.getElementById('detHistory').innerHTML = db
        .filter(d => (currentSort === 'team' ? d.team : d.event) === val)
        .reverse()
        .map(d => `
            <div class="note-card" style="flex-direction:column; align-items:flex-start; gap:10px;">
                <div style="width:100%; display:flex; justify-content:space-between;">
                    <b>${d.res} (${d.score}-${d.oppscore})</b>
                    <small>${currentSort === 'team' ? d.event : d.team}</small>
                </div>
                <div style="font-size:0.8rem; color:var(--sub-text)">${d.notes || 'No notes.'}</div>
                <div style="display:flex; gap:10px; width:100%;">
                    <button onclick="edit('${d.id}')" style="flex:1; padding:8px; background:var(--border); border:none; color:var(--text); border-radius:5px;">Edit</button>
                    <button onclick="del('${d.id}', '${val}')" style="flex:1; padding:8px; background:#400; border:none; color:white; border-radius:5px;">Del</button>
                </div>
            </div>`).join('');
    nav('detail');
}

// ─── Form CRUD ───────────────────────────────────────────────────────────────

function save() {
    const id = document.getElementById('editIdx').value || Date.now().toString();
    const r  = {
        id,
        team:      document.getElementById('f-team').value.toUpperCase(),
        event:     document.getElementById('f-event').value,
        res:       document.getElementById('f-res').value,
        autores:   document.getElementById('f-autores').value,
        partner:   document.getElementById('f-partner').value,
        opp:       document.getElementById('f-opp').value,
        score:     document.getElementById('f-score').value    || 0,
        oppscore:  document.getElementById('f-oppscore').value || 0,
        notes:     document.getElementById('f-notes').value,
    };
    if (!r.team) return alert('Missing Team #');
    const idx = db.findIndex(x => x.id === id);
    if (idx > -1) db[idx] = r; else db.push(r);
    cloudSaveReport(r);
    nav('home');
}

function openNew() {
    document.getElementById('editIdx').value = '';
    document.querySelectorAll('#view-form input, #view-form textarea').forEach(i => i.value = '');
    nav('form');
}

function edit(id) {
    const d = db.find(x => x.id === id);
    if (!d) return;
    ['editIdx','f-team','f-event','f-res','f-autores','f-partner','f-opp','f-score','f-oppscore','f-notes']
        .forEach(fid => {
            const el  = document.getElementById(fid);
            const key = fid.replace('f-', '').replace('editIdx', 'id');
            if (el) el.value = d[key] ?? '';
        });
    nav('form');
}

function del(id, val) {
    if (confirm('Delete?')) {
        db = db.filter(x => x.id !== id);
        cloudDeleteReport(id);
        showDet(val);
    }
}

// ─── Import / Export ─────────────────────────────────────────────────────────

function exportData() {
    const blob = new Blob([JSON.stringify({ db, sketches })], { type: 'text/plain' });
    const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'backup.paragon' });
    a.click();
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
            localStorage.setItem('paragon_db',       JSON.stringify(db));
            localStorage.setItem('paragon_sketches', JSON.stringify(sketches));
            drawNotes();
            alert('Import Successful.');
        } catch { alert('Error: Invalid .paragon file.'); }
    };
    reader.readAsText(file);
}

// ─── Settings ────────────────────────────────────────────────────────────────

const LOCKED_DARK  = ['theme-gold'];
const LOCKED_LIGHT = ['theme-arctic'];

function setTheme(theme) {
    const s = _getSettings();
    s.theme = theme;
    if (LOCKED_DARK.includes(theme))  s.mode = 'mode-dark';
    if (LOCKED_LIGHT.includes(theme)) s.mode = 'mode-light';
    _saveSettings(s); _applySettings(s); renderSettingsUI();
}

function setMode(mode) {
    const s = _getSettings();
    if (LOCKED_DARK.includes(s.theme) || LOCKED_LIGHT.includes(s.theme)) return;
    s.mode = mode;
    _saveSettings(s); _applySettings(s); renderSettingsUI();
}

function setStyle(style) {
    const s = _getSettings();
    s.style = style;
    _saveSettings(s); _applySettings(s); renderSettingsUI();
}

function _getSettings()  { return JSON.parse(localStorage.getItem('paragon_settings_v3')) || {}; }
function _saveSettings(s) {
    localStorage.setItem('paragon_settings_v3', JSON.stringify(s));
    if (typeof cloudSaveSettings === 'function') cloudSaveSettings(s);
}
function _applySettings(s) {
    const theme     = s.theme || 'theme-gold';
    const style     = s.style || 'style-classic';
    const modeClass = (s.mode || 'mode-dark') === 'mode-light' ? 'mode-light' : '';
    document.body.className = [theme, style, modeClass].filter(Boolean).join(' ');
}

function loadSettings() {
    const s = _getSettings();
    if (LOCKED_DARK.includes(s.theme))  s.mode = 'mode-dark';
    if (LOCKED_LIGHT.includes(s.theme)) s.mode = 'mode-light';
    _applySettings(s);
    renderSettingsUI();
}

function updateSettings() { loadSettings(); }

function renderSettingsUI() {
    const s            = _getSettings();
    const currentTheme = s.theme || 'theme-gold';
    const currentStyle = s.style || 'style-classic';
    const currentMode  = s.mode  || 'mode-dark';
    const isLocked     = LOCKED_DARK.includes(currentTheme) || LOCKED_LIGHT.includes(currentTheme);
    const lockNote     = LOCKED_DARK.includes(currentTheme)  ? 'Gold is always dark'
                       : LOCKED_LIGHT.includes(currentTheme) ? 'Arctic is always light' : '';

    const toggle = document.getElementById('mode-toggle');
    const noteEl = document.getElementById('mode-locked-note');
    const mdark  = document.getElementById('mode-btn-dark');
    const mlight = document.getElementById('mode-btn-light');
    toggle?.classList.toggle('locked', isLocked);
    if (noteEl) { noteEl.textContent = lockNote; noteEl.style.display = lockNote ? 'block' : 'none'; }
    mdark?.classList.toggle( 'active', currentMode === 'mode-dark');
    mlight?.classList.toggle('active', currentMode === 'mode-light');

    const themes = [
        { id: 'theme-gold',    name: 'Gold',    tag: 'Dark only',       accent: '#e8b23b', bg: '#060501' },
        { id: 'theme-arctic',  name: 'Arctic',  tag: 'Light only',      accent: '#006edb', bg: '#eef4fb' },
        { id: 'theme-red',     name: 'Red',     tag: 'Dark & Light',    accent: '#cc2200', bg: '#080808' },
        { id: 'theme-blue',    name: 'Blue',    tag: 'Dark & Light',    accent: '#1a6ccc', bg: '#080808' },
        { id: 'theme-stealth', name: 'Stealth', tag: 'Dark & Light',    accent: '#e0e0e0', bg: '#000000' },
    ];
    const styles = [
        { id: 'style-classic',  name: 'Classic',  desc: 'Original feel',   icon: '◼' },
        { id: 'style-minimal',  name: 'Minimal',  desc: 'Lines only',      icon: '▱' },
        { id: 'style-glass',    name: 'Glass',    desc: 'Frosted blur',    icon: '◈' },
        { id: 'style-tactical', name: 'Tactical', desc: 'Sharp HUD',       icon: '◧' },
        { id: 'style-neon',     name: 'Neon',     desc: 'Glow effects',    icon: '✦' },
        { id: 'style-retro',    name: 'Retro',    desc: 'Warm & textured', icon: '❧' },
    ];

    const tg = document.getElementById('theme-grid');
    if (tg) tg.innerHTML = themes.map(t => `
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

    const sg = document.getElementById('style-grid');
    if (sg) sg.innerHTML = styles.map(st => `
        <div class="style-card ${st.id === currentStyle ? 'active' : ''}" onclick="setStyle('${st.id}')">
            <div class="style-preview">${st.icon}</div>
            <div class="style-name">${st.name}</div>
            <div class="style-desc">${st.desc}</div>
        </div>`).join('');
}

function switchSettingsTab(tab) {
    document.getElementById('settings-tab-account')?.style    && (document.getElementById('settings-tab-account').style.display    = tab === 'account'    ? 'block' : 'none');
    document.getElementById('settings-tab-appearance')?.style && (document.getElementById('settings-tab-appearance').style.display = tab === 'appearance' ? 'block' : 'none');
    if (tab === 'appearance') renderSettingsUI();
    window.scrollTo(0, 0);
}

function handleSignOutCard() {
    if (typeof isGuest !== 'undefined' && isGuest) {
        if (typeof showLoginScreen === 'function') showLoginScreen();
    } else {
        if (typeof signOut === 'function') signOut();
    }
}
