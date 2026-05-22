
let _obTheme = 'theme-gold';
let _obStyle = 'style-classic';
let _obMode  = 'mode-dark';
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
});

function maybeShowOnboarding() {
  if (localStorage.getItem(STORAGE_KEYS.onboarded)) return false;
  _showOnboarding();
  return true;
}

function _showOnboarding() {
  const overlay = document.getElementById('ob-overlay');
  if (!overlay) return;
  overlay.classList.add('ob-visible');
  _renderStep1();
}

function _renderStep1() {
  const body = document.getElementById('ob-body');
  body.innerHTML = `
    <div class="ob-logo">
      <img src="assets/images/icon.png" alt="Robo Ops">
    </div>
    <h1 class="ob-title">Welcome to<br><span>Robo Ops</span></h1>
    <p class="ob-sub">Pick your look — you can change it anytime in Settings.</p>

    <div class="ob-section-label">Color Theme</div>
    <div class="ob-theme-grid" id="ob-theme-grid">
      ${THEMES.map(t => `
        <button class="ob-theme-swatch ${t.id === _obTheme ? 'ob-selected' : ''}"
                id="obs-${t.id}"
                onclick="obSelectTheme('${t.id}','${t.mode}')"
                style="background:${t.bg}; --ob-accent:${t.accent};">
          <div class="ob-swatch-dot" style="background:${t.accent};"></div>
          <div class="ob-swatch-name">${t.name}</div>
          <div class="ob-swatch-tag">${t.tag}</div>
        </button>
      `).join('')}
    </div>

    <div class="ob-section-label" style="margin-top:24px;">Interface Style</div>
    <div class="ob-style-grid" id="ob-style-grid">
      ${STYLES.map(s => `
        <button class="ob-style-card ${s.id === _obStyle ? 'ob-selected' : ''}"
                id="obst-${s.id}"
                onclick="obSelectStyle('${s.id}')">
          <div class="ob-style-icon">${s.icon}</div>
          <div class="ob-style-name">${s.name}</div>
          <div class="ob-style-desc">${s.desc}</div>
        </button>
      `).join('')}
    </div>

    <button class="ob-cta" onclick="obConfirmTheme()">
      Look good — continue
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </button>
  `;
  _applyPreview();
}

function obSelectTheme(id, mode) {
  _obTheme = id;
  _obMode  = mode;
  document.querySelectorAll('.ob-theme-swatch').forEach(el => el.classList.remove('ob-selected'));
  document.getElementById('obs-' + id)?.classList.add('ob-selected');
  _applyPreview();
}

function obSelectStyle(id) {
  _obStyle = id;
  document.querySelectorAll('.ob-style-card').forEach(el => el.classList.remove('ob-selected'));
  document.getElementById('obst-' + id)?.classList.add('ob-selected');
  _applyPreview();
}

function _applyPreview() {
  const modeClass = _obMode === 'mode-light' ? 'mode-light' : '';
  document.body.className = [_obTheme, _obStyle, modeClass].filter(Boolean).join(' ');
}

function obConfirmTheme() {
  if (typeof saveSettings === 'function') {
    saveSettings({ theme: _obTheme, style: _obStyle, mode: _obMode });
  }
  _renderStep2();
}

function _renderStep2() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || window.navigator.standalone === true;
  if (isStandalone) { _finishOnboarding(); return; }

  const isIOS            = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const canNativePrompt  = !!_deferredInstallPrompt;

  let installHtml = '';

  if (canNativePrompt) {
    installHtml = `
      <button class="ob-install-btn" onclick="obTriggerNativeInstall()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v13"/><polyline points="8 11 12 15 16 11"/><path d="M20 21H4"/></svg>
        Add to Home Screen
      </button>`;
  } else if (isIOS) {
    installHtml = `
      <div class="ob-install-manual">
        <div class="ob-install-step"><span class="ob-step-num">1</span>Tap the <strong>Share</strong> button <svg class="ob-inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> in Safari</div>
        <div class="ob-install-step"><span class="ob-step-num">2</span>Scroll down and tap <strong>"Add to Home Screen"</strong></div>
        <div class="ob-install-step"><span class="ob-step-num">3</span>Tap <strong>Add</strong> — done!</div>
      </div>`;
  } else {
    installHtml = `
      <div class="ob-install-manual">
        <div class="ob-install-step"><span class="ob-step-num">1</span>In Chrome or Edge, click the <strong>install icon</strong> in the address bar</div>
        <div class="ob-install-step"><span class="ob-step-num">2</span>Click <strong>"Install"</strong> in the popup</div>
        <div class="ob-install-step"><span class="ob-step-num">3</span>Robo Ops opens as its own app!</div>
      </div>`;
  }

  document.getElementById('ob-body').innerHTML = `
    <div class="ob-install-icon">
      <img src="assets/images/icon.png" alt="Robo Ops">
    </div>
    <h2 class="ob-title ob-title-sm">Install the App</h2>
    <p class="ob-sub">Get the full experience — works offline, opens instantly, no browser chrome.</p>
    ${installHtml}
    <button class="ob-cta ob-cta-install" id="ob-install-cta" onclick="obTriggerNativeInstall()" style="${canNativePrompt ? '' : 'display:none'}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v13"/><polyline points="8 11 12 15 16 11"/><path d="M20 21H4"/></svg>
      Install Now
    </button>
    <button class="ob-skip" onclick="_finishOnboarding()">
      ${canNativePrompt ? 'Maybe later' : "I'll do it later — let me in"}
    </button>
  `;
}

async function obTriggerNativeInstall() {
  if (!_deferredInstallPrompt) { _finishOnboarding(); return; }
  _deferredInstallPrompt.prompt();
  await _deferredInstallPrompt.userChoice;
  _deferredInstallPrompt = null;
  _finishOnboarding();
}

function _finishOnboarding() {
  localStorage.setItem(STORAGE_KEYS.onboarded, '1');
  const overlay = document.getElementById('ob-overlay');
  if (overlay) {
    overlay.classList.add('ob-exit');
    setTimeout(() => overlay.remove(), 500);
  }
}
