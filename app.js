let db = JSON.parse(localStorage.getItem('paragon_db')) || [];
let sketches = JSON.parse(localStorage.getItem('paragon_sketches')) || [];
let currentSort = 'team';
let currentField = 'match';
let editingSketchId = null;

// 'home' = came from scouting notes, 'events' = came from events hub
let detailOrigin = 'home';

let canvas, ctx, drawing = false, penColor = 'white';

window.onload = function() {
    loadSettings();
    drawNotes();
    initCanvas();
    nav('hub');
};

function initCanvas() {
    canvas = document.getElementById('sketch-canvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 500;
    const getXY = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
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

// Core nav — switches view, triggers side effects
function nav(v) {
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    const target = document.getElementById('view-' + v);
    if (target) target.classList.add('active');

    if (v === 'events') {
        // nav('events') is only called by the back button from detail view
        // Always restore the last open event (set by openEventDetail in events.js)
        if (typeof restoreLastEvent === 'function') restoreLastEvent();
    }
    if (v === 'home') drawNotes();

    window.scrollTo(0, 0);
    closeMenu();
}

// Called by the Events Hub card — always goes to the event LIST, clears any saved state
function openEventsHub() {
    if (typeof clearEventState === 'function') clearEventState();
    document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
    const target = document.getElementById('view-events');
    if (target) target.classList.add('active');
    window.scrollTo(0, 0);
    closeMenu();
    if (typeof loadEvents === 'function') loadEvents();
}

// Back button on detail view
function navBack() {
    if (detailOrigin === 'events') {
        nav('events'); // restores last event
    } else {
        nav('home');
    }
}

// STRATEGY / DRAWING
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
    localStorage.setItem('paragon_sketches', JSON.stringify(sketches));
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
        localStorage.setItem('paragon_sketches', JSON.stringify(sketches));
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
    localStorage.setItem('paragon_db', JSON.stringify(db));
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
        localStorage.setItem('paragon_db', JSON.stringify(db));
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

function updateSettings() {
    const theme = document.getElementById('set-theme').value;
    const style = document.getElementById('set-style').value;
    document.body.className = `${theme} ${style}`;
    localStorage.setItem('paragon_settings_v2', JSON.stringify({ theme, style }));
}

function loadSettings() {
    const saved = JSON.parse(localStorage.getItem('paragon_settings_v2'));
    if (saved) {
        document.getElementById('set-theme').value = saved.theme;
        document.getElementById('set-style').value = saved.style;
        document.body.className = `${saved.theme} ${saved.style}`;
    }
}

function toggleMenu() { document.getElementById('fabMenu').classList.toggle('show'); }
function closeMenu() { document.getElementById('fabMenu').classList.remove('show'); }
