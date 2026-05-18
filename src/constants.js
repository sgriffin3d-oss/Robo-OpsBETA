// constants.js — Single source of truth. Load order: first.

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

// VEX Override 2026-2027 scoring values
const POINTS = {
  // Rings scored on stakes (per ring, per stake ownership tier — see calc.js)
  ringOnStake:     1,
  // Stake ownership bonus (scored by the alliance who owns the most rings on it)
  stakeOwnership:  2,
  // Corner zone control bonus
  zoneControl:     5,
  // Autonomous bonus
  autonWin:        6,
  autonTie:        3,
};

// Themes — shared by onboarding.js and app.js settings renderer
const THEMES = [
  { id: 'theme-gold',    name: 'Gold',    tag: 'Dark & Light', accent: '#e8b23b', bg: '#060501', mode: 'mode-dark'  },
  { id: 'theme-red',     name: 'Red',     tag: 'Dark & Light', accent: '#cc2200', bg: '#080808', mode: 'mode-dark'  },
  { id: 'theme-blue',    name: 'Blue',    tag: 'Dark & Light', accent: '#1a6ccc', bg: '#080808', mode: 'mode-dark'  },
  { id: 'theme-stealth', name: 'Stealth', tag: 'Dark & Light', accent: '#e0e0e0', bg: '#000000', mode: 'mode-dark'  },
];

const STYLES = [
  { id: 'style-classic',  name: 'Classic',  desc: 'Original feel',   icon: '◼' },
  { id: 'style-minimal',  name: 'Minimal',  desc: 'Lines only',      icon: '▱' },
  { id: 'style-glass',    name: 'Glass',    desc: 'Frosted blur',    icon: '◈' },
  { id: 'style-tactical', name: 'Tactical', desc: 'Sharp HUD',       icon: '◧' },
  { id: 'style-neon',     name: 'Neon',     desc: 'Glow effects',    icon: '✦' },
  { id: 'style-retro',    name: 'Retro',    desc: 'Warm & textured', icon: '❧' },
];

// No locked themes — gold and all others support both modes
const LOCKED_DARK  = [];
const LOCKED_LIGHT = [];
