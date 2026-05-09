/* ============================================================
   PARAGON CORE X — WELCOME + INSTALL

   Flow:
     Not installed as PWA:
       → WELCOME SCREEN shown every open for guests.
       → For real signed-in accounts: shown until they click
         "Get Started" (sets WELCOME_SEEN_KEY) or install.

     Already installed (standalone mode or INSTALL_KEY set):
       → Skip welcome → straight to auth/app

   Settings panel:
     → Install card shown whenever not installed as PWA
     → Hides itself after successful install

   Call resetInstall() in console to re-test.
   ============================================================ */

const INSTALL_KEY      = 'paragon_installed_v1';
const WELCOME_SEEN_KEY = 'paragon_welcome_seen_v1';

let _installDeferredPrompt = null;
let _installOverlayEl      = null;
let _onWelcomeDone         = null;

// Capture install prompt as early as possible
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _installDeferredPrompt = e;
    _refreshInstallBtn();
    updateInstallCardVisibility();
});

window.addEventListener('appinstalled', () => {
    localStorage.setItem(INSTALL_KEY, '1');
    _closeInstallOverlay(true);
    updateInstallCardVisibility();
});

// ── Entry point ───────────────────────────────────────────────
function maybeShowInstall(onDone) {
    _onWelcomeDone = onDone || null;

    const isInstalled  = localStorage.getItem(INSTALL_KEY) === '1';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || window.navigator.standalone === true;

    if (isInstalled || isStandalone) {
        _onWelcomeDone && _onWelcomeDone();
        return;
    }

    const isGuest     = localStorage.getItem('paragon_guest_mode') === 'true';
    const welcomeSeen = localStorage.getItem(WELCOME_SEEN_KEY) === '1';
    const isSignedIn  = !!localStorage.getItem('sb-bccymltkymuokpjbrzfb-auth-token');

    // Guest → always show welcome (no persistent seen flag)
    if (isGuest) {
        _buildAndShowOverlay(false);
        return;
    }

    // Real account that has already dismissed → skip
    if (isSignedIn && welcomeSeen) {
        _onWelcomeDone && _onWelcomeDone();
        return;
    }

    // First visit or new account
    _buildAndShowOverlay(true);
}

// ── Build the welcome overlay ─────────────────────────────────
function _buildAndShowOverlay(persistSeen) {
    if (document.getElementById('install-overlay')) return;

    const el = document.createElement('div');
    el.id = 'install-overlay';
    el.innerHTML = `
        <div id="install-sheet">

            <div class="inst-logo-wrap">
                <img class="inst-logo" src="images/icon-192.png" onerror="this.src='images/icon.png'" alt="Paragon Core X">
            </div>

            <h1 class="inst-h1">Welcome to<br><span class="inst-accent">Paragon&nbsp;Core&nbsp;X</span></h1>
            <p class="inst-sub">Your VEX tournament command center.<br>Install for the best offline experience.</p>

            <!-- Native install button (Chrome/Edge when prompt available) -->
            <button class="inst-btn inst-btn-primary" id="inst-native-btn" onclick="_triggerNativeInstall()" style="display:none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><polyline points="8 12 12 16 16 12"/><path d="M3 21h18"/></svg>
                Install App
            </button>

            <!-- iOS instructions -->
            <div class="inst-ios-steps" id="inst-ios-steps" style="display:none;">
                <div class="inst-step">
                    <span class="inst-step-num">1</span>
                    <span>Tap <strong>Share</strong>
                        <svg class="inst-inline-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        at the bottom of Safari</span>
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

            <!-- Desktop manual instructions (no native prompt yet) -->
            <div class="inst-desktop-steps" id="inst-desktop-steps" style="display:none;">
                <div class="inst-step">
                    <span class="inst-step-num">1</span>
                    <span>In Chrome/Edge, click the <strong>install icon</strong>
                        <svg class="inst-inline-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><polyline points="8 12 12 16 16 12"/><path d="M3 21h18"/></svg>
                        in the address bar</span>
                </div>
                <div class="inst-step">
                    <span class="inst-step-num">2</span>
                    <span>Click <strong>Install</strong> in the popup</span>
                </div>
            </div>

            <!-- Get Started — always visible -->
            <button class="inst-btn inst-btn-secondary" id="inst-getstarted-btn" onclick="_proceedToApp()">
                Get Started
            </button>

            <button class="inst-skip" onclick="_proceedToApp()">Skip for now</button>
        </div>
    `;

    document.body.appendChild(el);
    _installOverlayEl = el;
    _installOverlayEl._persistSeen = persistSeen;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('inst-visible'));
    });

    _refreshInstallBtn();
}

// ── Decide which install UI to show ──────────────────────────
function _refreshInstallBtn() {
    if (!_installOverlayEl) return;

    const nativeBtn     = document.getElementById('inst-native-btn');
    const iosSteps      = document.getElementById('inst-ios-steps');
    const desktopSteps  = document.getElementById('inst-desktop-steps');
    const getStartedBtn = document.getElementById('inst-getstarted-btn');
    const isIOS         = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (_installDeferredPrompt) {
        if (nativeBtn)     nativeBtn.style.display    = '';
        if (iosSteps)      iosSteps.style.display     = 'none';
        if (desktopSteps)  desktopSteps.style.display = 'none';
        if (getStartedBtn) getStartedBtn.classList.add('inst-btn-secondary-small');
    } else if (isIOS) {
        if (nativeBtn)     nativeBtn.style.display    = 'none';
        if (iosSteps)      iosSteps.style.display     = '';
        if (desktopSteps)  desktopSteps.style.display = 'none';
        if (getStartedBtn) getStartedBtn.classList.remove('inst-btn-secondary-small');
    } else {
        if (nativeBtn)     nativeBtn.style.display    = 'none';
        if (iosSteps)      iosSteps.style.display     = 'none';
        if (desktopSteps)  desktopSteps.style.display = '';
        if (getStartedBtn) getStartedBtn.classList.remove('inst-btn-secondary-small');
    }
}

// ── Trigger native browser install ───────────────────────────
async function _triggerNativeInstall() {
    if (!_installDeferredPrompt) return;
    try {
        _installDeferredPrompt.prompt();
        const { outcome } = await _installDeferredPrompt.userChoice;
        _installDeferredPrompt = null;
        if (outcome === 'accepted') {
            localStorage.setItem(INSTALL_KEY, '1');
            _closeInstallOverlay(true);
        } else {
            _proceedToApp();
        }
    } catch(e) {
        _proceedToApp();
    }
}

// ── Proceed to app ────────────────────────────────────────────
function _proceedToApp() {
    if (_installOverlayEl && _installOverlayEl._persistSeen) {
        localStorage.setItem(WELCOME_SEEN_KEY, '1');
    }
    _closeInstallOverlay(false);
}

// ── Show install prompt from Settings ─────────────────────────
function showInstallPrompt() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || window.navigator.standalone === true;
    const isInstalled  = localStorage.getItem(INSTALL_KEY) === '1';
    if (isInstalled || isStandalone) return;

    _onWelcomeDone = null;
    const existing = document.getElementById('install-overlay');
    if (existing) existing.remove();
    _installOverlayEl = null;

    _buildAndShowOverlay(false);
}

// ── Update settings install card visibility ───────────────────
function updateInstallCardVisibility() {
    const card = document.getElementById('settings-install-card');
    if (!card) return;

    const isInstalled  = localStorage.getItem(INSTALL_KEY) === '1';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || window.navigator.standalone === true;

    card.style.display = (isInstalled || isStandalone) ? 'none' : '';
}

// ── Close overlay ─────────────────────────────────────────────
function _closeInstallOverlay(markInstalled) {
    if (markInstalled) {
        localStorage.setItem(INSTALL_KEY, '1');
        updateInstallCardVisibility();
    }

    const el = _installOverlayEl || document.getElementById('install-overlay');
    if (el) {
        el.classList.remove('inst-visible');
        el.classList.add('inst-exit');
        setTimeout(() => {
            el.remove();
            _installOverlayEl = null;
            _onWelcomeDone && _onWelcomeDone();
            _onWelcomeDone = null;
        }, 400);
    } else {
        _onWelcomeDone && _onWelcomeDone();
        _onWelcomeDone = null;
    }
}

// ── Dev helper ────────────────────────────────────────────────
function resetInstall() {
    localStorage.removeItem(INSTALL_KEY);
    localStorage.removeItem(WELCOME_SEEN_KEY);
    location.reload();
}
