// calc.js — High Stakes 2026-2027 score calculator
//
// Scoring:
//   Alliance Pins   — 5 pts each
//   Yellow Pins     — 10 pts each
//   Midfield Robots — 8 pts each (max 2 per alliance)
//   Auton Bonus     — 12 pts win / 6 pts tie

const MIDFIELD_MAX = 2;

const Calc = (() => {
  const state = {
    red:   { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 },
    blue:  { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 },
    auton: null,   // 'red' | 'blue' | 'tie' | null
  };

  function score(alliance) {
    const s = state[alliance];
    let total = 0;
    total += s.alliancePin   * POINTS.alliancePin;
    total += s.yellowPin     * POINTS.yellowPin;
    total += s.midfieldRobot * POINTS.midfieldRobot;
    if (state.auton === alliance) total += POINTS.autonBonus;
    if (state.auton === 'tie')    total += POINTS.autonTie;
    return total;
  }

  function clamp(val, max) {
    return Math.min(Math.max(0, val), max !== undefined ? max : Infinity);
  }

  function updateDisplay() {
    const r = score('red');
    const b = score('blue');

    // Counter values
    for (const [alliance, short] of [['red', 'r'], ['blue', 'b']]) {
      for (const field of ['alliancePin', 'yellowPin', 'midfieldRobot']) {
        const el = document.getElementById(`${short}-${field}`);
        if (el) el.innerText = state[alliance][field];
      }
    }

    // Totals
    const rEl = document.getElementById('tot-red');
    const bEl = document.getElementById('tot-blue');
    if (rEl) rEl.innerText = r;
    if (bEl) bEl.innerText = b;

    // Winning highlight on total cells
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

    // Auton button states
    ['red', 'tie', 'blue'].forEach(v => {
      const btn = document.getElementById('at-' + v);
      if (!btn) return;
      btn.classList.remove('active-red', 'active-blue', 'active-tie');
      if (state.auton === v) btn.classList.add('active-' + v);
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
  };
})();
