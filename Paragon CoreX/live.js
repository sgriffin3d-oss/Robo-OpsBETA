let liveTimer = null;
let currentEventId = null;
let activeTab = 'matches';

function nav(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + id).classList.add('active');
    
    // Stop refresh if we leave the live view
    if (id !== 'live') {
        clearInterval(liveTimer);
        liveTimer = null;
    }
}

async function startLiveRefresh() {
    const sku = document.getElementById('sku-input').value.trim();
    if (!sku) return alert("Please enter an SKU");

    document.getElementById('refresh-status').innerText = "Connecting...";
    
    try {
        const res = await fetch(`/api?path=/events?sku[]=${sku}`);
        const json = await res.json();
        if (json.data && json.data.length > 0) {
            currentEventId = json.data[0].id;
            updateData();
            if (liveTimer) clearInterval(liveTimer);
            liveTimer = setInterval(updateData, 30000); // 30 second refresh
        } else {
            alert("Event not found");
        }
    } catch (e) {
        console.error(e);
        alert("Connection Error. Check Vercel Proxy.");
    }
}

async function updateData() {
    if (!currentEventId) return;
    const status = document.getElementById('refresh-status');
    status.innerText = "Updating...";

    if (activeTab === 'matches') {
        const res = await fetch(`/api?path=/events/${currentEventId}/divisions/1/matches`);
        const data = await res.json();
        renderMatches(data.data);
    } else if (activeTab === 'rankings') {
        const res = await fetch(`/api?path=/events/${currentEventId}/divisions/1/rankings`);
        const data = await res.json();
        renderRankings(data.data);
    } else if (activeTab === 'skills') {
        const res = await fetch(`/api?path=/events/${currentEventId}/skills`);
        const data = await res.json();
        renderSkills(data.data);
    }
    
    const now = new Date();
    status.innerText = "Live • Last updated: " + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
}

function switchLiveTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-b').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    updateData();
}

function renderMatches(matches) {
    const container = document.getElementById('live-content');
    if (!matches || matches.length === 0) {
        container.innerHTML = "<p>No matches found.</p>";
        return;
    }

    // Sort by match order, show last 10
    const html = matches.slice(-10).reverse().map(m => {
        const red = m.alliances.find(a => a.color === 'red');
        const blue = m.alliances.find(a => a.color === 'blue');
        return `
            <div class="match-card">
                <div class="m-header"><span>${m.name}</span> <span>${m.field || ''}</span></div>
                <div class="alliances">
                    <div class="red-t">${red.teams.map(t => t.team.number).join(' ')}</div>
                    <div class="vs-box">${m.scored ? red.score + '-' + blue.score : 'VS'}</div>
                    <div class="blue-t">${blue.teams.map(t => t.team.number).join(' ')}</div>
                </div>
            </div>
        `;
    }).join('');
    container.innerHTML = html;
}

function renderRankings(ranks) {
    const container = document.getElementById('live-content');
    let html = `<table class="rank-table">
        <tr><th>#</th><th>Team</th><th>W-L-T</th><th>WP</th></tr>`;
    
    html += ranks.map(r => `
        <tr>
            <td>${r.rank}</td>
            <td style="color:var(--primary); font-weight:bold;">${r.team.number}</td>
            <td>${r.wins}-${r.losses}-${r.ties}</td>
            <td>${r.wp}</td>
        </tr>
    `).join('');
    
    html += `</table>`;
    container.innerHTML = html;
}

function renderSkills(skills) {
    const container = document.getElementById('live-content');
    // Sort by rank
    const html = `<table class="rank-table">
        <tr><th>Team</th><th>Total</th><th>Prog</th><th>Driver</th></tr>`;
    
    html += skills.map(s => `
        <tr>
            <td style="color:var(--primary); font-weight:bold;">${s.team.number}</td>
            <td><b>${s.score}</b></td>
            <td>${s.attempts.find(a => a.type === 'programming')?.score || 0}</td>
            <td>${s.attempts.find(a => a.type === 'driver')?.score || 0}</td>
        </tr>
    `).join('');
    
    html += `</table>`;
    container.innerHTML = html;
}