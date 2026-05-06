/**
 * auth.js - Paragon Core X
 * Supabase authentication + cloud sync
 * Supports: Google OAuth, Email/Password, Guest (local only)
 */

const SUPABASE_URL = 'https://bccymltkymuokpjbrzfb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W4DFizkRZQEHdh_xmXV4hQ_jVMMy0GX';

let supabase = null;
let currentUser = null;
let isGuest = false;

// ── INIT ─────────────────────────────────────────────────────────────────────

async function initAuth() {
    // Load Supabase SDK (injected via CDN in index.html)
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
            currentUser = session.user;
            isGuest = false;
            await onSignedIn();
        } else if (!isGuest) {
            currentUser = null;
            showLoginScreen();
        }
    });

    // Check existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        currentUser = session.user;
        isGuest = false;
        await onSignedIn();
    } else if (localStorage.getItem('paragon_guest_mode') === 'true') {
        isGuest = true;
        continueAsGuest(false);
    } else {
        showLoginScreen();
    }
}

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────

function showLoginScreen() {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const loginView = document.getElementById('view-login');
    if (loginView) loginView.classList.add('active');
}

async function signInWithGoogle() {
    const btn = document.getElementById('btn-google');
    if (btn) { btn.disabled = true; btn.textContent = 'Connecting...'; }

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });

    if (error) {
        showAuthError(error.message);
        if (btn) { btn.disabled = false; btn.textContent = 'Continue with Google'; }
    }
}

async function signInWithEmail() {
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;
    const isSignUp = document.getElementById('auth-mode')?.dataset.mode === 'signup';

    if (!email || !password) return showAuthError('Please enter email and password.');

    const btn = document.getElementById('btn-email');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    let result;
    if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
        if (!result.error && result.data.user?.identities?.length === 0) {
            showAuthError('Email already registered. Try signing in.');
            if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
            return;
        }
    } else {
        result = await supabase.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
        showAuthError(result.error.message);
        if (btn) { btn.disabled = false; btn.textContent = isSignUp ? 'Create Account' : 'Sign In'; }
    }
}

function toggleAuthMode() {
    const modeEl = document.getElementById('auth-mode');
    const btn = document.getElementById('btn-email');
    const toggle = document.getElementById('auth-toggle');
    const title = document.getElementById('auth-form-title');
    if (!modeEl) return;

    if (modeEl.dataset.mode === 'signin') {
        modeEl.dataset.mode = 'signup';
        if (btn) btn.textContent = 'Create Account';
        if (toggle) toggle.textContent = 'Already have an account? Sign in';
        if (title) title.textContent = 'Create Account';
    } else {
        modeEl.dataset.mode = 'signin';
        if (btn) btn.textContent = 'Sign In';
        if (toggle) toggle.textContent = "Don't have an account? Sign up";
        if (title) title.textContent = 'Sign In';
    }
    clearAuthError();
}

function continueAsGuest(save = true) {
    isGuest = true;
    currentUser = null;
    if (save) localStorage.setItem('paragon_guest_mode', 'true');
    onSignedIn();
}

async function signOut() {
    if (!isGuest) await supabase.auth.signOut();
    isGuest = false;
    currentUser = null;
    localStorage.removeItem('paragon_guest_mode');
    showLoginScreen();
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function clearAuthError() {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// ── POST LOGIN ────────────────────────────────────────────────────────────────

async function onSignedIn() {
    // Update account bar
    const nameEl = document.getElementById('account-name');
    const avatarEl = document.getElementById('account-avatar');
    if (nameEl) {
        if (isGuest) {
            nameEl.textContent = 'Guest';
        } else {
            const meta = currentUser?.user_metadata;
            nameEl.textContent = meta?.full_name || meta?.name || currentUser?.email || 'Account';
        }
    }
    if (avatarEl) {
        const avatar = currentUser?.user_metadata?.avatar_url;
        avatarEl.style.backgroundImage = avatar ? `url(${avatar})` : 'none';
        avatarEl.textContent = avatar ? '' : (isGuest ? '👤' : '👤');
    }

    // Load cloud data if signed in, otherwise use localStorage
    if (!isGuest && currentUser) {
        await syncFromCloud();
    } else {
        loadLocalData();
    }

    // Navigate to hub
    nav('hub');
    drawNotes();
    loadSettings();
}

// ── DATA SYNC ─────────────────────────────────────────────────────────────────

async function syncFromCloud() {
    if (isGuest || !currentUser) return;

    try {
        const [reportsRes, sketchesRes, settingsRes] = await Promise.all([
            supabase.from('scout_reports').select('*').eq('user_id', currentUser.id),
            supabase.from('sketches').select('*').eq('user_id', currentUser.id),
            supabase.from('user_settings').select('*').eq('user_id', currentUser.id).single()
        ]);

        if (reportsRes.data) {
            db = reportsRes.data.map(r => ({
                id: r.id, team: r.team, event: r.event, res: r.res,
                autores: r.autores, partner: r.partner, opp: r.opp,
                score: r.score, oppscore: r.oppscore, notes: r.notes
            }));
        }

        if (sketchesRes.data) {
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
        }

    } catch (err) {
        console.error('Sync error:', err);
        // Fall back to local data
        loadLocalData();
    }
}

function loadLocalData() {
    db = JSON.parse(localStorage.getItem('paragon_db')) || [];
    sketches = JSON.parse(localStorage.getItem('paragon_sketches')) || [];
}

// ── CLOUD WRITE HELPERS (called from app.js) ──────────────────────────────────

async function cloudSaveReport(report) {
    if (isGuest || !currentUser) {
        localStorage.setItem('paragon_db', JSON.stringify(db));
        return;
    }
    await supabase.from('scout_reports').upsert({
        ...report, user_id: currentUser.id
    });
}

async function cloudDeleteReport(id) {
    if (isGuest || !currentUser) {
        localStorage.setItem('paragon_db', JSON.stringify(db));
        return;
    }
    await supabase.from('scout_reports').delete().eq('id', id).eq('user_id', currentUser.id);
}

async function cloudSaveSketch(sketch) {
    if (isGuest || !currentUser) {
        localStorage.setItem('paragon_sketches', JSON.stringify(sketches));
        return;
    }
    await supabase.from('sketches').upsert({
        ...sketch, user_id: currentUser.id
    });
}

async function cloudDeleteSketch(id) {
    if (isGuest || !currentUser) {
        localStorage.setItem('paragon_sketches', JSON.stringify(sketches));
        return;
    }
    await supabase.from('sketches').delete().eq('id', id).eq('user_id', currentUser.id);
}

async function cloudSaveSettings(settings) {
    if (isGuest || !currentUser) return;
    await supabase.from('user_settings').upsert({
        user_id: currentUser.id,
        theme: settings.theme || 'theme-gold',
        style: settings.style || 'style-classic',
        mode:  settings.mode  || 'mode-dark',
        updated_at: new Date().toISOString()
    });
}
