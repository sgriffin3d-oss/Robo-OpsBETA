const SUPABASE_URL = 'https://bccymltkymuokpjbrzfb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W4DFizkRZQEHdh_xmXV4hQ_jVMMy0GX';

let _supabase   = null;
let currentUser = null;
let isGuest     = false;
let _authReady  = false;
let _signingOut = false;

async function initAuth() {
  if (!window.supabase) {
    isGuest    = true;
    _authReady = true;
    loadLocalData();
    switchPage('hub');
    return;
  }

  const { createClient } = window.supabase;
  _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { data: { session } } = await _supabase.auth.getSession();

    if (session?.user) {
      currentUser = session.user;
      isGuest     = false;
      _authReady  = true;
      updateAccountUI();
      await syncFromCloud();
      displayNotes();
      switchPage('hub');
    } else if (localStorage.getItem(STORAGE_KEYS.guestMode) === 'true') {
      isGuest    = true;
      _authReady = true;
      loadLocalData();
      switchPage('hub');
    } else {
      _authReady = true;
      showLoginScreen();
      return;
    }
  } catch (err) {
    console.error('Auth init error:', err);
    isGuest    = true;
    _authReady = true;
    loadLocalData();
    switchPage('hub');
  }

  _supabase.auth.onAuthStateChange(async (event, session) => {
    if (_signingOut) return;

    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      isGuest     = false;
      localStorage.removeItem(STORAGE_KEYS.guestMode);
      updateAccountUI();
      await syncFromCloud();
      displayNotes();
      switchPage('hub');
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      isGuest     = false;
      db       = [];
      sketches = [];
      if (typeof notes !== 'undefined') notes = [];
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
    options:  { redirectTo: window.location.origin },
  });

  if (error) {
    showAuthError(error.message);
    if (btn) {
      btn.disabled    = false;
      btn.innerHTML   = `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Continue with Google`;
    }
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
    if (btn) {
      btn.disabled    = false;
      btn.textContent = isSignUp ? 'Create Account' : 'Sign In';
    }
  }
}

function toggleAuthMode() {
  const modeEl = document.getElementById('auth-mode');
  const btn    = document.getElementById('btn-email');
  const toggle = document.getElementById('auth-toggle');
  const title  = document.getElementById('auth-form-title');
  if (!modeEl) return;
  const toSignup      = modeEl.dataset.mode === 'signin';
  modeEl.dataset.mode = toSignup ? 'signup' : 'signin';
  if (btn)    btn.textContent    = toSignup ? 'Create Account' : 'Sign In';
  if (toggle) toggle.textContent = toSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up";
  if (title)  title.textContent  = toSignup ? 'Create Account' : 'Sign In';
  clearAuthError();
}

function continueAsGuest(save = true) {
  currentUser = null;
  isGuest     = true;
  if (save) localStorage.setItem(STORAGE_KEYS.guestMode, 'true');
  loadLocalData();
  updateAccountUI();
  displayNotes();
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-hub')?.classList.add('active');
  window.scrollTo(0, 0);
}

async function signOut() {
  if (_signingOut) return;
  _signingOut = true;

  currentUser = null;
  isGuest     = false;
  db       = [];
  sketches = [];
  if (typeof notes !== 'undefined') notes = [];

  localStorage.removeItem(STORAGE_KEYS.guestMode);

  if (_supabase) {
    try { await _supabase.auth.signOut(); } catch (_) {}
  }

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
      avatarEl.style.fontSize        = '0';
      avatarEl.textContent           = '';
    } else {
      avatarEl.style.backgroundImage = 'none';
      avatarEl.style.fontSize        = '1.3rem';
      avatarEl.textContent           = '👤';
    }
  }

  const installCard = document.getElementById('settings-install-card');
  if (installCard) {
    const isStandalone      = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
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

    db       = (reportsRes.data || []).map(r => ({
      id: r.id, team: r.team, event: r.event, res: r.res,
      autores: r.autores, partner: r.partner, opp: r.opp,
      score: r.score, oppscore: r.oppscore, notes: r.notes,
    }));

    sketches = (sketchesRes.data || []).map(s => ({
      id: s.id, name: s.name, date: s.date, field: s.field, img: s.img,
    }));

    if (settingsRes.data) {
      const s = {
        theme:       settingsRes.data.theme,
        style:       settingsRes.data.style,
        mode:        settingsRes.data.mode,
        customColor: settingsRes.data.custom_color,
      };
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s));
      loadSettings();
    }
  } catch (err) {
    console.error('Cloud sync error:', err);
    db       = [];
    sketches = [];
  }

  syncNotesFromCloud();
}

function loadLocalData() {
  db       = JSON.parse(localStorage.getItem(STORAGE_KEYS.db))       || [];
  sketches = JSON.parse(localStorage.getItem(STORAGE_KEYS.sketches)) || [];
  if (typeof notes !== 'undefined') {
    notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes)) || [];
  }
}

async function cloudSaveReport(report) {
  if (isGuest || !currentUser || !_supabase) {
    localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(db));
    return;
  }
  try { await _supabase.from('scout_reports').upsert({ ...report, user_id: currentUser.id }); }
  catch (e) { console.warn('cloudSaveReport:', e); }
}

async function cloudDeleteReport(id) {
  if (isGuest || !currentUser || !_supabase) {
    localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(db));
    return;
  }
  try { await _supabase.from('scout_reports').delete().eq('id', id).eq('user_id', currentUser.id); }
  catch (e) { console.warn('cloudDeleteReport:', e); }
}

async function cloudSaveSketch(sketch) {
  if (!sketch) return;
  if (isGuest || !currentUser || !_supabase) {
    localStorage.setItem(STORAGE_KEYS.sketches, JSON.stringify(sketches));
    return;
  }
  try { await _supabase.from('sketches').upsert({ ...sketch, user_id: currentUser.id }); }
  catch (e) { console.warn('cloudSaveSketch:', e); }
}

async function cloudDeleteSketch(id) {
  if (isGuest || !currentUser || !_supabase) {
    localStorage.setItem(STORAGE_KEYS.sketches, JSON.stringify(sketches));
    return;
  }
  try { await _supabase.from('sketches').delete().eq('id', id).eq('user_id', currentUser.id); }
  catch (e) { console.warn('cloudDeleteSketch:', e); }
}

async function cloudSaveSettings(settings) {
  if (isGuest || !currentUser || !_supabase) return;
  try {
    await _supabase.from('user_settings').upsert({
      user_id:      currentUser.id,
      theme:        settings.theme       || 'theme-gold',
      style:        settings.style       || 'style-classic',
      mode:         settings.mode        || 'mode-dark',
      custom_color: settings.customColor || null,
      updated_at:   new Date().toISOString(),
    });
  } catch (e) { console.warn('cloudSaveSettings:', e); }
}

async function cloudSaveNote(note) {
  if (!note) return;
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
  if (isGuest || !currentUser || !_supabase) return;
  try { await _supabase.from('notes').upsert({ ...note, user_id: currentUser.id }); }
  catch (e) { console.warn('cloudSaveNote:', e); }
}

async function cloudDeleteNote(id) {
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
  if (isGuest || !currentUser || !_supabase) return;
  try { await _supabase.from('notes').delete().eq('id', id).eq('user_id', currentUser.id); }
  catch (e) { console.warn('cloudDeleteNote:', e); }
}

async function uploadNotePhoto(file) {
  if (isGuest || !currentUser || !_supabase) return null;
  try {
    const ext  = file.name.split('.').pop() || 'jpg';
    const path = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await _supabase.storage.from('note-photos').upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type,
    });
    if (error) throw error;
    const { data } = _supabase.storage.from('note-photos').getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (e) { console.warn('uploadNotePhoto:', e); return null; }
}

async function syncNotesFromCloud() {
  if (isGuest || !currentUser || !_supabase) return;
  try {
    const { data, error } = await _supabase.from('notes').select('*').eq('user_id', currentUser.id);
    if (error || !data?.length) return;
    notes = data.map(r => { const { user_id, ...rest } = r; return rest; });
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
    if (typeof renderNotesList === 'function') renderNotesList();
  } catch (e) { console.warn('syncNotesFromCloud:', e); }
}
