/* ============================================================================
   Tema. Fonte de verdade: o atributo data-alc-theme no <html>. Os componentes
   nunca leem o tema — só usam tokens semânticos, que trocam de valor.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.theme = (function () {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  let pref = 'auto';

  function resolve() {
    return pref === 'auto' ? (mq.matches ? 'dark' : 'light') : pref;
  }
  function paint() {
    document.documentElement.setAttribute('data-alc-theme', resolve());
    window.dispatchEvent(new CustomEvent('alc:theme', { detail: resolve() }));
  }
  return {
    async init() {
      const s = await ALC.store.settings();
      pref = s.theme || 'auto';
      paint();
      mq.addEventListener('change', () => { if (pref === 'auto') paint(); });
    },
    current() { return resolve(); },
    pref() { return pref; },
    /** Ciclo do botão do tray: auto -> claro -> escuro -> auto */
    async cycle() {
      pref = pref === 'auto' ? 'light' : pref === 'light' ? 'dark' : 'auto';
      paint();
      await ALC.store.saveSettings({ theme: pref });
      return pref;
    },
    set(v) { pref = v; paint(); }
  };
})();
