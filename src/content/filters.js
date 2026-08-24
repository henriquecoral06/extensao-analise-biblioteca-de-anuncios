/* ============================================================================
   Motor de filtros — client-side. Nunca removemos nós do DOM: o React do
   Facebook recicla os cards. Escondemos com uma classe e reaplicamos a cada
   scan. Um único passe: primeiro decide, depois escreve.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.filters = (function () {
  const { el } = ALC.dom;

  const state = {
    minDays: null,
    maxDays: null,
    onlyScaling: false,
    mediaType: 'all',      // all | video | image
    textContains: '',
    domainContains: '',
    enabled: true
  };

  let banner = null;
  const listeners = [];

  function pass(ad) {
    if (!ad) return true;
    if (state.minDays != null && (ad.daysRunning || 0) < state.minDays) return false;
    if (state.maxDays != null && (ad.daysRunning || 0) > state.maxDays) return false;
    if (state.onlyScaling && (ad.activeAdCount || 1) < 2) return false;
    if (state.mediaType !== 'all') {
      const has = (ad.creatives || []).some((c) => c.type === state.mediaType);
      if (!has) return false;
    }
    if (state.textContains) {
      const hay = ((ad.primaryText || '') + ' ' + (ad.headline || '') + ' ' +
        (ad.description || '') + ' ' + (ad.advertiserName || '')).toLowerCase();
      if (!hay.includes(state.textContains.toLowerCase())) return false;
    }
    if (state.domainContains) {
      if (!(ad.destinationDomain || '').toLowerCase().includes(state.domainContains.toLowerCase())) return false;
    }
    return true;
  }

  function isActive() {
    return state.enabled && (state.minDays != null || state.maxDays != null ||
      state.onlyScaling || state.mediaType !== 'all' || !!state.textContains ||
      !!state.domainContains);
  }

  function apply() {
    const decisions = [];              // fase de leitura
    ALC.registry.forEach((entry) => {
      decisions.push([entry.el, !isActive() || pass(entry.data)]);
    });
    let shown = 0;                     // fase de escrita
    for (let i = 0; i < decisions.length; i++) {
      const [node, ok] = decisions[i];
      node.classList.toggle('alc-hidden', !ok);
      if (ok) shown++;
    }
    const total = decisions.length;
    updateBanner(shown, total);
    listeners.forEach((fn) => { try { fn(shown, total, state); } catch (_) {} });
    return { shown, total };
  }

  function updateBanner(shown, total) {
    if (shown > 0 || total === 0 || !isActive()) {
      if (banner) { banner.remove(); banner = null; }
      return;
    }
    if (!banner) {
      const clear = el('button.alc-btn.alc-btn-sm.alc-btn-secondary', {
        type: 'button', text: ALC.t('clearFilters'), onclick: () => { reset(); apply(); }
      });
      banner = el('div.alc-empty.alc-scope.alc-card', null, [
        el('span.alc-i.alc-i-funnel', { 'aria-hidden': 'true' }),
        el('span.alc-empty-msg'),
        clear
      ]);
      const grid = ALC.registry.size
        ? ALC.registry.values().next().value.el.parentElement : document.body;
      (grid || document.body).prepend(banner);
    }
    banner.querySelector('.alc-empty-msg').textContent = ALC.t('noneVisible', { total });
  }

  function set(patch) {
    Object.assign(state, patch);
    ALC.store.set(ALC.K.FILTERS, state, 'local');
    return apply();
  }

  function reset() {
    Object.assign(state, {
      minDays: null, maxDays: null, onlyScaling: false, mediaType: 'all',
      textContains: '', domainContains: '', enabled: true
    });
    ALC.store.set(ALC.K.FILTERS, state, 'local');
  }

  async function restore() {
    const saved = await ALC.store.get(ALC.K.FILTERS, null, 'local');
    if (saved) Object.assign(state, saved);
  }

  return {
    state, apply, set, reset, restore, isActive, pass,
    toggleEnabled() { return set({ enabled: !state.enabled }); },
    onChange(fn) { listeners.push(fn); }
  };
})();
