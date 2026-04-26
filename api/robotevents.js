export default async function handler(req, res) {
    const { search, start, sku, type, id } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        return res.status(500).json({ error: "API Token missing in Vercel Environment Variables" });
    }

    // Base URL for events
    let url = `https://www.robotevents.com/api/v2/events`;
    
    // RobotEvents API v2 requires the numerical ID for sub-routes like /matches or /skills
    // We prioritize 'id' if the frontend sends it
    const eventIdentifier = id || sku;

    if (eventIdentifier && type) {
        // Correct path: /events/{id}/{type}
        url += `/${eventIdentifier}/${type}?per_page=100`;
    } 
    else {
        // Standard Search Path
        url += `?per_page=50`;
        if (start) url += `&start=${start}`;
        if (search && search.trim() !== "") {
            url += `&name[]=${encodeURIComponent(search)}`;
        }
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errBody = await response.text();
            return res.status(response.status).json({ error: "RobotEvents Error", details: errBody });
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Server Error", message: error.message });
    }
}
