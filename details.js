/**
 * details.js - Paragon Core X
 * Improved to handle Divisions and detailed Skills breakdown
 */

async function loadEventDeepData(sku) {
    const container = document.getElementById('detHistory');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--sub-text);"><div class="loading-spinner"></div><p>Scanning Divisions & Results...</p></div>`;

    try {
        // 1. Get Divisions first
        const divRes = await fetch(`/api/robotevents?sku=${sku}&type=divisions`);
        const divData = await divRes.json();
        const divisions = divData.data || divData; // Handle different API response shapes

        // 2. Get Skills (Event-wide)
        const skillsRes = await fetch(`/api/robotevents?sku=${sku}&type=skills`);
        const skillsData = await skillsRes.json();

        // 3. Get Matches for each division
        let allMatches = [];
        for (const div of divisions) {
            const mRes = await fetch(`/api/robotevents?sku=${sku}&type=matches&divisionId=${div.id}`);
            const mData = await mRes.json();
            if (mData.data) allMatches = allMatches.concat(mData.data);
        }

        renderDeepData(allMatches, skillsData.data || []);

    } catch (err) {
        container.innerHTML = `<p style="color:var(--red)">Deep Scan Failed: ${err.message}</p>`;
    }
}

function renderDeepData(matches, skills) {
    const container = document.getElementById('detHistory');
    container.innerHTML = '';

    // 1. Improved Skills Standings (Driver + Programming + Total)
    if (skills.length > 0) {
        let skillsHtml = `<h3>Skills Leaderboard</h3>`;
        skills.sort((a, b) => (b.attempts[0]?.score || 0) - (a.attempts[0]?.score || 0)).slice(0, 10).forEach(s => {
            const driver = s.attempts.find(a => a.type === 'driver')?.score || 0;
            const prog = s.attempts.find(a => a.type === 'programming')?.score || 0;
            const total = s.score || (driver + prog);

            skillsHtml += `
                <div class="note-card" style="margin-bottom:8px; padding:12px; display:block;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <b style="color:var(--primary)">${s.team.name}</b>
                        <b style="font-size:1.1rem;">Total: ${total}</b>
                    </div>
                    <div style="display:flex; gap:15px; font-size:0.75rem; opacity:0.8;">
                        <span>Driver: ${driver}</span>
                        <span>Prog: ${prog}</span>
                    </div>
                </div>`;
        });
        container.innerHTML += skillsHtml;
    }

    // 2. Match Schedule & Results
    if (matches.length > 0) {
        let matchHtml = `<h3 style="margin-top:25px;">Match Results</h3>`;
        matches.sort((a, b) => new Date(a.scheduled) - new Date(b.scheduled)).forEach(m => {
            const redTeams = m.alliances.find(a => a.color === 'red').teams.map(t => t.team.name).join(' & ');
            const blueTeams = m.alliances.find(a => a.color === 'blue').teams.map(t => t.team.name).join(' & ');
            const redScore = m.alliances.find(a => a.color === 'red').score;
            const blueScore = m.alliances.find(a => a.color === 'blue').score;
            const isDone = redScore > 0 || blueScore > 0;

            matchHtml += `
                <div class="note-card" style="flex-direction:column; align-items:flex-start; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; width:100%; font-size:0.7rem; opacity:0.6;">
                        <span>${m.name}</span>
                        <span>${isDone ? 'FINAL' : 'UPCOMING'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; width:100%; margin:10px 0;">
                        <div style="color:var(--red); font-weight:800; width:40%;">${redTeams}</div>
                        <div style="width:10%; text-align:center; font-weight:bold;">VS</div>
                        <div style="color:var(--blue); font-weight:800; width:40%; text-align:right;">${blueTeams}</div>
                    </div>
                    ${isDone ? `
                    <div style="display:flex; justify-content:space-between; width:100%; padding-top:8px; border-top:1px solid var(--border);">
                        <span style="color:var(--red); font-size:1.2rem; font-weight:900;">${redScore}</span>
                        <span style="color:var(--blue); font-size:1.2rem; font-weight:900;">${blueScore}</span>
                    </div>` : ''}
                </div>`;
        });
        container.innerHTML += matchHtml;
    } else {
        container.innerHTML += `<p style="text-align:center; padding:20px; opacity:0.5;">Matches not yet posted for this division.</p>`;
    }
}
