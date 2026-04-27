/**
 * events.js - Paragon Core X
 * Rebuilt: VEX VIA-inspired Events Hub with status filters
 */

let allEvents = [];
let activeFilter = 'all';

async function loadEvents(query = '') {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--sub-text);">
            <div class="loading-spinner"></div>
            <p style="margin-top:15px; font-size:0.85rem; letter-spacing:1px;">LOADING EVENTS...</p>
        </div>`;

    // Date window: 2 weeks ago to 4 weeks ahead to catch live + upcoming
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    const dateString = twoWeeksAgo.toISOString().split('T')[0] + 'T00:00:00Z';

    try {
        const url = `/api/robotevents?search=${encodeURIComponent(query)}&start=${dateString}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();

        if (!result.data || result.data.length === 0) {
            list.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--sub-text);">
                    <p style="font-size:0.9rem;">No events found${query ? ` for "${query}"` : ''}.</p>
                    ${query ? `<button onclick="clearEventSearch()" class="filter-clear-btn">Clear Search</button>` : ''}
                </div>`;
            return;
        }

        allEvents = result.data.map(e => ({
            name: e.name,
            city: e.location?.city || '',
            region: e.location?.region || '',
            start: e.start,
            end: e.end,
            status: getStatus(e.start, e.end),
            sku: e.sku,
            id: e.id
        }));

        renderFilteredEvents();

    } catch (err) {
        console.error('Events load error:', err);
        list.innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--red);">
                <p style="font-weight:800;">CONNECTION FAILED</p>
                <small style="color:var(--sub-text);">${err.message}</small><br>
                <button onclick="loadEvents()" style="margin-top:15px; background:var(--border); color:var(--text); border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:700;">RETRY</button>
            </div>`;
    }
}

function clearEventSearch() {
    const searchEl = document.getElementById('eventSearch');
    if (searchEl) searchEl.value = '';
    loadEvents('');
}

function setEventFilter(filter) {
    activeFilter = filter;
    document.querySelectorAll('.evt-filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('filter-' + filter);
    if (btn) btn.classList.add('active');
    renderFilteredEvents();
}

function renderFilteredEvents() {
    const list = document.getElementById('event-list');
    if (!list) return;

    let filtered = allEvents;
    if (activeFilter !== 'all') {
        filtered = allEvents.filter(e => e.status.toLowerCase() === activeFilter);
    }

    if (filtered.length === 0) {
        const labels = { live: 'live', upcoming: 'upcoming', completed: 'completed' };
        list.innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--sub-text);">
                <p style="font-size:0.85rem;">No ${labels[activeFilter] || ''} events found.</p>
            </div>`;
        return;
    }

    list.innerHTML = '';
    filtered.forEach(e => {
        const statusClass = e.status.toLowerCase();
        const location = [e.city, e.region].filter(Boolean).join(', ');
        const dateStr = formatEventDate(e.start, e.end);
        const safeName = e.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        list.innerHTML += `
            <div class="event-item" onclick="viewEventDetails(${e.id}, '${safeName}', '${e.status}')">
                <div class="event-item-top">
                    <div class="event-item-meta">${dateStr}${location ? ` &nbsp;·&nbsp; ${location}` : ''}</div>
                    <span class="status-pill status-${statusClass}">${e.status.toUpperCase()}</span>
                </div>
                <div class="event-item-name">${e.name}</div>
            </div>`;
    });
}

function formatEventDate(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const opts = { month: 'short', day: 'numeric' };
    if (s.toDateString() === e.toDateString()) {
        return s.toLocaleDateString(undefined, opts);
    }
    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}

function getStatus(start, end) {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    if (now >= s && now <= e) return 'Live';
    if (now > e) return 'Completed';
    return 'Upcoming';
}

function viewEventDetails(id, name, status) {
    document.getElementById('detName').innerText = name;
    nav('detail');
    if (typeof loadEventDeepData === 'function') {
        loadEventDeepData(id, status);
    }
}
