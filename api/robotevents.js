export default async function handler(req, res) {
    const { search, start } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        return res.status(500).json({ error: "Token Missing" });
    }

    // Use a broad search if no search term is provided
    let robotEventsUrl = `https://www.robotevents.com/api/v2/events?per_page=20`;
    
    if (start) robotEventsUrl += `&start=${start}`;
    if (search && search !== 'undefined' && search !== '') {
        robotEventsUrl += `&name[]=${encodeURIComponent(search)}`;
    }

    try {
        const response = await fetch(robotEventsUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: "Fetch failed" });
    }
}
