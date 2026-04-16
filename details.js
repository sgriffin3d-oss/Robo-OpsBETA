/**
 * details.js - Paragon Core X
 * Handles fetching and rendering specific event data (Matches & Skills)
 */

async function loadEventDetails(sku) {
    const list = document.getElementById('event-list');
    const originalContent = list.innerHTML; // Store to allow "back" navigation

    // Show Loading
    list.innerHTML = `<div class="loading-spinner"></div><p style="text-align:center;">Loading Event Intel...</p>`;

    try {
        // Fetch Matches and Skills in parallel
        const [matchRes, skillsRes] = await Promise.all([
            fetch(`/api/robotevents?sku=${sku}&type=matches`),
            fetch(`/api/robotevents?sku=${sku}&type=skills`)
        ]);

        const matches = await matchRes.json();
        const skills = await skillsRes.json();

        renderDetailsView(sku, matches.data || [], skills.data || []);
    } catch (err) {
        list.innerHTML = `<p style="color:var(--red);">Failed to load details: ${err.message}</p>`;
    }
}

function renderDetailsView(sku, matches, skills) {
    const list = document.getElementById('event-list');
    
    let html = `
        <button onclick="loadEvents()" class="sort-btn" style="margin-bottom:15px; width:auto;">← BACK TO LIST</button>
        <div class="details-header">
            <h3>Event Intelligence: ${sku}</h3>
        </div>
        
        <div class="tabs" style="display:flex; gap:10px; margin-bottom:15px;">
            <button class="sort-btn active" onclick="toggleDetailTab('matches')">MATCHES</button>
            <button class="sort-btn" onclick="toggleDetailTab('skills')">SKILLS</button>
        </div>

        <div id="tab-matches">
            ${matches.length ? matches.map(m => `
                <div class="match-item" style="background:var(--input-bg); padding:10px; border-radius:8px; margin-bottom:8px; border-left:4px solid var(--primary);">
                    <small>${m.name}</small>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--red); font-weight:bold;">${m.alliances[0].teams.map(t => t.team.name).join(' & ')}</span>
                        <span>vs</span>
                        <span style="color:var(--blue); font-weight:bold;">${m.alliances[1].teams.map(t => t.team.name).join(' & ')}</span>
                    </div>
                </div>
            `).join('') : '<p>No matches scheduled yet.</p>'}
        </div>

        <div id="tab-skills" style="display:none;">
            <table style="width:100%; border-collapse:collapse; color:var(--text);">
                <tr style="text-align:left; border-bottom:1px solid var(--border);">
                    <th style="padding:8px;">Rank</th>
                    <th>Team</th>
                    <th>Score</th>
                </tr>
                ${skills.map((s, idx) => `
                    <tr style="border-bottom:1px solid var(--border);">
                        <td style="padding:8px;">${idx + 1}</td>
                        <td style="color:var(--primary); font-weight:bold;">${s.team.name}</td>
                        <td>${s.score}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    `;

    list.innerHTML = html;
}

function toggleDetailTab(type) {
    document.getElementById('tab-matches').style.display = type === 'matches' ? 'block' : 'none';
    document.getElementById('tab-skills').style.display = type === 'skills' ? 'block' : 'none';
    
    // Toggle active state on buttons
    const buttons = document.querySelectorAll('.tabs .sort-btn');
    buttons[0].classList.toggle('active', type === 'matches');
    buttons[1].classList.toggle('active', type === 'skills');
}
