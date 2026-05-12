export default async function handler(req, res) {
    const { search, start, type, id, div } = req.query;
    const token = process.env.ROBOT_EVENTS_TOKEN;

    if (!token) {
        return res.status(500).json({ error: 'ROBOT_EVENTS_TOKEN env var is missing from Vercel.' });
    }

    const BASE = 'https://events.vex.com/api/v2' // fallback — swap to correct URL once confirmed
    const RE   = 'https://events.vex.com/api/v2';
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    async function reGet(url) {
        const r = await fetch(url, { headers });
        if (!r.ok) {
            const msg = await r.text();
            throw { status: r.status, msg };
        }
        return r.json();
    }

    try {
        // ── Single event detail ──────────────────────────────────────────────
        if (id && !type && !div) {
            const data = await reGet(`${RE}/events/${id}`);
            return res.status(200).json(data);
        }

        // ── Division-scoped data (matches / rankings) ─────────────────────
        if (id && div && type) {
            let all = [], page = 1, lastPage = 1;
            do {
                const data = await reGet(`${RE}/events/${id}/divisions/${div}/${type}?per_page=250&page=${page}`);
                all = all.concat(data.data || []);
                lastPage = data.meta?.last_page ?? 1;
                page++;
            } while (page <= lastPage);
            return res.status(200).json({ data: all });
        }

        // ── Event-scoped data (skills / teams) ───────────────────────────
        if (id && type) {
            let all = [], page = 1, lastPage = 1;
            do {
                const data = await reGet(`${RE}/events/${id}/${type}?per_page=250&page=${page}`);
                all = all.concat(data.data || []);
                lastPage = data.meta?.last_page ?? 1;
                page++;
            } while (page <= lastPage);
            return res.status(200).json({ data: all });
        }

        // ── Event list ───────────────────────────────────────────────────
        let url = `${RE}/events?per_page=50&program[]=4`;
        if (start)                url += `&start=${start}`;
        if (search?.trim())       url += `&name[]=${encodeURIComponent(search.trim())}`;
        const data = await reGet(url);
        return res.status(200).json(data);

    } catch (err) {
        const status  = err.status  || 500;
        const message = err.msg     || err.message || 'Unknown server error';
        return res.status(status).json({ error: `RobotEvents returned ${status}`, details: message });
    }
}
