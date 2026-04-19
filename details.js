/**
 * details.js - Paragon Core X
 * Fixed match rendering logic and score detection
 */

async function loadEventDeepData(sku) {
    const container = document.getElementById('detHistory');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--sub-text);">
            <div class="loading-spinner"></div>
            <p>Fetching Match & Skills Data...</p>
        </div>`;

    try {
        const [matchRes, skillsRes] = await Promise.all([
            fetch(`/api/robotevents?sku=${sku}&type=matches`),
            fetch(`/api/robotevents?sku=${sku}&type=skills`)
        ]);

        const matches = await matchRes.json();
        const skills = await skillsRes.json();

        renderDeepData(matches.data || [], skills.data || []);

    } catch (err) {
        container.innerHTML = `<p style="color:var(--red)">Failed to load event details: ${err.message}</p>`;
    }
}

function renderDeepData(matches, skills) {
    const container = document.getElementById('detHistory');
    container.innerHTML = '';

    // 1. Skills Rankings Section
    if (skills && skills.length > 0) {
        let skillsHtml = `<h3>Top Skills</h3><div class="skills-grid" style="display:grid; gap:10px; margin-bottom:20px;">`;
        skills.sort((a, b) => a.rank - b.rank).slice(0, 8).forEach(s => {
            skillsHtml += `
                <div class="note-card" style="padding:10px; font-size:0.8rem;">
                    <div style="display:flex; justify-content:space-between; width:100%;">
                        <b>#${s.rank} ${s.team.name}</b>
                        <span style="color:var(--primary)">${s.score} pts</span>
                    </div>
                </div>`;
        });
        skillsHtml += `</div>`;
        container.innerHTML += skillsHtml;
    }

    // 2. Match Schedule / Results Section
    if (matches && matches.length > 0) {
        let matchHtml = `<h3>Match Schedule</h3>`;
        // Sort matches by match number (e.g., Qualifying 1, 2, 3)
        matches.sort((a, b) => a.id - b.id).forEach(m => {
            // FIXED: Improved check for finished matches based on score existence
            const redScore = m.alliances[0].score || 0;
            const blueScore = m.alliances[1].score || 0;
            const isFinished = redScore > 0 || blueScore > 0;

            matchHtml += `
                <div class="note-card" style="flex-direction:column; align-items:flex-start; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; width:100%; font-size:0.75rem; opacity:0.7;">
                        <span>${m.name}</span>
                        <span style="color: ${isFinished ? 'var(--primary)' : 'var(--sub-text)'}">${isFinished ? 'FINAL' : 'UPCOMING'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; width:100%; margin:8px 0;">
                        <span style="color:#ff4d4d; font-weight:bold;">${m.alliances[0].teams.map(t => t.team.name).join(' & ')}</span>
                        <span style="font-weight:bold; opacity:0.5;">VS</span>
                        <span style="color:#4d94ff; font-weight:bold;">${m.alliances[1].teams.map(t => t.team.name).join(' & ')}</span>
                    </div>
                    ${isFinished ? `
                    <div style="display:flex; justify-content:space-between; width:100%; border-top:1px solid var(--border); padding-top:8px;">
                         <b style="color:#ff4d4d; font-size:1.1rem;">${redScore}</b>
                         <b style="color:#4d94ff; font-size:1.1rem;">${blueScore}</b>
                    </div>` : ''}
                </div>`;
        });
        container.innerHTML += matchHtml;
    } else {
        container.innerHTML += `
            <div style="text-align:center; padding:20px; border: 1px dashed var(--border); border-radius:12px;">
                <p style="color:var(--sub-text); margin:0;">No match data available yet.</p>
            </div>`;
    }
}
