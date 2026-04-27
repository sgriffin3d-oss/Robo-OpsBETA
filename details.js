/**
 * details_debug.js - Paragon Core X
 * TEMPORARY DEBUG VERSION - shows raw API responses on screen
 * Replace with details.js after diagnosing, then delete this file
 */

let currentEventId = null;
let activeTab = 'schedule';
let cachedData = {};

async function loadEventDeepData(id, status) {
    currentEventId = id;
    activeTab = 'schedule';
    cachedData = {};

    const container = document.getElementById('detHistory');
    if (!container) return;

    container.innerHTML = `
        <div class="detail-tabs" id="detail-tabs">
            <button class="detail-tab active" id="tab-schedule" onclick="switchTab('schedule')">SCHEDULE</button>
            <button class="detail-tab" id="tab-rankings" onclick="switchTab('rankings')">RANKINGS</button>
            <button class="detail-tab" id="tab-skills" onclick="switchTab('skills')">SKILLS</button>
            <button class="detail-tab" id="tab-teams" onclick="switchTab('teams')">TEAMS</button>
            <button class="detail-tab" id="tab-debug" onclick="switchTab('debug')" style="color:#f90;">DEBUG</button>
        </div>
        <div id="tab-content">
            <div style="text-align:center; padding:40px; color:var(--sub-text);">
                <div class="loading-spinner"></div>
                <p style="margin-top:15px; font-size:0.8rem; letter-spacing:1px;">FETCHING DATA...</p>
            </div>
        </div>`;

    const log = [];

    try {
        // Step 1: fetch the event to get divisions
        const eventUrl = `/api/robotevents?id=${id}`;
        log.push(`\n=== STEP 1: Fetch event ===\nURL: ${eventUrl}`);

        const eventRes = await fetch(eventUrl);
        const eventData = await eventRes.json();
        log.push(`Status: ${eventRes.status}\nResponse keys: ${Object.keys(eventData).join(', ')}`);
        log.push(`divisions: ${JSON.stringify(eventData.divisions)}`);

        const divisions = eventData.divisions || [];
        const divId = divisions.length > 0 ? divisions[0].id : 1;
        log.push(`Using divId: ${divId}`);

        // Step 2: fetch all 4 in parallel
        const urls = {
            matches:  `/api/robotevents?id=${id}&div=${divId}&type=matches`,
            skills:   `/api/robotevents?id=${id}&type=skills`,
            rankings: `/api/robotevents?id=${id}&div=${divId}&type=rankings`,
            teams:    `/api/robotevents?id=${id}&type=teams`
        };

        log.push(`\n=== STEP 2: Sub-fetches ===`);
        Object.entries(urls).forEach(([k, v]) => log.push(`${k}: ${v}`));

        const [matchRes, skillsRes, rankRes, teamRes] = await Promise.all(
            Object.values(urls).map(u => fetch(u))
        );

        const [matchData, skillsData, rankData, teamData] = await Promise.all([
            matchRes.json(), skillsRes.json(), rankRes.json(), teamRes.json()
        ]);

        // Log status codes and counts
        log.push(`\n=== STEP 3: Results ===`);
        log.push(`matches   HTTP ${matchRes.status} — data length: ${matchData.data?.length ?? 'no .data'}`);
        log.push(`skills    HTTP ${skillsRes.status} — data length: ${skillsData.data?.length ?? 'no .data'}`);
        log.push(`rankings  HTTP ${rankRes.status} — data length: ${rankData.data?.length ?? 'no .data'}`);
        log.push(`teams     HTTP ${teamRes.status} — data length: ${teamData.data?.length ?? 'no .data'}`);

        // Log first item of each so we can see actual shape
        if (matchData.data?.length > 0) {
            log.push(`\n--- First match object ---\n${JSON.stringify(matchData.data[0], null, 2)}`);
        } else {
            log.push(`\n--- Full matches response (no data) ---\n${JSON.stringify(matchData, null, 2)}`);
        }

        if (rankData.data?.length > 0) {
            log.push(`\n--- First ranking object ---\n${JSON.stringify(rankData.data[0], null, 2)}`);
        } else {
            log.push(`\n--- Full rankings response (no data) ---\n${JSON.stringify(rankData, null, 2)}`);
        }

        cachedData = {
            matches:  matchData.data  || [],
            skills:   skillsData.data || [],
            rankings: rankData.data   || [],
            teams:    teamData.data   || [],
            divisions,
            _log: log.join('\n')
        };

        renderTab('schedule');

    } catch (err) {
        log.push(`\n=== ERROR ===\n${err.message}\n${err.stack}`);
        cachedData._log = log.join('\n');
        document.getElementById('tab-content').innerHTML = `
            <p style="color:var(--red); text-align:center; padding:20px;">
                ${err.message}<br><small>Check DEBUG tab</small>
            </p>`;
        // Still show debug tab
        cachedData._log = log.join('\n');
    }

    // Always make debug available
    cachedData._log = log.join('\n');
}

function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.detail-tab').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tab-' + tab);
    if (btn) btn.classList.add('active');
    renderTab(tab);
}

function renderTab(tab) {
    const content = document.getElementById('tab-content');
    if (!content) return;
    switch (tab) {
        case 'schedule':  renderSchedule(content); break;
        case 'rankings':  renderRankings(content); break;
        case 'skills':    renderSkills(content); break;
        case 'teams':     renderTeams(content); break;
        case 'debug':     renderDebug(content); break;
    }
}

function renderDebug(container) {
    const logText = cachedData._log || 'No log yet.';
    container.innerHTML = `
        <div style="background:#111; border:1px solid #333; border-radius:10px; padding:14px; margin-top:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="color:#f90; font-weight:800; font-size:0.8rem;">RAW API DEBUG LOG</span>
                <button onclick="copyDebugLog()" style="background:#333; color:#fff; border:none; padding:5px 10px; border-radius:6px; font-size:0.7rem; cursor:pointer;">COPY</button>
            </div>
            <pre id="debug-pre" style="color:#0f0; font-size:0.65rem; overflow-x:auto; white-space:pre-wrap; word-break:break-all; margin:0;">${escapeHtml(logText)}</pre>
        </div>`;
}

function copyDebugLog() {
    navigator.clipboard.writeText(cachedData._log || '').then(() => alert('Copied to clipboard!'));
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── SCHEDULE ────────────────────────────────────────────────────────────────

function renderSchedule(container) {
    const matches = cachedData.matches || [];
    if (matches.length === 0) {
        container.innerHTML = emptyState('No match data — check DEBUG tab.');
        return;
    }
    const sorted = [...matches].sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return a.matchnum - b.matchnum;
    });
    let html = '';
    sorted.forEach(m => {
        const redAlliance = m.alliances?.find(a => a.color === 'red') || m.alliances?.[0];
        const blueAlliance = m.alliances?.find(a => a.color === 'blue') || m.alliances?.[1];
        if (!redAlliance || !blueAlliance) return;
        const redTeams = (redAlliance.teams || []).map(t => t.team?.name || '?').join(' / ');
        const blueTeams = (blueAlliance.teams || []).map(t => t.team?.name || '?').join(' / ');
        const redScore = redAlliance.score;
        const blueScore = blueAlliance.score;
        const isPlayed = typeof redScore === 'number' && redScore >= 0
                      && typeof blueScore === 'number' && blueScore >= 0;
        const redWin = isPlayed && redScore > blueScore;
        const blueWin = isPlayed && blueScore > redScore;
        html += `
            <div class="match-card ${isPlayed ? 'played' : ''}">
                <div class="match-header">
                    <span class="match-name">${m.name || 'Match'}</span>
                    <span class="match-status">${isPlayed ? 'FINAL' : 'UPCOMING'}</span>
                </div>
                <div class="match-body">
                    <div class="match-alliance red ${redWin ? 'winner' : ''}">
                        <span class="alliance-teams">${redTeams}</span>
                        ${isPlayed ? `<span class="alliance-score">${redScore}</span>` : ''}
                    </div>
                    <div class="match-vs">VS</div>
                    <div class="match-alliance blue ${blueWin ? 'winner' : ''}">
                        ${isPlayed ? `<span class="alliance-score">${blueScore}</span>` : ''}
                        <span class="alliance-teams">${blueTeams}</span>
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = html || emptyState('No matches to display.');
}

// ── RANKINGS ─────────────────────────────────────────────────────────────────

function renderRankings(container) {
    const rankings = cachedData.rankings || [];
    if (rankings.length === 0) {
        container.innerHTML = emptyState('No rankings — check DEBUG tab.');
        return;
    }
    const sorted = [...rankings].sort((a, b) => a.rank - b.rank);
    let html = `
        <div class="rank-header-row">
            <span class="rank-col-rank">RK</span>
            <span class="rank-col-team">TEAM</span>
            <span class="rank-col-stat">W-L-T</span>
            <span class="rank-col-stat">WP</span>
            <span class="rank-col-stat">SP</span>
        </div>`;
    sorted.forEach(r => {
        html += `
            <div class="rank-row ${r.rank <= 3 ? 'top-rank' : ''}">
                <span class="rank-col-rank">${r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : '#' + r.rank}</span>
                <span class="rank-col-team">${r.team?.name || '?'}</span>
                <span class="rank-col-stat">${r.wins ?? '–'}-${r.losses ?? '–'}-${r.ties ?? '–'}</span>
                <span class="rank-col-stat">${r.wp ?? '–'}</span>
                <span class="rank-col-stat">${r.sp ?? '–'}</span>
            </div>`;
    });
    container.innerHTML = html;
}

// ── SKILLS ───────────────────────────────────────────────────────────────────

function renderSkills(container) {
    const skills = cachedData.skills || [];
    if (skills.length === 0) {
        container.innerHTML = emptyState('Skills data not available.');
        return;
    }
    const teamMap = {};
    skills.forEach(s => {
        const teamName = s.team?.name || '?';
        if (!teamMap[teamName]) teamMap[teamName] = { team: teamName, driver: 0, prog: 0 };
        const type = s.type?.toLowerCase();
        if (type === 'driver') {
            teamMap[teamName].driver = Math.max(teamMap[teamName].driver, s.score ?? 0);
        } else {
            teamMap[teamName].prog = Math.max(teamMap[teamName].prog, s.score ?? 0);
        }
    });
    const sorted = Object.values(teamMap)
        .map(t => ({ ...t, total: t.driver + t.prog }))
        .sort((a, b) => b.total - a.total);
    let html = `
        <div class="rank-header-row">
            <span class="rank-col-rank">RK</span>
            <span class="rank-col-team">TEAM</span>
            <span class="rank-col-stat">DRV</span>
            <span class="rank-col-stat">PRG</span>
            <span class="rank-col-stat" style="color:var(--primary)">TOT</span>
        </div>`;
    sorted.forEach((t, i) => {
        const rank = i + 1;
        html += `
            <div class="rank-row ${rank <= 3 ? 'top-rank' : ''}">
                <span class="rank-col-rank">${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : '#' + rank}</span>
                <span class="rank-col-team">${t.team}</span>
                <span class="rank-col-stat">${t.driver}</span>
                <span class="rank-col-stat">${t.prog}</span>
                <span class="rank-col-stat" style="color:var(--primary); font-weight:900;">${t.total}</span>
            </div>`;
    });
    container.innerHTML = html;
}

// ── TEAMS ────────────────────────────────────────────────────────────────────

function renderTeams(container) {
    const teams = cachedData.teams || [];
    if (teams.length === 0) {
        container.innerHTML = emptyState('Team list not available.');
        return;
    }
    const sorted = [...teams].sort((a, b) =>
        (a.number || '').localeCompare(b.number || '', undefined, { numeric: true })
    );
    let html = '';
    sorted.forEach(t => {
        const number = t.number || t.name || '?';
        const org = t.organization || '';
        const loc = [t.location?.city, t.location?.region].filter(Boolean).join(', ');
        html += `
            <div class="team-row">
                <div class="team-number">${number}</div>
                <div class="team-info">
                    ${org ? `<div class="team-org">${org}</div>` : ''}
                    ${loc ? `<div class="team-loc">${loc}</div>` : ''}
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

function emptyState(msg) {
    return `<div style="text-align:center; padding:40px; color:var(--sub-text); font-size:0.85rem;">${msg}</div>`;
}
