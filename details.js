window.loadEventDetails = async function(sku) {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = `<div style="text-align:center; padding:40px;"><div class="loading-spinner"></div><p>Syncing Live Match Data...</p></div>`;

    try {
        const [matchRes, skillsRes] = await Promise.all([
            fetch(`/api/robotevents?sku=${sku}&type=matches`),
            fetch(`/api/robotevents?sku=${sku}&type=skills`)
        ]);

        const matches = await matchRes.json();
        const skills = await skillsRes.json();

        // IMPORTANT: RobotEvents data is always inside the .data array
        renderDetailsView(sku, matches.data || [], skills.data || []);
    } catch (err) {
        list.innerHTML = `<p style="color:var(--red); text-align:center;">Sync Failed: ${err.message}</p>`;
    }
};
