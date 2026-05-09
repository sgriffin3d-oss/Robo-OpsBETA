const SUPABASE_URL = 'https://bccymltkymuokpjbrzfb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W4DFizkRZQEHdh_xmXV4hQ_jVMMy0GX';

let _supabase = null;
let currentUser = null;
let isGuest = false;
let authReady = false;

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
            drawNotes();
        } else if (localStorage.getItem('paragon_guest_mode') === 'true') {
            
            isGuest = true;
            loadLocalData();
        } else {
            
            showLoginScreen();
        }
    } catch (err) {
        
        console.error('Auth init error:', err);
        isGuest = true;
        loadLocalData();
    }

    authReady = true;

    
    _supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            currentUser = session.user;
            isGuest = false;
            localStorage.removeItem('paragon_guest_mode');
            updateAccountUI();
            await syncFromCloud();
            drawNotes();
            nav('hub');
        } else if (event === 'SIGNED_OUT') {
            
            if (_signingOut) return;
            currentUser = null;
            isGuest = false;
            showLoginScreen();
        }
    });
}

let _authReady = false;  

function showLoginScreen() {
    if (!_authReady) return;  
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const loginView = document.getElementById('view-login');
    if (loginView) loginView.classList.add('active');
}

async function signInWithGoogle() {
    if (!_supabase) return showAuthError('Not connected to auth service.');
    const btn = document.getElementById('btn-google');
    if (btn) { btn.disabled = true; btn.textContent = 'Connecting...'; }

    const { error } = await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
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

    if (save) localStorage.setItem('paragon_guest_mode', 'true');
    loadLocalData();
    updateAccountUI();
    drawNotes();

    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const hub = document.getElementById('view-hub');
    if (hub) hub.classList.add('active');
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
    localStorage.removeItem('paragon_guest_mode');

    
    if (_supabase) {
        try { await _supabase.auth.signOut(); } catch (e) {  }
    }

    showLoginScreen();

    
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
    if (subtitleEl) {
        subtitleEl.textContent = isGuest ? 'Data saved locally only' : 'Synced across devices';
    }

    
    const labelEl = document.getElementById('account-signout-label');
    if (labelEl) {
        labelEl.textContent = isGuest ? 'Sign In' : 'Sign Out';
    }

    
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
        const isMarkedInstalled = localStorage.getItem('paragon_installed_v1') === '1';
        installCard.style.display = (isStandalone || isMarkedInstalled) ? 'none' : '';
    }
}

async function syncFromCloud() {
    if (isGuest || !currentUser || !_supabase) return;
    try {
        const [reportsRes, sketchesRes, settingsRes] = await Promise.all([
            _supabase.from('scout_reports').select('*').eq('user_id', currentUser.id),
            _supabase.from('sketches').select('*').eq('user_id', currentUser.id),
            _supabase.from('user_settings').select('*').eq('user_id', currentUser.id).single()
        ]);

        if (reportsRes.data?.length) {
            db = reportsRes.data.map(r => ({
                id: r.id, team: r.team, event: r.event, res: r.res,
                autores: r.autores, partner: r.partner, opp: r.opp,
                score: r.score, oppscore: r.oppscore, notes: r.notes
            }));
        }
        if (sketchesRes.data?.length) {
            sketches = sketchesRes.data.map(s => ({
                id: s.id, name: s.name, date: s.date, field: s.field, img: s.img
            }));
        }
        if (settingsRes.data) {
            localStorage.setItem('paragon_settings_v3', JSON.stringify({
                theme: settingsRes.data.theme,
                style: settingsRes.data.style,
                mode:  settingsRes.data.mode
            }));
            loadSettings();
        }
    } catch (err) {
        console.error('Cloud sync error:', err);
        loadLocalData();
    }
}

function loadLocalData() {
    db       = JSON.parse(localStorage.getItem('paragon_db'))       || [];
    sketches = JSON.parse(localStorage.getItem('paragon_sketches')) || [];
}

async function cloudSaveReport(report) {
    if (isGuest || !currentUser || !_supabase) {
        localStorage.setItem('paragon_db', JSON.stringify(db)); return;
    }
    await _supabase.from('scout_reports').upsert({ ...report, user_id: currentUser.id });
}

async function cloudDeleteReport(id) {
    if (isGuest || !currentUser || !_supabase) {
        localStorage.setItem('paragon_db', JSON.stringify(db)); return;
    }
    await _supabase.from('scout_reports').delete().eq('id', id).eq('user_id', currentUser.id);
}

async function cloudSaveSketch(sketch) {
    if (!sketch) return;
    if (isGuest || !currentUser || !_supabase) {
        localStorage.setItem('paragon_sketches', JSON.stringify(sketches)); return;
    }
    await _supabase.from('sketches').upsert({ ...sketch, user_id: currentUser.id });
}

async function cloudDeleteSketch(id) {
    if (isGuest || !currentUser || !_supabase) {
        localStorage.setItem('paragon_sketches', JSON.stringify(sketches)); return;
    }
    await _supabase.from('sketches').delete().eq('id', id).eq('user_id', currentUser.id);
}

async function cloudSaveSettings(settings) {
    if (isGuest || !currentUser || !_supabase) return;
    await _supabase.from('user_settings').upsert({
        user_id: currentUser.id,
        theme: settings.theme || 'theme-gold',
        style: settings.style || 'style-classic',
        mode:  settings.mode  || 'mode-dark',
        updated_at: new Date().toISOString()
    });
}
