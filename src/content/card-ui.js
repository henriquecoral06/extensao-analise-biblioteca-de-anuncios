/* ============================================================================
   CAMADA A — barra de ações dentro de cada card, badge de tempo no ar e o
   anel esmeralda que marca o anúncio em escala.
   O popover é renderizado num layer no <body>: assim o menu nunca é cortado
   pela borda do card e não depende do overflow do Facebook.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.cardUI = (function () {
  const { el, icon } = ALC.dom;

  const MENUS = [
    { key: 'save', icon: 'download', label: 'save', mod: () => ALC.actionsSave },
    { key: 'copy', icon: 'copy', label: 'copy', mod: () => ALC.actionsCopy },
    { key: 'open', icon: 'external', label: 'open', mod: () => ALC.actionsOpen },
    { key: 'send', icon: 'share', label: 'send', mod: () => ALC.actionsShare },
    { key: 'create', icon: 'sparkle', label: 'create', mod: () => ALC.actionsAI }
  ];

  let popHost = null;
  let openFor = null;      // botão que abriu o popover
  let closeTimer = null;

  /* --- popover ------------------------------------------------------------ */
  function popLayer() {
    if (popHost && document.body.contains(popHost)) return popHost;
    popHost = el('div#alc-pop.alc-scope');
    document.body.appendChild(popHost);
    return popHost;
  }

  function closeMenu() {
    clearTimeout(closeTimer);
    popLayer().replaceChildren();
    if (openFor) openFor.setAttribute('aria-expanded', 'false');
    openFor = null;
  }

  function openMenu(btn) {
    const card = btn.closest('.alc-card');
    const entry = card && ALC.registry.get(card.dataset.alcId);
    if (!entry) return;
    const def = MENUS.find((m) => m.key === btn.dataset.alcMenu);
    const mod = def && def.mod();
    if (!mod) return;

    closeMenu();
    openFor = btn;
    btn.setAttribute('aria-expanded', 'true');

    const menu = el('div.alc-menu', { role: 'menu', 'aria-label': ALC.t(def.label) });
    mod.items(entry.data).forEach((item) => {
      if (item.separator) { menu.appendChild(el('div.alc-menu-sep')); return; }
      const row = el('button.alc-menu-item', {
        type: 'button',
        role: 'menuitem',
        disabled: !!item.disabled,
        title: item.title || '',
        'data-alc-item': item.id
      }, [
        item.icon ? icon(item.icon, 14) : null,
        el('span', { text: item.label })
      ]);
      row.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (item.disabled) return;
        closeMenu();
        try { mod.run(entry.data, item.id, entry); } catch (err) { console.warn('[ALC]', err); }
      });
      menu.appendChild(row);
    });

    popLayer().appendChild(menu);
    position(menu, btn);
    menu.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    menu.addEventListener('mouseleave', scheduleClose);
    const first = menu.querySelector('.alc-menu-item:not([disabled])');
    if (first) first.focus({ preventScroll: true });
  }

  function position(menu, btn) {
    const r = btn.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    let left = r.left;
    let top = r.bottom + 6;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    if (left < 8) left = 8;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    menu.style.left = Math.round(left) + 'px';
    menu.style.top = Math.round(top) + 'px';
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closeMenu, 200);   // vão entre botão e menu
  }

  /* --- decoração do card -------------------------------------------------- */
  function buildBar(ad) {
    // data-alc-ui: marca a subárvore para o scraper pular. Sem isso, os
    // rótulos dos nossos botões entram no texto do anúncio.
    const bar = el('div.alc-card-bar', { 'data-alc-ui': 'bar' });
    const left = el('div.alc-card-actions');
    MENUS.forEach((m) => {
      const b = el('button.alc-cbtn', {
        type: 'button',
        'data-alc-menu': m.key,
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
        'aria-label': ALC.t(m.label)
      }, [
        icon(m.icon, 13),
        el('span.alc-cbtn-label', { text: ALC.t(m.label) })
      ]);
      left.appendChild(b);
    });
    bar.appendChild(left);
    if (ad && ad.daysRunning != null) bar.appendChild(daysBadge(ad));
    return bar;
  }

  function daysBadge(ad) {
    const n = ad.daysRunning;
    const scale = ALC.toneForDays(n);
    const badge = el('span.alc-days.alc-badge.alc-badge-' + scale.tone, {
      title: (ad.startDateRaw ? 'No ar desde ' + ad.startDateRaw + ' · ' : '') + scale.hint
    }, [
      icon('calendar', 12),
      el('span', { text: ALC.t(n === 1 ? 'dayBadge' : 'daysBadge', { n }) })
    ]);
    return badge;
  }

  /** Marca o anúncio em escala: anel esmeralda de 1px, sem sombra colorida —
      no sistema a superfície é definida pelo contorno, não pela elevação. */
  function scalingRing(card) {
    if (card.querySelector(':scope > .alc-card-ring')) return;
    card.appendChild(el('div.alc-card-ring', { 'aria-hidden': 'true', 'data-alc-ui': 'ring' }));
  }

  /** O contador nativo ("N anúncios usam esse criativo") ganha o acento. */
  function highlightNativeCount(card) {
    card.querySelectorAll('strong,b').forEach((s) => {
      if (s.closest('[data-alc-ui]')) return;
      const t = (s.textContent || '').trim();
      if (/^\d+$/.test(t) && Number(t) >= 2) s.classList.add('alc-count-hit');
    });
  }

  function decorate(card, ad, settings) {
    card.classList.add('alc-card', 'alc-scope');
    if (!card.querySelector(':scope > .alc-card-bar')) {
      card.appendChild(buildBar(ad));
    } else if (settings.showDaysBadge) {
      const old = card.querySelector(':scope > .alc-card-bar > .alc-days');
      if (old && ad.daysRunning != null) old.replaceWith(daysBadge(ad));
    }
    if (!settings.showDaysBadge) {
      const d = card.querySelector(':scope > .alc-card-bar > .alc-days');
      if (d) d.remove();
    }
    if (settings.highlightScaling && ad.activeAdCount >= 2) {
      card.classList.add('alc-scaling');
      scalingRing(card);
      highlightNativeCount(card);
    } else {
      card.classList.remove('alc-scaling');
    }
  }

  /* --- delegação global (um listener, não um por botão) ------------------- */
  function bind() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.alc-cbtn');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        if (openFor === btn) closeMenu(); else openMenu(btn);
        return;
      }
      if (!e.target.closest || !e.target.closest('.alc-menu')) closeMenu();
    }, true);

    document.addEventListener('mouseover', (e) => {
      const btn = e.target.closest && e.target.closest('.alc-cbtn');
      if (btn) { clearTimeout(closeTimer); if (openFor !== btn) openMenu(btn); }
    });
    document.addEventListener('mouseout', (e) => {
      const btn = e.target.closest && e.target.closest('.alc-cbtn');
      if (btn && !btn.contains(e.relatedTarget)) scheduleClose();
    });
    window.addEventListener('scroll', () => { if (openFor) closeMenu(); }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openFor) { closeMenu(); return; }
      if (!openFor || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      const items = Array.from(popLayer().querySelectorAll('.alc-menu-item:not([disabled])'));
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      const next = e.key === 'ArrowDown'
        ? items[(i + 1) % items.length]
        : items[(i - 1 + items.length) % items.length];
      next.focus();
    });
  }

  return { decorate, bind, closeMenu, buildBar };
})();
