/**
 * details.js - Paragon Core X
 * KEY FIX: Must fetch event first to get division ID, then use
 *          /events/{id}/divisions/{div}/matches and /rankings
 * KEY FIX: Single event endpoint returns {data: {...}} not the object directly
 */

let currentEventId = null;
let activeTab = 'schedule';
let cachedData = {};

async function loadEventDeepData(id) {
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
        // Step 1: fetch the single event to get its divisions
        // The proxy returns {data: {id, name, divisions: [...], ...}} for a single event
        const eventRes = await fetch(`/api/robotevents?id=${id}`);
        if (!eventRes.ok) throw new Error(`Event fetch failed: ${eventRes.status}`);
        const eventRaw = await eventRes.json();

        // Handle both {data: {...}} and raw object shapes
        const eventObj = eventRaw.data ?? eventRaw;
        const divisions = eventObj.divisions || [];
        const divId = divisions.length > 0 ? divisions[0].id : 1;

        // Step 2: fetch all 4 data types in parallel
        const [matchRes, skillsRes, rankRes, teamRes] = await Promise.all([
            fetch(`/api/robotevents?id=${id}&div=${divId}&type=matches`),
            fetch(`/api/robotevents?id=${id}&type=skills`),
            fetch(`/api/robotevents?id=${id}&div=${divId}&type=rankings`),
            fetch(`/api/robotevents?id=${id}&type=teams`)
        ]);

        const [matchData, skillsData, rankData, teamData] = await Promise.all([
            matchRes.json(), skillsRes.json(), rankRes.json(), teamRes.json()
        ]);

        cachedData = {
            matches:  matchData.data  || [],
            skills:   skillsData.data || [],
            rankings: rankData.data   || [],
            teams:    teamData.data   || [],
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

function renderSchedule(container) {
    const matches = cachedData.matches || [];
    if (!matches.length) {
        container.innerHTML = emptyState('No match data available yet.');
        return;
    }
    const sorted = [...matches].sort((a, b) =>
        a.round !== b.round ? a.round - b.round : a.matchnum - b.matchnum
    );
    let html = '';
    sorted.forEach(m => {
        const red  = m.alliances?.find(a => a.color === 'red')  || m.alliances?.[0];
        const blue = m.alliances?.find(a => a.color === 'blue') || m.alliances?.[1];
        if (!red || !blue) return;
        const rt = (red.teams  || []).map(t => t.team?.name || '?').join(' / ');
        const bt = (blue.teams || []).map(t => t.team?.name || '?').join(' / ');
        const rs = red.score, bs = blue.score;
        const played = typeof rs === 'number' && rs >= 0 && typeof bs === 'number' && bs >= 0;
        html += `
            <div class="match-card ${played ? 'played' : ''}">
                <div class="match-header">
                    <span class="match-name">${m.name || 'Match'}</span>
                    <span class="match-status">${played ? 'FINAL' : 'UPCOMING'}</span>
                </div>
                <div class="match-body">
                    <div class="match-alliance red ${played && rs > bs ? 'winner' : ''}">
                        <span class="alliance-teams">${rt}</span>
                        ${played ? `<span class="alliance-score">${rs}</span>` : ''}
                    </div>
                    <div class="match-vs">VS</div>
                    <div class="match-alliance blue ${played && bs > rs ? 'winner' : ''}">
                        ${played ? `<span class="alliance-score">${bs}</span>` : ''}
                        <span class="alliance-teams">${bt}</span>
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = html || emptyState('No matches to display.');
}

function renderRankings(container) {
    const rankings = cachedData.rankings || [];
    if (!rankings.length) {
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
        html += `
            <div class="rank-row ${r.rank <= 3 ? 'top-rank' : ''}">
                <span class="rank-col-rank">${r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : '#'+r.rank}</span>
                <span class="rank-col-team">${r.team?.name || '?'}</span>
                <span class="rank-col-stat">${r.wins ?? '–'}-${r.losses ?? '–'}-${r.ties ?? '–'}</span>
                <span class="rank-col-stat">${r.wp ?? '–'}</span>
                <span class="rank-col-stat">${r.sp ?? '–'}</span>
            </div>`;
    });
    container.innerHTML = html;
}

function renderSkills(container) {
    const skills = cachedData.skills || [];
    if (!skills.length) {
        container.innerHTML = emptyState('Skills data not available for this event.');
        return;
    }
    const teamMap = {};
    skills.forEach(s => {
        const n = s.team?.name || '?';
        if (!teamMap[n]) teamMap[n] = { team: n, driver: 0, prog: 0 };
        if (s.type?.toLowerCase() === 'driver') teamMap[n].driver = Math.max(teamMap[n].driver, s.score ?? 0);
        else teamMap[n].prog = Math.max(teamMap[n].prog, s.score ?? 0);
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
        const r = i + 1;
        html += `
            <div class="rank-row ${r <= 3 ? 'top-rank' : ''}">
                <span class="rank-col-rank">${r <= 3 ? ['🥇','🥈','🥉'][r-1] : '#'+r}</span>
                <span class="rank-col-team">${t.team}</span>
                <span class="rank-col-stat">${t.driver}</span>
                <span class="rank-col-stat">${t.prog}</span>
                <span class="rank-col-stat" style="color:var(--primary);font-weight:900;">${t.total}</span>
            </div>`;
    });
    container.innerHTML = html;
}

function renderTeams(container) {
    const teams = cachedData.teams || [];
    if (!teams.length) {
        container.innerHTML = emptyState('Team list not available.');
        return;
    }
    const sorted = [...teams].sort((a, b) =>
        (a.number || '').localeCompare(b.number || '', undefined, { numeric: true })
    );
    let html = '';
    sorted.forEach(t => {
        const loc = [t.location?.city, t.location?.region].filter(Boolean).join(', ');
        html += `
            <div class="team-row">
                <div class="team-number">${t.number || '?'}</div>
                <div class="team-info">
                    ${t.organization ? `<div class="team-org">${t.organization}</div>` : ''}
                    ${loc ? `<div class="team-loc">${loc}</div>` : ''}
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

function emptyState(msg) {
    return `<div style="text-align:center;padding:40px;color:var(--sub-text);font-size:0.85rem;">${msg}</div>`;
}
