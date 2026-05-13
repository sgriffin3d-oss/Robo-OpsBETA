// constants.js
// Single source of truth for every magic string and fixed number in the app.
// Load order: this file loads first so every other file can use these safely.

// Keys used to read/write localStorage. Keeping them here means if a key
// ever needs to change, there is exactly one place to update it.
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

// VEX scoring point values for the current season.
// Update these here when the season changes - nowhere else needs to change.
const POINTS = {
  rings:    2,
  stakes:   3,
  zones:    5,
  autonWin: 6,
  autonTie: 3,
};
