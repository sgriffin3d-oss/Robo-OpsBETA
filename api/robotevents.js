/**
 * api/robotevents.js - Paragon Core X
 * Enhanced Intelligent Proxy for RobotEvents v2
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { search, start, sku, type } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) return res.status(500).json({ error: "API Token Missing" });

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'ParagonCoreX_V1_Scout'
    };

    try {
        let apiUrl;

        // 1. Handle Skills
        if (sku && type === 'skills') {
            apiUrl = `https://www.robotevents.com/api/v2/events/${sku}/skills`;
            const response = await fetch(apiUrl, { headers });
            const data = await response.json();
            return res.status(200).json(data);
        }

        // 2. Handle Matches (The Complex Part)
        if (sku && type === 'matches') {
            // Attempt 1: Division 1 (Standard for most events)
            let matchUrl = `https://www.robotevents.com/api/v2/events/${sku}/divisions/1/matches`;
            let response = await fetch(matchUrl, { headers });
            let data = await response.json();

            // Attempt 2: If Division 1 is empty, try the generic event matches
            if (!data.data || data.data.length === 0) {
                matchUrl = `https://www.robotevents.com/api/v2/events/${sku}/matches`;
                response = await fetch(matchUrl, { headers });
                data = await response.json();
            }

            return res.status(200).json(data);
        }

        // 3. Handle General Event List
        const urlObj = new URL('https://www.robotevents.com/api/v2/events');
        urlObj.searchParams.append('per_page', '50');
        urlObj.searchParams.append('sort', 'start');
        urlObj.searchParams.append('order', 'desc');
        if (start) urlObj.searchParams.append('start', start);
        if (search) urlObj.searchParams.append('name[]', search.trim());

        const response = await fetch(urlObj.toString(), { headers });
        const data = await response.json();
        return res.status(200).json(data);

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
