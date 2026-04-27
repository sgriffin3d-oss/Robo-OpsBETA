/**
 * details.js - Paragon Core X
 * Fixed: Fetches event divisions first, then uses division ID for matches & rankings
 * The RobotEvents API requires /events/{id}/divisions/{div}/matches — not /events/{id}/matches
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
        </div>
        <div id="tab-content">
            <div style="text-align:center; padding:40px; color:var(--sub-text);">
                <div class="loading-spinner"></div>
                <p style="margin-top:15px; font-size:0.8rem; letter-spacing:1px;">FETCHING DATA...</p>
            </div>
        </div>`;

    try {
        // Step 1: Fetch the event object to get its divisions array.
        // Matches and rankings are division-scoped in the RobotEvents v2 API:
        //   CORRECT:   /events/{id}/divisions/{div}/matches
        //   WRONG:     /events/{id}/matches  <-- this endpoint does not exist
        const eventRes = await fetch(`/api/robotevents?id=${id}`);
        if (!eventRes.ok) throw new Error(`Event fetch failed: ${eventRes.status}`);
        const eventData = await eventRes.json();

        const divisions = eventData.divisions || [];
        const divId = divisions.length > 0 ? divisions[0].id : 1;

        // Step 2: Fetch all 4 data types in parallel with correct URLs
        const [matchRes, skillsRes, rankRes, teamRes] = await Promise.all([
            fetch(`/api/robotevents?id=${id}&div=${divId}&type=matches`),
            fetch(`/api/robotevents?id=${id}&type=skills`),
            fetch(`/api/robotevents?id=${id}&div=${divId}&type=rankings`),
            fetch(`/api/robotevents?id=${id}&type=teams`)
        ]);

        const [matchData, skillsData, rankData, teamData] = await Promise.all([
            matchRes.json(),
            skillsRes.json(),
            rankRes.json(),
            teamRes.json()
        ]);

        cachedData = {
            matches: matchData.data || [],
            skills: skillsData.data || [],
            rankings: rankData.data || [],
            teams: teamData.data || [],
            divisions
        };

        renderTab('schedule');

    } catch (err) {
        document.getElementById('tab-content').innerHTML = `
            <p style="color:var(--red); text-align:center; padding:30px;">
                Failed to load event data.<br>
                <small style="color:var(--sub-text);">${err.message}</small>
            </p>`;
    }
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
    }
}

// ── SCHEDULE ────────────────────────────────────────────────────────────────

function renderSchedule(container) {
    const matches = cachedData.matches || [];

    if (matches.length === 0) {
        container.innerHTML = emptyState('No match data available yet.');
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

        // RobotEvents uses -1 for unplayed matches
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
        container.innerHTML = emptyState('Rankings not available yet.');
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
        const team = r.team?.name || '?';
        const wins = r.wins ?? '–';
        const losses = r.losses ?? '–';
        const ties = r.ties ?? '–';
        const wp = r.wp ?? '–';
        const sp = r.sp ?? '–';

        html += `
            <div class="rank-row ${r.rank <= 3 ? 'top-rank' : ''}">
                <span class="rank-col-rank">${r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : '#' + r.rank}</span>
                <span class="rank-col-team">${team}</span>
                <span class="rank-col-stat">${wins}-${losses}-${ties}</span>
                <span class="rank-col-stat">${wp}</span>
                <span class="rank-col-stat">${sp}</span>
            </div>`;
    });

    container.innerHTML = html;
}

// ── SKILLS ───────────────────────────────────────────────────────────────────

function renderSkills(container) {
    const skills = cachedData.skills || [];

    if (skills.length === 0) {
        container.innerHTML = emptyState('Skills data not available for this event.');
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

    // /events/{id}/teams returns Team objects directly (not wrapped in a .team property)
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

// ── HELPERS ──────────────────────────────────────────────────────────────────

function emptyState(msg) {
    return `<div style="text-align:center; padding:40px; color:var(--sub-text); font-size:0.85rem;">${msg}</div>`;
}
