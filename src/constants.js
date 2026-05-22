const STORAGE_KEYS = {
  db:           'paragon_db',
  sketches:     'paragon_sketches',
  notes:        'paragon_notes_v1',
  settings:     'paragon_settings_v3',
  guestMode:    'paragon_guest_mode',
  installed:    'paragon_installed_v1',
  welcomeSeen:  'paragon_welcome_seen_v1',
  installReset: 'paragon_install_reset_v2',
  onboarded:    'paragon_onboarded_v1',
};

const POINTS = {
  alliancePin:   5,
  yellowPin:     10,
  midfieldRobot: 8,
  autonBonus:    12,
  autonTie:      6,
};

const THEMES = [
  { id: 'theme-gold',    name: 'Gold',    tag: 'Dark & Light', accent: '#e8b23b', bg: '#060501', mode: 'mode-dark' },
  { id: 'theme-red',     name: 'Red',     tag: 'Dark & Light', accent: '#cc2200', bg: '#080808', mode: 'mode-dark' },
  { id: 'theme-blue',    name: 'Blue',    tag: 'Dark & Light', accent: '#1a6ccc', bg: '#080808', mode: 'mode-dark' },
  { id: 'theme-stealth', name: 'Stealth', tag: 'Dark & Light', accent: '#e0e0e0', bg: '#000000', mode: 'mode-dark' },
  { id: 'theme-custom',  name: 'Custom',  tag: 'Pick your color', accent: '#7c3aed', bg: '#080808', mode: 'mode-dark' },
];

const STYLES = [
  { id: 'style-classic',  name: 'Classic',  desc: 'Original feel',   icon: '◼' },
  { id: 'style-minimal',  name: 'Minimal',  desc: 'Lines only',      icon: '▱' },
  { id: 'style-glass',    name: 'Glass',    desc: 'Frosted blur',    icon: '◈' },
  { id: 'style-tactical', name: 'Tactical', desc: 'Sharp HUD',       icon: '◧' },
  { id: 'style-neon',     name: 'Neon',     desc: 'Glow effects',    icon: '✦' },
  { id: 'style-retro',    name: 'Retro',    desc: 'Warm & textured', icon: '❧' },
];

const LOCKED_DARK  = [];
const LOCKED_LIGHT = [];
