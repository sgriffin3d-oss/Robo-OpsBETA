/**
 * details.js - Paragon Core X
 * Handles fetching and rendering specific event data (Matches & Skills)
 * Fixed: Division iteration safety check
 */

async function loadEventDeepData(sku) {
    const container = document.getElementById('detHistory');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--sub-text);">
            <div class="loading-spinner"></div>
            <p>Scanning Divisions & Results...</p>
        </div>`;

    try {
        // 1. Get Divisions
        const divRes = await fetch(`/api/robotevents?sku=${sku}&type=divisions`);
        const divJson = await divRes.json();
        
        // Safety Check: RobotEvents API usually wraps the array in a 'data' property
        let divisions = divJson.data || divJson; 
        if (!Array.isArray(divisions)) {
            divisions = [divisions]; // Force into array if it's a single object
        }

        // 2. Get Skills (Event-wide)
        const skillsRes = await fetch(`/api/robotevents?sku=${sku}&type=skills`);
        const skillsData = await skillsRes.json();

        // 3. Get Matches for each division
        let allMatches = [];
        for (const div of divisions) {
            if (!div.id) continue;
            const mRes = await fetch(`/api/robotevents?sku=${sku}&type=matches&divisionId=${div.id}`);
            const mData = await mRes.json();
            if (mData.data && Array.isArray(mData.data)) {
                allMatches = allMatches.concat(mData.data);
            }
        }

        renderDeepData(allMatches, skillsData.data || []);

    } catch (err) {
        console.error("Deep Scan Error:", err);
        container.innerHTML = `<p style="color:var(--red); text-align:center;">Deep Scan Failed: ${err.message}</p>`;
    }
}

function renderDeepData(matches, skills) {
    const container = document.getElementById('detHistory');
    container.innerHTML = '';

    // 1. Improved Skills Standings (Driver + Programming + Total)
    if (skills && skills.length > 0) {
        let skillsHtml = `<h3>Skills Leaderboard</h3>`;
        // Sort by highest total score
        skills.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10).forEach(s => {
            const driver = s.attempts.find(a => a.type === 'driver')?.score || 0;
            const prog = s.attempts.find(a => a.type === 'programming')?.score || 0;
            const total = s.score || (driver + prog);

            skillsHtml += `
                <div class="note-card" style="margin-bottom:8px; padding:12px; display:block; border-left: 4px solid var(--primary);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <b style="color:var(--text)">${s.team.name}</b>
                        <b style="font-size:1.1rem; color:var(--primary);">Total: ${total}</b>
                    </div>
                    <div style="display:flex; gap:15px; font-size:0.75rem; color:var(--sub-text);">
                        <span>Driver: <b>${driver}</b></span>
                        <span>Prog: <b>${prog}</b></span>
                    </div>
                </div>`;
        });
        container.innerHTML += skillsHtml;
    }

    // 2. Match Schedule & Results
    if (matches && matches.length > 0) {
        let matchHtml = `<h3 style="margin-top:25px;">Match Results</h3>`;
        // Sort matches by scheduled time
        matches.sort((a, b) => new Date(a.scheduled) - new Date(b.scheduled)).forEach(m => {
            const redAlliance = m.alliances.find(a => a.color === 'red');
            const blueAlliance = m.alliances.find(a => a.color === 'blue');
            
            const redTeams = redAlliance.teams.map(t => t.team.name).join(' & ');
            const blueTeams = blueAlliance.teams.map(t => t.team.name).join(' & ');
            const redScore = redAlliance.score;
            const blueScore = blueAlliance.score;
            const isDone = redScore > 0 || blueScore > 0;

            matchHtml += `
                <div class="note-card" style="flex-direction:column; align-items:flex-start; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; width:100%; font-size:0.7rem; opacity:0.6; margin-bottom:8px;">
                        <span>${m.name}</span>
                        <span style="color:${isDone ? 'var(--primary)' : 'inherit'}">${isDone ? 'FINAL' : 'UPCOMING'}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:10px;">
                        <div style="color:var(--red); font-weight:700; width:42%; font-size:0.85rem;">${redTeams}</div>
                        <div style="width:10%; text-align:center; opacity:0.4; font-size:0.7rem;">VS</div>
                        <div style="color:var(--blue); font-weight:700; width:42%; text-align:right; font-size:0.85rem;">${blueTeams}</div>
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
        container.innerHTML += `<p style="text-align:center; padding:20px; color:var(--sub-text);">No matches found for these divisions.</p>`;
    }
}
