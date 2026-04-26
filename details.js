/**
 * details.js - Paragon Core X
 * Handles fetching and rendering specific event data (Matches & Skills)
 */

async function loadEventDeepData(id) {
    const container = document.getElementById('detHistory');
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--sub-text);">
            <div class="loading-spinner"></div>
            <p>Fetching Match & Skills Data...</p>
        </div>`;

    try {
        // Fetch Matches and Skills in parallel using numerical ID
        const [matchRes, skillsRes] = await Promise.all([
            fetch(`/api/robotevents?id=${id}&type=matches`),
            fetch(`/api/robotevents?id=${id}&type=skills`)
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
    if (skills.length > 0) {
        let skillsHtml = `<h3>Skills Standings</h3><div class="skills-grid" style="display:grid; gap:10px; margin-bottom:20px;">`;
        
        // Sort by rank and show top 8
        skills.sort((a, b) => a.rank - b.rank).slice(0, 8).forEach(s => {
            skillsHtml += `
                <div class="note-card" style="padding:10px; font-size:0.8rem;">
                    <div style="display:flex; justify-content:space-between; width:100%;">
                        <b>#${s.rank} ${s.team.name}</b>
                        <span style="color:var(--primary)">Score: ${s.score}</span>
                    </div>
                </div>`;
        });
        skillsHtml += `</div>`;
        container.innerHTML += skillsHtml;
    }

    // 2. Match Schedule / Results Section
    if (matches.length > 0) {
        let matchHtml = `<h3>Match Schedule</h3>`;
        
        // Sort matches by their ID or sequence
        matches.sort((a, b) => a.id - b.id).forEach(m => {
            // Check if scores exist to determine if it's finished
            const redScore = m.alliances[0].score;
            const blueScore = m.alliances[1].score;
            const isFinished = redScore > 0 || blueScore > 0;

            matchHtml += `
                <div class="note-card" style="flex-direction:column; align-items:flex-start; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; width:100%; font-size:0.75rem; opacity:0.7;">
                        <span>${m.name}</span>
                        <span>${isFinished ? 'FINAL' : 'UPCOMING'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; width:100%; margin:8px 0;">
                        <span style="color:#ff4d4d; font-weight:bold;">${m.alliances[0].teams.map(t => t.team.name).join(' & ')}</span>
                        <span style="font-weight:bold;">VS</span>
                        <span style="color:#4d94ff; font-weight:bold;">${m.alliances[1].teams.map(t => t.team.name).join(' & ')}</span>
                    </div>
                    ${isFinished ? `
                    <div style="display:flex; justify-content:space-between; width:100%; border-top:1px solid var(--border); padding-top:5px;">
                         <b style="color:#ff4d4d">${redScore}</b>
                         <b style="color:#4d94ff">${blueScore}</b>
                    </div>` : ''}
                </div>`;
        });
        container.innerHTML += matchHtml;
    } else {
        container.innerHTML += `<p style="text-align:center; color:var(--sub-text); padding:20px;">No match data available for this event yet.</p>`;
    }
}
