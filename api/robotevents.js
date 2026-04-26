export default async function handler(req, res) {
    const { search, start, sku, type, id } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        return res.status(500).json({ error: "API Token missing in Vercel Environment Variables" });
    }

    let url = `https://www.robotevents.com/api/v2/events`;
    
    // Use 'id' (numerical) if available, otherwise fall back to 'sku'
    const eventIdentifier = id || sku;

    // Case 1: Fetching specific event details (Matches or Skills) using the ID
    if (eventIdentifier && type) {
        url += `/${eventIdentifier}/${type}?per_page=100`;
    } 
    // Case 2: Standard Event Search
    else {
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
