/**
 * details.js - Paragon Core X
 * Rebuilt: Tabbed event detail view (Rankings, Schedule, Skills, Teams)
 * Fixed API response parsing for RobotEvents v2
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

    // Inject tab bar + content area
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

    // Kick off all 4 fetches in parallel
    try {
        const [matchRes, skillsRes, rankRes, teamRes] = await Promise.all([
            fetch(`/api/robotevents?id=${id}&type=matches`),
            fetch(`/api/robotevents?id=${id}&type=skills`),
            fetch(`/api/robotevents?id=${id}&type=rankings`),
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
            teams: teamData.data || []
        };

        renderTab('schedule');

    } catch (err) {
        document.getElementById('tab-content').innerHTML = `
            <p style="color:var(--red); text-align:center; padding:30px;">
                Failed to load event data.<br><small>${err.message}</small>
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

    // Sort by match name naturally (Q1, Q2 ... SF1, F1)
    const sorted = [...matches].sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return a.matchnum - b.matchnum;
    });

    let html = '';
    sorted.forEach(m => {
        const redAlliance = m.alliances?.find(a => a.color === 'red') || m.alliances?.[0];
        const blueAlliance = m.alliances?.find(a => a.color === 'blue') || m.alliances?.[1];
        if (!redAlliance || !blueAlliance) return;

        const redTeams = (redAlliance.teams || []).map(t => t.team?.name || t.team?.id || '?').join(' & ');
        const blueTeams = (blueAlliance.teams || []).map(t => t.team?.name || t.team?.id || '?').join(' & ');

        // Score of -1 means not yet played in RobotEvents API
        const redScore = redAlliance.score ?? -1;
        const blueScore = blueAlliance.score ?? -1;
        const isPlayed = redScore >= 0 && blueScore >= 0;

        let winnerClass = '';
        if (isPlayed) {
            if (redScore > blueScore) winnerClass = 'red';
            else if (blueScore > redScore) winnerClass = 'blue';
            else winnerClass = 'tie';
        }

        html += `
            <div class="match-card ${isPlayed ? 'played' : ''}">
                <div class="match-header">
                    <span class="match-name">${m.name || 'Match'}</span>
                    <span class="match-status">${isPlayed ? 'FINAL' : 'UPCOMING'}</span>
                </div>
                <div class="match-body">
                    <div class="match-alliance red ${winnerClass === 'red' ? 'winner' : ''}">
                        <span class="alliance-teams">${redTeams}</span>
                        ${isPlayed ? `<span class="alliance-score">${redScore}</span>` : ''}
                    </div>
                    <div class="match-vs">VS</div>
                    <div class="match-alliance blue ${winnerClass === 'blue' ? 'winner' : ''}">
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
        const team = r.team?.name || r.team?.id || '?';
        const wins = r.wins ?? '–';
        const losses = r.losses ?? '–';
        const ties = r.ties ?? '–';
        const wp = r.wp ?? '–';
        const sp = r.sp ?? '–';
        const isTop3 = r.rank <= 3;

        html += `
            <div class="rank-row ${isTop3 ? 'top-rank' : ''}">
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

    // Group by team, keep highest combined score
    const teamMap = {};
    skills.forEach(s => {
        const teamName = s.team?.name || s.team?.id || '?';
        const type = s.type?.toLowerCase(); // 'driver' or 'programming'
        if (!teamMap[teamName]) teamMap[teamName] = { team: teamName, driver: 0, prog: 0, rank: s.rank ?? 999 };
        if (type === 'driver' || type === 'driver control') {
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

    const sorted = [...teams].sort((a, b) => {
        const na = a.team?.name || a.name || '';
        const nb = b.team?.name || b.name || '';
        return na.localeCompare(nb, undefined, { numeric: true });
    });

    let html = '';
    sorted.forEach(t => {
        // RobotEvents returns team data differently depending on endpoint
        const name = t.team?.name || t.name || '?';
        const org = t.team?.organization || t.organization || '';
        const loc = [t.team?.location?.city, t.team?.location?.region]
            .filter(Boolean).join(', ') || [t.location?.city, t.location?.region].filter(Boolean).join(', ');

        html += `
            <div class="team-row">
                <div class="team-number">${name}</div>
                <div class="team-info">
                    ${org ? `<div class="team-org">${org}</div>` : ''}
                    ${loc ? `<div class="team-loc">${loc}</div>` : ''}
                </div>
            </div>`;
    });

    container.innerHTML = html || emptyState('No teams to display.');
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function emptyState(msg) {
    return `<div style="text-align:center; padding:40px; color:var(--sub-text); font-size:0.85rem;">${msg}</div>`;
}
