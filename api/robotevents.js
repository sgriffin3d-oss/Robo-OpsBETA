export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { search, start, sku, type } = req.query; // Added sku and type
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        return res.status(500).json({ error: "Server Configuration Error" });
    }

    let apiUrl;

    // Logic to switch between Event List, Matches, or Skills
    if (sku && type === 'matches') {
        // We try Division 1 as it is the standard for most events
        apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/divisions/1/matches`;
    } else if (sku && type === 'skills') {
        apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/skills`;
    } else {
        const urlObj = new URL('https://www.robotevents.com/api/v2/events');
        urlObj.searchParams.append('per_page', '50');
        urlObj.searchParams.append('sort', 'start');
        urlObj.searchParams.append('order', 'desc');
        if (start) urlObj.searchParams.append('start', start);
        if (search) urlObj.searchParams.append('name[]', search.trim());
        apiUrl = urlObj.toString();
    }

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'User-Agent': 'ParagonCoreX_V1_ScoutingApp'
            }
        });

        const data = await response.json();

        // FALLBACK: If Division 1 matches are empty, try the generic match endpoint
        if (sku && type === 'matches' && (!data.data || data.data.length === 0)) {
            const fallbackRes = await fetch(`https://www.robotevents.com/api/v2/events/${sku}/matches`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            return res.status(200).json(await fallbackRes.json());
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
