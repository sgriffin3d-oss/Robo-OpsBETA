// calc.js — Override 2026-2027 score calculator
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

    // Subtitle + pre-fill name input when editing
    const sub   = document.getElementById('calc-subtitle');
    const input = document.getElementById('calc-save-name');
    if (editingCalcId) {
      const item = loadSaved().find(c => c.id === editingCalcId);
      if (sub)   sub.textContent   = item ? `Editing: ${item.name}` : 'Override Match Scoring';
      if (input && item && !input.value) input.value = item.name;
    } else {
      if (sub)   sub.textContent = 'Override Match Scoring';
    }
  }

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(CALC_STORE_KEY)) || []; }
    catch { return []; }
  }

  function persistSaved(list) {
    localStorage.setItem(CALC_STORE_KEY, JSON.stringify(list));
  }

  function renderSaved() {
    const list  = document.getElementById('calc-saved-list');
    if (!list) return;
    const saved = loadSaved();

    if (saved.length === 0) {
      list.innerHTML = `<div class="sketch-item" style="justify-content:center;opacity:0.5;font-size:0.75rem;color:var(--sub-text);padding:24px;">No saved calculators yet</div>`;
      return;
    }

    list.innerHTML = saved.map(item => {
      const r = item.redScore, b = item.blueScore;
      const winText = r > b ? `<span style="color:var(--red)">Red wins</span>`
                    : b > r ? `<span style="color:var(--blue)">Blue wins</span>`
                    :         `<span style="color:var(--primary)">Tie</span>`;
      return `
        <div class="sketch-item" onclick="Calc.loadItem('${item.id}')">
          <div class="calc-saved-scorebug">
            <span class="calc-saved-scorebug-num" style="color:var(--red)">${r}</span>
            <span class="calc-saved-scorebug-vs">–</span>
            <span class="calc-saved-scorebug-num" style="color:var(--blue)">${b}</span>
          </div>
          <div class="sketch-info">
            <strong class="sketch-name-label">${item.name}</strong>
            <small class="sketch-meta">${item.date} · ${winText}</small>
          </div>
          <button class="btn-delete" onclick="event.stopPropagation();Calc.deleteItem('${item.id}')">Del</button>
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

      if (editingCalcId) {
        const idx = list.findIndex(c => c.id === editingCalcId);
        if (idx > -1) Object.assign(list[idx], {
          name, redScore: score('red'), blueScore: score('blue'),
          auton: state.auton, red: { ...state.red }, blue: { ...state.blue },
        });
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
      }

      persistSaved(list);
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
