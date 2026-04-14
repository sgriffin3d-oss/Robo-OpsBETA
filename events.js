async function loadEvents(query = '') {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = '<p style="text-align:center; color:var(--sub-text); margin-top:20px;">Searching RobotEvents...</p>';

    // Look back 2 weeks to show current/recent events
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString();

    try {
        const response = await fetch(`/api/robotevents?search=${query}&start=${twoWeeksAgo}`);
        const result = await response.json();

        if (result.data && result.data.length > 0) {
            const events = result.data.map(e => ({
                name: e.name,
                location: `${e.location.city}, ${e.location.region}`,
                date: new Date(e.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                status: getStatus(e.start, e.end),
                sku: e.sku
            }));
            renderEvents(events);
        } else {
            list.innerHTML = '<p style="text-align:center; color:var(--sub-text);">No events found in this range.</p>';
        }
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p style="color:var(--red); text-align:center;">API Error. Check Vercel Logs.</p>';
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
    // Next feature: Fetching /matches and /skills for this SKU
    alert("SKU Selected: " + sku);
}