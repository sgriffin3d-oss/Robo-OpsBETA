const MIDFIELD_MAX   = 2;
const CALC_STORE_KEY = 'paragon_saved_calcs';

let editingCalcId = null;

const Calc = (() => {
  const state = {
    red:   { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 },
    blue:  { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 },
    auton: null,
  };

  function score(alliance) {
    const s = state[alliance];
    let t = 0;
    t += s.alliancePin   * POINTS.alliancePin;
    t += s.yellowPin     * POINTS.yellowPin;
    t += s.midfieldRobot * POINTS.midfieldRobot;
    if (state.auton === alliance) t += POINTS.autonBonus;
    if (state.auton === 'tie')    t += POINTS.autonTie;
    return t;
  }

  function clamp(val, max) {
    return Math.min(Math.max(0, val), max !== undefined ? max : Infinity);
  }

  function updateDisplay() {
    const r = score('red'), b = score('blue');

    for (const [alliance, short] of [['red','r'],['blue','b']]) {
      for (const field of ['alliancePin','yellowPin','midfieldRobot']) {
        const el = document.getElementById(`${short}-${field}`);
        if (el) el.innerText = state[alliance][field];
      }
    }

    document.getElementById('tot-red') .innerText = r;
    document.getElementById('tot-blue').innerText = b;

    const rCell = document.getElementById('total-cell-red');
    const bCell = document.getElementById('total-cell-blue');
    rCell?.classList.toggle('calc-total-cell--winning', r > b);
    rCell?.classList.toggle('calc-total-cell--losing',  r < b);
    bCell?.classList.toggle('calc-total-cell--winning', b > r);
    bCell?.classList.toggle('calc-total-cell--losing',  b < r);

    ['red','tie','blue'].forEach(v => {
      const btn = document.getElementById('at-' + v);
      if (!btn) return;
      btn.classList.remove('active-red','active-blue','active-tie');
      if (state.auton === v) btn.classList.add('active-' + v);
    });

    const sub   = document.getElementById('calc-subtitle');
    const input = document.getElementById('calc-save-name');
    if (editingCalcId) {
      const item = loadSaved().find(c => c.id === editingCalcId);
      if (sub)   sub.textContent   = item ? `Editing: ${item.name}` : 'Override Match Scoring';
      if (input && item && !input.value) input.value = item.name;
    } else {
      if (sub) sub.textContent = 'Override Match Scoring';
    }
  }

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(CALC_STORE_KEY)) || []; }
    catch { return []; }
  }

  function persistSaved(list) {
    localStorage.setItem(CALC_STORE_KEY, JSON.stringify(list));
  }

  // Cloud-aware helpers — fall back gracefully if auth not ready
  function cloudSave(entry) {
    if (typeof cloudSaveCalc === 'function') cloudSaveCalc(entry);
  }
  function cloudDelete(id) {
    if (typeof cloudDeleteCalc === 'function') cloudDeleteCalc(id);
  }

  function renderSaved() {
    const list  = document.getElementById('calc-saved-list');
    if (!list) return;
    const saved = loadSaved();

    if (!saved.length) {
      list.innerHTML = `<div class="saved-empty"><p>No saved calculators yet.</p><small>Calculate a match and tap Save.</small></div>`;
      return;
    }

    list.innerHTML = saved.map(item => {
      const r = item.redScore, b = item.blueScore;
      const winLabel = r > b ? `<span style="color:var(--red)">Red wins</span>`
                     : b > r ? `<span style="color:var(--blue)">Blue wins</span>`
                     :         `<span style="color:var(--primary)">Tie</span>`;
      return `
        <div class="saved-card" onclick="Calc.loadItem('${item.id}')">
          <div class="calc-saved-scorebug">
            <span class="calc-saved-scorebug-num" style="color:var(--red)">${r}</span>
            <span class="calc-saved-scorebug-vs">–</span>
            <span class="calc-saved-scorebug-num" style="color:var(--blue)">${b}</span>
          </div>
          <div class="saved-card-info">
            <span class="saved-card-name">${item.name}</span>
            <span class="saved-card-meta">${item.date} · ${winLabel}</span>
          </div>
          <button class="saved-card-del" onclick="event.stopPropagation();Calc.deleteItem('${item.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>`;
    }).join('');
  }

  return {
    adjust(alliance, field, delta) {
      const max = field === 'midfieldRobot' ? MIDFIELD_MAX : Infinity;
      state[alliance][field] = clamp(state[alliance][field] + delta, max);
      updateDisplay();
    },

    setAuton(winner) {
      state.auton = state.auton === winner ? null : winner;
      updateDisplay();
    },

    saveCalc() {
      const input = document.getElementById('calc-save-name');
      const name  = input?.value.trim() || 'Untitled';
      const list  = loadSaved();

      let savedEntry;
      if (editingCalcId) {
        const idx = list.findIndex(c => c.id === editingCalcId);
        if (idx > -1) {
          Object.assign(list[idx], {
            name, redScore: score('red'), blueScore: score('blue'),
            auton: state.auton, red: { ...state.red }, blue: { ...state.blue },
          });
          savedEntry = list[idx];
        }
      } else {
        const entry = {
          id: Date.now().toString(), name,
          redScore: score('red'), blueScore: score('blue'),
          auton: state.auton,
          red:  { ...state.red },
          blue: { ...state.blue },
          date: new Date().toLocaleDateString(),
        };
        list.unshift(entry);
        editingCalcId = entry.id;
        savedEntry = entry;
      }

      persistSaved(list);
      if (savedEntry) cloudSave(savedEntry);
      updateDisplay();
      renderSaved();
      setCalcMode('saved');
    },

    reset() {
      state.red   = { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 };
      state.blue  = { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 };
      state.auton = null;
      editingCalcId = null;
      const input = document.getElementById('calc-save-name');
      if (input) input.value = '';
      updateDisplay();
    },

    loadItem(id) {
      const item = loadSaved().find(c => c.id === id);
      if (!item) return;
      Object.assign(state.red,  item.red);
      Object.assign(state.blue, item.blue);
      state.auton   = item.auton;
      editingCalcId = item.id;
      const input = document.getElementById('calc-save-name');
      if (input) input.value = item.name;
      updateDisplay();
      setCalcMode('new');
    },

    deleteItem(id) {
      if (!confirm('Delete this calculator?')) return;
      persistSaved(loadSaved().filter(c => c.id !== id));
      cloudDelete(id);
      if (editingCalcId === id) this.reset();
      renderSaved();
    },

    init() {
      updateDisplay();
      renderSaved();
    },
  };
})();

function setCalcMode(mode) {
  document.getElementById('calc-new-view').style.display   = mode === 'new'   ? '' : 'none';
  document.getElementById('calc-saved-view').style.display = mode === 'saved' ? '' : 'none';
  document.getElementById('calc-tab-new').classList.toggle('active',   mode === 'new');
  document.getElementById('calc-tab-saved').classList.toggle('active', mode === 'saved');
  if (mode === 'saved') Calc.init();
}

document.addEventListener('DOMContentLoaded', () => Calc.init());
