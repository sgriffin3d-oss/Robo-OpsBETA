// ─── Event Detail View ────────────────────────────────────────────────────────

let currentEventId = null;
let activeTab      = 'schedule';
let activeDivId    = null;
let cachedData     = {};

async function loadEventDeepData(id) {
  currentEventId = id;
  activeTab      = 'schedule';
  activeDivId    = null;
  cachedData     = {};

  const container = document.getElementById('detHistory');
  if (!container) return;

  container.innerHTML = loadingHTML('FETCHING DATA...');

  try {
    const raw       = await apiFetch(`/api/robotevents?id=${id}`);
    const eventObj  = raw.data ?? raw;
    const divisions = eventObj.divisions || [];
    activeDivId     = divisions[0]?.id ?? 1;
    cachedData.divisions = divisions;

    await fetchDivisionData(id, activeDivId);
    renderDetailUI(container, divisions);
    renderTab('schedule');

  } catch (err) {
    container.innerHTML = errorHTML(err.message);
  }
}

async function fetchDivisionData(eventId, divId) {
  const [matchData, rankData, skillsData, teamData] = await Promise.all([
    apiFetch(`/api/robotevents?id=${eventId}&div=${divId}&type=matches`),
    apiFetch(`/api/robotevents?id=${eventId}&div=${divId}&type=rankings`),
    apiFetch(`/api/robotevents?id=${eventId}&type=skills`),
    apiFetch(`/api/robotevents?id=${eventId}&type=teams`),
  ]);
  cachedData.matches  = matchData.data  || [];
  cachedData.rankings = rankData.data   || [];
  cachedData.skills   = skillsData.data || [];
  cachedData.teams    = teamData.data   || [];
}

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderDetailUI(container, divisions) {
  const divSelector = divisions.length > 1 ? `
    <div class="div-select-row">
      <span class="div-select-label">DIV</span>
      <div class="div-select-wrap">
        <select class="div-select" onchange="switchDivision(parseInt(this.value))">
          ${divisions.map(d => `<option value="${d.id}" ${d.id === activeDivId ? 'selected' : ''}>${d.name}</option>`).join('')}
        </select>
        <span class="div-select-arrow">▾</span>
      </div>
    </div>` : '';

  container.innerHTML = `
    ${divSelector}
    <div class="detail-tabs">
      <button class="detail-tab active" id="tab-schedule" onclick="switchTab('schedule')">SCHEDULE</button>
      <button class="detail-tab"        id="tab-rankings" onclick="switchTab('rankings')">RANKINGS</button>
      <button class="detail-tab"        id="tab-skills"   onclick="switchTab('skills')">SKILLS</button>
      <button class="detail-tab"        id="tab-teams"    onclick="switchTab('teams')">TEAMS</button>
    </div>
    <div id="tab-content"></div>`;
}

async function switchDivision(divId) {
  activeDivId = divId;
  const content = document.getElementById('tab-content');
  if (content) content.innerHTML = loadingHTML();
  await fetchDivisionData(currentEventId, divId);
  renderTab(activeTab);
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.detail-tab').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab-' + tab)?.classList.add('active');
  renderTab(tab);
}

function renderTab(tab) {
  const content = document.getElementById('tab-content');
  if (!content) return;
  const renderers = { schedule: renderSchedule, rankings: renderRankings, skills: renderSkills, teams: renderTeams };
  renderers[tab]?.(content);
}

// ─── Tab Renderers ────────────────────────────────────────────────────────────

function renderSchedule(container) {
  const matches = cachedData.matches || [];
  if (!matches.length) { container.innerHTML = emptyState('No match data available yet.'); return; }

  const sorted = [...matches].sort((a, b) =>
    a.round !== b.round ? a.round - b.round : a.matchnum - b.matchnum
  );

  container.innerHTML = sorted.map(match => {
    const red  = match.alliances?.find(a => a.color === 'red')  || match.alliances?.[0];
    const blue = match.alliances?.find(a => a.color === 'blue') || match.alliances?.[1];
    if (!red || !blue) return '';

    const redTeams  = (red.teams  || []).map(t => t.team?.name || '?').join(' / ');
    const blueTeams = (blue.teams || []).map(t => t.team?.name || '?').join(' / ');
    const rs        = red.score;
    const bs        = blue.score;
    const played    = typeof rs === 'number' && rs >= 0 && typeof bs === 'number' && bs >= 0;
    const time      = match.started   ? `Started ${formatMatchTime(match.started)}`
                    : match.scheduled ? `Sched. ${formatMatchTime(match.scheduled)}`
                    : '';

    return `
      <div class="match-card ${played ? 'played' : ''}">
        <div class="match-header">
          <span class="match-name">${match.name || 'Match'}</span>
          <div class="match-header-right">
            ${time ? `<span class="match-time">${time}</span>` : ''}
            <span class="match-status">${played ? 'FINAL' : 'UPCOMING'}</span>
          </div>
        </div>
        <div class="match-body">
          <div class="match-alliance red ${played && rs > bs ? 'winner' : ''}">
            <span class="alliance-teams">${redTeams}</span>
            ${played ? `<span class="alliance-score">${rs}</span>` : ''}
          </div>
          <div class="match-vs">VS</div>
          <div class="match-alliance blue ${played && bs > rs ? 'winner' : ''}">
            ${played ? `<span class="alliance-score">${bs}</span>` : ''}
            <span class="alliance-teams">${blueTeams}</span>
          </div>
        </div>
      </div>`;
  }).join('') || emptyState('No matches to display.');
}

function renderRankings(container) {
  const rankings = cachedData.rankings || [];
  if (!rankings.length) { container.innerHTML = emptyState('Rankings not available yet.'); return; }

  const sorted = [...rankings].sort((a, b) => a.rank - b.rank);
  const medals = ['🥇', '🥈', '🥉'];

  container.innerHTML = `
    <div class="rank-header-row">
      <span class="rank-col-rank">RK</span>
      <span class="rank-col-team">TEAM</span>
      <span class="rank-col-stat">W-L-T</span>
      <span class="rank-col-stat">WP</span>
      <span class="rank-col-stat">SP</span>
    </div>
    ${sorted.map(r => `
      <div class="rank-row ${r.rank <= 3 ? 'top-rank' : ''}">
        <span class="rank-col-rank">${r.rank <= 3 ? medals[r.rank - 1] : '#' + r.rank}</span>
        <span class="rank-col-team">${r.team?.name || '?'}</span>
        <span class="rank-col-stat">${r.wins ?? '–'}-${r.losses ?? '–'}-${r.ties ?? '–'}</span>
        <span class="rank-col-stat">${r.wp ?? '–'}</span>
        <span class="rank-col-stat">${r.sp ?? '–'}</span>
      </div>`).join('')}`;
}

function renderSkills(container) {
  const skills = cachedData.skills || [];
  if (!skills.length) { container.innerHTML = emptyState('Skills data not available for this event.'); return; }

  // Group runs by team, keeping best score per type
  const teamMap = {};
  skills.forEach(run => {
    const name  = run.team?.name || '?';
    const type  = run.type?.toLowerCase();
    const score = run.score ?? 0;
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

  const medals = ['🥇', '🥈', '🥉'];

  container.innerHTML = `
    <div class="rank-header-row">
      <span class="rank-col-rank">RK</span>
      <span class="rank-col-team">TEAM</span>
      <span class="rank-col-skill">DRIVER</span>
      <span class="rank-col-skill">PROG</span>
      <span class="rank-col-skill rank-col-skill--total">TOTAL</span>
    </div>
    ${sorted.map((t, i) => {
      const rank = i + 1;
      const drv  = t.driverAttempts > 0 ? `${t.driverBest}/${t.driverAttempts}` : '–';
      const prg  = t.progAttempts   > 0 ? `${t.progBest}/${t.progAttempts}`     : '–';
      return `
        <div class="rank-row ${rank <= 3 ? 'top-rank' : ''}">
          <span class="rank-col-rank">${rank <= 3 ? medals[rank - 1] : '#' + rank}</span>
          <span class="rank-col-team">${t.team}</span>
          <span class="rank-col-skill">${drv}</span>
          <span class="rank-col-skill">${prg}</span>
          <span class="rank-col-skill rank-col-skill--total">${t.total}</span>
        </div>`;
    }).join('')}`;
}

function renderTeams(container) {
  const teams = cachedData.teams || [];
  if (!teams.length) { container.innerHTML = emptyState('Team list not available.'); return; }

  const sorted = [...teams].sort((a, b) => {
    const na = a.number || a.team_name || '';
    const nb = b.number || b.team_name || '';
    return na.localeCompare(nb, undefined, { numeric: true });
  });

  container.innerHTML = sorted.map(t => {
    const number = t.number || t.team_name || '?';
    const name   = t.team_name && t.team_name !== number ? t.team_name : '';
    const org    = t.organization || '';
    const loc    = [t.location?.city, t.location?.region].filter(Boolean).join(', ');
    return `
      <div class="team-row">
        <div class="team-number">${number}</div>
        <div class="team-info">
          ${name ? `<div class="team-org team-org--bold">${name}</div>` : ''}
          ${org  ? `<div class="team-org">${org}</div>`                 : ''}
          ${loc  ? `<div class="team-loc">${loc}</div>`                 : ''}
        </div>
      </div>`;
  }).join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMatchTime(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function loadingHTML(message = '') {
  return `
    <div class="state-center">
      <div class="loading-spinner"></div>
      ${message ? `<p class="state-label">${message}</p>` : ''}
    </div>`;
}

function errorHTML(message) {
  return `
    <div class="state-center state-error">
      <p>Failed to load.</p>
      <small>${message}</small>
    </div>`;
}

function emptyState(message) {
  return `<div class="state-center state-empty">${message}</div>`;
}
