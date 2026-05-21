// notes.js — Unified Notes Module

// ─── Feather SVG Icons ────────────────────────────────────────────────────────
const ICONS = {
  chevron:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  image:     `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  camera:    `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  plus:      `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  x:         `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
};

// ─── State ────────────────────────────────────────────────────────────────────
let notes           = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes)) || [];
let noteSort        = 'team';
let noteQuery       = '';
let editingNoteId   = null;
let currentTemplate = null;
let pendingPhotos   = [];   // { dataUrl, file, url }
let stratSections   = [];

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
    filtered = notes.filter(n =>
      [n.title, n.team, n.event, n.type].join(' ').toUpperCase().includes(noteQuery)
    );
  }

  const keyFn = n => {
    if (noteSort === 'team')  return n.team  || n.title || '—';
    if (noteSort === 'event') return n.event || n.title || '—';
    return { match: 'Match Report', team: 'Team Rating', strategy: 'Strategy' }[n.type] || n.type;
  };

  const groups = {};
  filtered.forEach(n => { const k = keyFn(n); (groups[k] = groups[k] || []).push(n); });
  const keys = Object.keys(groups).sort();

  if (!keys.length) {
    list.innerHTML = `<div class="notes-empty">No notes yet.<br>Tap <strong>+ New Note</strong> to get started.</div>`;
    return;
  }

  list.innerHTML = keys.map(k => `
    <div class="notes-group">
      <div class="notes-group-label">${escHtml(k)}</div>
      ${groups[k].map(noteCardHtml).join('')}
    </div>`).join('');
}

function noteCardHtml(n) {
  const typeLabel = { match: 'Match', team: 'Team', strategy: 'Strategy' }[n.type] || n.type;
  const sub = n.type === 'match' ? (n.event || n.date || '')
            : n.type === 'team'  ? (n.event || n.date || '')
            : (n.date || '');
  const photoTag = n.photos?.length
    ? `<span class="note-card-photo-count">${ICONS.image}&thinsp;${n.photos.length}</span>` : '';
  return `
    <div class="note-card" onclick="openNoteDetail('${escAttr(n.id)}')">
      <div class="note-card-left">
        <span class="note-badge note-badge--${n.type}">${typeLabel}</span>
        <strong class="note-card-title">${escHtml(n.title || n.team || 'Untitled')}</strong>
        ${sub ? `<small class="note-card-sub">${escHtml(sub)}</small>` : ''}
      </div>
      <div class="note-card-right">${photoTag}<span class="note-card-chevron">${ICONS.chevron}</span></div>
    </div>`;
}

// ─── Detail View ──────────────────────────────────────────────────────────────
function openNoteDetail(id) {
  const n = notes.find(x => x.id === id);
  if (!n) return;
  const wrap = document.getElementById('noteDetailBody');
  if (!wrap) return;

  document.getElementById('noteDetailTitle').textContent = n.title || n.team || 'Note';

  let html = n.type === 'match'    ? matchDetailHtml(n)
           : n.type === 'team'     ? teamDetailHtml(n)
           : strategyDetailHtml(n);

  if (n.photos?.length) {
    html += `<div class="detail-section-label">Photos</div>
      <div class="detail-photo-gallery">
        ${n.photos.map((url, i) =>
          `<img src="${escAttr(url)}" class="detail-photo-thumb"
                onclick="openPhotoFull('${escAttr(id)}',${i})" loading="lazy">`
        ).join('')}
      </div>`;
  }

  wrap.innerHTML = html;
  document.getElementById('noteDetailEditBtn').onclick   = () => openNoteForm(n.id);
  document.getElementById('noteDetailDeleteBtn').onclick = () => deleteNote(n.id);
  switchPage('noteDetail');
}

function matchDetailHtml(n) {
  const winColor = { red: 'var(--red)', blue: 'var(--blue)', tie: 'var(--primary)' };
  const winLabel = { red: 'Red Alliance', blue: 'Blue Alliance', tie: 'Tie' };
  const autoLabel = {
    red:  `<span style="color:var(--red)">Red</span>`,
    blue: `<span style="color:var(--blue)">Blue</span>`,
    tie:  'Tie'
  };
  return `
    <div class="detail-row"><span class="detail-label">Match</span><span>${escHtml(n.title || '—')}</span></div>
    <div class="detail-row"><span class="detail-label">Event</span><span>${escHtml(n.event || '—')}</span></div>
    <div class="detail-row"><span class="detail-label">Winner</span>
      <span style="color:${winColor[n.winner] || 'inherit'}">${winLabel[n.winner] || '—'}</span></div>
    <div class="detail-row"><span class="detail-label">Auton</span>
      <span>${autoLabel[n.autonWinner] || '—'}</span></div>
    <div class="detail-scorebug">
      <div class="detail-scorebug-side">
        <div class="detail-scorebug-label" style="color:var(--red)">RED</div>
        <div class="detail-scorebug-score">${n.redScore ?? '—'}</div>
        <div class="detail-scorebug-teams">${escHtml((n.redTeams || []).join(', ') || '—')}</div>
      </div>
      <div class="detail-scorebug-vs">VS</div>
      <div class="detail-scorebug-side">
        <div class="detail-scorebug-label" style="color:var(--blue)">BLUE</div>
        <div class="detail-scorebug-score">${n.blueScore ?? '—'}</div>
        <div class="detail-scorebug-teams">${escHtml((n.blueTeams || []).join(', ') || '—')}</div>
      </div>
    </div>
    ${n.notes ? `<div class="detail-section-label">Notes</div><div class="detail-notes-body">${escHtml(n.notes)}</div>` : ''}`;
}

function teamDetailHtml(n) {
  const keys = ['autonomous', 'offense', 'defense', 'driving', 'teamwork'];
  const bars = keys.map(k => {
    const val = n[k] ?? 0;
    const pct = val * 10;
    const color = pct >= 70 ? 'var(--green, #4caf50)' : pct >= 40 ? 'var(--primary)' : '#e05040';
    return `<div class="detail-rating-row">
      <span class="detail-rating-label">${k.charAt(0).toUpperCase() + k.slice(1)}</span>
      <div class="detail-rating-bar-wrap">
        <div class="detail-rating-bar" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="detail-rating-val">${val}<span style="opacity:.45;font-size:.7em">/10</span></span>
    </div>`;
  }).join('');
  return `
    <div class="detail-row"><span class="detail-label">Team</span><span>${escHtml(n.team || '—')}</span></div>
    <div class="detail-row"><span class="detail-label">Event</span><span>${escHtml(n.event || '—')}</span></div>
    <div class="detail-row"><span class="detail-label">Bot Type</span><span>${escHtml(n.botType || '—')}</span></div>
    <div class="detail-section-label">Ratings</div>
    <div class="detail-ratings-block">${bars}</div>
    ${n.notes ? `<div class="detail-section-label">Notes</div><div class="detail-notes-body">${escHtml(n.notes)}</div>` : ''}`;
}

function strategyDetailHtml(n) {
  const secs = (n.sections || []).map((s, i) => `
    <div class="detail-section-label">${escHtml(s.title || `Section ${i + 1}`)}</div>
    <div class="detail-notes-body">${escHtml(s.body || '')}</div>`).join('');
  return `
    <div class="detail-row"><span class="detail-label">Title</span><span>${escHtml(n.title || '—')}</span></div>
    <div class="detail-row"><span class="detail-label">Event</span><span>${escHtml(n.event || '—')}</span></div>
    ${secs}`;
}

function openPhotoFull(noteId, idx) {
  const n = notes.find(x => x.id === noteId);
  if (!n?.photos?.[idx]) return;
  const overlay = document.getElementById('photoFullOverlay');
  const img     = document.getElementById('photoFullImg');
  if (overlay && img) { img.src = n.photos[idx]; overlay.style.display = 'flex'; }
}
function closePhotoFull() {
  const o = document.getElementById('photoFullOverlay');
  if (o) o.style.display = 'none';
}

// ─── Navigation ───────────────────────────────────────────────────────────────
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
  pendingPhotos   = (n.photos || []).map(url => ({ dataUrl: url, file: null, url }));
  stratSections   = n.type === 'strategy' ? JSON.parse(JSON.stringify(n.sections || [])) : [];
  buildNoteForm(n.type, n);
  switchPage('noteForm');
}

function buildNoteForm(type, data) {
  const wrap = document.getElementById('noteFormBody');
  if (!wrap) return;
  document.getElementById('noteFormTitle').textContent =
    (editingNoteId ? 'Edit ' : 'New ') +
    ({ match: 'Match Report', team: 'Team Rating', strategy: 'Strategy Note' }[type] || 'Note');

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
  const wBtn = v => `<button type="button" class="alliance-btn alliance-btn--${v}${d?.winner === v ? ' active' : ''}" onclick="setWinner('${v}')">${v.toUpperCase()}</button>`;
  const aBtn = v => `<button type="button" class="alliance-btn alliance-btn--${v}${d?.autonWinner === v ? ' active' : ''}" onclick="setAutonWinner('${v}')">${v.toUpperCase()}</button>`;
  return `
    <input type="hidden" id="nf-winner"      value="${d?.winner || ''}">
    <input type="hidden" id="nf-autonWinner" value="${d?.autonWinner || ''}">
    <label class="form-label">Match Name / Title</label>
    <input type="text" id="nf-title" class="form-input" placeholder="e.g. Quals 12" value="${escAttr(d?.title || '')}">
    <label class="form-label">Event</label>
    <input type="text" id="nf-event" class="form-input" placeholder="Event name" value="${escAttr(d?.event || '')}">
    <label class="form-label">Winner</label>
    <div class="alliance-btn-row" id="winner-row">${wBtn('red')}${wBtn('blue')}${wBtn('tie')}</div>
    <label class="form-label">Auton Winner</label>
    <div class="alliance-btn-row" id="auton-row">${aBtn('red')}${aBtn('blue')}${aBtn('tie')}</div>
    <div class="score-row-wrap">
      <div class="score-col">
        <label class="form-label" style="color:var(--red)">Red Score</label>
        <input type="number" id="nf-redScore" class="form-input" placeholder="0" value="${d?.redScore ?? ''}">
        <label class="form-label" style="color:var(--red);margin-top:8px">Red Teams</label>
        <input type="text" id="nf-redTeams" class="form-input" placeholder="1234A, 5678B" value="${escAttr((d?.redTeams || []).join(', '))}">
      </div>
      <div class="score-col">
        <label class="form-label" style="color:var(--blue)">Blue Score</label>
        <input type="number" id="nf-blueScore" class="form-input" placeholder="0" value="${d?.blueScore ?? ''}">
        <label class="form-label" style="color:var(--blue);margin-top:8px">Blue Teams</label>
        <input type="text" id="nf-blueTeams" class="form-input" placeholder="9012C, 3456D" value="${escAttr((d?.blueTeams || []).join(', '))}">
      </div>
    </div>
    <label class="form-label">Import from Saved Calculator</label>
    <div id="calcPickerList" class="calc-picker-list"></div>
    <label class="form-label">Extra Notes</label>
    <textarea id="nf-notes" class="form-textarea" rows="4" placeholder="Strategic notes...">${escHtml(d?.notes || '')}</textarea>
    ${photoSectionHtml()}`;
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
  try { saved = JSON.parse(localStorage.getItem('paragon_saved_calcs')) || []; } catch {}
  if (!saved.length) {
    list.innerHTML = `<div class="calc-picker-empty">No saved calculators yet.</div>`;
    return;
  }
  list.innerHTML = saved.map(item => {
    const r = item.redScore, b = item.blueScore;
    const win = r > b ? 'Red wins' : b > r ? 'Blue wins' : 'Tie';
    return `<div class="calc-picker-item" onclick="importFromCalc('${escAttr(item.id)}',this)">
      <div class="calc-picker-scorebug">
        <span style="color:var(--red)">${r}</span>
        <span class="calc-picker-vs">–</span>
        <span style="color:var(--blue)">${b}</span>
      </div>
      <div class="calc-picker-info">
        <strong>${escHtml(item.name)}</strong>
        <small>${escHtml(item.date)} · ${win}</small>
      </div>
    </div>`;
  }).join('');
}

function importFromCalc(id, el) {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('paragon_saved_calcs')) || []; } catch {}
  const item = saved.find(c => c.id === id);
  if (!item) return;
  const ri = document.getElementById('nf-redScore');
  const bi = document.getElementById('nf-blueScore');
  if (ri) ri.value = item.redScore;
  if (bi) bi.value = item.blueScore;
  setWinner(item.redScore > item.blueScore ? 'red' : item.blueScore > item.redScore ? 'blue' : 'tie');
  if (item.auton) setAutonWinner(item.auton);
  document.querySelectorAll('.calc-picker-item').forEach(e => e.classList.remove('calc-picker-item--selected'));
  el?.classList.add('calc-picker-item--selected');
}

// ─── Team Rating Form ─────────────────────────────────────────────────────────
function teamFormHtml(d) {
  const keys = ['autonomous', 'offense', 'defense', 'driving', 'teamwork'];
  const sliders = keys.map(k => {
    const val = d?.[k] ?? 5;
    return `
    <div class="rating-slider-row">
      <div class="rating-slider-header">
        <span class="rating-slider-label">${k.charAt(0).toUpperCase() + k.slice(1)}</span>
        <span class="rating-slider-pill" id="slval-${k}">${val}</span>
      </div>
      <div class="rating-track-container">
        <div class="rating-track-fill" id="fill-${k}" style="width:${(val - 1) / 9 * 100}%"></div>
        <input type="range" min="1" max="10" step="1" value="${val}"
               id="sl-${k}" class="rating-slider"
               oninput="updateSliderVal('${k}', this.value)"
               ontouchstart="this.focus()">
      </div>
      <div class="rating-slider-ticks">
        ${[1,2,3,4,5,6,7,8,9,10].map(n =>
          `<span class="rating-tick${n <= val ? ' tick-on' : ''}" id="tick-${k}-${n}">${n}</span>`
        ).join('')}
      </div>
    </div>`;
  }).join('');

  return `
    <label class="form-label">Team Number</label>
    <input type="text" id="nf-team" class="form-input" placeholder="e.g. 1234A" value="${escAttr(d?.team || '')}">
    <label class="form-label">Event</label>
    <input type="text" id="nf-event" class="form-input" placeholder="Event name" value="${escAttr(d?.event || '')}">
    <label class="form-label">Bot Type</label>
    <input type="text" id="nf-botType" class="form-input"
           placeholder="e.g. Ruiguan S-Bot, Lever Bot..."
           value="${escAttr(d?.botType || '')}">
    <div class="rating-sliders-card">${sliders}</div>
    <label class="form-label">Extra Notes</label>
    <textarea id="nf-notes" class="form-textarea" rows="4"
              placeholder="Anything else to note...">${escHtml(d?.notes || '')}</textarea>
    ${photoSectionHtml()}`;
}

function updateSliderVal(key, rawVal) {
  const val = parseInt(rawVal);
  const pill = document.getElementById('slval-' + key);
  if (pill) {
    pill.textContent = val;
    // Color the pill based on score
    pill.style.background = val >= 8 ? 'var(--green,#4caf50)'
                          : val >= 5 ? 'var(--primary)'
                          : '#e05040';
  }
  // Update fill bar width (1-10 mapped to 0-100%)
  const fill = document.getElementById('fill-' + key);
  if (fill) fill.style.width = ((val - 1) / 9 * 100) + '%';
  // Update tick highlights
  for (let i = 1; i <= 10; i++) {
    const tick = document.getElementById(`tick-${key}-${i}`);
    if (tick) tick.className = 'rating-tick' + (i <= val ? ' tick-on' : '');
  }
}

function initSliders(data) {
  ['autonomous', 'offense', 'defense', 'driving', 'teamwork'].forEach(k => {
    const val = data?.[k] ?? 5;
    // Force the fill and ticks to reflect saved values on edit
    const fill = document.getElementById('fill-' + k);
    if (fill) fill.style.width = ((val - 1) / 9 * 100) + '%';
    const pill = document.getElementById('slval-' + k);
    if (pill) {
      pill.style.background = val >= 8 ? 'var(--green,#4caf50)' : val >= 5 ? 'var(--primary)' : '#e05040';
    }
  });
}

// ─── Strategy Form ────────────────────────────────────────────────────────────
function strategyFormHtml(d) {
  return `
    <label class="form-label">Title</label>
    <input type="text" id="nf-title" class="form-input" placeholder="Strategy name" value="${escAttr(d?.title || '')}">
    <label class="form-label">Event</label>
    <input type="text" id="nf-event" class="form-input" placeholder="Event name" value="${escAttr(d?.event || '')}">
    <div id="stratSectionsWrap"></div>
    <button type="button" class="btn-add-section" onclick="addStratSection()">
      ${ICONS.plus} Add Section
    </button>
    ${photoSectionHtml()}`;
}

function renderStratSections() {
  const wrap = document.getElementById('stratSectionsWrap');
  if (!wrap) return;
  if (!stratSections.length) stratSections.push({ title: '', body: '' });
  wrap.innerHTML = stratSections.map((s, i) => `
    <div class="strat-section">
      <div class="strat-section-header">
        <input type="text" class="form-input strat-section-title"
               placeholder="Section title (e.g. Auton Plan)"
               value="${escAttr(s.title)}"
               oninput="stratSections[${i}].title = this.value">
        ${stratSections.length > 1
          ? `<button type="button" class="btn-remove-section" onclick="removeStratSection(${i})">${ICONS.x}</button>`
          : ''}
      </div>
      <textarea class="form-textarea strat-section-body" rows="4"
                placeholder="Write your strategy here..."
                oninput="stratSections[${i}].body = this.value">${escHtml(s.body)}</textarea>
    </div>`).join('');
}

function addStratSection()     { stratSections.push({ title: '', body: '' }); renderStratSections(); }
function removeStratSection(i) { stratSections.splice(i, 1); renderStratSections(); }

// ─── Photo Section ────────────────────────────────────────────────────────────
function photoSectionHtml() {
  return `<div class="photo-section">
    <label class="form-label">Photos</label>
    <div id="photoPreviews" class="photo-previews"></div>
    <button type="button" class="btn-add-photo" onclick="triggerPhotoInput()">
      ${ICONS.camera}&ensp;Add Photo
    </button>
    <input type="file" id="photoFileInput" accept="image/*" multiple
           style="display:none" onchange="onPhotosSelected(this)">
  </div>`;
}

function triggerPhotoInput() {
  document.getElementById('photoFileInput')?.click();
}

function onPhotosSelected(input) {
  const files = Array.from(input.files);
  let loaded = 0;
  if (!files.length) return;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      pendingPhotos.push({ dataUrl: e.target.result, file, url: null });
      loaded++;
      if (loaded === files.length) renderPhotoPreviews();
    };
    reader.onerror = () => { loaded++; if (loaded === files.length) renderPhotoPreviews(); };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function renderPhotoPreviews() {
  const wrap = document.getElementById('photoPreviews');
  if (!wrap) return;
  if (!pendingPhotos.length) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = pendingPhotos.map((p, i) => `
    <div class="photo-thumb-wrap">
      <img src="${escAttr(p.dataUrl || p.url || '')}" class="photo-thumb" loading="lazy">
      <button type="button" class="photo-thumb-remove" onclick="removePhoto(${i})">${ICONS.x}</button>
    </div>`).join('');
}

function removePhoto(i) {
  pendingPhotos.splice(i, 1);
  renderPhotoPreviews();
}

// ─── Save ─────────────────────────────────────────────────────────────────────
async function saveNote() {
  const btn = document.getElementById('noteFormSaveBtn');
  if (!btn || btn.disabled) return;   // prevent double-tap
  btn.disabled   = true;
  btn.textContent = 'Saving…';

  let success = false;
  try {
    let note = { type: currentTemplate };

    if (currentTemplate === 'match') {
      note.title       = document.getElementById('nf-title')?.value.trim()  || '';
      note.event       = document.getElementById('nf-event')?.value.trim()  || '';
      note.winner      = document.getElementById('nf-winner')?.value        || '';
      note.autonWinner = document.getElementById('nf-autonWinner')?.value   || '';
      note.redScore    = parseInt(document.getElementById('nf-redScore')?.value)  || 0;
      note.blueScore   = parseInt(document.getElementById('nf-blueScore')?.value) || 0;
      note.redTeams    = (document.getElementById('nf-redTeams')?.value  || '').split(',').map(s => s.trim()).filter(Boolean);
      note.blueTeams   = (document.getElementById('nf-blueTeams')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
      note.notes       = document.getElementById('nf-notes')?.value || '';
      note.team        = note.redTeams[0] || '';
    }

    if (currentTemplate === 'team') {
      note.team    = (document.getElementById('nf-team')?.value.trim()   || '').toUpperCase();
      note.event   =  document.getElementById('nf-event')?.value.trim()  || '';
      note.botType =  document.getElementById('nf-botType')?.value.trim() || '';
      note.notes   =  document.getElementById('nf-notes')?.value          || '';
      note.title   = note.team;
      ['autonomous', 'offense', 'defense', 'driving', 'teamwork'].forEach(k => {
        note[k] = parseInt(document.getElementById('sl-' + k)?.value) || 5;
      });
    }

    if (currentTemplate === 'strategy') {
      // Flush any last-keystroke values
      document.querySelectorAll('.strat-section-title').forEach((el, i) => { if (stratSections[i]) stratSections[i].title = el.value; });
      document.querySelectorAll('.strat-section-body').forEach((el, i)  => { if (stratSections[i]) stratSections[i].body  = el.value; });
      note.title    = document.getElementById('nf-title')?.value.trim() || 'Strategy';
      note.event    = document.getElementById('nf-event')?.value.trim() || '';
      note.sections = stratSections.map(s => ({ ...s }));
      note.team     = '';
    }

    note.date = new Date().toLocaleDateString();

    // ── Photos: always store at least the base64 dataUrl (works offline/guest)
    note.photos = [];
    for (const p of pendingPhotos) {
      if (p.url && !p.url.startsWith('data:')) {
        // Already a remote URL — keep it
        note.photos.push(p.url);
      } else if (p.file) {
        // New file: try Supabase upload, fall back to base64 — never drop the photo
        let saved = p.dataUrl;           // guaranteed fallback
        try {
          const remote = await uploadNotePhoto(p.file);
          if (remote) { saved = remote; p.url = remote; }
        } catch { /* swallow — use dataUrl */ }
        note.photos.push(saved);
      } else if (p.dataUrl) {
        // Previously saved as base64 — keep
        note.photos.push(p.dataUrl);
      }
    }

    // ── Persist locally first — this must succeed before we try cloud
    const id = editingNoteId || Date.now().toString();
    note.id  = id;
    const existing = notes.findIndex(x => x.id === id);
    if (existing > -1) notes[existing] = note;
    else notes.unshift(note);
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));

    success = true;

    // ── Cloud save is best-effort — failure should NOT affect local save
    try { await cloudSaveNote(note); } catch (e) { console.warn('Cloud sync failed (non-fatal):', e); }

  } catch (err) {
    console.error('saveNote error:', err);
    alert('Could not save note: ' + (err?.message || err));
  } finally {
    btn.disabled    = false;
    btn.textContent = 'SAVE';
  }

  if (success) {
    switchPage('notes');
    renderNotesList();
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  notes = notes.filter(x => x.id !== id);
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
  try { await cloudDeleteNote(id); } catch {}
  switchPage('notes');
  renderNotesList();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                           .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escAttr(str) {
  return String(str ?? '').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
