/**
 * api/claude.js - Paragon Core X
 * Proxies AI requests to Google Gemini API
 * Normal mode:     gemini-2.5-flash  (fast, free tier)
 * Superuser mode:  gemini-2.5-pro    (more capable, still free tier)
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel environment variables' });
    }

    const { system, messages, superuser } = req.body;

    // Use more powerful model in superuser mode
    const model = superuser ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

    // Convert messages to Gemini format (uses 'model' not 'assistant')
    const geminiContents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    // Inject system prompt as a user/model exchange at the start
    if (system) {
        geminiContents.unshift(
            { role: 'user',  parts: [{ text: system }] },
            { role: 'model', parts: [{ text: 'Understood.' }] }
        );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: geminiContents,
                generationConfig: {
                    maxOutputTokens: 8000,
                    temperature: superuser ? 0.7 : 0.2
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.error?.message || 'Gemini API error',
                details: data
            });
        }

        // Join ALL parts — Gemini 2.5 can return multiple parts in one response
        const parts = data.candidates?.[0]?.content?.parts || [];
        const text = parts.map(p => p.text || '').join('');

        // Check finish reason — STOP is good, MAX_TOKENS means it was cut short
        const finishReason = data.candidates?.[0]?.finishReason;
        const truncated = finishReason === 'MAX_TOKENS';

        res.status(200).json({
            content: [{ type: 'text', text: text + (truncated ? '\n\n*(response truncated)*' : '') }]
        });

    } catch (err) {
        res.status(500).json({ error: 'Proxy error', message: err.message });
    }
}
