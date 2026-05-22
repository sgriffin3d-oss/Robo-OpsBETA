(function _forceResetOnce() {
    if (!localStorage.getItem(STORAGE_KEYS.installReset)) {
        localStorage.removeItem(STORAGE_KEYS.installed);
        localStorage.removeItem(STORAGE_KEYS.welcomeSeen);
        localStorage.setItem(STORAGE_KEYS.installReset, '1');
    }
})();

let _installDeferredPrompt = null;
let _installOverlayEl      = null;
let _onWelcomeDone         = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _installDeferredPrompt = e;
    _refreshInstallBtn();
    updateInstallCardVisibility();
});

window.addEventListener('appinstalled', () => {
    localStorage.setItem(STORAGE_KEYS.installed, '1');
    _closeInstallOverlay(true);
    updateInstallCardVisibility();
});

function maybeShowInstall(onDone) {
    _onWelcomeDone = onDone || null;

    const isInstalled  = localStorage.getItem(STORAGE_KEYS.installed) === '1';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || window.navigator.standalone === true;

    if (isInstalled || isStandalone) {
        _onWelcomeDone && _onWelcomeDone();
        return;
    }

    const guestMode  = localStorage.getItem(STORAGE_KEYS.guestMode) === 'true';
    const welcomeSeen = localStorage.getItem(STORAGE_KEYS.welcomeSeen) === '1';
    const isSignedIn  = !!localStorage.getItem('sb-bccymltkymuokpjbrzfb-auth-token');

    if (guestMode) {
        _buildAndShowOverlay(false);
        return;
    }

    if (isSignedIn && welcomeSeen) {
        _onWelcomeDone && _onWelcomeDone();
        return;
    }

    _buildAndShowOverlay(true);
}

function _buildAndShowOverlay(persistSeen) {
    if (document.getElementById('install-overlay')) return;

    const el = document.createElement('div');
    el.id = 'install-overlay';
    el.innerHTML = `
        <div id="install-sheet">
            <div class="inst-logo-wrap">
                <img class="inst-logo" src="assets/images/icon-192.png" onerror="this.src='assets/images/icon.png'" alt="Robo Ops">
            </div>
            <h1 class="inst-h1">Welcome to<br><span class="inst-accent">Robo&nbsp;Ops</span></h1>
            <p class="inst-sub">Your VEX tournament command center.<br>Install for the best offline experience.</p>
            <button class="inst-btn inst-btn-primary" id="inst-native-btn" onclick="_triggerNativeInstall()" style="display:none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><polyline points="8 12 12 16 16 12"/><path d="M3 21h18"/></svg>
                Install App
            </button>
            <div class="inst-ios-steps" id="inst-ios-steps" style="display:none;">
                <div class="inst-step"><span class="inst-step-num">1</span><span>Tap <strong>Share</strong> <svg class="inst-inline-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> at the bottom of Safari</span></div>
                <div class="inst-step"><span class="inst-step-num">2</span><span>Scroll and tap <strong>"Add to Home Screen"</strong></span></div>
                <div class="inst-step"><span class="inst-step-num">3</span><span>Tap <strong>Add</strong> — you're in!</span></div>
            </div>
            <div class="inst-desktop-steps" id="inst-desktop-steps" style="display:none;">
                <div class="inst-step"><span class="inst-step-num">1</span><span>In Chrome/Edge, click the <strong>install icon</strong> <svg class="inst-inline-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13"/><polyline points="8 12 12 16 16 12"/><path d="M3 21h18"/></svg> in the address bar</span></div>
                <div class="inst-step"><span class="inst-step-num">2</span><span>Click <strong>Install</strong> in the popup</span></div>
            </div>
            <button class="inst-btn inst-btn-secondary" id="inst-getstarted-btn" onclick="_proceedToApp()">Get Started</button>
            <button class="inst-skip" onclick="_proceedToApp()">Skip for now</button>
        </div>`;

    document.body.appendChild(el);
    _installOverlayEl = el;
    _installOverlayEl._persistSeen = persistSeen;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('inst-visible'));
    });

    _refreshInstallBtn();
}

function _refreshInstallBtn() {
    if (!_installOverlayEl) return;

    const nativeBtn    = document.getElementById('inst-native-btn');
    const iosSteps     = document.getElementById('inst-ios-steps');
    const desktopSteps = document.getElementById('inst-desktop-steps');
    const getStartedBtn = document.getElementById('inst-getstarted-btn');
    const isIOS        = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (_installDeferredPrompt) {
        if (nativeBtn)    nativeBtn.style.display    = '';
        if (iosSteps)     iosSteps.style.display     = 'none';
        if (desktopSteps) desktopSteps.style.display = 'none';
        if (getStartedBtn) getStartedBtn.classList.add('inst-btn-secondary-small');
    } else if (isIOS) {
        if (nativeBtn)    nativeBtn.style.display    = 'none';
        if (iosSteps)     iosSteps.style.display     = '';
        if (desktopSteps) desktopSteps.style.display = 'none';
        if (getStartedBtn) getStartedBtn.classList.remove('inst-btn-secondary-small');
    } else {
        if (nativeBtn)    nativeBtn.style.display    = 'none';
        if (iosSteps)     iosSteps.style.display     = 'none';
        if (desktopSteps) desktopSteps.style.display = '';
        if (getStartedBtn) getStartedBtn.classList.remove('inst-btn-secondary-small');
    }
}

async function _triggerNativeInstall() {
    if (!_installDeferredPrompt) return;
    try {
        _installDeferredPrompt.prompt();
        const { outcome } = await _installDeferredPrompt.userChoice;
        _installDeferredPrompt = null;
        if (outcome === 'accepted') {
            localStorage.setItem(STORAGE_KEYS.installed, '1');
            _closeInstallOverlay(true);
        } else {
            _proceedToApp();
        }
    } catch (_) {
        _proceedToApp();
    }
}

function _proceedToApp() {
    if (_installOverlayEl && _installOverlayEl._persistSeen) {
        localStorage.setItem(STORAGE_KEYS.welcomeSeen, '1');
    }
    _closeInstallOverlay(false);
}

function showInstallPrompt() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || window.navigator.standalone === true;
    if (localStorage.getItem(STORAGE_KEYS.installed) === '1' || isStandalone) return;

    _onWelcomeDone = null;
    const existing = document.getElementById('install-overlay');
    if (existing) existing.remove();
    _installOverlayEl = null;
    _buildAndShowOverlay(false);
}

function updateInstallCardVisibility() {
    const card = document.getElementById('settings-install-card');
    if (!card) return;
    const isInstalled  = localStorage.getItem(STORAGE_KEYS.installed) === '1';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || window.navigator.standalone === true;
    card.style.display = (isInstalled || isStandalone) ? 'none' : '';
}

function _closeInstallOverlay(markInstalled) {
    if (markInstalled) {
        localStorage.setItem(STORAGE_KEYS.installed, '1');
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

function resetInstall() {
    localStorage.removeItem(STORAGE_KEYS.installed);
    localStorage.removeItem(STORAGE_KEYS.welcomeSeen);
    location.reload();
}
