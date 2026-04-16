const https = require('https');

export default function handler(req, res) {
    // 1. Setup CORS for all devices
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { search, start } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    // DEBUG: If this shows up on your phone, we know the Token is the problem
    if (!token) {
        return res.status(500).json({ 
            error: "TOKEN_MISSING", 
            message: "The ROBOT_EVENTS_TOKEN variable is not set in Vercel Production Settings." 
        });
    }

    // 2. Build the URL
    const queryParams = new URLSearchParams({
        per_page: '50',
        sort: 'start',
        order: 'desc'
    });
    if (start) queryParams.append('start', start);
    if (search) queryParams.append('name[]', search);

    const options = {
        hostname: 'www.robotevents.com',
        path: `/api/v2/events?${queryParams.toString()}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Vercel Serverless)'
        }
    };

    // 3. Perform the request using HTTPS module (more stable than fetch in Node)
    const request = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
            if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
                res.status(200).json(JSON.parse(data));
            } else {
                res.status(apiRes.statusCode).json({ 
                    error: "API_REJECTED", 
                    status: apiRes.statusCode,
                    details: data 
                });
            }
        });
    });

    request.on('error', (err) => {
        res.status(500).json({ error: "CONNECTION_FAILED", message: err.message });
    });

    request.end();
}
