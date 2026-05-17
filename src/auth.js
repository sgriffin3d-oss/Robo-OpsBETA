// Supabase project credentials.
// SUPABASE_KEY is the publishable anon key — safe to ship in client code,
// but keep it out of version control if you can by setting it via an env var
// and injecting it at build time. For now it lives here.
const SUPABASE_URL = 'https://bccymltkymuokpjbrzfb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W4DFizkRZQEHdh_xmXV4hQ_jVMMy0GX';

let _supabase    = null;
let currentUser  = null;
let isGuest      = false;
// Flipped to true once initAuth has run — guards showLoginScreen so it
// can't fire before the SDK has had a chance to restore a session.
let _authReady   = false;

async function initAuth() {
  if (!window.supabase) {
    console.warn('Supabase SDK not loaded — running as guest');
    isGuest = true;
    loadLocalData();
    return;
  }

  const { createClient } = window.supabase;
  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { data: { session } } = await _supabase.auth.getSession();

    if (session?.user) {
      currentUser = session.user;
      isGuest = false;
      updateAccountUI();
      await syncFromCloud();
      displayNotes();
      switchPage('hub');
    } else if (localStorage.getItem(STORAGE_KEYS.guestMode) === 'true') {
      isGuest = true;
      loadLocalData();
      switchPage('hub');
    } else {
      // No session and not in guest mode — show the login screen.
      // Set _authReady first so showLoginScreen's guard doesn't block it.
      _authReady = true;
      showLoginScreen();
      return;
    }
  } catch (err) {
    console.error('Auth init error:', err);
    isGuest = true;
    loadLocalData();
    switchPage('hub');
  }

  _authReady = true;

  _supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      isGuest = false;
      localStorage.removeItem(STORAGE_KEYS.guestMode);
      updateAccountUI();
      await syncFromCloud();
      displayNotes();
      switchPage('hub');
    } else if (event === 'SIGNED_OUT') {
      // Suppress the listener firing from our own signOut() call
      if (_signingOut) return;
      currentUser = null;
      isGuest = false;
      showLoginScreen();
    }
  });
}

function showLoginScreen() {
  if (!_authReady) return;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-login')?.classList.add('active');
}

async function signInWithGoogle() {
  if (!_supabase) return showAuthError('Not connected to auth service.');
  const btn = document.getElementById('btn-google');
  if (btn) { btn.disabled = true; btn.textContent = 'Connecting...'; }

  const { error } = await _supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });

  if (error) {
    showAuthError(error.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Continue with Google'; }
  }
}

async function signInWithEmail() {
  if (!_supabase) return showAuthError('Not connected to auth service.');
  const email    = document.getElementById('auth-email')?.value?.trim();
  const password = document.getElementById('auth-password')?.value;
  const isSignUp = document.getElementById('auth-mode')?.dataset.mode === 'signup';
  if (!email || !password) return showAuthError('Please enter email and password.');

  const btn = document.getElementById('btn-email');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }

  const { error } = isSignUp
    ? await _supabase.auth.signUp({ email, password })
    : await _supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showAuthError(error.message);
    if (btn) { btn.disabled = false; btn.textContent = isSignUp ? 'Create Account' : 'Sign In'; }
  }
}

function toggleAuthMode() {
  const modeEl  = document.getElementById('auth-mode');
  const btn     = document.getElementById('btn-email');
  const toggle  = document.getElementById('auth-toggle');
  const title   = document.getElementById('auth-form-title');
  if (!modeEl) return;
  const toSignup = modeEl.dataset.mode === 'signin';
  modeEl.dataset.mode = toSignup ? 'signup' : 'signin';
  if (btn)    btn.textContent    = toSignup ? 'Create Account' : 'Sign In';
  if (toggle) toggle.textContent = toSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up";
  if (title)  title.textContent  = toSignup ? 'Create Account' : 'Sign In';
  clearAuthError();
}

function continueAsGuest(save = true) {
  currentUser = null;
  isGuest = true;
  if (save) localStorage.setItem(STORAGE_KEYS.guestMode, 'true');
  loadLocalData();
  updateAccountUI();
  displayNotes();
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-hub')?.classList.add('active');
  window.scrollTo(0, 0);
}

let _signingOut = false;
async function signOut() {
  if (_signingOut) return;
  _signingOut = true;

  db = [];
  sketches = [];
  currentUser = null;
  isGuest = false;
  localStorage.removeItem(STORAGE_KEYS.guestMode);

  if (_supabase) {
    try { await _supabase.auth.signOut(); } catch (e) { /* ignore */ }
  }

  // Bypass the _authReady guard — at this point auth is definitely ready
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-login')?.classList.add('active');
  window.scrollTo(0, 0);

  setTimeout(() => { _signingOut = false; }, 800);
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function clearAuthError() {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function updateAccountUI() {
  const nameEl = document.getElementById('account-name');
  if (nameEl) {
    if (isGuest) {
      nameEl.textContent = 'Guest Mode';
    } else {
      const meta = currentUser?.user_metadata;
      nameEl.textContent = meta?.full_name || meta?.name || currentUser?.email || 'Account';
    }
  }

  const subtitleEl = document.getElementById('account-subtitle');
  if (subtitleEl) subtitleEl.textContent = isGuest ? 'Data saved locally only' : 'Synced across devices';

  const labelEl = document.getElementById('account-signout-label');
  if (labelEl) labelEl.textContent = isGuest ? 'Sign In' : 'Sign Out';

  const avatarEl = document.getElementById('account-avatar');
  if (avatarEl) {
    const avatar = currentUser?.user_metadata?.avatar_url;
    if (avatar) {
      avatarEl.style.backgroundImage = `url(${avatar})`;
      avatarEl.style.fontSize = '0';
      avatarEl.textContent = '';
    } else {
      avatarEl.style.backgroundImage = 'none';
      avatarEl.style.fontSize = '1.3rem';
      avatarEl.textContent = '👤';
    }
  }

  const installCard = document.getElementById('settings-install-card');
  if (installCard) {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                      || window.navigator.standalone === true;
    const isMarkedInstalled = localStorage.getItem(STORAGE_KEYS.installed) === '1';
    installCard.style.display = (isStandalone || isMarkedInstalled) ? 'none' : '';
  }
}

async function syncFromCloud() {
  if (isGuest || !currentUser || !_supabase) return;
  try {
    const [reportsRes, sketchesRes, settingsRes] = await Promise.all([
      _supabase.from('scout_reports').select('*').eq('user_id', currentUser.id),
      _supabase.from('sketches').select('*').eq('user_id', currentUser.id),
      _supabase.from('user_settings').select('*').eq('user_id', currentUser.id).single(),
    ]);

    if (reportsRes.data?.length) {
      db = reportsRes.data.map(r => ({
        id: r.id, team: r.team, event: r.event, res: r.res,
        autores: r.autores, partner: r.partner, opp: r.opp,
        score: r.score, oppscore: r.oppscore, notes: r.notes,
      }));
    }
    if (sketchesRes.data?.length) {
      sketches = sketchesRes.data.map(s => ({
        id: s.id, name: s.name, date: s.date, field: s.field, img: s.img,
      }));
    }
    if (settingsRes.data) {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({
        theme: settingsRes.data.theme,
        style: settingsRes.data.style,
        mode:  settingsRes.data.mode,
      }));
      loadSettings();
    }
  } catch (err) {
    console.error('Cloud sync error:', err);
    loadLocalData();
  }
}

function loadLocalData() {
  db       = JSON.parse(localStorage.getItem(STORAGE_KEYS.db))       || [];
  sketches = JSON.parse(localStorage.getItem(STORAGE_KEYS.sketches)) || [];
}

async function cloudSaveReport(report) {
  if (isGuest || !currentUser || !_supabase) {
    localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(db));
    return;
  }
  await _supabase.from('scout_reports').upsert({ ...report, user_id: currentUser.id });
}

async function cloudDeleteReport(id) {
  if (isGuest || !currentUser || !_supabase) {
    localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(db));
    return;
  }
  await _supabase.from('scout_reports').delete().eq('id', id).eq('user_id', currentUser.id);
}

async function cloudSaveSketch(sketch) {
  if (!sketch) return;
  if (isGuest || !currentUser || !_supabase) {
    localStorage.setItem(STORAGE_KEYS.sketches, JSON.stringify(sketches));
    return;
  }
  await _supabase.from('sketches').upsert({ ...sketch, user_id: currentUser.id });
}

async function cloudDeleteSketch(id) {
  if (isGuest || !currentUser || !_supabase) {
    localStorage.setItem(STORAGE_KEYS.sketches, JSON.stringify(sketches));
    return;
  }
  await _supabase.from('sketches').delete().eq('id', id).eq('user_id', currentUser.id);
}

async function cloudSaveSettings(settings) {
  if (isGuest || !currentUser || !_supabase) return;
  await _supabase.from('user_settings').upsert({
    user_id:    currentUser.id,
    theme:      settings.theme || 'theme-gold',
    style:      settings.style || 'style-classic',
    mode:       settings.mode  || 'mode-dark',
    updated_at: new Date().toISOString(),
  });
}
