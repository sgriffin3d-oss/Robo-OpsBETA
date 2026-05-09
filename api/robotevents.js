export default async function handler(req, res) {
    const { search, start, type, id, div } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        return res.status(500).json({ error: "API Token missing" });
    }

    let baseUrl;

    if (id && div && type) {
        baseUrl = `https://www.robotevents.com/api/v2/events/${id}/divisions/${div}/${type}`;
    } else if (id && type) {
        baseUrl = `https://www.robotevents.com/api/v2/events/${id}/${type}`;
    } else if (id) {
        
        const response = await fetch(`https://www.robotevents.com/api/v2/events/${id}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: "RobotEvents Error", details: err });
        }
        return res.status(200).json(await response.json());
    } else {
        
        let url = `https://www.robotevents.com/api/v2/events?per_page=50&program[]=4`;
        if (start) url += `&start=${start}`;
        if (search && search.trim() !== "") url += `&name[]=${encodeURIComponent(search)}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: "RobotEvents Error", details: err });
        }
        return res.status(200).json(await response.json());
    }

    
    try {
        let allData = [];
        let page = 1;
        let lastPage = 1;

        do {
            const url = `${baseUrl}?per_page=250&page=${page}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
            });

            if (!response.ok) {
                const err = await response.text();
                return res.status(response.status).json({ error: "RobotEvents Error", details: err });
            }

            const data = await response.json();
            allData = allData.concat(data.data || []);

            
            lastPage = data.meta?.last_page ?? 1;
            page++;

        } while (page <= lastPage);

        res.status(200).json({ data: allData });

    } catch (error) {
        res.status(500).json({ error: "Server Error", message: error.message });
    }
}
