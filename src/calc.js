// calc.js — Override 2026-2027 score calculator
const MIDFIELD_MAX = 2;
const CALC_STORAGE_KEY = 'paragon_saved_calcs';

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
  }

  // ── Saved calcs ──────────────────────────────────────

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(CALC_STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function persistSaved(list) {
    localStorage.setItem(CALC_STORAGE_KEY, JSON.stringify(list));
  }

  function renderSaved() {
    const list  = loadSaved();
    const el    = document.getElementById('calc-saved-list');
    const empty = document.getElementById('calc-saved-empty');
    if (!el) return;

    // Remove old items (keep the empty placeholder node)
    el.querySelectorAll('.calc-saved-item').forEach(n => n.remove());

    if (list.length === 0) {
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';

    list.forEach((item, idx) => {
      const winner = item.redScore > item.blueScore ? 'red'
                   : item.blueScore > item.redScore ? 'blue' : 'tie';
      const winLabel = winner === 'tie' ? 'Tie'
                     : `<span class="calc-saved-score-${winner}">${winner.charAt(0).toUpperCase()+winner.slice(1)} wins</span>`;

      const node = document.createElement('div');
      node.className = 'calc-saved-item';
      node.innerHTML = `
        <div class="calc-saved-item-info">
          <span class="calc-saved-item-name">${item.name}</span>
          <span class="calc-saved-item-meta">
            <span class="calc-saved-score-red">${item.redScore}</span>
            &nbsp;–&nbsp;
            <span class="calc-saved-score-blue">${item.blueScore}</span>
            &nbsp;·&nbsp;${winLabel}
          </span>
        </div>
        <div class="calc-saved-item-actions">
          <button class="calc-saved-btn" title="Load" onclick="Calc.loadItem(${idx})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
          </button>
          <button class="calc-saved-btn calc-saved-btn--delete" title="Delete" onclick="Calc.deleteItem(${idx})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>`;
      el.appendChild(node);
    });
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

    reset() {
      state.red   = { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 };
      state.blue  = { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 };
      state.auton = null;
      updateDisplay();
    },

    openSaveModal() {
      const modal = document.getElementById('calc-save-modal');
      const input = document.getElementById('calc-save-name');
      if (!modal || !input) return;
      input.value = '';
      modal.classList.remove('hidden');
      setTimeout(() => input.focus(), 80);
    },

    closeSaveModal() {
      document.getElementById('calc-save-modal')?.classList.add('hidden');
    },

    confirmSave() {
      const input = document.getElementById('calc-save-name');
      const name  = input?.value.trim();
      if (!name) { input?.focus(); return; }

      const list = loadSaved();
      list.unshift({
        name,
        redScore:  score('red'),
        blueScore: score('blue'),
        auton:     state.auton,
        red:       { ...state.red },
        blue:      { ...state.blue },
        savedAt:   Date.now(),
      });
      persistSaved(list);
      this.closeSaveModal();
      renderSaved();
    },

    loadItem(idx) {
      const item = loadSaved()[idx];
      if (!item) return;
      Object.assign(state.red,  item.red);
      Object.assign(state.blue, item.blue);
      state.auton = item.auton;
      updateDisplay();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    deleteItem(idx) {
      const list = loadSaved();
      list.splice(idx, 1);
      persistSaved(list);
      renderSaved();
    },

    init() {
      updateDisplay();
      renderSaved();
    },
  };
})();

document.addEventListener('DOMContentLoaded', () => Calc.init());
