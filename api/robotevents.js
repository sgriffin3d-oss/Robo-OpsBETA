export default async function handler(req, res) {
    const { search, start } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        return res.status(500).json({ error: "API Token not found in Vercel" });
    }

    // Build the RobotEvents URL
    // We filter by name/region and ensure we only get events starting after our date
    let url = `https://www.robotevents.com/api/v2/events?start=${start}`;
    if (search) url += `&name[]=${encodeURIComponent(search)}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch from RobotEvents" });
    }
}