/**
 * events.js - Paragon Core X
 * Handles RobotEvents API integration via Vercel Serverless Proxy
 */

async function loadEvents(query = '') {
    const list = document.getElementById('event-list');
    if (!list) return;

    // 1. Show Loading State
    list.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--sub-text);">
            <div class="loading-spinner"></div>
            <p style="margin-top:15px;">Accessing RobotEvents...</p>
        </div>`;

    // 2. Define Date Window (Look back 7 days to catch recent stuff, but keep it fresh)
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const dateString = oneWeekAgo.toISOString().split('T')[0] + 'T00:00:00Z';

    try {
        // 3. Fetch from your Vercel Proxy
        // We encode the query to handle spaces and special characters
        const url = `/api/robotevents?search=${encodeURIComponent(query)}&start=${dateString}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        // 4. Handle Empty Results
        if (!result.data || result.data.length === 0) {
            list.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--sub-text);">
                    <p>No current events found for "${query || 'Recent'}"</p>
                    <button onclick="loadEvents('')" style="background:var(--border); color:var(--text); border:none; padding:10px 20px; border-radius:8px; margin-top:10px; cursor:pointer;">Clear Search</button>
                </div>`;
            return;
        }

        // 5. Map and Render Data
        const events = result.data.map(e => ({
            name: e.name,
            location: `${e.location.city || 'Unknown'}, ${e.location.region || ''}`,
            date: new Date(e.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            status: getStatus(e.start, e.end),
            sku: e.sku,
            id: e.id // Added ID for deeper API navigation
        }));

        renderEvents(events);

    } catch (err) {
        console.error("Scout Error:", err);
        list.innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--red);">
                <p><b>API Connection Failed</b></p>
                <small>${err.message}</small><br><br>
                <small style="color:var(--sub-text)">Verify ROBOT_EVENTS_TOKEN is set in Vercel Environment Variables.</small>
            </div>`;
    }
}

/**
 * Determines the status of the event based on current time
 */
function getStatus(start, end) {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    
    if (now >= s && now <= e) return 'Live';
    if (now > e) return 'Completed';
    return 'Upcoming';
}

/**
 * Injects the event cards into the HTML
 */
function renderEvents(events) {
    const list = document.getElementById('event-list');
    list.innerHTML = '';
    
    events.forEach(e => {
        const statusClass = e.status.toLowerCase();
        // Updated to pass both ID and name to the detail view
        list.innerHTML += `
            <div class="event-item" onclick="viewEventDetails('${e.id}', '${e.name.replace(/'/g, "\\'")}')">
                <div class="event-meta">
                    <span>${e.date}</span>
                    <span style="margin: 0 5px; opacity: 0.5;">•</span>
                    <span>${e.location}</span>
                </div>
                <span class="event-name">${e.name}</span>
                <div class="status-pill status-${statusClass}">${e.status.toUpperCase()}</div>
            </div>
        `;
    });
}

/**
 * Action when clicking an event card. 
 * Navigates to the detail view and triggers the deep data fetch from details.js.
 */
function viewEventDetails(id, name) {
    const detName = document.getElementById('detName');
    if (detName) detName.innerText = name;
    
    // Navigate using the existing view manager
    if (typeof nav === 'function') {
        nav('detail');
    }

    // Call the deep fetch logic from details.js
    if (typeof loadEventDeepData === 'function') {
        loadEventDeepData(id);
    }
}
