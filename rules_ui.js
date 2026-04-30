/**
 * rules_ui.js - Paragon Core X
 * Game Manual Rules Browser + AI Rules Assistant
 * Uses RULES_DATA from rules.js
 */

let rulesActiveCategory = 'All';
let rulesSearchTimer = null;
let aiConversation = [];

const CATEGORY_ORDER = ['Scoring','Specific Game','Safety','General','General Game','Robot Skills','Robot','Tournament'];
const CATEGORY_ICONS = {
    'Scoring':       '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="6"/><path d="M8 14l-2 7h12l-2-7"/></svg>',
    'Specific Game': '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="6" width="20" height="14" rx="2"/><circle cx="8" cy="13" r="1.5" fill="currentColor"/><circle cx="16" cy="13" r="1.5" fill="currentColor"/><path d="M12 10v6"/><path d="M9 13h6"/></svg>',
    'Safety':        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'General':       '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    'General Game':  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    'Robot Skills':  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M12 3v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M12 17v4"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
    'Robot':         '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    'Tournament':    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="6" height="14"/><rect x="9" y="3" width="6" height="18"/><rect x="16" y="10" width="6" height="11"/></svg>',
};

function initRules() {
    renderCategoryBar();
    renderRulesList('', 'All');
    // Reset AI chat
    aiConversation = [];
    renderAIMessages();
}

// ── CATEGORY BAR ─────────────────────────────────────────────────────────────

function renderCategoryBar() {
    const bar = document.getElementById('rules-cat-bar');
    if (!bar) return;

    const cats = ['All', ...CATEGORY_ORDER];
    bar.innerHTML = cats.map(c => `
        <button class="rules-cat-btn ${c === rulesActiveCategory ? 'active' : ''}"
                onclick="setRulesCategory('${c}')">
            ${CATEGORY_ICONS[c] || ''} ${c}
        </button>`).join('');
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

    let filtered = RULES_DATA.filter(r => {
        const catMatch = category === 'All' || r.category === category;
        const textMatch = !q
            || r.id.toLowerCase().includes(q)
            || r.brief.toLowerCase().includes(q)
            || r.full_text.toLowerCase().includes(q);
        return catMatch && textMatch;
    });

    if (!filtered.length) {
        list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--sub-text);font-size:0.85rem;">No rules found${q ? ` for "${query}"` : ''}.</div>`;
        return;
    }

    // Group by category
    const groups = {};
    filtered.forEach(r => {
        if (!groups[r.category]) groups[r.category] = [];
        groups[r.category].push(r);
    });

    let html = '';
    const orderedCats = category === 'All'
        ? CATEGORY_ORDER.filter(c => groups[c])
        : [category].filter(c => groups[c]);

    orderedCats.forEach(cat => {
        html += `<div class="rules-section-header">${CATEGORY_ICONS[cat] || ''} ${cat}</div>`;
        groups[cat].forEach(r => {
            const highlightedBrief = q ? highlightMatch(r.brief, q) : r.brief;
            html += `
                <div class="rule-card" onclick="openRule('${r.id}')">
                    <span class="rule-id">${r.id}</span>
                    <span class="rule-brief">${highlightedBrief}</span>
                    <span class="rule-arrow">›</span>
                </div>`;
        });
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

async function sendAIQuestion() {
    const input = document.getElementById('ai-input');
    const btn   = document.getElementById('ai-send-btn');
    if (!input || !btn) return;

    const question = input.value.trim();
    if (!question) return;

    input.value = '';
    btn.disabled = true;
    btn.textContent = '...';

    // Add user message
    aiConversation.push({ role: 'user', content: question });
    renderAIMessages();

    // Build rules context — send all rules as compact text
    const rulesContext = RULES_DATA.map(r =>
        `<${r.id}> [${r.category}] ${r.brief}: ${r.full_text}`
    ).join('\n\n');

    const systemPrompt = `You are a VEX V5 Robotics Competition rules expert for the 2026-2027 game "Override". 
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
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                system: systemPrompt,
                messages: messages
            })
        });

        const data = await response.json();
        const answer = data.content?.[0]?.text || 'Sorry, I could not get a response. Please try again.';

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
    renderAIMessages();
}

// Allow Enter key to send
function onAIKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendAIQuestion();
    }
}
