export default async function handler(req, res) {
    // 1. Force clear CORS headers so mobile/Safari don't block the request
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle the browser's "preflight" check
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { search, start } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        console.error("Environment Variable ROBOT_EVENTS_TOKEN is missing.");
        return res.status(500).json({ error: "Token Configuration Missing" });
    }

    // 2. Build the URL using the modern WHATWG API (prevents the Node warning)
    const apiTarget = new URL('https://www.robotevents.com/api/v2/events');
    apiTarget.searchParams.set('per_page', '50');
    apiTarget.searchParams.set('sort', 'start');
    apiTarget.searchParams.set('order', 'desc');

    if (start) apiTarget.searchParams.set('start', start);
    
    // RobotEvents specifically requires the brackets for name filtering: name[]
    if (search && search.trim() !== "") {
        apiTarget.searchParams.set('name[]', search.trim());
    }

    try {
        const response = await fetch(apiTarget.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                // Explicitly defining a User-Agent is the #1 way to fix "Chrome vs Others" errors
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`RobotEvents API Error ${response.status}:`, errorText);
            return res.status(response.status).json({ error: "API Rejected Request" });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (err) {
        console.error("Function Crash:", err.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
