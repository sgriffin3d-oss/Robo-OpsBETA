// calc.js — Override 2026-2027 score calculator
//
// Scoring model (from the game manual):
//   Rings on stakes:   1 pt each
//   Stake ownership:   2 pt bonus to the alliance with the most rings on a given stake
//   Zone control:      5 pt bonus per corner zone held at end of match
//   Autonomous bonus:  6 pt (win) / 3 pt each (tie)
//
// The counter values the user enters are:
//   rings  — total rings your alliance scored across all stakes
//   stakes — number of stakes your alliance owns (majority rings)
//   zones  — number of corner zones your alliance controls

const Calc = (() => {
  const state = {
    red:   { rings: 0, stakes: 0, zones: 0 },
    blue:  { rings: 0, stakes: 0, zones: 0 },
    auton: null,   // 'red' | 'blue' | 'tie' | null
  };

  function score(alliance) {
    const s = state[alliance];
    let total = 0;
    total += s.rings  * POINTS.ringOnStake;
    total += s.stakes * POINTS.stakeOwnership;
    total += s.zones  * POINTS.zoneControl;
    if (state.auton === alliance)    total += POINTS.autonWin;
    if (state.auton === 'tie')       total += POINTS.autonTie;
    return total;
  }

  function clamp(val) { return Math.max(0, val); }

  function updateDisplay() {
    const r = score('red');
    const b = score('blue');

    // Individual counter values
    for (const [alliance, short] of [['red', 'r'], ['blue', 'b']]) {
      document.getElementById(`${short}-rings`)?.innerText  !== undefined &&
        (document.getElementById(`${short}-rings`).innerText  = state[alliance].rings);
      document.getElementById(`${short}-stakes`)?.innerText !== undefined &&
        (document.getElementById(`${short}-stakes`).innerText = state[alliance].stakes);
      document.getElementById(`${short}-zones`)?.innerText  !== undefined &&
        (document.getElementById(`${short}-zones`).innerText  = state[alliance].zones);
    }

    // Totals
    const rEl = document.getElementById('tot-red');
    const bEl = document.getElementById('tot-blue');
    if (rEl) rEl.innerText = r;
    if (bEl) bEl.innerText = b;

    // Highlight the winning alliance subtotal
    document.getElementById('tot-red')?.closest('.alliance-subtotal')
      ?.classList.toggle('alliance-subtotal--winning', r > b);
    document.getElementById('tot-blue')?.closest('.alliance-subtotal')
      ?.classList.toggle('alliance-subtotal--winning', b > r);

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
      state[alliance][field] = clamp(state[alliance][field] + delta);
      updateDisplay();
    },

    setAuton(winner) {
      // Tap same button again to deselect
      state.auton = state.auton === winner ? null : winner;
      updateDisplay();
    },

    reset() {
      state.red   = { rings: 0, stakes: 0, zones: 0 };
      state.blue  = { rings: 0, stakes: 0, zones: 0 };
      state.auton = null;
      updateDisplay();
    },
  };
})();
