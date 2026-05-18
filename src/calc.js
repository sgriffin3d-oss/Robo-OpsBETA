// calc.js — High Stakes 2026-2027 score calculator
//
// Scoring model:
//   Alliance Pins   — 5 pts each  (alliance-colored pins placed)
//   Yellow Pins     — 10 pts each (yellow/neutral pins owned)
//   Midfield Robots — 8 pts each  (robots in midfield zone at end)
//   Autonomous Bonus — 12 pts (winner only; no tie split)

const Calc = (() => {
  const state = {
    red:   { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 },
    blue:  { alliancePin: 0, yellowPin: 0, midfieldRobot: 0 },
    auton: null,   // 'red' | 'blue' | null
  };

  function score(alliance) {
    const s = state[alliance];
    let total = 0;
    total += s.alliancePin   * POINTS.alliancePin;
    total += s.yellowPin     * POINTS.yellowPin;
    total += s.midfieldRobot * POINTS.midfieldRobot;
    if (state.auton === alliance) total += POINTS.autonBonus;
    return total;
  }

  function clamp(val) { return Math.max(0, val); }

  function updateDisplay() {
    const r = score('red');
    const b = score('blue');

    const fields = ['alliancePin', 'yellowPin', 'midfieldRobot'];
    for (const [alliance, short] of [['red', 'r'], ['blue', 'b']]) {
      for (const field of fields) {
        const el = document.getElementById(`${short}-${field}`);
        if (el) el.innerText = state[alliance][field];
      }
    }

    const rEl = document.getElementById('tot-red');
    const bEl = document.getElementById('tot-blue');
    if (rEl) rEl.innerText = r;
    if (bEl) bEl.innerText = b;

    document.getElementById('tot-red')?.closest('.calc-total')
      ?.classList.toggle('calc-total--winning', r > b);
    document.getElementById('tot-blue')?.closest('.calc-total')
      ?.classList.toggle('calc-total--winning', b > r);

    ['red', 'blue'].forEach(v => {
      const btn = document.getElementById('at-' + v);
      if (!btn) return;
      btn.classList.remove('active-red', 'active-blue');
      if (state.auton === v) btn.classList.add('active-' + v);
    });
  }

  return {
    adjust(alliance, field, delta) {
      state[alliance][field] = clamp(state[alliance][field] + delta);
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
