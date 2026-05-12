// ─── Events Browser ───────────────────────────────────────────────────────────

let allEvents    = [];
let activeFilter = 'all';
let searchTimer  = null;
let lastEventId   = null;
let lastEventName = null;

function restoreLastEvent() {
  if (lastEventId !== null) {
    openEventDetailView(lastEventId, lastEventName);
  } else {
    if (!allEvents.length) loadEvents();
  }
}

function clearEventState() {
  lastEventId   = null;
  lastEventName = null;
}

function onEventSearch(value) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadEvents(value), 450);
}

async function loadEvents(query = '') {
  const list = document.getElementById('event-list');
  if (!list) return;

  list.innerHTML = loadingHTML('LOADING EVENTS...');

  // Default: events from 2 weeks ago onwards. When searching, go back a year.
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const oneYearAgo  = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const trimmed     = query.trim();
  const startDate   = trimmed ? oneYearAgo : twoWeeksAgo;
  const startStr    = startDate.toISOString().split('T')[0] + 'T00:00:00Z';

  try {
    const res    = await fetch(`/api/robotevents?search=${encodeURIComponent(trimmed)}&start=${startStr}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();

    if (!result.data?.length) {
      list.innerHTML = noResultsHTML(query);
      return;
    }

    allEvents = result.data.map(e => ({
      id:     e.id,
      name:   e.name,
      city:   e.location?.city   || '',
      region: e.location?.region || '',
      start:  e.start,
      end:    e.end,
      status: getEventStatus(e.start, e.end),
    }));

    // Reset filter so the active state is always correct after a fresh load
    setEventFilter('all');

  } catch (err) {
    list.innerHTML = `
      <div class="state-center state-error">
        <p class="state-error-title">CONNECTION FAILED</p>
        <small>${err.message}</small>
        <button class="btn-secondary state-retry" onclick="loadEvents()">RETRY</button>
      </div>`;
  }
}

function clearEventSearch() {
  const el = document.getElementById('eventSearch');
  if (el) el.value = '';
  loadEvents('');
}

function setEventFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll('.evt-filter-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('filter-' + filter)?.classList.add('active');
  renderFilteredEvents();
}

function renderFilteredEvents() {
  const list = document.getElementById('event-list');
  if (!list) return;

  const filtered = activeFilter === 'all'
    ? allEvents
    : allEvents.filter(e => e.status.toLowerCase() === activeFilter);

  if (!filtered.length) {
    list.innerHTML = `<div class="state-center state-empty">No ${activeFilter !== 'all' ? activeFilter : ''} events found.</div>`;
    return;
  }

  list.innerHTML = filtered.map(e => {
    const loc      = [e.city, e.region].filter(Boolean).join(', ');
    const dateStr  = formatEventDate(e.start, e.end);
    const safeName = e.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `
      <div class="event-item" onclick="openEventDetail(${e.id}, '${safeName}')">
        <div class="event-item-top">
          <div class="event-item-meta">${dateStr}${loc ? ` · ${loc}` : ''}</div>
          <span class="status-pill status-${e.status.toLowerCase()}">${e.status.toUpperCase()}</span>
        </div>
        <div class="event-item-name">${e.name}</div>
      </div>`;
  }).join('');
}

function noResultsHTML(query) {
  return `
    <div class="state-center">
      <p>No events found${query ? ` for "${query}"` : ''}.</p>
      ${query ? `<button class="btn-secondary state-retry" onclick="clearEventSearch()">CLEAR</button>` : ''}
    </div>`;
}

// ─── Date & Status Helpers ────────────────────────────────────────────────────

function formatEventDate(start, end) {
  const s    = new Date(start);
  const e    = new Date(end);
  const opts = { month: 'short', day: 'numeric' };
  return s.toDateString() === e.toDateString()
    ? s.toLocaleDateString(undefined, opts)
    : `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}

function getEventStatus(start, end) {
  const now = new Date();
  if (now >= new Date(start) && now <= new Date(end)) return 'Live';
  if (now > new Date(end)) return 'Completed';
  return 'Upcoming';
}

// ─── Navigation ───────────────────────────────────────────────────────────────

function openEventDetail(id, name) {
  lastEventId   = id;
  lastEventName = name;
  detailOrigin  = 'events';
  openEventDetailView(id, name);
}

function openEventDetailView(id, name) {
  document.getElementById('detName').innerText = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-detail')?.classList.add('active');
  window.scrollTo(0, 0);
  if (typeof loadEventDeepData === 'function') loadEventDeepData(id);
}

// ─── Shared loading helper (also used in details.js) ─────────────────────────

function loadingHTML(message = '') {
  return `
    <div class="state-center">
      <div class="loading-spinner"></div>
      ${message ? `<p class="state-label">${message}</p>` : ''}
    </div>`;
}
