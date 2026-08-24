/* ============================================================================
   CAMADA B — filtros rápidos na barra da Meta, logo depois de "Salvar
   pesquisa". Também define o popover genérico usado pelo tray.
   ========================================================================== */
window.ALC = window.ALC || {};

/* --- popover genérico (um layer só, no <body>) ---------------------------- */
ALC.popover = (function () {
  const { el } = ALC.dom;
  let host = null, anchor = null;

  function layer() {
    if (host && document.body.contains(host)) return host;
    host = el('div#alc-pop2.alc-scope');
    document.body.appendChild(host);
    return host;
  }
  function close() {
    layer().replaceChildren();
    if (anchor) anchor.setAttribute('aria-expanded', 'false');
    anchor = null;
  }
  function open(btn, content, opts = {}) {
    const same = anchor === btn;
    close();
    if (same) return null;
    anchor = btn;
    btn.setAttribute('aria-expanded', 'true');
    const box = el('div.alc-menu' + (opts.wide ? '.alc-menu-wide' : ''), {
      role: 'menu', 'aria-label': opts.label || ''
    }, [content]);
    layer().appendChild(box);
    const r = btn.getBoundingClientRect();
    let left = opts.align === 'right' ? r.right - box.offsetWidth : r.left;
    let top = r.bottom + 8;
    if (left + box.offsetWidth > innerWidth - 8) left = innerWidth - box.offsetWidth - 8;
    if (left < 8) left = 8;
    if (top + box.offsetHeight > innerHeight - 8) top = Math.max(8, r.top - box.offsetHeight - 8);
    box.style.left = Math.round(left) + 'px';
    box.style.top = Math.round(top) + 'px';
    return box;
  }
  document.addEventListener('click', (e) => {
    if (!anchor) return;
    if (e.target.closest('#alc-pop2') || e.target === anchor || anchor.contains(e.target)) return;
    close();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  return { open, close, isOpen: () => !!anchor };
})();

ALC.navbar = (function () {
  const { el, icon } = ALC.dom;
  let root = null;

  function menuItem(label, opts = {}) {
    const b = el('button.alc-menu-item', {
      type: 'button', role: 'menuitem', title: opts.title || ''
    }, [
      opts.icon ? icon(opts.icon, 14) : null,
      el('span', { text: label }),
      opts.checked ? el('span.alc-menu-check', null, [icon('check', 13)]) : null
    ]);
    if (opts.onClick) b.addEventListener('click', opts.onClick);
    if (opts.checked) b.classList.add('is-on');
    return b;
  }

  function filterMenu(btn) {
    const wrap = el('div.alc-menu-list');
    const s = ALC.filters.state;
    ALC.DAY_FILTERS.forEach((n) => {
      const label = n === 7 ? ALC.t('oneWeek') : n === 14 ? ALC.t('twoWeeks')
        : n === 21 ? ALC.t('threeWeeks') : n === 28 ? ALC.t('fourWeeks')
        : ALC.t('activeFor', { n });
      wrap.appendChild(menuItem(label, {
        checked: s.minDays === n && s.maxDays == null,
        title: 'Mostra apenas anúncios com ' + n + ' dias ou mais no ar',
        onClick: () => { ALC.filters.set({ minDays: n, maxDays: null, enabled: true }); ALC.popover.close(); }
      }));
    });
    wrap.appendChild(el('div.alc-menu-sep'));
    wrap.appendChild(menuItem(ALC.t('custom'), {
      icon: 'sliders',
      onClick: () => customPopover(btn)
    }));
    wrap.appendChild(menuItem(ALC.t('onlyScaling'), {
      icon: 'sparkle',
      checked: s.onlyScaling,
      onClick: (e) => {
        ALC.filters.set({ onlyScaling: !s.onlyScaling, enabled: true });
        e.currentTarget.classList.toggle('is-on', s.onlyScaling);
        ALC.popover.close();
      }
    }));
    wrap.appendChild(el('div.alc-menu-sep'));
    wrap.appendChild(menuItem(ALC.t('clearFilters'), {
      icon: 'close',
      onClick: () => { ALC.filters.reset(); ALC.filters.apply(); ALC.popover.close(); }
    }));
    return wrap;
  }

  function customPopover(btn) {
    const s = ALC.filters.state;
    const min = el('input.alc-input', { type: 'number', min: '0', value: s.minDays ?? '' });
    const max = el('input.alc-input', { type: 'number', min: '0', value: s.maxDays ?? '' });
    const go = el('button.alc-btn.alc-btn-sm.alc-shiny', { type: 'button' }, [
      el('span.alc-dots', { 'aria-hidden': 'true' }),
      el('span.alc-btn-content', null, [el('span', { text: ALC.t('apply') })])
    ]);
    go.addEventListener('click', () => {
      ALC.filters.set({
        minDays: min.value === '' ? null : Number(min.value),
        maxDays: max.value === '' ? null : Number(max.value),
        enabled: true
      });
      ALC.popover.close();
    });
    const form = el('div.alc-menu-form', null, [
      el('div.alc-field', null, [el('label', { text: ALC.t('minDays') }), min]),
      el('div.alc-field', null, [el('label', { text: ALC.t('maxDays') }), max]),
      go
    ]);
    ALC.popover.close();
    setTimeout(() => ALC.popover.open(btn, form, { label: ALC.t('custom') }), 0);
  }

  async function nicheMenu() {
    const presets = await ALC.store.presets();
    const grid = el('div.alc-niche-grid');
    presets.forEach((p) => {
      grid.appendChild(el('button.alc-menu-item', {
        type: 'button', role: 'menuitem', text: p.label,
        onclick: () => {
          const u = ALC.LIBRARY_BASE + '?active_status=active&ad_type=all&country=' +
            (ALC.settings.country || 'BR') + '&q=' + encodeURIComponent(p.query) +
            '&search_type=keyword_unordered&media_type=all';
          location.href = u;
        }
      }));
    });
    const edit = el('button.alc-menu-item.alc-menu-foot', {
      type: 'button', role: 'menuitem',
      onclick: () => { ALC.send(ALC.MSG.OPEN_OPTIONS, { tab: 'niches' }); ALC.popover.close(); }
    }, [ALC.dom.icon('settings', 13), el('span', { text: ALC.t('editList') })]);
    return el('div', null, [grid, el('div.alc-menu-sep'), edit]);
  }

  function button(iconName, labelKey, onOpen) {
    const b = el('button.alc-navbtn', {
      type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      'aria-label': ALC.t(labelKey), 'data-alc-tooltip': ALC.t(labelKey)
    }, [icon(iconName, 15)]);
    b.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const content = await onOpen(b);
      if (content) ALC.popover.open(b, content, { label: ALC.t(labelKey), wide: labelKey === 'searchNiches' });
    });
    return b;
  }

  async function mount() {
    if (root && document.body.contains(root)) return;
    const native = await ALC.dom.waitFor(() =>
      ALC.dom.findByText(document.body, /^(salvar pesquisa|save search|guardar búsqueda)$/i,
        'div[role="button"],span,button'), 10000);
    root = el('div.alc-navbar.alc-scope', null, [
      button('calendar', 'filterBy', (b) => filterMenu(b)),
      button('search', 'searchNiches', () => nicheMenu())
    ]);
    if (native) {
      const holder = native.closest('div[role="button"]') || native;
      (holder.parentElement || document.body).insertBefore(root, holder.nextSibling);
    } else {
      root.classList.add('alc-navbar-float');   // barra nativa não encontrada
      document.body.appendChild(root);
    }
  }

  function unmount() { if (root) { root.remove(); root = null; } }

  return { mount, unmount };
})();
