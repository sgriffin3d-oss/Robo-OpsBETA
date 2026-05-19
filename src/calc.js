// calc.js — Override 2026-2027 score calculator
const MIDFIELD_MAX    = 2;
const CALC_STORE_KEY  = 'paragon_saved_calcs';

let editingCalcId = null;   // non-null when editing a saved entry

const Calc = (() => {
  const state = {
    red:   { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 },
    blue:  { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 },
    auton: null,   // 'red' | 'blue' | 'tie' | null
  };

  // ── Scoring ────────────────────────────────────────────
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

    const rEl = document.getElementById('tot-red');
    const bEl = document.getElementById('tot-blue');
    if (rEl) rEl.innerText = r;
    if (bEl) bEl.innerText = b;

    const rCell = document.getElementById('total-cell-red');
    const bCell = document.getElementById('total-cell-blue');
    if (rCell) {
      rCell.classList.toggle('calc-total-cell--winning', r > b);
      rCell.classList.toggle('calc-total-cell--losing',  r < b);
    }
    if (bCell) {
      bCell.classList.toggle('calc-total-cell--winning', b > r);
      bCell.classList.toggle('calc-total-cell--losing',  b < r);
    }

    ['red','tie','blue'].forEach(v => {
      const btn = document.getElementById('at-' + v);
      if (!btn) return;
      btn.classList.remove('active-red','active-blue','active-tie');
      if (state.auton === v) btn.classList.add('active-' + v);
    });

    // Subtitle shows "Editing: Name" when in edit mode
    const sub = document.getElementById('calc-subtitle');
    if (sub) {
      if (editingCalcId) {
        const item = loadSaved().find(c => c.id === editingCalcId);
        sub.textContent = item ? `Editing: ${item.name}` : 'Override Match Scoring';
      } else {
        sub.textContent = 'Override Match Scoring';
      }
    }
  }

  // ── Storage ────────────────────────────────────────────
  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(CALC_STORE_KEY)) || []; }
    catch { return []; }
  }

  function persistSaved(list) {
    localStorage.setItem(CALC_STORE_KEY, JSON.stringify(list));
  }

  // ── Saved list render — mirrors displayDrawing() ───────
  function renderSaved() {
    const list = document.getElementById('calc-saved-list');
    if (!list) return;

    const saved = loadSaved();
    if (saved.length === 0) {
      list.innerHTML = `<div class="sketch-item" style="justify-content:center;opacity:0.5;font-size:0.72rem;color:var(--sub-text);">No saved calculators yet</div>`;
      return;
    }

    list.innerHTML = saved.map(item => {
      const r = item.redScore, b = item.blueScore;
      const winText = r > b ? `<span style="color:var(--red)">Red wins</span>`
                    : b > r ? `<span style="color:var(--blue)">Blue wins</span>`
                    : `<span style="color:var(--primary)">Tie</span>`;
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
          <button class="btn-delete" onclick="event.stopPropagation(); Calc.deleteItem('${item.id}')">Del</button>
        </div>`;
    }).join('');
  }

  // ── Public API ─────────────────────────────────────────
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

    reset() {
      state.red   = { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 };
      state.blue  = { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 };
      state.auton = null;
      editingCalcId = null;
      updateDisplay();
    },

    openSaveModal() {
      const name = prompt(editingCalcId ? 'Update name:' : 'Save as:', '');
      if (name === null) return;   // cancelled
      const trimmed = name.trim() || (editingCalcId ? '' : 'Untitled');
      if (!trimmed && !editingCalcId) return;

      const list = loadSaved();

      if (editingCalcId) {
        const idx = list.findIndex(c => c.id === editingCalcId);
        if (idx > -1) {
          list[idx] = {
            ...list[idx],
            name:      trimmed || list[idx].name,
            redScore:  score('red'),
            blueScore: score('blue'),
            auton:     state.auton,
            red:       { ...state.red },
            blue:      { ...state.blue },
          };
        }
      } else {
        list.unshift({
          id:        Date.now().toString(),
          name:      trimmed,
          redScore:  score('red'),
          blueScore: score('blue'),
          auton:     state.auton,
          red:       { ...state.red },
          blue:      { ...state.blue },
          date:      new Date().toLocaleDateString(),
        });
        editingCalcId = list[0].id;
      }

      persistSaved(list);
      updateDisplay();
      renderSaved();
    },

    loadItem(id) {
      const item = loadSaved().find(c => c.id === id);
      if (!item) return;
      Object.assign(state.red,  item.red);
      Object.assign(state.blue, item.blue);
      state.auton   = item.auton;
      editingCalcId = item.id;
      updateDisplay();
      setCalcMode('new');
    },

    deleteItem(id) {
      if (!confirm('Delete this calculator?')) return;
      const list = loadSaved().filter(c => c.id !== id);
      persistSaved(list);
      if (editingCalcId === id) {
        editingCalcId = null;
        this.reset();
      }
      renderSaved();
    },

    init() {
      updateDisplay();
      renderSaved();
    },
  };
})();

// ── Tab switching — mirrors setFieldMode() ─────────────────
function setCalcMode(mode) {
  document.getElementById('calc-new-view').style.display   = mode === 'new'   ? '' : 'none';
  document.getElementById('calc-saved-view').style.display = mode === 'saved' ? '' : 'none';

  document.getElementById('calc-tab-new').classList.toggle('active',   mode === 'new');
  document.getElementById('calc-tab-saved').classList.toggle('active', mode === 'saved');

  if (mode === 'saved') Calc.init();   // refresh list on switch
}

document.addEventListener('DOMContentLoaded', () => Calc.init());
