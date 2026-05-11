/**
 * Paragon-CoreX Feature Registry
 * --------------------------------
 * To add a new feature to the home screen:
 *
 *   1. Create src/myfeature.js  → call ParagonFeature({ ... }) inside
 *   2. Create assets/css/myfeature.css  (optional)
 *   3. Add to index.html:
 *        <link rel="stylesheet" href="assets/css/myfeature.css">
 *        <script src="src/myfeature.js"></script>
 *
 * That's it. The card appears on the hub automatically.
 *
 * ParagonFeature(config) options:
 *   id       {string}   Unique kebab-case ID, e.g. 'my-feature'
 *   label    {string}   Card label shown on hub
 *   icon     {string}   SVG string or emoji, shown in the card icon slot
 *   onOpen   {function} Called every time the feature view is navigated to
 *   render   {function} Called ONCE on first open — receives the view container div
 *   order    {number}   Optional. Lower = higher up in the hub. Default: 100
 */

(function () {
  const _registry = [];

  window.ParagonFeature = function (config) {
    if (!config.id || !config.label) {
      console.warn('[Registry] Feature missing id or label — skipped:', config);
      return;
    }
    _registry.push(config);
    // Re-render cards if hub is already mounted (script loaded late)
    if (document.readyState !== 'loading') _renderAll();
  };

  // Called by app.js nav() — keeps registry decoupled from nav internals
  window._registryOnNav = function (viewId) {
    const feature = _registry.find(f => 'view-plugin-' + f.id === viewId);
    if (!feature) return;
    const container = document.getElementById('view-plugin-' + feature.id);
    if (!container) return;
    if (!container.dataset.rendered) {
      container.dataset.rendered = '1';
      if (typeof feature.render === 'function') feature.render(container);
    }
    if (typeof feature.onOpen === 'function') feature.onOpen(container);
  };

  function _renderAll() {
    const anchor = document.getElementById('hub-plugin-cards');
    const viewHost = document.getElementById('view-plugins');
    if (!anchor || !viewHost) return;

    // Sort by optional order field, then insertion order
    const sorted = [..._registry].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

    anchor.innerHTML = sorted.map(f => `
      <div class="hub-card" onclick="nav('plugin-${f.id}')">
        <span class="icon">${f.icon || '◼'}</span>
        <b>${f.label}</b>
      </div>`).join('');

    // Create view containers for any that don't exist yet
    sorted.forEach(f => {
      const vid = 'view-plugin-' + f.id;
      if (!document.getElementById(vid)) {
        const section = document.createElement('section');
        section.id = vid;
        section.className = 'view';
        viewHost.appendChild(section);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', _renderAll);
})();
