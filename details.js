/**
 * details.js - Paragon Core X
 * Comprehensive event detail renderer
 */

window.loadEventDetails = async function(sku) {
    const list = document.getElementById('event-list');
    if (!list) return;

    // Loading State with Spinner
    list.innerHTML = `
        <div style="text-align:center; padding:50px; color:var(--sub-text);">
            <div class="loading-spinner"></div>
            <p style="margin-top:15px; font-weight:bold; letter-spacing:1px;">DECRYPTING LIVE DATA: ${sku}</p>
        </div>`;

    try {
        const [matchRes, skillsRes] = await Promise.all([
            fetch(`/api/robotevents?sku=${sku}&type=matches`),
            fetch(`/api/robotevents?sku=${sku}&type=skills`)
        ]);

        const matches = await matchRes.json();
        const skills = await skillsRes.json();

        renderDetailsView(sku, matches.data || [], skills.data || []);
    } catch (err) {
        list.innerHTML = `
            <div style="text-align:center; padding:30px; border:1px solid var(--red); border-radius:12px;">
                <p style="color:var(--red); font-weight:bold;">SYNC INTERRUPTED</p>
                <small>${err.message}</small><br>
                <button onclick="loadEvents()" class="save-btn" style="width:auto; margin-top:15px;">RETURN TO HUB</button>
            </div>`;
    }
};

function renderDetailsView(sku, matches, skills) {
    const list = document.getElementById('event-list');
    
    // Sort matches by instance or ID
    const sortedMatches = matches.sort((a, b) => (a.instance || a.id) - (b.instance || b.id));

    let html = `
        <div class="details-container" style="animation: fadeIn 0.3s ease;">
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px;">
                <button onclick="loadEvents()" style="background:var(--input-bg); border:1px solid var(--border); color:var(--text); padding:10px 15px; border-radius:10px; cursor:pointer;">←</button>
                <h2 style="margin:0; font-size:1.2rem; color:var(--primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${sku}</h2>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                <button id="btn-tab-matches" class="save-btn" onclick="window.toggleDetailTab('matches')">MATCH SCHEDULE</button>
                <button id="btn-tab-skills" class="save-btn" style="background:var(--border); color:var(--text);" onclick="window.toggleDetailTab('skills')">SKILLS RANK</button>
            </div>

            <div id="tab-matches">
                ${sortedMatches.length > 0 ? sortedMatches.map(m => {
                    const red = m.alliances.find(a => a.color === 'red');
                    const blue = m.alliances.find(a => a.color === 'blue');
                    
                    const redNames = red?.teams.map(t => t.team.name).join(' & ') || "TBD";
                    const blueNames = blue?.teams.map(t => t.team.name).join(' & ') || "TBD";
                    
                    const scoreText = (red?.score === null || red?.score === 0 && blue?.score === 0) 
                        ? 'VS' 
                        : `${red.score} - ${blue.score}`;

                    return `
                    <div style="background:var(--card-bg); border:1px solid var(--border); padding:15px; border-radius:16px; margin-bottom:12px; position:relative;">
                        <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:var(--sub-text); margin-bottom:8px; font-weight:bold; text-transform:uppercase;">
                            <span>${m.name}</span>
                            <span style="color:var(--primary)">${m.field || 'FIELD 1'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                            <div style="color:var(--red); font-weight:800; flex:1; font-size:0.9rem;">${redNames}</div>
                            <div style="background:var(--bg); border:1px solid var(--border); padding:4px 10px; border-radius:8px; font-size:0.8rem; font-weight:bold; min-width:50px; text-align:center;">${scoreText}</div>
                            <div style="color:var(--blue); font-weight:800; flex:1; text-align:right; font-size:0.9rem;">${blueNames}</div>
                        </div>
                    </div>`;
                }).join('') : '<p style="text-align:center; padding:40px; color:var(--sub-text);">Match data unavailable for this event.</p>'}
            </div>

            <div id="tab-skills" style="display:none;">
                <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:16px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <tr style="background:var(--input-bg); font-size:0.7rem; color:var(--sub-text); text-transform:uppercase;">
                            <th style="padding:15px;">#</th>
                            <th>TEAM</th>
                            <th style="text-align:right; padding-right:15px;">HIGH SCORE</th>
                        </tr>
                        ${skills.length > 0 ? skills.sort((a,b) => b.score - a.score).map((s, i) => `
                            <tr style="border-top:1px solid var(--border);">
                                <td style="padding:15px; color:var(--sub-text);">${i+1}</td>
                                <td style="color:var(--primary); font-weight:900;">${s.team.name}</td>
                                <td style="text-align:right; padding-right:15px; font-weight:bold; font-family:monospace; font-size:1.1rem;">${s.score}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="3" style="text-align:center; padding:40px; color:var(--sub-text);">No skills data recorded.</td></tr>'}
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

    if (!mTab || !sTab) return;

    if (type === 'matches') {
        mTab.style.display = 'block';
        sTab.style.display = 'none';
        mBtn.style.background = 'var(--primary)'; mBtn.style.color = '#000';
        sBtn.style.background = 'var(--border)'; sBtn.style.color = 'var(--text)';
    } else {
        mTab.style.display = 'none';
        sTab.style.display = 'block';
        sBtn.style.background = 'var(--primary)'; sBtn.style.color = '#000';
        mBtn.style.background = 'var(--border)'; mBtn.style.color = 'var(--text)';
    }
};
