export default async function handler(req, res) {
    // 1. Set CORS headers so any device/browser can talk to this function
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { search, start } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        console.error("CRITICAL: ROBOT_EVENTS_TOKEN is missing in Vercel Environment Variables.");
        return res.status(500).json({ error: "Server Configuration Error" });
    }

    // 2. Use the WHATWG URL API (Fixes the [DEP0169] warning)
    const apiUrl = new URL('https://www.robotevents.com/api/v2/events');
    apiUrl.searchParams.append('per_page', '50');
    apiUrl.searchParams.append('sort', 'start');
    apiUrl.searchParams.append('order', 'desc');

    if (start) apiUrl.searchParams.append('start', start);
    if (search && search.trim() !== "") {
        apiUrl.searchParams.append('name[]', search.trim());
    }

    try {
        const response = await fetch(apiUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                // 3. Hardcoding a User-Agent prevents browsers from injecting 
                // their own, which often triggers API firewalls.
                'User-Agent': 'ParagonCoreX_V1_ScoutingApp'
            }
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            console.error(`RobotEvents API Rejected Request: ${response.status}`, errorMsg);
            return res.status(response.status).json({ error: "RobotEvents API Error" });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error("Internal Function Error:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
