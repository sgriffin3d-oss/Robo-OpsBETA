/**
 * details.js - Paragon Core X
 * Fetches specific Match and Skills data for an event
 */

window.loadEventDetails = async function(sku) {
    const list = document.getElementById('event-list');
    if (!list) return;

    // Show Loading
    list.innerHTML = `
        <div style="text-align:center; padding:40px;">
            <div class="loading-spinner"></div>
            <p>Gathering Match Intel...</p>
        </div>`;

    try {
        // Parallel fetch for speed
        // Note: Using the sku in the query for your Vercel proxy
        const [matchRes, skillsRes] = await Promise.all([
            fetch(`/api/robotevents?sku=${sku}&type=matches`),
            fetch(`/api/robotevents?sku=${sku}&type=skills`)
        ]);

        const matches = await matchRes.json();
        const skills = await skillsRes.json();

        renderDetailsView(sku, matches.data || [], skills.data || []);
    } catch (err) {
        console.error("Detail Load Error:", err);
        list.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <p style="color:var(--red);">Failed to load details: ${err.message}</p>
                <button onclick="loadEvents()" class="save-btn" style="width:auto; margin-top:10px;">Return to List</button>
            </div>`;
    }
};

function renderDetailsView(sku, matches, skills) {
    const list = document.getElementById('event-list');
    
    let html = `
        <div style="padding:10px;">
            <button onclick="loadEvents()" style="background:var(--input-bg); color:var(--text); border:1px solid var(--border); padding:8px 15px; border-radius:8px; cursor:pointer; margin-bottom:15px;">← BACK</button>
            <h3 style="margin-bottom:20px; color:var(--primary);">${sku}</h3>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                <button id="btn-tab-matches" class="save-btn" onclick="window.toggleDetailTab('matches')">MATCHES</button>
                <button id="btn-tab-skills" class="save-btn" style="background:var(--border); color:var(--text);" onclick="window.toggleDetailTab('skills')">SKILLS</button>
            </div>

            <div id="tab-matches">
                ${matches.length > 0 ? matches.map(m => {
                    // Safety Check: Ensure alliances and teams exist before rendering
                    const redAlliance = m.alliances?.[0]?.teams?.map(t => t.team.name).join(' & ') || "TBD";
                    const blueAlliance = m.alliances?.[1]?.teams?.map(t => t.team.name).join(' & ') || "TBD";
                    
                    return `
                    <div style="background:var(--card-bg); border:1px solid var(--border); padding:12px; border-radius:12px; margin-bottom:10px;">
                        <small style="color:var(--sub-text)">${m.name || 'Match'}</small>
                        <div style="display:flex; justify-content:space-between; margin-top:5px; font-weight:bold; gap: 10px;">
                            <span style="color:var(--red); flex:1;">${redAlliance}</span>
                            <span style="color:var(--sub-text); font-size:0.8rem;">VS</span>
                            <span style="color:var(--blue); flex:1; text-align:right;">${blueAlliance}</span>
                        </div>
                    </div>`;
                }).join('') : '<p style="text-align:center; color:var(--sub-text); padding:20px;">No match schedule released yet.</p>'}
            </div>

            <div id="tab-skills" style="display:none;">
                ${skills.length > 0 ? `
                <div style="background:var(--card-bg); border:1px solid var(--border); border-radius:12px; overflow:hidden;">
                    <table style="width:100%; text-align:left; border-collapse:collapse;">
                        <thead style="background:var(--input-bg); font-size:0.8rem;">
                            <tr><th style="padding:10px;">#</th><th>Team</th><th>Score</th></tr>
                        </thead>
                        <tbody>
                            ${skills.map((s, i) => `
                                <tr style="border-top:1px solid var(--border);">
                                    <td style="padding:10px; color:var(--sub-text);">${i+1}</td>
                                    <td style="font-weight:bold; color:var(--primary);">${s.team?.name || 'Unknown'}</td>
                                    <td>${s.score || 0}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>` : '<p style="text-align:center; color:var(--sub-text); padding:20px;">No skills scores posted yet.</p>'}
            </div>
        </div>
    `;

    list.innerHTML = html;
}

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
