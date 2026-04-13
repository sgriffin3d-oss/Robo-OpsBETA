export default async function handler(req, res) {
    const token = process.env.ROBOT_EVENTS_TOKEN;
    const { endpoint, ...params } = req.query;
    const queryString = new URLSearchParams(params).toString();
    const url = `https://www.robotevents.com/api/v2/${endpoint}?${queryString}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch from Robot Events" });
    }
}