// calc.js — High Stakes 2026-2027 score calculator
//
// Scoring model:
//   Alliance Pins   — 5 pts each  (alliance-colored pins placed)
//   Yellow Pins     — 10 pts each (yellow/neutral pins owned)
//   Midfield Robots — 8 pts each  (max 2 per alliance)
//   Autonomous Bonus — 12 pts win / 6 pts tie

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

  function clamp(val, max = Infinity) {
    return Math.min(Math.max(0, val), max);
  }

  function updateDisplay() {
    const r = score('red');
    const b = score('blue');

    const maxes = { alliancePin: Infinity, yellowPin: Infinity, midfieldRobot: MIDFIELD_MAX };
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

    // Winning highlight on banner sides
    document.getElementById('tot-red')?.closest('.calc-banner-side')
      ?.classList.toggle('calc-banner-side--winning', r > b);
    document.getElementById('tot-blue')?.closest('.calc-banner-side')
      ?.classList.toggle('calc-banner-side--winning', b > r);

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
