// ─── Score Calculator ────────────────────────────────────────────────────────
// Tracks ring/stake/zone counts for red and blue alliances and calculates
// live scores. Point values: rings = 2pts, stakes = 3pts, zones = 5pts.
// Autonomous winner gets 6pts, tie gives both alliances 3pts.

const POINTS = { rings: 2, stakes: 3, zones: 5, autonWin: 6, autonTie: 3 };

let calcState = {
  red:   { rings: 0, stakes: 0, zones: 0 },
  blue:  { rings: 0, stakes: 0, zones: 0 },
  auton: null, // 'red' | 'blue' | 'tie' | null
};

function adjustScore(alliance, field, delta) {
  calcState[alliance][field] = Math.max(0, calcState[alliance][field] + delta);
  document.getElementById(alliance[0] + '-' + field).innerText = calcState[alliance][field];
  updateCalcDisplay();
}

function setAutonWinner(winner) {
  calcState.auton = winner;
  document.querySelectorAll('.auton-btn').forEach(btn => btn.className = 'auton-btn');
  if (winner !== 'none') {
    document.getElementById('at-' + winner)?.classList.add('active-' + winner);
  }
  updateCalcDisplay();
}

function updateCalcDisplay() {
  document.getElementById('tot-red').innerText  = calcAllianceScore('red');
  document.getElementById('tot-blue').innerText = calcAllianceScore('blue');
}

function calcAllianceScore(alliance) {
  const s = calcState[alliance];
  let score = (s.rings * POINTS.rings) + (s.stakes * POINTS.stakes) + (s.zones * POINTS.zones);
  if (calcState.auton === alliance) score += POINTS.autonWin;
  if (calcState.auton === 'tie')    score += POINTS.autonTie;
  return score;
}

function resetCalc() {
  calcState = {
    red:   { rings: 0, stakes: 0, zones: 0 },
    blue:  { rings: 0, stakes: 0, zones: 0 },
    auton: null,
  };
  document.querySelectorAll('.val-display').forEach(el => el.innerText = '0');
  setAutonWinner('none');
  updateCalcDisplay();
}
