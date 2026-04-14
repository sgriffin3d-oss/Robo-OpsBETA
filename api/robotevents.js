export default async function handler(req, res) {
    const { search, start } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) return res.status(500).json({ error: "Token Missing" });

    // per_page=50 gives us a good variety
    // sort=start & order=desc brings the most recent/future events to the top
    let url = `https://www.robotevents.com/api/v2/events?per_page=50&sort=start&order=desc`;
    
    if (start) url += `&start=${start}`;
    if (search && search.trim() !== "") {
        url += `&name[]=${encodeURIComponent(search)}`;
    }

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: "Fetch failed" });
    }
}
