let db = JSON.parse(localStorage.getItem('paragon_db')) || [];
let sketches = JSON.parse(localStorage.getItem('paragon_sketches')) || [];
let currentSort = 'team';
let currentField = 'match';
let editingSketchId = null;
let detailOrigin = 'home';

let canvas, ctx, drawing = false, penColor = 'white';

window.onload = function() {
    // Boot app normally first — no black screen ever
    loadSettings();
    drawNotes();
    initCanvas();
    nav('hub');
    // Then check auth in background — redirects to login if not signed in
    if (typeof initAuth === 'function') initAuth();
};

function initCanvas() {
    canvas = document.getElementById('sketch-canvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = 800; canvas.height = 500;
    const getXY = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };
    const start = (e) => { drawing = true; draw(e); };
    const end = () => { drawing = false; ctx.beginPath(); };
    const draw = (e) => {
        if (!drawing) return;
        const pos = getXY(e);
        ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = penColor;
        ctx.lineTo(pos.x, pos.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    };
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); });
    canvas.addEventListener('touchend', end);
}

function nav(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    const target = document.getElementById('view-' + v);
    if (target) target.classList.add('active');
    if (v === 'home') drawNotes();
    if (v === 'rules' && typeof initRules === 'function') initRules();
    if (v === 'settings') {
        if (typeof updateAccountUI === 'function') updateAccountUI();
        switchSettingsTab('account');
    }
    window.scrollTo(0, 0);
    closeMenu();
}

// Hub card tap — always clears event state and shows the list
function openEventsHub() {
    if (typeof clearEventState === 'function') clearEventState();
    nav('events');
    if (typeof loadEvents === 'function') loadEvents();
}

// Back button on detail view
function navBack() {
    // Clear last event so nav('events') shows the list, not the last event
    if (typeof clearEventState === 'function') clearEventState();
    if (detailOrigin === 'events') {
        // Go straight to events list — do NOT restore the last event
        nav('events');
        // Show the already-rendered list (don't reload)
        // If list is empty for some reason, load it
        const list = document.getElementById('event-list');
        if (list && list.children.length === 0 && typeof loadEvents === 'function') loadEvents();
    } else {
        nav('home');
    }
}

function setPen(c) { penColor = c; }
function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }

function saveSketch() {
    const name = document.getElementById('sketch-name').value || "Unnamed Strategy";
    const imgData = canvas.toDataURL();
    if (editingSketchId) {
        let idx = sketches.findIndex(s => s.id === editingSketchId);
        if (idx > -1) { sketches[idx].name = name; sketches[idx].img = imgData; sketches[idx].field = currentField; }
        editingSketchId = null;
    } else {
        sketches.push({ id: Date.now().toString(), name, date: new Date().toLocaleDateString(), field: currentField, img: imgData });
    }
    cloudSaveSketch(sketches.find(s => s.id === (editingSketchId || Date.now().toString())) || sketches[sketches.length-1]);
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
    img.onload = function() { clearCanvas(); ctx.drawImage(img, 0, 0); };
    img.src = s.img;
}

function drawSketches() {
    const list = document.getElementById('sketch-list');
    if(!list) return;
    list.innerHTML = '';
    [...sketches].reverse().forEach(s => {
        const fieldPath = s.field === 'skills' ? 'images/skills.png' : 'images/field.png';
        list.innerHTML += `
            <div class="sketch-item">
                <img src="${s.img}" class="sketch-preview" onclick="loadSketch('${s.id}')"
                     style="background-image:url('${fieldPath}'); background-size:cover; cursor:pointer;">
                <div style="flex:1; cursor:pointer;" onclick="loadSketch('${s.id}')">
                    <b style="font-size:0.9rem;">${s.name}</b><br>
                    <small style="color:var(--sub-text)">${s.date} • ${s.field.toUpperCase()}</small>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <button onclick="deleteSketch('${s.id}')" style="background:#400; color:white; border:none; padding:5px 8px; border-radius:5px; font-size:0.7rem;">Del</button>
                </div>
            </div>`;
    });
}

function deleteSketch(id) {
    if(confirm("Delete this strategy?")) {
        sketches = sketches.filter(s => s.id !== id);
        cloudDeleteSketch(id);
        drawSketches();
    }
}

function setSort(s) {
    currentSort = s;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('sort-' + s);
    if(btn) btn.classList.add('active');
    drawNotes();
}

function drawNotes() {
    const list = document.getElementById('noteList');
    if (!list) return;
    const query = (document.getElementById('noteSearch')?.value || "").toUpperCase();
    list.innerHTML = '';
    let keys = [...new Set(db.map(item => currentSort === 'team' ? item.team : item.event))].sort();
    keys.forEach(k => {
        if (k.toUpperCase().includes(query)) {
            let count = db.filter(d => (currentSort === 'team' ? d.team : d.event) === k).length;
            list.innerHTML += `
                <div class="note-card" onclick="showDet('${k}')">
                    <div><b>${k}</b><br><small>${count} Reports</small></div>
                    <div style="color:var(--primary)">→</div>
                </div>`;
        }
    });
}

function showDet(val) {
    detailOrigin = 'home';
    document.getElementById('detName').innerText = val;
    const hist = document.getElementById('detHistory');
    hist.innerHTML = '';
    db.filter(d => (currentSort === 'team' ? d.team : d.event) === val).reverse().forEach(d => {
        hist.innerHTML += `<div class="note-card" style="flex-direction:column; align-items:flex-start; gap:10px;">
            <div style="width:100%; display:flex; justify-content:space-between;"><b>${d.res} (${d.score}-${d.oppscore})</b><small>${currentSort==='team'?d.event:d.team}</small></div>
            <div style="font-size:0.8rem; color:var(--sub-text)">${d.notes || 'No notes.'}</div>
            <div style="display:flex; gap:10px; width:100%;">
                <button onclick="edit('${d.id}')" style="flex:1; padding:8px; background:var(--border); border:none; color:var(--text); border-radius:5px;">Edit</button>
                <button onclick="del('${d.id}', '${val}')" style="flex:1; padding:8px; background:#400; border:none; color:white; border-radius:5px;">Del</button>
            </div>
        </div>`;
    });
    nav('detail');
}

function save() {
    const id = document.getElementById('editIdx').value || Date.now().toString();
    const r = {
        id, team: document.getElementById('f-team').value.toUpperCase(),
        event: document.getElementById('f-event').value, res: document.getElementById('f-res').value,
        autores: document.getElementById('f-autores').value, partner: document.getElementById('f-partner').value,
        opp: document.getElementById('f-opp').value, score: document.getElementById('f-score').value || 0,
        oppscore: document.getElementById('f-oppscore').value || 0, notes: document.getElementById('f-notes').value
    };
    if (!r.team) return alert("Missing Team #");
    let idx = db.findIndex(x => x.id === id);
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
    document.getElementById('editIdx').value = d.id;
    document.getElementById('f-team').value = d.team;
    document.getElementById('f-event').value = d.event;
    document.getElementById('f-res').value = d.res;
    document.getElementById('f-autores').value = d.autores;
    document.getElementById('f-partner').value = d.partner;
    document.getElementById('f-opp').value = d.opp;
    document.getElementById('f-score').value = d.score;
    document.getElementById('f-oppscore').value = d.oppscore;
    document.getElementById('f-notes').value = d.notes;
    nav('form');
}

function del(id, val) {
    if (confirm("Delete?")) {
        db = db.filter(x => x.id !== id);
        cloudDeleteReport(id);
        showDet(val);
    }
}

function exportData() {
    const blob = new Blob([JSON.stringify({ db, sketches })], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `backup.paragon`; link.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const raw = JSON.parse(e.target.result);
            if (raw.db && raw.sketches) { db = raw.db; sketches = raw.sketches; }
            else { db = raw; sketches = []; }
            localStorage.setItem('paragon_db', JSON.stringify(db));
            localStorage.setItem('paragon_sketches', JSON.stringify(sketches));
            drawNotes(); alert("Import Successful.");
        } catch (err) { alert("Error: Invalid .paragon file."); }
    };
    reader.readAsText(file);
}

// ── THEMES: which ones are locked to a mode ──────────────────
const LOCKED_DARK  = ['theme-gold'];     // always dark
const LOCKED_LIGHT = ['theme-arctic'];   // always light

function setTheme(theme) {
    const s = _getSettings();
    s.theme = theme;
    // Enforce locked modes
    if (LOCKED_DARK.includes(theme))  s.mode = 'mode-dark';
    if (LOCKED_LIGHT.includes(theme)) s.mode = 'mode-light';
    _saveSettings(s);
    _applySettings(s);
    renderSettingsUI();
}

function setMode(mode) {
    const s = _getSettings();
    // Don't allow mode change on locked themes
    if (LOCKED_DARK.includes(s.theme) || LOCKED_LIGHT.includes(s.theme)) return;
    s.mode = mode;
    _saveSettings(s);
    _applySettings(s);
    renderSettingsUI();
}

function setStyle(style) {
    const s = _getSettings();
    s.style = style;
    _saveSettings(s);
    _applySettings(s);
    renderSettingsUI();
}

function _getSettings() {
    return JSON.parse(localStorage.getItem('paragon_settings_v3')) || {};
}

function _saveSettings(s) {
    localStorage.setItem('paragon_settings_v3', JSON.stringify(s));
    if (typeof cloudSaveSettings === 'function') cloudSaveSettings(s);
}

function _applySettings(s) {
    const theme = s.theme || 'theme-gold';
    const style = s.style || 'style-classic';
    const mode  = s.mode  || 'mode-dark';
    const modeClass = mode === 'mode-light' ? 'mode-light' : '';
    document.body.className = [theme, style, modeClass].filter(Boolean).join(' ');
}

function loadSettings() {
    // Migrate from old keys
    const old = JSON.parse(localStorage.getItem('paragon_settings_v2'));
    if (old && !localStorage.getItem('paragon_settings_v3')) {
        const migrated = {
            theme: old.theme === 'theme-light' ? 'theme-arctic' : 'theme-gold',
            style: old.style === 'style-modern' ? 'style-glass' : 'style-classic',
            mode:  old.theme === 'theme-light' ? 'mode-light' : 'mode-dark'
        };
        _saveSettings(migrated);
    }
    const s = _getSettings();
    // Enforce locks on load
    if (LOCKED_DARK.includes(s.theme))  s.mode = 'mode-dark';
    if (LOCKED_LIGHT.includes(s.theme)) s.mode = 'mode-light';
    _applySettings(s);
    renderSettingsUI();
}

function updateSettings() { loadSettings(); }

function renderSettingsUI() {
    const s = _getSettings();
    const currentTheme = s.theme || 'theme-gold';
    const currentStyle = s.style || 'style-classic';
    const currentMode  = s.mode  || 'mode-dark';

    const isLocked = LOCKED_DARK.includes(currentTheme) || LOCKED_LIGHT.includes(currentTheme);
    const lockNote = LOCKED_DARK.includes(currentTheme)
        ? 'Gold is always dark'
        : LOCKED_LIGHT.includes(currentTheme)
        ? 'Arctic is always light'
        : '';

    // Mode toggle
    const toggle = document.getElementById('mode-toggle');
    const noteEl = document.getElementById('mode-locked-note');
    const mdark  = document.getElementById('mode-btn-dark');
    const mlight = document.getElementById('mode-btn-light');
    if (toggle) toggle.classList.toggle('locked', isLocked);
    if (noteEl) { noteEl.textContent = lockNote; noteEl.style.display = lockNote ? 'block' : 'none'; }
    if (mdark)  mdark.classList.toggle('active',  currentMode === 'mode-dark');
    if (mlight) mlight.classList.toggle('active', currentMode === 'mode-light');

    const themes = [
        { id: 'theme-gold',    name: 'Gold',    tag: 'Dark only', accent: '#e8b23b', bg: '#060501' },
        { id: 'theme-arctic',  name: 'Arctic',  tag: 'Light only', accent: '#006edb', bg: '#eef4fb' },
        { id: 'theme-red',     name: 'Red',     tag: 'Dark & Light', accent: '#ff2222', bg: '#060000' },
        { id: 'theme-blue',    name: 'Blue',    tag: 'Dark & Light', accent: '#2882ff', bg: '#00050f' },
        { id: 'theme-stealth', name: 'Stealth', tag: 'Dark & Light', accent: '#e0e0e0', bg: '#000000' },
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
    if (tg) {
        tg.innerHTML = themes.map(t => `
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

    const sg = document.getElementById('style-grid');
    if (sg) {
        sg.innerHTML = styles.map(st => `
            <div class="style-card ${st.id === currentStyle ? 'active' : ''}"
                 onclick="setStyle('${st.id}')">
                <div class="style-preview">${st.icon}</div>
                <div class="style-name">${st.name}</div>
                <div class="style-desc">${st.desc}</div>
            </div>`).join('');
    }
}


function switchSettingsTab(tab) {
    const accountTab    = document.getElementById('settings-tab-account');
    const appearanceTab = document.getElementById('settings-tab-appearance');
    if (accountTab)    accountTab.style.display    = tab === 'account'    ? 'block' : 'none';
    if (appearanceTab) appearanceTab.style.display = tab === 'appearance' ? 'block' : 'none';
    if (tab === 'appearance' && typeof renderSettingsUI === 'function') renderSettingsUI();
    window.scrollTo(0, 0);
}

// Sign out card handler — works for both signed-in and guest
function handleSignOutCard() {
    if (typeof isGuest !== 'undefined' && isGuest) {
        // Guest: go back to login so they can sign in
        if (typeof showLoginScreen === 'function') showLoginScreen();
    } else {
        if (typeof signOut === 'function') signOut();
    }
}
function toggleMenu() { document.getElementById('fabMenu').classList.toggle('show'); }
function closeMenu() { document.getElementById('fabMenu').classList.remove('show'); }
