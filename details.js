/**
 * details.js - Paragon Core X
 * Comprehensive Live Data Renderer
 */

window.loadEventDetails = async function(sku) {
    const list = document.getElementById('event-list');
    if (!list) return;

    // High-quality loading state
    list.innerHTML = `
        <div style="text-align:center; padding:50px; color:var(--sub-text);">
            <div class="loading-spinner"></div>
            <p style="margin-top:15px; font-weight:900; letter-spacing:1.5px; color:var(--primary);">PULLING LIVE INTEL: ${sku}</p>
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
            <div style="text-align:center; padding:30px; border:2px solid var(--red); border-radius:16px; margin:20px;">
                <h3 style="color:var(--red);">CONNECTION LOST</h3>
                <p style="font-size:0.8rem;">${err.message}</p>
                <button onclick="loadEvents()" class="save-btn" style="width:auto; padding:10px 30px;">RETRY HUB</button>
            </div>`;
    }
};

function renderDetailsView(sku, matches, skills) {
    const list = document.getElementById('event-list');
    
    // Sort matches logically (Qual 1, Qual 2, etc.)
    const sortedMatches = matches.sort((a, b) => (a.instance || a.id) - (b.instance || b.id));

    let html = `
        <div class="details-view" style="animation: slideUp 0.4s ease-out;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding:0 10px;">
                <button onclick="loadEvents()" style="background:var(--input-bg); border:1px solid var(--border); color:var(--text); padding:12px; border-radius:12px; cursor:pointer; font-weight:bold;">←</button>
                <div>
                    <h2 style="margin:0; font-size:1.1rem; color:var(--primary); line-height:1;">${sku}</h2>
                    <small style="color:var(--sub-text); text-transform:uppercase; font-size:0.6rem;">Live Match Database</small>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px; padding:0 10px;">
                <button id="btn-tab-matches" class="save-btn" onclick="window.toggleDetailTab('matches')">MATCHES</button>
                <button id="btn-tab-skills" class="save-btn" style="background:var(--border); color:var(--text);" onclick="window.toggleDetailTab('skills')">SKILLS</button>
            </div>

            <div id="tab-matches" style="padding:0 10px;">
                ${sortedMatches.length > 0 ? sortedMatches.map(m => {
                    const rAll = m.alliances.find(a => a.color === 'red');
                    const bAll = m.alliances.find(a => a.color === 'blue');
                    
                    // Display Team Numbers if names are unavailable
                    const red = rAll?.teams.map(t => t.team.name || t.team.number).join(' & ') || "TBD";
                    const blue = bAll?.teams.map(t => t.team.name || t.team.number).join(' & ') || "TBD";
                    
                    const score = (rAll?.score || bAll?.score) ? `${rAll.score} - ${bAll.score}` : 'VS';

                    return `
                    <div style="background:var(--card-bg); border:1px solid var(--border); padding:16px; border-radius:20px; margin-bottom:12px; box-shadow: var(--shadow);">
                        <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:var(--sub-text); margin-bottom:10px; font-weight:bold; letter-spacing:0.5px;">
                            <span>${m.name.toUpperCase()}</span>
                            <span style="color:var(--primary)">${m.field || 'MAIN FIELD'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                            <div style="color:var(--red); font-weight:900; flex:1; font-size:0.85rem;">${red}</div>
                            <div style="background:var(--input-bg); border:1px solid var(--border); padding:5px 12px; border-radius:10px; font-size:0.75rem; font-weight:900; min-width:60px; text-align:center;">${score}</div>
                            <div style="color:var(--blue); font-weight:900; flex:1; text-align:right; font-size:0.85rem;">${blue}</div>
                        </div>
                    </div>`;
                }).join('') : '<div style="text-align:center; padding:40px; color:var(--sub-text);">No live matches found in API for this SKU.</div>'}
            </div>

            <div id="tab-skills" style="display:none; padding:0 10px;">
                <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:20px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead>
                            <tr style="background:var(--input-bg); font-size:0.65rem; color:var(--sub-text);">
                                <th style="padding:15px;">RANK</th>
                                <th>TEAM</th>
                                <th style="text-align:right; padding-right:15px;">TOP SCORE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${skills.length > 0 ? skills.sort((a,b) => b.score - a.score).map((s, i) => `
                                <tr style="border-top:1px solid var(--border);">
                                    <td style="padding:15px; color:var(--sub-text); font-weight:bold;">${i+1}</td>
                                    <td style="color:var(--primary); font-weight:900; font-size:0.9rem;">${s.team.name || s.team.number}</td>
                                    <td style="text-align:right; padding-right:15px; font-weight:bold; font-size:1.1rem; font-family:monospace;">${s.score}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="3" style="text-align:center; padding:40px; color:var(--sub-text);">No skills scores reported.</td></tr>'}
                        </tbody>
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
