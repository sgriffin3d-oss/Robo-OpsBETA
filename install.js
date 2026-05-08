/* ============================================================
   PARAGON CORE X — WELCOME + INSTALL
   
   Flow:
     First visit (not installed, not signed in):
       WELCOME SCREEN → LOGIN → APP
     
     Returning visit, not installed, not signed in:
       WELCOME SCREEN → LOGIN → APP
     
     Returning visit, signed in OR installed as PWA:
       Skip welcome → straight to auth/app
   
   Call resetInstall() in console to re-test.
   ============================================================ */

const INSTALL_KEY = 'paragon_installed_v1';

let _installDeferredPrompt = null;
let _installOverlayEl      = null;
let _onWelcomeDone         = null;   // callback to run when welcome closes

// Capture install prompt as early as possible
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _installDeferredPrompt = e;
    _refreshInstallBtn();
});

window.addEventListener('appinstalled', () => {
    localStorage.setItem(INSTALL_KEY, '1');
    _closeInstallOverlay(true);
});

// ── Entry point ───────────────────────────────────────────────
// Called from window.onload. onDone is the callback to run
// after the welcome screen closes (or immediately if skipped).
function maybeShowInstall(onDone) {
    _onWelcomeDone = onDone || null;

    const isInstalled = localStorage.getItem(INSTALL_KEY) === '1';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || window.navigator.standalone === true;
    const isSignedIn = !!localStorage.getItem('sb-bccymltkymuokpjbrzfb-auth-token')
                    || localStorage.getItem('paragon_guest_mode') === 'true';

    // Skip welcome if: already installed as PWA, OR user is signed in/was guest
    if (isInstalled || isStandalone || isSignedIn) {
        _onWelcomeDone && _onWelcomeDone();
        return;
    }

    // First-time or returned-but-not-installed-and-not-signed-in: show welcome
    _buildAndShowOverlay();
}

// ── Build the welcome overlay ─────────────────────────────────
function _buildAndShowOverlay() {
    if (document.getElementById('install-overlay')) return;

    const el = document.createElement('div');
    el.id = 'install-overlay';
    el.innerHTML = `
        <div id="install-sheet">

            <div class="inst-logo-wrap">
                <img class="inst-logo" src="images/icon-192.png" onerror="this.src='images/icon.png'" alt="Paragon Core X">
            </div>

            <h1 class="inst-h1">Welcome to<br><span class="inst-accent">Paragon&nbsp;Core&nbsp;X</span></h1>
            <p class="inst-sub">Your VEX tournament command center.<br>Install it for the best experience.</p>

            <!-- Native install button (Chrome/Edge when prompt is available) -->
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

            <!-- Get Started — always visible, proceeds to login -->
            <button class="inst-btn inst-btn-secondary" onclick="_proceedToApp()">
                Get Started
            </button>

            <button class="inst-skip" onclick="_proceedToApp()">Skip for now</button>
        </div>
    `;

    document.body.appendChild(el);
    _installOverlayEl = el;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('inst-visible'));
    });

    _refreshInstallBtn();
}

// ── Decide which install UI to show ──────────────────────────
function _refreshInstallBtn() {
    if (!_installOverlayEl) return;

    const nativeBtn    = document.getElementById('inst-native-btn');
    const iosSteps     = document.getElementById('inst-ios-steps');
    const desktopSteps = document.getElementById('inst-desktop-steps');
    const isIOS        = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (_installDeferredPrompt) {
        if (nativeBtn)    nativeBtn.style.display    = '';
        if (iosSteps)     iosSteps.style.display     = 'none';
        if (desktopSteps) desktopSteps.style.display = 'none';
    } else if (isIOS) {
        if (nativeBtn)    nativeBtn.style.display    = 'none';
        if (iosSteps)     iosSteps.style.display     = '';
        if (desktopSteps) desktopSteps.style.display = 'none';
    } else {
        if (nativeBtn)    nativeBtn.style.display    = 'none';
        if (iosSteps)     iosSteps.style.display     = 'none';
        if (desktopSteps) desktopSteps.style.display = '';
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
            // User declined install but we still proceed to the app
            _proceedToApp();
        }
    } catch(e) {
        _proceedToApp();
    }
}

// ── Proceed to app (close welcome, launch auth) ───────────────
function _proceedToApp() {
    _closeInstallOverlay(false);
}

// ── Close overlay then fire the onDone callback ───────────────
function _closeInstallOverlay(markInstalled) {
    if (markInstalled) localStorage.setItem(INSTALL_KEY, '1');

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
    location.reload();
}
