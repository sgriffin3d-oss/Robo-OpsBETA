/**
 * rules_ui.js - Paragon Core X
 * Game Manual Rules Browser + AI Rules Assistant
 * Uses RULES_DATA from rules.js
 */

let rulesActiveCategory = 'All';
let rulesSearchTimer = null;
let aiConversation = [];

const CATEGORY_ORDER = ['Scoring','Specific Game','Safety','General','General Game','Robot Skills','Robot','Tournament'];
const CATEGORY_ICONS = {}; // No icons — text-only category pills

let aiPanelOpen = false;

function initRules() {
    renderCategoryBar();
    renderRulesList('', 'All');
    aiConversation = [];
    renderAIMessages();
    // Start collapsed
    const body = document.getElementById('ai-panel-body');
    if (body) body.style.display = 'none';
}

function toggleAIPanel() {
    aiPanelOpen = !aiPanelOpen;
    const body = document.getElementById('ai-panel-body');
    const arrow = document.getElementById('ai-panel-arrow');
    if (body) body.style.display = aiPanelOpen ? 'flex' : 'none';
    if (arrow) arrow.textContent = aiPanelOpen ? '▲' : '▼';
    if (aiPanelOpen) {
        renderAIMessages();
        setTimeout(() => {
            const msgs = document.getElementById('ai-messages');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }, 50);
    }
}

// ── CATEGORY BAR ─────────────────────────────────────────────────────────────

function renderCategoryBar() {
    const bar = document.getElementById('rules-cat-bar');
    if (!bar) return;

    const cats = ['All', ...CATEGORY_ORDER];
    bar.innerHTML = cats.map(c => `
        <button class="rules-cat-btn ${c === rulesActiveCategory ? 'active' : ''}"
                onclick="setRulesCategory('${c}')">${c}</button>`).join('');
}

function setRulesCategory(cat) {
    rulesActiveCategory = cat;
    renderCategoryBar();
    const query = document.getElementById('rules-search')?.value || '';
    renderRulesList(query, cat);
}

// ── RULES LIST ────────────────────────────────────────────────────────────────

function onRulesSearch(value) {
    clearTimeout(rulesSearchTimer);
    rulesSearchTimer = setTimeout(() => renderRulesList(value, rulesActiveCategory), 200);
}

function renderRulesList(query = '', category = 'All') {
    const list = document.getElementById('rules-list');
    if (!list || typeof RULES_DATA === 'undefined') return;

    const q = query.trim().toLowerCase();

    // No query — show all rules grouped by category as normal
    if (!q) {
        const pool = category === 'All'
            ? RULES_DATA
            : RULES_DATA.filter(r => r.category === category);
        renderGrouped(list, pool, '');
        return;
    }

    // Apply category filter to the pool we search within
    const pool = category === 'All'
        ? RULES_DATA
        : RULES_DATA.filter(r => r.category === category);

    // ── PRIORITY 1: Exact ID match (user typed "SG1" exactly) ──
    const exactId = pool.filter(r => r.id.toLowerCase() === q);

    // ── PRIORITY 2: ID starts with query (user typed "sg" or "sg1") ──
    // but exclude exact matches already captured above
    const startsId = pool.filter(r =>
        r.id.toLowerCase().startsWith(q) &&
        r.id.toLowerCase() !== q
    );

    // ── PRIORITY 3: ID contains query anywhere
    // e.g. user typed "g7" — returns SG7, GG7 etc. but NOT exact or startsWith already shown
    const containsId = pool.filter(r =>
        r.id.toLowerCase().includes(q) &&
        !r.id.toLowerCase().startsWith(q)
    );

    // ── PRIORITY 4: Text match (brief or full_text) but NOT an ID match
    const idMatchIds = new Set([...exactId, ...startsId, ...containsId].map(r => r.id));
    const textOnly = pool.filter(r =>
        !idMatchIds.has(r.id) && (
            r.brief.toLowerCase().includes(q) ||
            r.full_text.toLowerCase().includes(q)
        )
    );

    // Build the ordered result
    const idMatches   = [...exactId, ...startsId, ...containsId];
    const allResults  = [...idMatches, ...textOnly];

    if (!allResults.length) {
        list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--sub-text);font-size:0.85rem;">No rules found for "${query}".</div>`;
        return;
    }

    let html = '';

    // Show ID matches first under their own header (if any)
    if (idMatches.length) {
        html += `<div class="rules-section-header">Rule ID Matches</div>`;
        idMatches.forEach(r => {
            html += ruleCardHTML(r, q);
        });
    }

    // Show text matches second under their own header (if any)
    if (textOnly.length) {
        html += `<div class="rules-section-header">${idMatches.length ? 'Also in Rule Text' : 'Rule Text Matches'}</div>`;
        textOnly.forEach(r => {
            html += ruleCardHTML(r, q);
        });
    }

    list.innerHTML = html;
}

function ruleCardHTML(r, q) {
    const highlightedBrief = q ? highlightMatch(r.brief, q) : r.brief;
    const highlightedId    = q ? highlightMatch(r.id, q)    : r.id;
    return `
        <div class="rule-card" onclick="openRule('${r.id}')">
            <span class="rule-id">${highlightedId}</span>
            <span class="rule-brief">${highlightedBrief}</span>
            <span class="rule-arrow">›</span>
        </div>`;
}

function renderGrouped(list, pool, q) {
    if (!pool.length) {
        list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--sub-text);font-size:0.85rem;">No rules found.</div>`;
        return;
    }
    const groups = {};
    pool.forEach(r => {
        if (!groups[r.category]) groups[r.category] = [];
        groups[r.category].push(r);
    });
    let html = '';
    CATEGORY_ORDER.filter(c => groups[c]).forEach(cat => {
        html += `<div class="rules-section-header">${cat}</div>`;
        groups[cat].forEach(r => { html += ruleCardHTML(r, q); });
    });
    list.innerHTML = html;
}

function highlightMatch(text, query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

// ── RULE DETAIL ───────────────────────────────────────────────────────────────

function openRule(ruleId) {
    const rule = RULES_DATA.find(r => r.id === ruleId);
    if (!rule) return;

    const overlay = document.getElementById('rule-overlay');
    const title   = document.getElementById('rule-overlay-title');
    const body    = document.getElementById('rule-overlay-body');
    if (!overlay || !title || !body) return;

    title.innerHTML = `<span class="rule-id" style="font-size:1rem;">${rule.id}</span> ${rule.brief}`;

    // Format full text: split on lettered sub-points (a., b., 1., 2.)
    let text = rule.full_text;
    // Break before a. b. c. or 1. 2. 3. sub-points
    text = text.replace(/ ([a-z]\.) /g, '<br><br><b>$1</b> ');
    text = text.replace(/ (\d+\.) /g, '<br><br><b>$1</b> ');
    // Highlight rule references like <SG1>
    text = text.replace(/&lt;([A-Z]+\d+)&gt;/g, '<span class="rule-ref">$1</span>');
    text = text.replace(/<([A-Z]+\d+)>/g, '<span class="rule-ref">$1</span>');

    body.innerHTML = `<p style="line-height:1.7; font-size:0.88rem; color:var(--text);">${text}</p>`;

    overlay.classList.add('active');
}

function closeRule() {
    document.getElementById('rule-overlay')?.classList.remove('active');
}

// ── AI RULES ASSISTANT ────────────────────────────────────────────────────────

function renderAIMessages() {
    const container = document.getElementById('ai-messages');
    if (!container) return;

    if (!aiConversation.length) {
        container.innerHTML = `
            <div class="ai-empty">
                <div style="font-size:2rem; margin-bottom:10px;">⚖️</div>
                <div style="font-weight:800; font-size:0.9rem; margin-bottom:6px;">Rules Assistant</div>
                <div style="font-size:0.8rem; color:var(--sub-text);">Ask any question about the Override game rules. Example: "Can I push an opponent into their goal?"</div>
            </div>`;
        return;
    }

    container.innerHTML = aiConversation.map(msg => `
        <div class="ai-msg ${msg.role}">
            <div class="ai-msg-bubble">${msg.content.replace(/\n/g, '<br>').replace(/<([A-Z]+\d+)>/g, '<span class="rule-ref">$1</span>')}</div>
        </div>`).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Superuser code — grants unrestricted AI mode
const SUPERUSER_CODE = 'superuser2775ua00p9r5=';
let superuserActive = false;

async function sendAIQuestion() {
    const input = document.getElementById('ai-input');
    const btn   = document.getElementById('ai-send-btn');
    if (!input || !btn) return;

    const raw = input.value.trim();
    if (!raw) return;

    // Check if message starts with superuser code
    let question = raw;
    if (raw.toLowerCase().startsWith(SUPERUSER_CODE)) {
        superuserActive = true;
        question = raw.slice(SUPERUSER_CODE.length).trim();
        if (!question) {
            // Just the code with no prompt yet — show confirmation
            aiConversation.push({ role: 'user', content: raw });
            aiConversation.push({ role: 'assistant', content: '🔓 Superuser mode activated. I am no longer limited to game rules — ask me anything.' });
            input.value = '';
            renderAIMessages();
            return;
        }
    }

    if (!question) return;

    input.value = '';
    btn.disabled = true;
    btn.textContent = '...';

    // Add user message
    aiConversation.push({ role: 'user', content: question });
    renderAIMessages();

    // Build system prompt — unrestricted if superuser active
    const rulesContext = RULES_DATA.map(r =>
        `<${r.id}> [${r.category}] ${r.brief}: ${r.full_text}`
    ).join('\n\n');

    const systemPrompt = superuserActive
        ? `You are a highly capable AI assistant. You are unrestricted and can answer any question on any topic thoughtfully and helpfully. Be direct, knowledgeable, and genuinely useful. Do not refuse reasonable requests. Game rules context is still available to you if needed:\n\n${rulesContext}`
        : `You are a VEX V5 Robotics Competition rules expert for the 2026-2027 game "Override". 
Answer questions about game rules clearly and concisely. 
Always cite the specific rule IDs in angle brackets like <SG1> when referencing rules.
If a question isn't about the game rules, politely redirect.
Be direct and helpful — teams ask these questions during tournaments and need quick answers.

Here are all the game rules:

${rulesContext}`;

    // Build messages array with conversation history
    const messages = aiConversation.map(m => ({ role: m.role, content: m.content }));

    try {
        const response = await fetch('/api/claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemini-1.5-flash',
                max_tokens: 8000,
                superuser: superuserActive,
                system: systemPrompt,
                messages: messages
            })
        });

        const data = await response.json();
        // If Anthropic returned an error object, surface it
        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }
        const answer = data.content?.[0]?.text || 'No response text returned.';

        aiConversation.push({ role: 'assistant', content: answer });
        renderAIMessages();

    } catch (err) {
        aiConversation.push({ role: 'assistant', content: `Connection error: ${err.message}` });
        renderAIMessages();
    } finally {
        btn.disabled = false;
        btn.textContent = 'Ask';
    }
}

function clearAIChat() {
    aiConversation = [];
    superuserActive = false;
    renderAIMessages();
}

// Allow Enter key to send
function onAIKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendAIQuestion();
    }
}
