export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { search, start, sku, type } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) return res.status(500).json({ error: "Token Missing" });

    let apiUrl;

    // Route to specific sub-resource if SKU and TYPE are provided
    if (sku && type === 'matches') {
        apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/matches`;
    } else if (sku && type === 'skills') {
        apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/skills`;
    } else {
        // Default: List events
        const urlObj = new URL('https://www.robotevents.com/api/v2/events');
        urlObj.searchParams.append('per_page', '50');
        if (start) urlObj.searchParams.append('start', start);
        if (search) urlObj.searchParams.append('name[]', search.trim());
        apiUrl = urlObj.toString();
    }

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'User-Agent': 'ParagonCoreX_V1'
            }
        });

        const data = await response.json();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
