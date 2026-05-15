// constants.js
// Single source of truth for every magic string and fixed number in the app.
// Load order: this file must load first.

// localStorage keys — change a key here and nowhere else needs updating
const STORAGE_KEYS = {
  db:           'paragon_db',
  sketches:     'paragon_sketches',
  settings:     'paragon_settings_v3',
  guestMode:    'paragon_guest_mode',
  installed:    'paragon_installed_v1',
  welcomeSeen:  'paragon_welcome_seen_v1',
  installReset: 'paragon_install_reset_v2',
  onboarded:    'paragon_onboarded_v1',
};

// VEX Override scoring — update here when the season changes
const POINTS = {
  rings:    2,
  stakes:   3,
  zones:    5,
  autonWin: 6,
  autonTie: 3,
};

// Theme and style definitions shared by onboarding.js and app.js settings.
// Keeping them here prevents the two modules from drifting apart.
const THEMES = [
  { id: 'theme-gold',    name: 'Gold',    tag: 'Dark only',    accent: '#e8b23b', bg: '#060501', mode: 'mode-dark'  },
  { id: 'theme-arctic',  name: 'Arctic',  tag: 'Light only',   accent: '#006edb', bg: '#eef4fb', mode: 'mode-light' },
  { id: 'theme-red',     name: 'Red',     tag: 'Dark & Light', accent: '#cc2200', bg: '#080808', mode: 'mode-dark'  },
  { id: 'theme-blue',    name: 'Blue',    tag: 'Dark & Light', accent: '#1a6ccc', bg: '#080808', mode: 'mode-dark'  },
  { id: 'theme-stealth', name: 'Stealth', tag: 'Dark & Light', accent: '#e0e0e0', bg: '#000000', mode: 'mode-dark'  },
];

const STYLES = [
  { id: 'style-classic',  name: 'Classic',  desc: 'Original feel',  icon: '◼' },
  { id: 'style-minimal',  name: 'Minimal',  desc: 'Lines only',     icon: '▱' },
  { id: 'style-glass',    name: 'Glass',    desc: 'Frosted blur',   icon: '◈' },
  { id: 'style-tactical', name: 'Tactical', desc: 'Sharp HUD',      icon: '◧' },
  { id: 'style-neon',     name: 'Neon',     desc: 'Glow effects',   icon: '✦' },
  { id: 'style-retro',    name: 'Retro',    desc: 'Warm & textured',icon: '❧' },
];

// Themes where the mode is fixed and can't be toggled by the user
const LOCKED_DARK  = ['theme-gold'];
const LOCKED_LIGHT = ['theme-arctic'];
