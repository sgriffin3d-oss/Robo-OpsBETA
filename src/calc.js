// calc.js
// Score calculator for red and blue alliances.
// All calculator state and logic lives inside the Calc object so nothing
// here can accidentally collide with variables in other files.
// Point values come from POINTS in constants.js.

const Calc = {

  // Current counts for each alliance. Reset by Calc.reset().
  state: {
    red:   { rings: 0, stakes: 0, zones: 0 },
    blue:  { rings: 0, stakes: 0, zones: 0 },
    auton: null, // 'red' | 'blue' | 'tie' | null
  },

  // Increment or decrement a field for one alliance.
  // delta is +1 or -1. Score floor is 0 (can't go negative).
  adjust(alliance, field, delta) {
    this.state[alliance][field] = Math.max(0, this.state[alliance][field] + delta);
    document.getElementById(alliance[0] + '-' + field).innerText = this.state[alliance][field];
    this.updateDisplay();
  },

  // Mark which alliance won autonomous (or 'tie', or 'none' to clear).
  setAuton(winner) {
    this.state.auton = winner;
    document.querySelectorAll('.auton-btn').forEach(btn => btn.className = 'auton-btn');
    if (winner !== 'none') {
      document.getElementById('at-' + winner)?.classList.add('active-' + winner);
    }
    this.updateDisplay();
  },

  // Push the current scores to the DOM.
  updateDisplay() {
    document.getElementById('tot-red').innerText  = this.score('red');
    document.getElementById('tot-blue').innerText = this.score('blue');
  },

  // Calculate total score for one alliance based on current state.
  score(alliance) {
    const s = this.state[alliance];
    let total = (s.rings * POINTS.rings) + (s.stakes * POINTS.stakes) + (s.zones * POINTS.zones);
    if (this.state.auton === alliance) total += POINTS.autonWin;
    if (this.state.auton === 'tie')    total += POINTS.autonTie;
    return total;
  },

  // Reset everything back to zero.
  reset() {
    this.state = {
      red:   { rings: 0, stakes: 0, zones: 0 },
      blue:  { rings: 0, stakes: 0, zones: 0 },
      auton: null,
    };
    document.querySelectorAll('.val-display').forEach(el => el.innerText = '0');
    this.setAuton('none');
    this.updateDisplay();
  },

};
