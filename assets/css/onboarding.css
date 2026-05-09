/* ============================================================
   PARAGON CORE X — ONBOARDING STYLES
   ============================================================ */

/* ── Overlay ─────────────────────────────────────────────── */
#ob-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    background: rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s ease;
    overflow-y: auto;
    padding: 0 0 40px 0;
}

#ob-overlay.ob-visible {
    opacity: 1;
    pointer-events: all;
}

#ob-overlay.ob-exit {
    opacity: 0;
    pointer-events: none;
}

/* ── Sheet ───────────────────────────────────────────────── */
#ob-body {
    width: 100%;
    max-width: 480px;
    padding: 48px 24px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    animation: ob-slide-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes ob-slide-in {
    from { transform: translateY(32px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
}

/* ── Logo ────────────────────────────────────────────────── */
.ob-logo {
    width: 80px;
    height: 80px;
    border-radius: 22px;
    overflow: hidden;
    margin-bottom: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    border: 2px solid rgba(255,255,255,0.08);
}
.ob-logo img { width: 100%; height: 100%; object-fit: cover; }

.ob-install-icon {
    width: 96px;
    height: 96px;
    border-radius: 26px;
    overflow: hidden;
    margin-bottom: 24px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    border: 2px solid rgba(255,255,255,0.1);
    animation: ob-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
}
.ob-install-icon img { width: 100%; height: 100%; object-fit: cover; }

@keyframes ob-bounce {
    from { transform: scale(0.6); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
}

/* ── Typography ──────────────────────────────────────────── */
.ob-title {
    font-family: inherit;
    font-size: 2.1rem;
    font-weight: 800;
    color: #ffffff;
    text-align: center;
    line-height: 1.15;
    margin: 0 0 10px 0;
    letter-spacing: -0.03em;
}
.ob-title span {
    color: var(--primary, #e8b23b);
}
.ob-title.ob-title-sm {
    font-size: 1.7rem;
}
.ob-sub {
    font-size: 0.9rem;
    color: rgba(255,255,255,0.5);
    text-align: center;
    margin: 0 0 28px 0;
    line-height: 1.5;
    max-width: 320px;
}

.ob-section-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
    align-self: flex-start;
    margin-bottom: 10px;
}

/* ── Theme swatches ──────────────────────────────────────── */
.ob-theme-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    width: 100%;
}

@media (max-width: 360px) {
    .ob-theme-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

.ob-theme-swatch {
    border: 2px solid transparent;
    border-radius: 14px;
    padding: 12px 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    transition: border-color 0.2s, transform 0.15s;
    background: var(--bg, #060501); /* will be overridden by inline style */
    position: relative;
    overflow: hidden;
}
.ob-theme-swatch::after {
    content: '✓';
    position: absolute;
    top: 4px;
    right: 6px;
    font-size: 0.65rem;
    color: var(--ob-accent, #e8b23b);
    opacity: 0;
    transition: opacity 0.2s;
}
.ob-theme-swatch.ob-selected {
    border-color: var(--ob-accent, #e8b23b);
    transform: scale(1.04);
}
.ob-theme-swatch.ob-selected::after { opacity: 1; }

.ob-swatch-dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
}
.ob-swatch-name {
    font-size: 0.65rem;
    font-weight: 700;
    color: rgba(255,255,255,0.75);
    text-align: center;
}
.ob-swatch-tag {
    font-size: 0.55rem;
    color: rgba(255,255,255,0.35);
    text-align: center;
}

/* ── Style cards ─────────────────────────────────────────── */
.ob-style-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    width: 100%;
}

.ob-style-card {
    border: 2px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 12px 8px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: rgba(255,255,255,0.04);
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
    color: rgba(255,255,255,0.6);
}
.ob-style-card.ob-selected {
    border-color: var(--primary, #e8b23b);
    background: rgba(255,255,255,0.08);
    color: #fff;
    transform: scale(1.03);
}
.ob-style-icon {
    font-size: 1.4rem;
    color: var(--primary, #e8b23b);
}
.ob-style-name {
    font-size: 0.72rem;
    font-weight: 700;
}
.ob-style-desc {
    font-size: 0.6rem;
    color: rgba(255,255,255,0.35);
    text-align: center;
}

/* ── CTA button ──────────────────────────────────────────── */
.ob-cta {
    margin-top: 28px;
    width: 100%;
    padding: 16px 24px;
    background: var(--primary, #e8b23b);
    color: var(--primary-fg, #000);
    border: none;
    border-radius: 14px;
    font-size: 1rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.2s, transform 0.15s;
    letter-spacing: -0.01em;
}
.ob-cta:active { opacity: 0.8; transform: scale(0.98); }

/* ── Install screen ──────────────────────────────────────── */
.ob-install-btn {
    width: 100%;
    padding: 16px 24px;
    background: var(--primary, #e8b23b);
    color: var(--primary-fg, #000);
    border: none;
    border-radius: 14px;
    font-size: 1rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: opacity 0.2s, transform 0.15s;
    margin-top: 8px;
}
.ob-install-btn:active { opacity: 0.8; transform: scale(0.98); }

.ob-install-manual {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 4px;
}

.ob-install-step {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 0.88rem;
    color: rgba(255,255,255,0.8);
    display: flex;
    align-items: center;
    gap: 12px;
    line-height: 1.4;
}
.ob-install-step strong { color: #fff; }

.ob-step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--primary, #e8b23b);
    color: var(--primary-fg, #000);
    font-size: 0.8rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.ob-inline-icon {
    width: 18px;
    height: 18px;
    vertical-align: middle;
    flex-shrink: 0;
}

.ob-skip {
    margin-top: 14px;
    background: none;
    border: none;
    color: rgba(255,255,255,0.3);
    font-size: 0.82rem;
    cursor: pointer;
    padding: 8px;
    text-decoration: underline;
    transition: color 0.2s;
}
.ob-skip:hover { color: rgba(255,255,255,0.6); }
