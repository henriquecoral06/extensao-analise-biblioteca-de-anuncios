/* ============================================================================
   CAMADA D — tray flutuante. Pílula com superfície translúcida, hairline de
   1px e um único botão em tratamento de CTA: o filtro. Arrastável, com snap
   nos cantos e posição persistida.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.tray = (function () {
  const { el, icon } = ALC.dom;
  let root = null, rail = null, badge = null, filterBtn = null, expanded = true;

  function btn(name, iconName, tip, onClick, cls) {
    const b = el('button.alc-tray-btn' + (cls ? '.' + cls : ''), {
      type: 'button', 'data-alc-tray': name, 'aria-label': tip, 'data-alc-tooltip': tip
    }, [icon(iconName, 17)]);
    b.addEventListener('click', onClick);
    return b;
  }

  async function mount() {
    if (root && document.body.contains(root)) return;
    const ui = await ALC.store.get(ALC.K.UI, {}, 'local');
    expanded = ui.trayExpanded !== false;

    /* Botão de filtro: apagado em repouso, CTA esmeralda quando filtrando.
       O tratamento shiny-brand entra e sai em syncFilterBtn(). */
    filterBtn = el('button.alc-tray-filter', {
      type: 'button', 'aria-label': ALC.t('filterTip', { shown: 0, total: 0 }),
      'data-alc-tooltip': ALC.t('filterTip', { shown: 0, total: 0 })
    }, [
      el('span.alc-dots', { 'aria-hidden': 'true' }),
      el('span.alc-btn-content', null, [icon('funnel', 18)])
    ]);
    filterBtn.addEventListener('click', (e) => {
      if (e.shiftKey) { ALC.panel.show('filters'); return; }
      const r = ALC.filters.toggleEnabled();
      ALC.toast.info(ALC.filters.state.enabled
        ? 'Filtro ligado — ' + r.shown + ' de ' + r.total
        : 'Filtro desligado — ' + r.total + ' anúncios');
    });
    // "6/18" é dado, não notificação: vira um chip ao lado do controle, e não
    // uma bolha em cima dele — que não caberia quando os números crescem.
    badge = el('span.alc-tray-badge.alc-badge.alc-badge-neutral', {
      text: '0/0', 'aria-hidden': 'true'
    });

    rail = el('div.alc-tray-rail', null, [
      btn('panel', 'eye', ALC.t('hidePanel'), () => {
        const vis = ALC.panel.toggle();
        const b = rail.querySelector('[data-alc-tray="panel"] .alc-i');
        b.className = 'alc-i alc-i-' + (vis ? 'eye' : 'eye-off');
        const host = b.parentElement;
        host.setAttribute('data-alc-tooltip', ALC.t(vis ? 'hidePanel' : 'showPanel'));
        host.setAttribute('aria-label', ALC.t(vis ? 'hidePanel' : 'showPanel'));
      }),
      filterBtn,
      badge,
      btn('sync', 'refresh', ALC.t('sync'), () => ALC.rescan(true)),
      btn('top', 'arrow-up', ALC.t('backToTop'), () => window.scrollTo({ top: 0, behavior: 'smooth' })),
      btn('theme', ALC.theme.current() === 'dark' ? 'moon' : 'sun', ALC.t('toggleTheme'), async (e) => {
        // guarda o elemento antes do await: currentTarget zera quando o
        // despacho do evento termina
        const host = e.currentTarget;
        const pref = await ALC.theme.cycle();
        host.querySelector('.alc-i').className =
          'alc-i alc-i-' + (ALC.theme.current() === 'dark' ? 'moon' : 'sun');
        ALC.toast.info('Tema: ' + ({ auto: 'automático', light: 'claro', dark: 'escuro' }[pref]));
      }),
      btn('help', 'info', ALC.t('support'), helpModal)
    ]);

    const collapseBtn = btn('collapse', expanded ? 'chevrons-right' : 'chevrons-left',
      ALC.t(expanded ? 'collapse' : 'expand'), toggleCollapse);

    const grip = el('span.alc-tray-grip', { 'aria-hidden': 'true', title: 'Arrastar' },
      [icon('grip', 14)]);

    root = el('div#alc-tray.alc-scope', { role: 'toolbar', 'aria-label': 'Biblioteca Extrema' },
      [grip, rail, collapseBtn]);
    if (!expanded) root.classList.add('is-collapsed');
    document.body.appendChild(root);

    restorePos(ui.trayPos);
    enableDrag(grip);
    ALC.filters.onChange(updateBadge);
    syncFilterBtn();
    window.addEventListener('resize', () => restorePos(currentPos()));
  }

  function toggleCollapse(e) {
    expanded = !expanded;
    root.classList.toggle('is-collapsed', !expanded);
    const i = e.currentTarget.querySelector('.alc-i');
    i.className = 'alc-i alc-i-' + (expanded ? 'chevrons-right' : 'chevrons-left');
    e.currentTarget.setAttribute('data-alc-tooltip', ALC.t(expanded ? 'collapse' : 'expand'));
    saveUI({ trayExpanded: expanded });
  }

  /* Verde só quando o filtro realmente esconde algo: desligado, ou ligado sem
     nenhum critério, o botão fica apagado — o estado do controle é o estado
     do resultado. */
  function syncFilterBtn() {
    if (!filterBtn) return;
    const on = ALC.filters.isActive();
    filterBtn.classList.toggle('alc-shiny-brand', on);
    filterBtn.classList.toggle('is-off', !on);
    filterBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function updateBadge(shown, total) {
    syncFilterBtn();
    if (!badge) return;
    badge.textContent = shown + '/' + total;
    const filtering = ALC.filters.isActive() && shown < total;
    badge.classList.toggle('alc-badge-danger', filtering);
    badge.classList.toggle('alc-badge-neutral', !filtering);
    const tip = ALC.t('filterTip', { shown, total });
    const f = root.querySelector('.alc-tray-filter');
    if (f) { f.setAttribute('data-alc-tooltip', tip); f.setAttribute('aria-label', tip); }
  }

  function helpModal() {
    const rows = [
      ['F', 'liga/desliga o filtro ativo'],
      ['H', 'mostra/esconde o painel lateral'],
      ['T', 'volta ao topo'],
      ['R', 'sincroniza (re-scan)'],
      ['Esc', 'fecha menu ou modal'],
      ['?', 'abre esta ajuda']
    ];
    const list = el('div.alc-kbd-list', null, rows.map(([k, d]) =>
      el('div.alc-kbd-row', null, [el('kbd', { text: k }), el('span', { text: d })])));

    const diag = el('button.alc-btn.alc-btn-secondary', {
      type: 'button', text: 'Exportar diagnóstico'
    });
    diag.addEventListener('click', async () => {
      const ping = await ALC.send(ALC.MSG.PING, {});
      const report = {
        versao: chrome.runtime.getManifest().version,
        url: location.href,
        idioma: ALC.i18n.lang,
        tema: ALC.theme.current(),
        cardsRegistrados: ALC.registry.size,
        filtros: ALC.filters.state,
        serviceWorker: ping.ok ? 'ok' : ping.error,
        gqlCapturados: ALC.gql ? ALC.gql.size : 0
      };
      await ALC.dom.copyText(JSON.stringify(report, null, 2));
      ALC.toast.success('Diagnóstico copiado.');
    });
    const opts = el('button.alc-btn.alc-shiny', { type: 'button' }, [
      el('span.alc-dots', { 'aria-hidden': 'true' }),
      el('span.alc-btn-content', null, [icon('settings', 14), el('span', { text: 'Abrir Opções' })])
    ]);
    opts.addEventListener('click', () => ALC.send(ALC.MSG.OPEN_OPTIONS, {}));

    ALC.modal.open({
      eyebrow: 'Biblioteca Extrema ' + chrome.runtime.getManifest().version,
      title: ALC.t('shortcuts'),
      subtitle: 'Tudo roda localmente. Nada é enviado para nenhum servidor além do provedor de IA que você configurar.',
      body: list,
      actions: [diag, opts]
    });
  }

  /* --- arrastar com snap nos cantos --------------------------------------- */
  function currentPos() {
    const r = root.getBoundingClientRect();
    return { x: r.left, y: r.top };
  }
  function restorePos(pos) {
    if (!root) return;
    const r = root.getBoundingClientRect();
    let { x, y } = pos || { x: innerWidth - r.width - 24, y: innerHeight - r.height - 24 };
    x = Math.min(Math.max(8, x), innerWidth - r.width - 8);
    y = Math.min(Math.max(8, y), innerHeight - r.height - 24);
    root.style.left = x + 'px';
    root.style.top = y + 'px';
    root.style.right = 'auto';
    root.style.bottom = 'auto';
  }
  function enableDrag(handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      const r = root.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      root.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      root.style.left = (ox + e.clientX - sx) + 'px';
      root.style.top = (oy + e.clientY - sy) + 'px';
    });
    handle.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('is-dragging');
      const r = root.getBoundingClientRect();
      let x = r.left, y = r.top;
      if (x < 40) x = 24;
      if (innerWidth - r.right < 40) x = innerWidth - r.width - 24;
      if (y < 40) y = 24;
      if (innerHeight - r.bottom < 40) y = innerHeight - r.height - 24;
      restorePos({ x, y });
      saveUI({ trayPos: { x, y } });
    });
  }
  async function saveUI(patch) {
    const ui = await ALC.store.get(ALC.K.UI, {}, 'local');
    await ALC.store.set(ALC.K.UI, Object.assign({}, ui, patch), 'local');
  }

  function unmount() { if (root) { root.remove(); root = null; } }

  return { mount, unmount, updateBadge, syncFilterBtn, helpModal };
})();
