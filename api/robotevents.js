export default async function handler(req, res) {
    const { search, start, sku, type, divisionId } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        return res.status(500).json({ error: "API Token missing in Vercel Environment Variables" });
    }

    let url = `https://www.robotevents.com/api/v2/events`;
    
    // NEW: Handle specific event sub-resource requests
    if (sku) {
        if (type === 'divisions') {
            url += `/${sku}/divisions`;
        } else if (type === 'skills') {
            url += `/${sku}/skills?per_page=100`;
        } else if (type === 'matches' && divisionId) {
            url += `/${sku}/divisions/${divisionId}/matches?per_page=100`;
        } else {
            url += `/${sku}`;
        }
    } 
    // Standard Event Search
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
