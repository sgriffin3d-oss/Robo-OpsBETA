let allEvents    = [];
let activeFilter = 'all';
let searchTimer  = null;
let lastEventId  = null;
let lastEventName = null;

function restoreLastEvent() {
    if (lastEventId !== null) {
        _openEventDetailView(lastEventId, lastEventName);
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

    list.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--sub-text);">
            <div class="loading-spinner"></div>
            <p style="margin-top:15px; font-size:0.85rem; letter-spacing:1px;">LOADING EVENTS...</p>
        </div>`;

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const dateStr     = twoWeeksAgo.toISOString().split('T')[0] + 'T00:00:00Z';
    const trimmed     = query.trim();
    const searchStart = trimmed
        ? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T00:00:00Z'
        : dateStr;

    try {
        const res  = await fetch(`/api/robotevents?search=${encodeURIComponent(trimmed)}&start=${searchStart}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();

        if (!result.data?.length) {
            list.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--sub-text);">
                    <p>No events found${query ? ` for "${query}"` : ''}.</p>
                    ${query ? `<button onclick="clearEventSearch()" style="margin-top:12px;background:var(--border);color:var(--text);border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:700;">CLEAR</button>` : ''}
                </div>`;
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

        // Reset filter to 'all' on a fresh load so the active state is always correct
        setEventFilter('all');

    } catch (err) {
        list.innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--red);">
                <p style="font-weight:800;">CONNECTION FAILED</p>
                <small style="color:var(--sub-text);">${err.message}</small><br>
                <button onclick="loadEvents()" style="margin-top:15px;background:var(--border);color:var(--text);border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:700;">RETRY</button>
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
    document.querySelectorAll('.evt-filter-btn').forEach(b => b.classList.remove('active'));
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
        list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--sub-text);font-size:0.85rem;">No ${activeFilter !== 'all' ? activeFilter : ''} events found.</div>`;
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

function formatEventDate(start, end) {
    const s = new Date(start), e = new Date(end);
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

function openEventDetail(id, name) {
    lastEventId   = id;
    lastEventName = name;
    detailOrigin  = 'events';
    _openEventDetailView(id, name);
}

function _openEventDetailView(id, name) {
    document.getElementById('detName').innerText = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-detail')?.classList.add('active');
    window.scrollTo(0, 0);
    if (typeof loadEventDeepData === 'function') loadEventDeepData(id);
}
