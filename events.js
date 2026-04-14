async function loadEvents(query = '') {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = '<p style="text-align:center; color:var(--sub-text); margin-top:20px;">Accessing RobotEvents...</p>';

    // Go back 30 days instead of 14 to ensure we catch recently finished events
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const dateString = thirtyDaysAgo.toISOString().split('T')[0] + 'T00:00:00Z';

    try {
        const response = await fetch(`/api/robotevents?search=${encodeURIComponent(query)}&start=${dateString}`);
        const result = await response.json();

        if (result.data && result.data.length > 0) {
            const events = result.data.map(e => ({
                name: e.name,
                location: `${e.location.city || ''}, ${e.location.region || ''}`,
                date: new Date(e.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                status: getStatus(e.start, e.end),
                sku: e.sku
            }));
            renderEvents(events);
        } else {
            list.innerHTML = `
                <div style="text-align:center; padding:20px;">
                    <p style="color:var(--sub-text);">No events found.</p>
                    <small style="color:#555">Try searching for a state like "Tennessee" or "Texas"</small>
                </div>`;
        }
    } catch (err) {
        list.innerHTML = '<p style="color:var(--red); text-align:center;">Connection lost. Check your internet or Vercel logs.</p>';
    }
}

function getStatus(start, end) {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    if (now >= s && now <= e) return 'Live';
    if (now > e) return 'Completed';
    return 'Upcoming';
}

function renderEvents(events) {
    const list = document.getElementById('event-list');
    list.innerHTML = '';
    
    events.forEach(e => {
        const statusClass = e.status.toLowerCase();
        list.innerHTML += `
            <div class="event-item" onclick="viewEventDetails('${e.sku}')">
                <div class="event-meta">${e.date} • ${e.location}</div>
                <span class="event-name">${e.name}</span>
                <div class="status-pill status-${statusClass}">${e.status.toUpperCase()}</div>
            </div>
        `;
    });
}

function viewEventDetails(sku) {
    alert("Viewing Matches for: " + sku);
}
