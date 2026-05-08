/* ============================================================
   PARAGON CORE X — WELCOME + INSTALL
   Shows on first visit. Replaced onboarding.js.
   Call resetInstall() in console to re-test.
   ============================================================ */

const INSTALL_KEY = 'paragon_installed_v1';

let _installDeferredPrompt = null;   // Chrome/Edge native prompt
let _installOverlayEl      = null;

// ── Capture install prompt AS EARLY AS POSSIBLE ─────────────
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _installDeferredPrompt = e;
    // If the overlay is already showing, reveal the native button
    _refreshInstallBtn();
});

// If already installed as standalone, mark done immediately
window.addEventListener('appinstalled', () => {
    localStorage.setItem(INSTALL_KEY, '1');
    _closeInstallOverlay();
});

// ── Entry point — called from window.onload in app.js ────────
function maybeShowInstall() {
    const alreadyDone = localStorage.getItem(INSTALL_KEY);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || window.navigator.standalone === true;
    if (alreadyDone || isStandalone) return;
    _buildAndShowOverlay();
}

// ── Build overlay DOM ────────────────────────────────────────
function _buildAndShowOverlay() {
    if (document.getElementById('install-overlay')) return;

    const el = document.createElement('div');
    el.id = 'install-overlay';
    el.innerHTML = `
        <div id="install-sheet">

            <!-- Logo -->
            <div class="inst-logo-wrap">
                <img class="inst-logo" src="images/icon-512.png" alt="Paragon Core X icon">
            </div>

            <!-- Headline -->
            <h1 class="inst-h1">Welcome to<br><span class="inst-accent">Paragon&nbsp;Core&nbsp;X</span></h1>
            <p class="inst-sub">Your VEX tournament command center.<br>Install it for the best experience.</p>

            <!-- Primary: native install button (shown when available) -->
            <button class="inst-btn inst-btn-primary" id="inst-native-btn" onclick="_triggerNativeInstall()" style="display:none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><polyline points="8 12 12 16 16 12"/><path d="M3 21h18"/></svg>
                Install App
            </button>

            <!-- iOS manual instructions (shown on iOS Safari) -->
            <div class="inst-ios-steps" id="inst-ios-steps" style="display:none;">
                <div class="inst-step">
                    <span class="inst-step-num">1</span>
                    <span>Tap <strong>Share</strong> <svg class="inst-inline-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> at the bottom of Safari</span>
                </div>
                <div class="inst-step">
                    <span class="inst-step-num">2</span>
                    <span>Scroll and tap <strong>"Add to Home Screen"</strong></span>
                </div>
                <div class="inst-step">
                    <span class="inst-step-num">3</span>
                    <span>Tap <strong>Add</strong> — you're in!</span>
                </div>
            </div>

            <!-- Desktop manual (shown when no native prompt and not iOS) -->
            <div class="inst-desktop-steps" id="inst-desktop-steps" style="display:none;">
                <div class="inst-step">
                    <span class="inst-step-num">1</span>
                    <span>In Chrome/Edge, click the <strong>install icon</strong> <svg class="inst-inline-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><polyline points="8 12 12 16 16 12"/><path d="M3 21h18"/></svg> in the address bar</span>
                </div>
                <div class="inst-step">
                    <span class="inst-step-num">2</span>
                    <span>Click <strong>Install</strong> in the popup</span>
                </div>
            </div>

            <!-- Always-visible skip link -->
            <button class="inst-skip" onclick="_skipInstall()">Skip for now</button>
        </div>
    `;

    document.body.appendChild(el);
    _installOverlayEl = el;

    // Small delay so CSS transition fires
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('inst-visible'));
    });

    _refreshInstallBtn();
}

// ── Decide which UI to show based on current state ──────────
function _refreshInstallBtn() {
    if (!_installOverlayEl) return;

    const nativeBtn     = document.getElementById('inst-native-btn');
    const iosSteps      = document.getElementById('inst-ios-steps');
    const desktopSteps  = document.getElementById('inst-desktop-steps');

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (_installDeferredPrompt) {
        // Best case — we can trigger native browser prompt
        if (nativeBtn)    nativeBtn.style.display    = '';
        if (iosSteps)     iosSteps.style.display     = 'none';
        if (desktopSteps) desktopSteps.style.display = 'none';
    } else if (isIOS) {
        if (nativeBtn)    nativeBtn.style.display    = 'none';
        if (iosSteps)     iosSteps.style.display     = '';
        if (desktopSteps) desktopSteps.style.display = 'none';
    } else {
        // Desktop without prompt yet (page may need to be fully loaded)
        if (nativeBtn)    nativeBtn.style.display    = 'none';
        if (iosSteps)     iosSteps.style.display     = 'none';
        if (desktopSteps) desktopSteps.style.display = '';
    }
}

// ── Trigger native browser install popup ────────────────────
async function _triggerNativeInstall() {
    if (!_installDeferredPrompt) return;
    try {
        _installDeferredPrompt.prompt();
        const { outcome } = await _installDeferredPrompt.userChoice;
        _installDeferredPrompt = null;
        if (outcome === 'accepted') {
            localStorage.setItem(INSTALL_KEY, '1');
            _closeInstallOverlay();
        }
    } catch(e) {
        // Prompt already used or unavailable — fall through
        _refreshInstallBtn();
    }
}

// ── Skip ─────────────────────────────────────────────────────
function _skipInstall() {
    localStorage.setItem(INSTALL_KEY, '1');
    _closeInstallOverlay();
}

// ── Close ────────────────────────────────────────────────────
function _closeInstallOverlay() {
    const el = _installOverlayEl || document.getElementById('install-overlay');
    if (!el) return;
    el.classList.remove('inst-visible');
    el.classList.add('inst-exit');
    setTimeout(() => el.remove(), 400);
    _installOverlayEl = null;
}

// ── Dev helper ───────────────────────────────────────────────
function resetInstall() {
    localStorage.removeItem(INSTALL_KEY);
    location.reload();
}
