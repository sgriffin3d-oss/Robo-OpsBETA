// notes.js — Unified Notes Module (Match Report, Team Rating, Strategy)
// Depends on: constants.js, auth.js (cloudSaveNote, cloudDeleteNote, uploadNotePhoto)

// ─── State ────────────────────────────────────────────────────────────────────

let notes         = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes)) || [];
let noteSort      = 'team';
let noteQuery     = '';
let editingNoteId = null;
let currentTemplate = null;
let pendingPhotos  = [];
let stratSections  = [];

// ─── Entry Point ──────────────────────────────────────────────────────────────

function initNotes() {
  notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes)) || [];
  renderNotesList();
}

// ─── List View ────────────────────────────────────────────────────────────────

function setNoteSort(sort) {
  noteSort = sort;
  document.querySelectorAll('.note-sort-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('nsort-' + sort)?.classList.add('active');
  renderNotesList();
}

function onNoteSearch(val) {
  noteQuery = val.toUpperCase();
  renderNotesList();
}

function renderNotesList() {
  const list = document.getElementById('notesList');
  if (!list) return;

  let filtered = notes;
  if (noteQuery) {
    filtered = notes.filter(n => {
      const hay = [n.title, n.team, n.event, n.type].join(' ').toUpperCase();
      return hay.includes(noteQuery);
    });
  }

  const keyFn = n => {
    if (noteSort === 'team')  return n.team  || n.title || '—';
    if (noteSort === 'event') return n.event || n.title || '—';
    if (noteSort === 'type')  return ({ match:'Match', team:'Team Rating', strategy:'Strategy' }[n.type] || n.type);
    return '—';
  };

  const groups = {};
  filtered.forEach(n => { const k = keyFn(n); (groups[k] = groups[k] || []).push(n); });
  const sortedKeys = Object.keys(groups).sort();

  if (!sortedKeys.length) {
    list.innerHTML = `<div class="notes-empty">No notes yet.<br>Tap <strong>+ New</strong> to create one.</div>`;
    return;
  }

  list.innerHTML = sortedKeys.map(key => `
    <div class="notes-group">
      <div class="notes-group-label">${escHtml(key)}</div>
      ${groups[key].map(n => noteCardHtml(n)).join('')}
    </div>`).join('');
}

function noteCardHtml(n) {
  const typeLabel = { match:'Match', team:'Team', strategy:'Strategy' }[n.type] || n.type;
  const sub = n.type === 'match' ? (n.event||'') : n.type === 'team' ? (n.event||'') : (n.date||'');
  const photoIcon = n.photos?.length ? `<span class="note-card-photo-icon">📷 ${n.photos.length}</span>` : '';
  return `
    <div class="note-card" onclick="openNoteDetail('${n.id}')">
      <div class="note-card-left">
        <span class="note-badge note-badge--${n.type}">${typeLabel}</span>
        <strong class="note-card-title">${escHtml(n.title || n.team || 'Untitled')}</strong>
        ${sub ? `<small class="note-card-sub">${escHtml(sub)}</small>` : ''}
      </div>
      <div class="note-card-right">${photoIcon}<span class="note-card-arrow">→</span></div>
    </div>`;
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function openNoteDetail(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  const wrap = document.getElementById('noteDetailBody');
  if (!wrap) return;

  document.getElementById('noteDetailTitle').textContent = n.title || n.team || 'Note';

  let html = '';
  if (n.type === 'match')    html = matchDetailHtml(n);
  else if (n.type === 'team') html = teamDetailHtml(n);
  else if (n.type === 'strategy') html = strategyDetailHtml(n);

  if (n.photos?.length) {
    html += `<div class="detail-section-label">Photos</div>
      <div class="detail-photo-gallery">
        ${n.photos.map(url => `<img src="${url}" class="detail-photo-thumb" onclick="openPhotoFull('${url}')">`).join('')}
      </div>`;
  }

  wrap.innerHTML = html;
  document.getElementById('noteDetailEditBtn').onclick   = () => openNoteForm(n.id);
  document.getElementById('noteDetailDeleteBtn').onclick = () => deleteNote(n.id);
  switchPage('noteDetail');
}

function matchDetailHtml(n) {
  const winColor = { red:'var(--red)', blue:'var(--blue)', tie:'var(--primary)' };
  const winLabel = { red:'🔴 Red Alliance', blue:'🔵 Blue Alliance', tie:'Tie' };
  const autoLabel = { red:'<span style="color:var(--red)">Red</span>', blue:'<span style="color:var(--blue)">Blue</span>', tie:'Tie' };
  return `
    <div class="detail-row"><span class="detail-label">Match</span><span>${escHtml(n.title||'—')}</span></div>
    <div class="detail-row"><span class="detail-label">Event</span><span>${escHtml(n.event||'—')}</span></div>
    <div class="detail-row"><span class="detail-label">Winner</span><span style="color:${winColor[n.winner]||'inherit'}">${winLabel[n.winner]||'—'}</span></div>
    <div class="detail-row"><span class="detail-label">Auton</span><span>${autoLabel[n.autonWinner]||'—'}</span></div>
    <div class="detail-scorebug">
      <div class="detail-scorebug-side">
        <div class="detail-scorebug-label" style="color:var(--red)">RED</div>
        <div class="detail-scorebug-score">${n.redScore ?? '—'}</div>
        <div class="detail-scorebug-teams">${escHtml((n.redTeams||[]).join(', ')||'—')}</div>
      </div>
      <div class="detail-scorebug-vs">VS</div>
      <div class="detail-scorebug-side">
        <div class="detail-scorebug-label" style="color:var(--blue)">BLUE</div>
        <div class="detail-scorebug-score">${n.blueScore ?? '—'}</div>
        <div class="detail-scorebug-teams">${escHtml((n.blueTeams||[]).join(', ')||'—')}</div>
      </div>
    </div>
    ${n.notes ? `<div class="detail-section-label">Notes</div><div class="detail-notes-body">${escHtml(n.notes)}</div>` : ''}`;
}

function teamDetailHtml(n) {
  const sliders = ['autonomous','offense','defense','driving','teamwork'];
  const bars = sliders.map(k => {
    const val = n[k] ?? 0;
    return `<div class="detail-rating-row">
      <span class="detail-rating-label">${k.charAt(0).toUpperCase()+k.slice(1)}</span>
      <div class="detail-rating-bar-wrap"><div class="detail-rating-bar" style="width:${val*10}%"></div></div>
      <span class="detail-rating-val">${val}/10</span>
    </div>`;
  }).join('');
  return `
    <div class="detail-row"><span class="detail-label">Team</span><span>${escHtml(n.team||'—')}</span></div>
    <div class="detail-row"><span class="detail-label">Event</span><span>${escHtml(n.event||'—')}</span></div>
    <div class="detail-row"><span class="detail-label">Bot Type</span><span>${escHtml(n.botType||'—')}</span></div>
    <div class="detail-section-label">Ratings</div>${bars}
    ${n.notes ? `<div class="detail-section-label">Notes</div><div class="detail-notes-body">${escHtml(n.notes)}</div>` : ''}`;
}

function strategyDetailHtml(n) {
  const secs = (n.sections||[]).map((s,i) => `
    <div class="detail-section-label">${escHtml(s.title||`Section ${i+1}`)}</div>
    <div class="detail-notes-body">${escHtml(s.body||'')}</div>`).join('');
  return `
    <div class="detail-row"><span class="detail-label">Title</span><span>${escHtml(n.title||'—')}</span></div>
    <div class="detail-row"><span class="detail-label">Event</span><span>${escHtml(n.event||'—')}</span></div>
    ${secs}`;
}

function openPhotoFull(url) {
  const overlay = document.getElementById('photoFullOverlay');
  const img     = document.getElementById('photoFullImg');
  if (overlay && img) { img.src = url; overlay.style.display = 'flex'; }
}

function closePhotoFull() {
  const o = document.getElementById('photoFullOverlay');
  if (o) o.style.display = 'none';
}

// ─── Template Picker & Form ───────────────────────────────────────────────────

function openNewNote() {
  editingNoteId   = null;
  currentTemplate = null;
  pendingPhotos   = [];
  stratSections   = [];
  switchPage('notePicker');
}

function selectTemplate(type) {
  currentTemplate = type;
  buildNoteForm(type, null);
  switchPage('noteForm');
}

function openNoteForm(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  editingNoteId   = id;
  currentTemplate = n.type;
  pendingPhotos   = (n.photos||[]).map(url => ({ dataUrl: url, uploaded: true, url }));
  stratSections   = n.type === 'strategy' ? JSON.parse(JSON.stringify(n.sections||[])) : [];
  buildNoteForm(n.type, n);
  switchPage('noteForm');
}

function buildNoteForm(type, data) {
  const wrap = document.getElementById('noteFormBody');
  if (!wrap) return;
  document.getElementById('noteFormTitle').textContent =
    (editingNoteId ? 'Edit ' : 'New ') +
    ({ match:'Match Report', team:'Team Rating', strategy:'Strategy Note' }[type]||'Note');

  if (type === 'match')    wrap.innerHTML = matchFormHtml(data);
  if (type === 'team')     wrap.innerHTML = teamFormHtml(data);
  if (type === 'strategy') wrap.innerHTML = strategyFormHtml(data);

  renderPhotoPreviews();
  if (type === 'match')    renderCalcPicker();
  if (type === 'strategy') renderStratSections();
  if (type === 'team')     initSliders(data);
}

// ─── Match Form ───────────────────────────────────────────────────────────────

function matchFormHtml(d) {
  const winBtn = v => `<button type="button" class="alliance-btn alliance-btn--${v}${d?.winner===v?' active':''}" onclick="setWinner('${v}')">${v.toUpperCase()}</button>`;
  const atnBtn = v => `<button type="button" class="alliance-btn alliance-btn--${v}${d?.autonWinner===v?' active':''}" onclick="setAutonWinner('${v}')">${v.toUpperCase()}</button>`;
  return `
    <input type="hidden" id="nf-winner" value="${d?.winner||''}">
    <input type="hidden" id="nf-autonWinner" value="${d?.autonWinner||''}">
    <label class="form-label">Match Name / Title</label>
    <input type="text" id="nf-title" class="form-input" placeholder="e.g. Quals 12" value="${escAttr(d?.title||'')}">
    <label class="form-label">Event</label>
    <input type="text" id="nf-event" class="form-input" placeholder="Event name" value="${escAttr(d?.event||'')}">
    <label class="form-label">Winner</label>
    <div class="alliance-btn-row" id="winner-row">${winBtn('red')}${winBtn('blue')}${winBtn('tie')}</div>
    <label class="form-label">Auton Winner</label>
    <div class="alliance-btn-row" id="auton-row">${atnBtn('red')}${atnBtn('blue')}${atnBtn('tie')}</div>
    <div class="score-row-wrap">
      <div class="score-col">
        <label class="form-label" style="color:var(--red)">Red Score</label>
        <input type="number" id="nf-redScore" class="form-input" placeholder="0" value="${d?.redScore??''}">
        <label class="form-label" style="color:var(--red);margin-top:8px">Red Teams</label>
        <input type="text" id="nf-redTeams" class="form-input" placeholder="1234A, 5678B" value="${escAttr((d?.redTeams||[]).join(', '))}">
      </div>
      <div class="score-col">
        <label class="form-label" style="color:var(--blue)">Blue Score</label>
        <input type="number" id="nf-blueScore" class="form-input" placeholder="0" value="${d?.blueScore??''}">
        <label class="form-label" style="color:var(--blue);margin-top:8px">Blue Teams</label>
        <input type="text" id="nf-blueTeams" class="form-input" placeholder="9012C, 3456D" value="${escAttr((d?.blueTeams||[]).join(', '))}">
      </div>
    </div>
    <label class="form-label">Import from Saved Calculator</label>
    <div id="calcPickerList" class="calc-picker-list"></div>
    <label class="form-label">Extra Notes</label>
    <textarea id="nf-notes" class="form-textarea" rows="4" placeholder="Strategic notes...">${escHtml(d?.notes||'')}</textarea>
    <div class="photo-section">
      <label class="form-label">Photos</label>
      <div id="photoPreviews" class="photo-previews"></div>
      <button type="button" class="btn-add-photo" onclick="triggerPhotoInput()">+ Add Photo</button>
      <input type="file" id="photoFileInput" accept="image/*" multiple style="display:none" onchange="onPhotosSelected(this)">
    </div>`;
}

function setWinner(val) {
  document.getElementById('nf-winner').value = val;
  document.querySelectorAll('#winner-row .alliance-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`#winner-row .alliance-btn--${val}`)?.classList.add('active');
}

function setAutonWinner(val) {
  document.getElementById('nf-autonWinner').value = val;
  document.querySelectorAll('#auton-row .alliance-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`#auton-row .alliance-btn--${val}`)?.classList.add('active');
}

function renderCalcPicker() {
  const list = document.getElementById('calcPickerList');
  if (!list) return;
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('paragon_saved_calcs'))||[]; } catch {}
  if (!saved.length) {
    list.innerHTML = `<div class="calc-picker-empty">No saved calculators yet.</div>`;
    return;
  }
  list.innerHTML = saved.map(item => {
    const r = item.redScore, b = item.blueScore;
    const win = r > b ? 'Red wins' : b > r ? 'Blue wins' : 'Tie';
    return `<div class="calc-picker-item" onclick="importFromCalc('${item.id}', this)">
      <div class="calc-picker-scorebug">
        <span style="color:var(--red)">${r}</span>
        <span class="calc-picker-vs">–</span>
        <span style="color:var(--blue)">${b}</span>
      </div>
      <div class="calc-picker-info">
        <strong>${escHtml(item.name)}</strong>
        <small>${item.date} · ${win}</small>
      </div>
    </div>`;
  }).join('');
}

function importFromCalc(id, el) {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('paragon_saved_calcs'))||[]; } catch {}
  const item = saved.find(c => c.id === id);
  if (!item) return;
  const ri = document.getElementById('nf-redScore');
  const bi = document.getElementById('nf-blueScore');
  if (ri) ri.value = item.redScore;
  if (bi) bi.value = item.blueScore;
  const winner = item.redScore > item.blueScore ? 'red' : item.blueScore > item.redScore ? 'blue' : 'tie';
  setWinner(winner);
  if (item.auton) setAutonWinner(item.auton);
  document.querySelectorAll('.calc-picker-item').forEach(e => e.classList.remove('calc-picker-item--selected'));
  el?.classList.add('calc-picker-item--selected');
}

// ─── Team Rating Form ─────────────────────────────────────────────────────────

function teamFormHtml(d) {
  const keys = ['autonomous','offense','defense','driving','teamwork'];
  const sliderHtml = keys.map(k => `
    <div class="rating-slider-row">
      <div class="rating-slider-top">
        <span class="rating-slider-label">${k.charAt(0).toUpperCase()+k.slice(1)}</span>
        <span class="rating-slider-val" id="slval-${k}">${d?.[k]??5}</span>
      </div>
      <input type="range" min="1" max="10" value="${d?.[k]??5}" id="sl-${k}" class="rating-slider"
             oninput="updateSliderVal('${k}',this.value)">
      <div class="rating-slider-ticks">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<span>${n}</span>`).join('')}</div>
    </div>`).join('');
  return `
    <label class="form-label">Team Number</label>
    <input type="text" id="nf-team" class="form-input" placeholder="e.g. 1234A" value="${escAttr(d?.team||'')}">
    <label class="form-label">Event</label>
    <input type="text" id="nf-event" class="form-input" placeholder="Event name" value="${escAttr(d?.event||'')}">
    <label class="form-label">Bot Type</label>
    <input type="text" id="nf-botType" class="form-input" placeholder="e.g. Clamper, Stacker, Pusher..." value="${escAttr(d?.botType||'')}">
    <div class="rating-sliders-wrap">${sliderHtml}</div>
    <label class="form-label">Extra Notes</label>
    <textarea id="nf-notes" class="form-textarea" rows="4" placeholder="Anything else to note...">${escHtml(d?.notes||'')}</textarea>
    <div class="photo-section">
      <label class="form-label">Photos</label>
      <div id="photoPreviews" class="photo-previews"></div>
      <button type="button" class="btn-add-photo" onclick="triggerPhotoInput()">+ Add Photo</button>
      <input type="file" id="photoFileInput" accept="image/*" multiple style="display:none" onchange="onPhotosSelected(this)">
    </div>`;
}

function updateSliderVal(key, val) {
  const el = document.getElementById('slval-'+key);
  if (el) el.textContent = val;
  const sl = document.getElementById('sl-'+key);
  if (sl) sl.style.setProperty('--val', val);
}

function initSliders(data) {
  ['autonomous','offense','defense','driving','teamwork'].forEach(k => {
    const sl = document.getElementById('sl-'+k);
    if (sl) sl.style.setProperty('--val', data?.[k]??5);
  });
}

// ─── Strategy Form ────────────────────────────────────────────────────────────

function strategyFormHtml(d) {
  return `
    <label class="form-label">Title</label>
    <input type="text" id="nf-title" class="form-input" placeholder="Strategy name" value="${escAttr(d?.title||'')}">
    <label class="form-label">Event</label>
    <input type="text" id="nf-event" class="form-input" placeholder="Event name" value="${escAttr(d?.event||'')}">
    <div id="stratSectionsWrap"></div>
    <button type="button" class="btn-add-section" onclick="addStratSection()">+ Add Section</button>
    <div class="photo-section">
      <label class="form-label">Photos</label>
      <div id="photoPreviews" class="photo-previews"></div>
      <button type="button" class="btn-add-photo" onclick="triggerPhotoInput()">+ Add Photo</button>
      <input type="file" id="photoFileInput" accept="image/*" multiple style="display:none" onchange="onPhotosSelected(this)">
    </div>`;
}

function renderStratSections() {
  const wrap = document.getElementById('stratSectionsWrap');
  if (!wrap) return;
  if (!stratSections.length) stratSections.push({ title:'', body:'' });
  wrap.innerHTML = stratSections.map((s,i) => `
    <div class="strat-section" id="stratSec-${i}">
      <div class="strat-section-header">
        <input type="text" class="form-input strat-section-title" placeholder="Section title (e.g. Auton Plan)"
               value="${escAttr(s.title)}" oninput="stratSections[${i}].title=this.value">
        ${stratSections.length > 1
          ? `<button type="button" class="btn-remove-section" onclick="removeStratSection(${i})">✕</button>` : ''}
      </div>
      <textarea class="form-textarea strat-section-body" rows="4" placeholder="Write your strategy here..."
                oninput="stratSections[${i}].body=this.value">${escHtml(s.body)}</textarea>
    </div>`).join('');
}

function addStratSection() {
  stratSections.push({ title:'', body:'' });
  renderStratSections();
}

function removeStratSection(i) {
  stratSections.splice(i, 1);
  renderStratSections();
}

// ─── Photos ───────────────────────────────────────────────────────────────────

function triggerPhotoInput() {
  document.getElementById('photoFileInput')?.click();
}

function onPhotosSelected(input) {
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      pendingPhotos.push({ dataUrl: e.target.result, file, uploaded: false, url: null });
      renderPhotoPreviews();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function renderPhotoPreviews() {
  const wrap = document.getElementById('photoPreviews');
  if (!wrap) return;
  wrap.innerHTML = pendingPhotos.map((p,i) => `
    <div class="photo-thumb-wrap">
      <img src="${p.dataUrl||p.url}" class="photo-thumb">
      <button type="button" class="photo-thumb-remove" onclick="removePhoto(${i})">✕</button>
    </div>`).join('');
}

function removePhoto(i) {
  pendingPhotos.splice(i, 1);
  renderPhotoPreviews();
}

// ─── Save ─────────────────────────────────────────────────────────────────────

async function saveNote() {
  const btn = document.getElementById('noteFormSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    let note = { type: currentTemplate };

    if (currentTemplate === 'match') {
      note.title       = document.getElementById('nf-title')?.value.trim()||'';
      note.event       = document.getElementById('nf-event')?.value.trim()||'';
      note.winner      = document.getElementById('nf-winner')?.value||'';
      note.autonWinner = document.getElementById('nf-autonWinner')?.value||'';
      note.redScore    = parseInt(document.getElementById('nf-redScore')?.value)||0;
      note.blueScore   = parseInt(document.getElementById('nf-blueScore')?.value)||0;
      note.redTeams    = (document.getElementById('nf-redTeams')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
      note.blueTeams   = (document.getElementById('nf-blueTeams')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
      note.notes       = document.getElementById('nf-notes')?.value||'';
      note.team        = note.redTeams[0]||'';
    }

    if (currentTemplate === 'team') {
      note.team    = document.getElementById('nf-team')?.value.trim().toUpperCase()||'';
      note.event   = document.getElementById('nf-event')?.value.trim()||'';
      note.botType = document.getElementById('nf-botType')?.value.trim()||'';
      note.notes   = document.getElementById('nf-notes')?.value||'';
      note.title   = note.team;
      ['autonomous','offense','defense','driving','teamwork'].forEach(k => {
        note[k] = parseInt(document.getElementById('sl-'+k)?.value)||5;
      });
    }

    if (currentTemplate === 'strategy') {
      document.querySelectorAll('.strat-section-title').forEach((el,i) => { if (stratSections[i]) stratSections[i].title = el.value; });
      document.querySelectorAll('.strat-section-body').forEach((el,i)  => { if (stratSections[i]) stratSections[i].body  = el.value; });
      note.title    = document.getElementById('nf-title')?.value.trim()||'Strategy';
      note.event    = document.getElementById('nf-event')?.value.trim()||'';
      note.sections = stratSections.map(s=>({...s}));
      note.team     = '';
    }

    note.date = new Date().toLocaleDateString();

    // Upload new photos
    const uploadedUrls = await uploadPendingPhotos();
    note.photos = pendingPhotos.map((p,i) => p.uploaded ? p.url : uploadedUrls[i]).filter(Boolean);

    const id = editingNoteId || Date.now().toString();
    note.id   = id;

    const existing = notes.findIndex(x => x.id === id);
    if (existing > -1) notes[existing] = note;
    else notes.unshift(note);

    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
    await cloudSaveNote(note);

    switchPage('notes');
    renderNotesList();
  } catch (err) {
    console.error('Save note error:', err);
    alert('Error saving note. Please try again.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'SAVE'; }
  }
}

async function uploadPendingPhotos() {
  const urls = new Array(pendingPhotos.length).fill(null);
  for (let i = 0; i < pendingPhotos.length; i++) {
    const p = pendingPhotos[i];
    if (p.uploaded) { urls[i] = p.url; continue; }
    if (!p.file) continue;
    try {
      const url = await uploadNotePhoto(p.file);
      if (url) { pendingPhotos[i].uploaded = true; pendingPhotos[i].url = url; urls[i] = url; }
    } catch (e) { console.warn('Photo upload failed:', e); }
  }
  return urls;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  notes = notes.filter(x => x.id !== id);
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
  await cloudDeleteNote(id);
  switchPage('notes');
  renderNotesList();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escAttr(str) {
  return String(str??'').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
