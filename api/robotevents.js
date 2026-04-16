export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { search, start, sku, type } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) return res.status(500).json({ error: "Server Configuration Error" });

    let apiUrl;

    // Route logic: Determine which RobotEvents endpoint to hit
    if (sku && type === 'matches') {
        apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/matches`;
    } else if (sku && type === 'skills') {
        apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/skills`;
    } else {
        // Default: Fetch event list
        apiUrl = new URL('https://www.robotevents.com/api/v2/events');
        apiUrl.searchParams.append('per_page', '50');
        apiUrl.searchParams.append('sort', 'start');
        apiUrl.searchParams.append('order', 'desc');
        if (start) apiUrl.searchParams.append('start', start);
        if (search) apiUrl.searchParams.append('name[]', search.trim());
        apiUrl = apiUrl.toString();
    }

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'User-Agent': 'ParagonCoreX_V1'
            }
        });

        if (!response.ok) return res.status(response.status).json({ error: "API Error" });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
