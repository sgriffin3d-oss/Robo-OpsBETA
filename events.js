async function loadEvents(query = '') {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = '<p style="text-align:center; color:var(--sub-text); margin-top:20px;">Contacting RobotEvents...</p>';

    // Go back 6 months to be safe
    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    const dateString = sixMonthsAgo.toISOString().split('T')[0] + 'T00:00:00Z';

    try {
        const url = `/api/robotevents?search=${encodeURIComponent(query)}&start=${dateString}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const result = await response.json();
        console.log("RobotEvents Data:", result); // Look at this in your browser Inspect tool

        if (result.data && result.data.length > 0) {
            const events = result.data.map(e => ({
                name: e.name,
                location: `${e.location.city || 'Unknown'}, ${e.location.region || ''}`,
                date: new Date(e.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                status: getStatus(e.start, e.end),
                sku: e.sku
            }));
            renderEvents(events);
        } else {
            list.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--sub-text);">
                    <p>No events found for "${query || 'Recent'}"</p>
                    <button onclick="loadEvents('Worlds')" style="background:var(--primary); border:none; padding:10px; border-radius:8px; margin-top:10px;">Try Searching 'Worlds'</button>
                </div>`;
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        list.innerHTML = `
            <div style="text-align:center; padding:20px; color:var(--red);">
                <p><b>Connection Error</b></p>
                <small>${err.message}</small><br>
                <small style="color:#666">Check Vercel Logs for ROBOT_EVENTS_TOKEN issues.</small>
            </div>`;
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
    alert("Event SKU: " + sku + "\nMatch list feature coming in next update!");
}
