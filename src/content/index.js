/* ============================================================================
   Bootstrap, ciclo de vida e observadores.
   A Biblioteca é uma SPA com scroll infinito: um único MutationObserver com
   debounce alimenta um scan idempotente, que sai cedo em card já decorado.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.registry = new Map();      // libraryId -> { el, data }
ALC.collected = [];
ALC.gql = new Map();           // libraryId -> snapshot vindo do GraphQL
ALC.settings = Object.assign({}, ALC.DEFAULT_SETTINGS);
ALC.lastShiftKey = false;

(function () {
  const { debounce } = ALC.dom;
  let observer = null;
  let mounted = false;
  let pending = [];

  const onLibrary = () => /\/ads\/library/.test(location.pathname);

  /* --- scan --------------------------------------------------------------- */
  function scanAndDecorate() {
    if (!mounted) return;
    const found = ALC.scraper.discover();
    if (!found.length && !pending.length) return;
    pending = pending.concat(found);
    processChunk();
  }

  function processChunk() {
    const chunk = pending.splice(0, 30);      // nunca mais de 30 cards por frame
    chunk.forEach(({ el, libraryId }) => {
      if (el.classList.contains('alc-card')) return;
      const data = ALC.scraper.scrape(el, libraryId, {
        expand: ALC.settings.autoExpandSeeMore
      });
      if (!data) return;
      el.dataset.alcId = libraryId;
      ALC.registry.set(libraryId, { el, data });
      try { ALC.cardUI.decorate(el, data, ALC.settings); } catch (e) { console.warn('[ALC]', e); }
    });
    ALC.filters.apply();
    ALC.panel.push();
    if (pending.length) {
      (window.requestIdleCallback || window.requestAnimationFrame)(processChunk);
    }
  }

  /** Reprocessa tudo do zero: limpa o registry, redecora e reaplica filtros. */
  ALC.rescan = function (announce) {
    if (announce) ALC.toast.info(ALC.t('syncing'));
    document.querySelectorAll('.alc-card').forEach((c) => {
      c.classList.remove('alc-card', 'alc-scaling', 'alc-hidden');
      c.querySelectorAll(':scope > .alc-card-bar, :scope > .alc-card-ring').forEach((n) => n.remove());
      delete c.dataset.alcId;
    });
    ALC.registry.clear();
    pending = [];
    scanAndDecorate();
  };

  /** Registra o anúncio na aba "Coletados" quando o usuário age sobre ele. */
  ALC.collect = function (ad) {
    if (!ad || ALC.collected.some((a) => a.libraryId === ad.libraryId)) return;
    ALC.collected.push(ad);
    ALC.store.set(ALC.K.COLLECTED, ALC.collected.slice(-200), 'local');
    ALC.panel.push();
  };

  /* --- GraphQL: fonte primária quando disponível --------------------------- */
  function listenGraphQL() {
    window.addEventListener('message', (e) => {
      if (e.source !== window || !e.data || e.data.source !== 'ALC_GQL') return;
      const ads = e.data.payload || [];
      let novo = 0;
      ads.forEach((a) => {
        if (!a || !a.libraryId) return;
        if (!ALC.gql.has(a.libraryId)) novo++;
        ALC.gql.set(a.libraryId, a);
      });
      // dados melhores chegaram: re-scrapeia só os cards já registrados
      if (novo) {
        ALC.registry.forEach((entry, id) => {
          if (!ALC.gql.has(id)) return;
          const fresh = ALC.scraper.scrape(entry.el, id, { expand: false });
          if (fresh) entry.data = fresh;
        });
        ALC.filters.apply();
        ALC.panel.push();
      }
    });
    try {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('src/content/inject.js');
      s.onload = () => s.remove();
      (document.head || document.documentElement).appendChild(s);
    } catch (_) { /* sem interceptação: o scraping do DOM cobre */ }
  }

  /* --- atalhos de teclado -------------------------------------------------- */
  function shortcuts() {
    document.addEventListener('keydown', (e) => {
      ALC.lastShiftKey = e.shiftKey;
      const t = e.target;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'f') { const r = ALC.filters.toggleEnabled(); ALC.toast.info(r.shown + '/' + r.total); }
      else if (k === 'h') ALC.panel.toggle();
      else if (k === 't') window.scrollTo({ top: 0, behavior: 'smooth' });
      else if (k === 'r') ALC.rescan(true);
      else if (e.key === '?') ALC.tray.helpModal();
    });
    document.addEventListener('keyup', (e) => { ALC.lastShiftKey = e.shiftKey; });
  }

  /* --- SPA: mudanças de URL ------------------------------------------------ */
  function watchUrl() {
    let last = location.href;
    const check = () => {
      if (location.href === last) return;
      last = location.href;
      if (!onLibrary()) { teardown(); return; }
      if (!mounted) { boot(); return; }
      ALC.registry.clear();
      pending = [];
      ALC.filters.apply();
      setTimeout(scanAndDecorate, 600);
    };
    ['pushState', 'replaceState'].forEach((m) => {
      const orig = history[m];
      history[m] = function () { const r = orig.apply(this, arguments); setTimeout(check, 0); return r; };
    });
    window.addEventListener('popstate', check);
  }

  /* --- montagem / desmontagem ---------------------------------------------- */
  async function boot() {
    if (mounted || !onLibrary()) return;
    mounted = true;

    ALC.settings = await ALC.store.settings();
    ALC.i18n.setLang(ALC.i18n.detect(ALC.settings.lang));
    await ALC.theme.init();
    await ALC.filters.restore();
    ALC.collected = await ALC.store.get(ALC.K.COLLECTED, [], 'local');

    ALC.cardUI.bind();
    await ALC.panel.mount();
    ALC.filters.onChange(() => ALC.panel.push());
    await ALC.tray.mount();
    ALC.navbar.mount();
    listenGraphQL();

    const scan = debounce(scanAndDecorate, 250);
    observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scanAndDecorate();

    ALC.store.onChange((changes, area) => {
      if (area === 'sync' && changes[ALC.K.SETTINGS]) {
        ALC.settings = Object.assign({}, ALC.DEFAULT_SETTINGS, changes[ALC.K.SETTINGS].newValue || {});
        ALC.theme.set(ALC.settings.theme || 'auto');
        ALC.i18n.setLang(ALC.i18n.detect(ALC.settings.lang));
        ALC.rescan(false);
      }
    });
    console.info('[AdLib Copilot] pronto.');
  }

  function teardown() {
    if (!mounted) return;
    mounted = false;
    if (observer) { observer.disconnect(); observer = null; }
    ALC.tray.unmount();
    ALC.panel.unmount();
    ALC.navbar.unmount();
    document.querySelectorAll('.alc-card').forEach((c) => {
      c.classList.remove('alc-card', 'alc-scaling', 'alc-hidden');
      c.querySelectorAll(':scope > .alc-card-bar, :scope > .alc-card-ring').forEach((n) => n.remove());
    });
    ALC.registry.clear();
  }

  shortcuts();
  watchUrl();
  boot();
})();
