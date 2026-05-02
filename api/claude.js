/**
 * api/claude.js - Paragon Core X
 * Proxies AI rules assistant requests to Google Gemini API (free tier)
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel environment variables' });
    }

    const { system, messages } = req.body;

    // Convert Anthropic-style {role, content} messages to Gemini format
    // Gemini uses 'user' and 'model' roles (not 'assistant')
    const geminiContents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    // Prepend system prompt as first user message if present
    if (system) {
        geminiContents.unshift({
            role: 'user',
            parts: [{ text: system }]
        });
        geminiContents.splice(1, 0, {
            role: 'model',
            parts: [{ text: 'Understood. I am ready to answer questions about the VEX Override game rules.' }]
        });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: geminiContents,
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.2
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

        // Extract text from Gemini response and return in Anthropic-compatible format
        // so rules_ui.js doesn't need to change its response parsing
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        res.status(200).json({
            content: [{ type: 'text', text }]
        });

    } catch (err) {
        res.status(500).json({ error: 'Proxy error', message: err.message });
    }
}
