/**
 * details.js - Paragon Core X
 * Fixed: Robust skills attempt handling and division iteration
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
        let divisions = divJson.data || divJson; 
        if (!Array.isArray(divisions)) divisions = [divisions];

        // 2. Get Skills
        const skillsRes = await fetch(`/api/robotevents?sku=${sku}&type=skills`);
        const skillsData = await skillsRes.json();

        // 3. Get Matches for each division
        let allMatches = [];
        for (const div of divisions) {
            if (!div || !div.id) continue;
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

    // 1. Skills Leaderboard with Driver/Prog Breakdown
    if (skills && skills.length > 0) {
        let skillsHtml = `<h3>Skills Leaderboard</h3>`;
        
        // Sort by total score descending
        skills.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10).forEach(s => {
            // SAFE ATTACK: Convert attempts to array if it isn't one
            let attempts = s.attempts;
            if (!Array.isArray(attempts)) attempts = attempts ? [attempts] : [];

            // Find specific scores
            const driver = attempts.find(a => a.type === 'driver')?.score || 0;
            const prog = attempts.find(a => a.type === 'programming')?.score || 0;
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

    // 2. Match Results
    if (matches && matches.length > 0) {
        let matchHtml = `<h3 style="margin-top:25px;">Match Results</h3>`;
        
        // Sort matches by time
        matches.sort((a, b) => new Date(a.scheduled) - new Date(b.scheduled)).forEach(m => {
            const redAlliance = m.alliances.find(a => a.color === 'red');
            const blueAlliance = m.alliances.find(a => a.color === 'blue');
            
            if (!redAlliance || !blueAlliance) return;

            const redTeams = redAlliance.teams.map(t => t.team.name).join(' & ');
            const blueTeams = blueAlliance.teams.map(t => t.team.name).join(' & ');
            const redScore = redAlliance.score || 0;
            const blueScore = blueAlliance.score || 0;
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
        container.innerHTML += `<p style="text-align:center; padding:20px; color:var(--sub-text);">Waiting for matches to be posted...</p>`;
    }
}
