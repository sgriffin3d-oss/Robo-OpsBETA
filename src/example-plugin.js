/**
 * Example Plugin: Match Stats
 * ----------------------------
 * This is a demo to show how the plugin system works.
 * Delete this file and remove the two lines from index.html to remove it.
 */

ParagonFeature({
  id: 'match-stats',
  label: 'Match Stats',
  order: 10,

  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>`,

  render(container) {
    container.innerHTML = `
      <div class="welcome-header">
        <h1>Match Stats</h1>
        <p>Quick overview of your scouting data</p>
      </div>
      <div id="plugin-stats-content" style="padding: 0 16px 80px;"></div>
      <div style="padding: 0 16px;">
        <button onclick="nav('hub')"
          style="width:100%; padding:14px; background:var(--card-bg); border:1px solid var(--border);
                 border-radius:var(--radius); color:var(--text); font-size:0.9rem; cursor:pointer;">
          ← Back to Hub
        </button>
      </div>`;
  },

  onOpen(container) {
    // Runs every time the view is opened — data is always fresh
    const db = JSON.parse(localStorage.getItem('paragon_db')) || [];
    const el = document.getElementById('plugin-stats-content');
    if (!el) return;

    if (db.length === 0) {
      el.innerHTML = `<p style="color:var(--sub-text); text-align:center; padding:40px 0;">
        No match reports yet. Add some from the hub!
      </p>`;
      return;
    }

    const wins   = db.filter(d => d.res === 'W').length;
    const losses = db.filter(d => d.res === 'L').length;
    const ties   = db.filter(d => d.res === 'T').length;
    const avgScore = db.length
      ? Math.round(db.reduce((s, d) => s + Number(d.score || 0), 0) / db.length)
      : 0;

    el.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
        ${stat('Wins',   wins,     '#2a8')}
        ${stat('Losses', losses,   '#c33')}
        ${stat('Ties',   ties,     '#888')}
        ${stat('Avg Score', avgScore, 'var(--primary)')}
      </div>`;

    function stat(label, value, color) {
      return `<div style="background:var(--card-bg); border:1px solid var(--border);
                          border-radius:var(--radius); padding:16px; text-align:center;">
        <div style="font-size:1.8rem; font-weight:700; color:${color};">${value}</div>
        <div style="font-size:0.75rem; color:var(--sub-text); margin-top:4px;">${label}</div>
      </div>`;
    }
  }
});
