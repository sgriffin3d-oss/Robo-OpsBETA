/**
 * details.js - Paragon Core X
 */

window.loadEventDetails = async function(sku) {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = `<div style="text-align:center; padding:40px;"><div class="loading-spinner"></div><p>Fetching Live Intel for ${sku}...</p></div>`;

    try {
        // Use the updated API structure
        const [matchRes, skillsRes] = await Promise.all([
            fetch(`/api/robotevents?sku=${sku}&type=matches`),
            fetch(`/api/robotevents?sku=${sku}&type=skills`)
        ]);

        const matches = await matchRes.json();
        const skills = await skillsRes.json();

        renderDetailsView(sku, matches.data || [], skills.data || []);
    } catch (err) {
        list.innerHTML = `<p style="color:var(--red); text-align:center;">Sync Error: ${err.message}</p>`;
    }
};

function renderDetailsView(sku, matches, skills) {
    const list = document.getElementById('event-list');
    
    // Sort matches by number/order if available
    const sortedMatches = matches.sort((a, b) => a.instance - b.instance);

    let html = `
        <div style="padding:10px;">
            <button onclick="loadEvents()" class="save-btn" style="width:auto; padding:10px 20px; margin-bottom:15px; background:var(--border); color:var(--text);">← BACK</button>
            <h2 style="color:var(--primary); margin-bottom:5px;">${sku}</h2>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                <button id="btn-tab-matches" class="save-btn" onclick="window.toggleDetailTab('matches')">MATCHES</button>
                <button id="btn-tab-skills" class="save-btn" style="background:var(--border); color:var(--text);" onclick="window.toggleDetailTab('skills')">SKILLS</button>
            </div>

            <div id="tab-matches">
                ${sortedMatches.length > 0 ? sortedMatches.map(m => {
                    const red = m.alliances.find(a => a.color === 'red')?.teams.map(t => t.team.name).join(' & ') || "TBD";
                    const blue = m.alliances.find(a => a.color === 'blue')?.teams.map(t => t.team.name).join(' & ') || "TBD";
                    const score = m.alliances[0].score !== null ? `${m.alliances[0].score} - ${m.alliances[1].score}` : "VS";

                    return `
                    <div style="background:var(--card-bg); border:1px solid var(--border); padding:15px; border-radius:12px; margin-bottom:10px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--sub-text); margin-bottom:8px;">
                            <span>${m.name}</span>
                            <span>${m.field || ''}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold;">
                            <span style="color:var(--red); flex:1;">${red}</span>
                            <span style="padding:0 10px; font-size:0.8rem; color:var(--primary);">${score}</span>
                            <span style="color:var(--blue); flex:1; text-align:right;">${blue}</span>
                        </div>
                    </div>`;
                }).join('') : '<p style="text-align:center; padding:20px; color:var(--sub-text);">Schedule not yet published.</p>'}
            </div>

            <div id="tab-skills" style="display:none;">
                <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:12px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse;">
                        <tr style="background:var(--input-bg); font-size:0.7rem; text-align:left;">
                            <th style="padding:12px;">RANK</th>
                            <th>TEAM</th>
                            <th>HIGH</th>
                        </tr>
                        ${skills.length > 0 ? skills.sort((a,b) => b.rank - a.rank).map((s, i) => `
                            <tr style="border-top:1px solid var(--border);">
                                <td style="padding:12px;">${s.rank || i+1}</td>
                                <td style="color:var(--primary); font-weight:bold;">${s.team.name}</td>
                                <td style="font-weight:bold;">${s.score}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--sub-text);">No scores recorded.</td></tr>'}
                    </table>
                </div>
            </div>
        </div>
    `;

    list.innerHTML = html;
}
