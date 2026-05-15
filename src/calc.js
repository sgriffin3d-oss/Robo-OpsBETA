// Score calculator for Override 2026-2027.
// All state and logic live inside Calc so nothing collides with other files.
// Point values come from POINTS in constants.js.

const Calc = {

  state: {
    red:   { pins: 0, ownedPins: 0, midfield: 0 },
    blue:  { pins: 0, ownedPins: 0, midfield: 0 },
    auton: null, // 'red' | 'blue' | 'tie' | null
  },

  // Increment or decrement a counter for one alliance. Floor is 0.
  adjust(alliance, field, delta) {
    this.state[alliance][field] = Math.max(0, this.state[alliance][field] + delta);
    document.getElementById(alliance[0] + '-' + field).innerText = this.state[alliance][field];
    this.updateDisplay();
  },

  // Record which alliance won autonomous (or 'none' to clear).
  setAuton(winner) {
    this.state.auton = winner === 'none' ? null : winner;
    document.querySelectorAll('.auton-btn').forEach(btn => btn.className = 'auton-btn');
    if (winner !== 'none') {
      document.getElementById('at-' + winner)?.classList.add('active-' + winner);
    }
    this.updateDisplay();
  },

  score(alliance) {
    const s = this.state[alliance];
    let total = (s.pins * POINTS.pins)
              + (s.ownedPins * POINTS.ownedPin)
              + (s.midfield  * POINTS.midfield);
    if (this.state.auton === alliance) total += POINTS.autonWin;
    if (this.state.auton === 'tie')    total += POINTS.autonTie;
    return total;
  },

  updateDisplay() {
    document.getElementById('tot-red').innerText  = this.score('red');
    document.getElementById('tot-blue').innerText = this.score('blue');
  },

  reset() {
    this.state = {
      red:   { pins: 0, ownedPins: 0, midfield: 0 },
      blue:  { pins: 0, ownedPins: 0, midfield: 0 },
      auton: null,
    };
    document.querySelectorAll('.val-display').forEach(el => el.innerText = '0');
    this.setAuton('none');
    this.updateDisplay();
  },

};
