/**
 * api/robotevents.js - Paragon Core X Vercel Serverless Proxy
 * Updated to support division-based matches and rankings endpoints
 */

export default async function handler(req, res) {
    const { search, start, type, id, div } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        return res.status(500).json({ error: "API Token missing in Vercel Environment Variables" });
    }

    let url;

    if (id && div && type) {
        // Division-scoped endpoints: matches and rankings require a division ID
        // e.g. /events/12345/divisions/1/matches
        url = `https://www.robotevents.com/api/v2/events/${id}/divisions/${div}/${type}?per_page=100`;

    } else if (id && type) {
        // Non-division endpoints: skills, teams, awards
        // e.g. /events/12345/skills
        url = `https://www.robotevents.com/api/v2/events/${id}/${type}?per_page=100`;

    } else if (id) {
        // Fetch a single event (used to get its divisions list)
        url = `https://www.robotevents.com/api/v2/events/${id}`;

    } else {
        // Event search
        url = `https://www.robotevents.com/api/v2/events?per_page=50`;
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
