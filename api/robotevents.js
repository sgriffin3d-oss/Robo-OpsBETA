/**
 * api/robotevents.js - Paragon Core X Backend
 * Robust API proxy for RobotEvents v2
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { search, start, sku, type } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        return res.status(500).json({ error: "Token Missing in Vercel Env" });
    }

    try {
        let apiUrl;

        // ROUTE 1: Specific Match Data
        if (sku && type === 'matches') {
            // We try the standard division 1 path first
            apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/divisions/1/matches`;
        } 
        // ROUTE 2: Specific Skills Data
        else if (sku && type === 'skills') {
            apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/skills`;
        } 
        // ROUTE 3: General Event List
        else {
            const urlObj = new URL('https://www.robotevents.com/api/v2/events');
            urlObj.searchParams.append('per_page', '50');
            urlObj.searchParams.append('sort', 'start');
            urlObj.searchParams.append('order', 'desc');
            if (start) urlObj.searchParams.append('start', start);
            if (search) urlObj.searchParams.append('name[]', search.trim());
            apiUrl = urlObj.toString();
        }

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'User-Agent': 'ParagonCoreX_V1'
            }
        });

        let data = await response.json();

        // FALLBACK: If Division 1 returned nothing for matches, try the generic endpoint
        if (sku && type === 'matches' && (!data.data || data.data.length === 0)) {
            const fallbackUrl = `https://www.robotevents.com/api/v2/events/${sku}/matches`;
            const fallbackRes = await fetch(fallbackUrl, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });
            data = await fallbackRes.json();
        }

        return res.status(200).json(data);

    } catch (err) {
        console.error("Vercel Proxy Error:", err);
        return res.status(500).json({ error: err.message });
    }
}
