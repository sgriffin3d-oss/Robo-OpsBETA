export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { search, start, sku, type } = req.query; // Now listening for SKU and TYPE
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) return res.status(500).json({ error: "API Token Missing" });

    let apiUrl;

    // ROUTE 1: Fetch Matches for a specific tournament
    if (sku && type === 'matches') {
        // Most events store matches in Division 1
        apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/divisions/1/matches`;
    } 
    // ROUTE 2: Fetch Skills for a specific tournament
    else if (sku && type === 'skills') {
        apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/skills`;
    } 
    // ROUTE 3: General Event List (Default)
    else {
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

        // FALLBACK: If Division 1 was empty, try the general event match list
        if (sku && type === 'matches' && (!data.data || data.data.length === 0)) {
            const fallback = await fetch(`https://www.robotevents.com/api/v2/events/${sku}/matches`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            return res.status(200).json(await fallback.json());
        }

        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
