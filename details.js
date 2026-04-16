/**
 * details.js - Paragon Core X
 */

window.loadEventDetails = async function(sku) {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = `<div style="text-align:center; padding:40px;"><div class="loading-spinner"></div><p>Syncing Live Data...</p></div>`;

    try {
        const [matchRes, skillsRes] = await Promise.all([
            fetch(`/api/robotevents?sku=${sku}&type=matches`),
            fetch(`/api/robotevents?sku=${sku}&type=skills`)
        ]);

        const matches = await matchRes.json();
        const skills = await skillsRes.json();

        // RobotEvents returns data inside a .data property
        renderDetailsView(sku, matches.data || [], skills.data || []);
    } catch (err) {
        list.innerHTML = `<p style="color:var(--red); text-align:center; padding:20px;">Load Failed: ${err.message}</p>`;
    }
};

function renderDetailsView(sku, matches, skills) {
    const list = document.getElementById('event-list');
    
    // Sort matches by number (Qual 1, Qual 2, etc.)
    const sortedMatches = matches.sort((a, b) => a.id - b.id);

    let html = `
        <div style="padding:10px;">
            <button onclick="loadEvents()" class="save-btn" style="width:auto; padding:8px 15px; margin-bottom:15px; background:var(--border); color:var(--text); border:none; border-radius:8px;">← BACK</button>
            <h3 style="color:var(--primary); margin-bottom:20px;">${sku}</h3>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                <button id="btn-tab-matches" class="save-btn" onclick="window.toggleDetailTab('matches')">MATCHES</button>
                <button id="btn-tab-skills" class="save-btn" style="background:var(--border); color:var(--text);" onclick="window.toggleDetailTab('skills')">SKILLS</button>
            </div>

            <div id="tab-matches">
                ${sortedMatches.length > 0 ? sortedMatches.map(m => {
                    const red = m.alliances.find(a => a.color === 'red')?.teams.map(t => t.team.name).join(' / ') || "TBD";
                    const blue = m.alliances.find(a => a.color === 'blue')?.teams.map(t => t.team.name).join(' / ') || "TBD";
                    const rScore = m.alliances.find(a => a.color === 'red')?.score ?? "-";
                    const bScore = m.alliances.find(a => a.color === 'blue')?.score ?? "-";

                    return `
                    <div style="background:var(--card-bg); border:1px solid var(--border); padding:12px; border-radius:12px; margin-bottom:10px;">
                        <div style="font-size:0.7rem; color:var(--sub-text); margin-bottom:5px; text-transform:uppercase;">${m.name}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:var(--red); font-weight:bold; flex:1;">${red}</span>
                            <span style="background:var(--input-bg); padding:2px 8px; border-radius:4px; font-size:0.8rem; margin:0 10px;">${rScore} - ${bScore}</span>
                            <span style="color:var(--blue); font-weight:bold; flex:1; text-align:right;">${blue}</span>
                        </div>
                    </div>`;
                }).join('') : '<p style="text-align:center; padding:30px; color:var(--sub-text);">No matches found in API.</p>'}
            </div>

            <div id="tab-skills" style="display:none;">
                <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:12px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <tr style="background:var(--input-bg); font-size:0.7rem; color:var(--sub-text);">
                            <th style="padding:12px;">RANK</th>
                            <th>TEAM</th>
                            <th>SCORE</th>
                        </tr>
                        ${skills.length > 0 ? skills.map((s, i) => `
                            <tr style="border-top:1px solid var(--border);">
                                <td style="padding:12px;">${s.rank || i+1}</td>
                                <td style="color:var(--primary); font-weight:bold;">${s.team.name}</td>
                                <td style="font-weight:bold;">${s.score}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--sub-text);">No skills scores yet.</td></tr>'}
                    </table>
                </div>
            </div>
        </div>
    `;

    list.innerHTML = html;
}
