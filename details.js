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

        // Access the .data property from the API response
        renderDetailsView(sku, matches.data || [], skills.data || []);
    } catch (err) {
        list.innerHTML = `<p style="color:var(--red); text-align:center; padding:20px;">Load Failed: ${err.message}</p>`;
    }
};

function renderDetailsView(sku, matches, skills) {
    const list = document.getElementById('event-list');
    const sortedMatches = matches.sort((a, b) => (a.instance || a.id) - (b.instance || b.id));

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
                    const rTeams = m.alliances.find(a => a.color === 'red')?.teams.map(t => t.team.name || t.team.number).join(' / ') || "TBD";
                    const bTeams = m.alliances.find(a => a.color === 'blue')?.teams.map(t => t.team.name || t.team.number).join(' / ') || "TBD";
                    const rScore = m.alliances.find(a => a.color === 'red')?.score ?? "-";
                    const bScore = m.alliances.find(a => a.color === 'blue')?.score ?? "-";

                    return `
                    <div style="background:var(--card-bg); border:1px solid var(--border); padding:12px; border-radius:12px; margin-bottom:10px;">
                        <div style="font-size:0.6rem; color:var(--sub-text); margin-bottom:5px;">${m.name.toUpperCase()}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:var(--red); font-weight:bold; flex:1;">${rTeams}</span>
                            <span style="background:var(--input-bg); padding:2px 8px; border-radius:4px; font-size:0.8rem; margin:0 10px; border:1px solid var(--border);">${rScore} - ${bScore}</span>
                            <span style="color:var(--blue); font-weight:bold; flex:1; text-align:right;">${bTeams}</span>
                        </div>
                    </div>`;
                }).join('') : '<p style="text-align:center; padding:30px; color:var(--sub-text);">No matches found for this SKU.</p>'}
            </div>

            <div id="tab-skills" style="display:none;">
                <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:12px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <tr style="background:var(--input-bg); font-size:0.7rem; color:var(--sub-text);">
                            <th style="padding:12px;">RANK</th>
                            <th>TEAM</th>
                            <th>SCORE</th>
                        </tr>
                        ${skills.length > 0 ? skills.sort((a,b) => b.score - a.score).map((s, i) => `
                            <tr style="border-top:1px solid var(--border);">
                                <td style="padding:12px;">${i+1}</td>
                                <td style="color:var(--primary); font-weight:bold;">${s.team.name || s.team.number}</td>
                                <td style="font-weight:bold;">${s.score}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--sub-text);">No skills scores yet.</td></tr>'}
                    </table>
                </div>
            </div>
        </div>
    `;
    list.innerHTML = html;
};

window.toggleDetailTab = function(type) {
    const mTab = document.getElementById('tab-matches');
    const sTab = document.getElementById('tab-skills');
    const mBtn = document.getElementById('btn-tab-matches');
    const sBtn = document.getElementById('btn-tab-skills');
    if (type === 'matches') {
        mTab.style.display = 'block'; sTab.style.display = 'none';
        mBtn.style.background = 'var(--primary)'; mBtn.style.color = '#000';
        sBtn.style.background = 'var(--border)'; sBtn.style.color = 'var(--text)';
    } else {
        mTab.style.display = 'none'; sTab.style.display = 'block';
        sBtn.style.background = 'var(--primary)'; sBtn.style.color = '#000';
        mBtn.style.background = 'var(--border)'; mBtn.style.color = 'var(--text)';
    }
};
