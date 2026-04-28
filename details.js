/**
 * details.js - Paragon Core X
 * Features: division dropdown, skills score/attempts, full pagination via proxy
 */

let currentEventId = null;
let activeTab = 'schedule';
let activeDivId = null;
let cachedData = {};

async function loadEventDeepData(id) {
    currentEventId = id;
    activeTab = 'schedule';
    activeDivId = null;
    cachedData = {};

    const container = document.getElementById('detHistory');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--sub-text);">
            <div class="loading-spinner"></div>
            <p style="margin-top:15px; font-size:0.8rem; letter-spacing:1px;">FETCHING DATA...</p>
        </div>`;

    try {
        const eventRes = await fetch(`/api/robotevents?id=${id}`);
        if (!eventRes.ok) throw new Error(`Event fetch failed: ${eventRes.status}`);
        const eventRaw = await eventRes.json();
        const eventObj = eventRaw.data ?? eventRaw;
        const divisions = eventObj.divisions || [];
        activeDivId = divisions.length > 0 ? divisions[0].id : 1;
        cachedData.divisions = divisions;

        await fetchDivisionData(id, activeDivId);
        renderDetailUI(container, divisions);
        renderTab(activeTab);

    } catch (err) {
        container.innerHTML = `
            <p style="color:var(--red); text-align:center; padding:30px;">
                Failed to load event data.<br>
                <small style="color:var(--sub-text);">${err.message}</small>
            </p>`;
    }
}

async function fetchDivisionData(eventId, divId) {
    const [matchRes, rankRes, skillsRes, teamRes] = await Promise.all([
        fetch(`/api/robotevents?id=${eventId}&div=${divId}&type=matches`),
        fetch(`/api/robotevents?id=${eventId}&div=${divId}&type=rankings`),
        fetch(`/api/robotevents?id=${eventId}&type=skills`),
        fetch(`/api/robotevents?id=${eventId}&type=teams`)
    ]);
    const [matchData, rankData, skillsData, teamData] = await Promise.all([
        matchRes.json(), rankRes.json(), skillsRes.json(), teamRes.json()
    ]);
    cachedData.matches  = matchData.data  || [];
    cachedData.rankings = rankData.data   || [];
    cachedData.skills   = skillsData.data || [];
    cachedData.teams    = teamData.data   || [];
}

function renderDetailUI(container, divisions) {
    // Division dropdown — only shown if event has multiple divisions
    let divDropdown = '';
    if (divisions.length > 1) {
        const options = divisions.map(d =>
            `<option value="${d.id}" ${d.id === activeDivId ? 'selected' : ''}>${d.name}</option>`
        ).join('');
        divDropdown = `
            <div class="div-dropdown-wrap">
                <label class="div-dropdown-label">DIVISION</label>
                <select class="div-dropdown" onchange="switchDivision(parseInt(this.value))">
                    ${options}
                </select>
            </div>`;
    }

    container.innerHTML = `
        ${divDropdown}
        <div class="detail-tabs" id="detail-tabs">
            <button class="detail-tab active" id="tab-schedule" onclick="switchTab('schedule')">SCHEDULE</button>
            <button class="detail-tab" id="tab-rankings" onclick="switchTab('rankings')">RANKINGS</button>
            <button class="detail-tab" id="tab-skills" onclick="switchTab('skills')">SKILLS</button>
            <button class="detail-tab" id="tab-teams" onclick="switchTab('teams')">TEAMS</button>
        </div>
        <div id="tab-content"></div>`;
}

async function switchDivision(divId) {
    activeDivId = divId;
    const content = document.getElementById('tab-content');
    if (content) content.innerHTML = `
        <div style="text-align:center;padding:30px;color:var(--sub-text);">
            <div class="loading-spinner"></div>
        </div>`;
    await fetchDivisionData(currentEventId, divId);
    renderTab(activeTab);
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
    if (!matches.length) { container.innerHTML = emptyState('No match data available yet.'); return; }
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

// ── RANKINGS ─────────────────────────────────────────────────────────────────

function renderRankings(container) {
    const rankings = cachedData.rankings || [];
    if (!rankings.length) { container.innerHTML = emptyState('Rankings not available yet.'); return; }
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
                <span class="rank-col-stat">${r.wins??'–'}-${r.losses??'–'}-${r.ties??'–'}</span>
                <span class="rank-col-stat">${r.wp??'–'}</span>
                <span class="rank-col-stat">${r.sp??'–'}</span>
            </div>`;
    });
    container.innerHTML = html;
}

// ── SKILLS ───────────────────────────────────────────────────────────────────

function renderSkills(container) {
    const skills = cachedData.skills || [];
    if (!skills.length) { container.innerHTML = emptyState('Skills data not available for this event.'); return; }

    // Each entry = one attempt. Group by team, count attempts, track best score per type.
    const teamMap = {};
    skills.forEach(s => {
        const name = s.team?.name || '?';
        const type = s.type?.toLowerCase();
        const score = s.score ?? 0;
        if (!teamMap[name]) teamMap[name] = { team: name, driverBest: 0, driverAttempts: 0, progBest: 0, progAttempts: 0 };
        if (type === 'driver') {
            teamMap[name].driverAttempts++;
            teamMap[name].driverBest = Math.max(teamMap[name].driverBest, score);
        } else {
            teamMap[name].progAttempts++;
            teamMap[name].progBest = Math.max(teamMap[name].progBest, score);
        }
    });

    const sorted = Object.values(teamMap)
        .map(t => ({ ...t, total: t.driverBest + t.progBest }))
        .sort((a, b) => b.total - a.total);

    let html = `
        <div class="rank-header-row">
            <span class="rank-col-rank">RK</span>
            <span class="rank-col-team">TEAM</span>
            <span class="rank-col-skill">DRIVER</span>
            <span class="rank-col-skill">PROG</span>
            <span class="rank-col-skill" style="color:var(--primary)">TOTAL</span>
        </div>`;

    sorted.forEach((t, i) => {
        const rank = i + 1;
        const drv = t.driverAttempts > 0 ? `${t.driverBest}/${t.driverAttempts}` : '–';
        const prg = t.progAttempts   > 0 ? `${t.progBest}/${t.progAttempts}`     : '–';
        html += `
            <div class="rank-row ${rank <= 3 ? 'top-rank' : ''}">
                <span class="rank-col-rank">${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : '#'+rank}</span>
                <span class="rank-col-team">${t.team}</span>
                <span class="rank-col-skill">${drv}</span>
                <span class="rank-col-skill">${prg}</span>
                <span class="rank-col-skill" style="color:var(--primary);font-weight:900;">${t.driverBest + t.progBest}</span>
            </div>`;
    });
    container.innerHTML = html;
}

// ── TEAMS ────────────────────────────────────────────────────────────────────

function renderTeams(container) {
    const teams = cachedData.teams || [];
    if (!teams.length) { container.innerHTML = emptyState('Team list not available.'); return; }
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
