/* ============================================================================
   CAMADA C — painel lateral.
   Renderizado direto no DOM, sem iframe: testado contra o facebook.com, o
   <iframe> de chrome-extension:// não sobrevive na página da Biblioteca — o
   elemento simplesmente não fica no DOM. O isolamento de CSS que o iframe dava
   é substituído pelo namespace .alc- e por estilos explícitos em todo
   componente, e de quebra some a ponte de postMessage.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.panel = (function () {
  const { el, icon } = ALC.dom;
  let root = null, body = null, visible = false, tab = 'session';
  const refs = {};

  /* --- construção ---------------------------------------------------------- */

  function metric(key, label, suffix) {
    const value = el('b', { text: '0' });
    refs[key] = value;
    return el('div.alc-metric', null, [
      el('span.alc-metric-k', { text: label }),
      el('div.alc-metric-v', null, [value, suffix ? el('i', { text: suffix }) : null])
    ]);
  }

  function buildSession() {
    refs.dist = el('div.alc-dist');
    refs.top = el('div.alc-top');
    return el('div.alc-pane', { 'data-pane': 'session' }, [
      el('div.alc-metrics', null, [
        metric('total', 'Analisados'),
        metric('shown', 'Exibidos'),
        metric('avg', 'Média no ar', 'dias'),
        metric('scaling', 'Escalando')
      ]),
      el('div.alc-eyebrow', { text: 'Tempo no ar' }),
      refs.dist,
      el('div.alc-eyebrow', { text: 'Top anunciantes' }),
      refs.top
    ]);
  }

  function buildCollected() {
    refs.collected = el('div.alc-collected');
    const btn = (fmt, iconName, label) => {
      const b = el('button.alc-btn.alc-btn-sm.alc-btn-secondary', { type: 'button' },
        [icon(iconName, 13), el('span', { text: label })]);
      b.addEventListener('click', () => exportCollected(fmt));
      return b;
    };
    const clear = el('button.alc-btn.alc-btn-sm.alc-btn-ghost', {
      type: 'button', text: 'Limpar'
    });
    clear.addEventListener('click', () => {
      ALC.collected = [];
      ALC.store.set(ALC.K.COLLECTED, [], 'local');
      push();
    });
    return el('div.alc-pane', { 'data-pane': 'collected' }, [
      refs.collected,
      el('div.alc-row-actions', null, [clear, btn('csv', 'file-text', '.csv'), btn('json', 'download', '.json')])
    ]);
  }

  function buildFilters() {
    const min = el('input.alc-input.alc-num', { type: 'number', min: '0', placeholder: '0' });
    const max = el('input.alc-input.alc-num', { type: 'number', min: '0', placeholder: '∞' });
    const scaling = el('input', { type: 'checkbox' });
    const text = el('input.alc-input', { type: 'text', placeholder: 'palavra na copy…' });
    const domain = el('input.alc-input', { type: 'text', placeholder: 'exemplo.com.br' });
    const seg = el('div.alc-seg', { role: 'group' }, [
      ['all', 'Tudo'], ['video', 'Vídeo'], ['image', 'Imagem']
    ].map(([v, l], i) => el('button', {
      type: 'button', 'data-media': v, 'aria-selected': i === 0 ? 'true' : 'false', text: l
    })));
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      Array.from(seg.children).forEach((o) => o.setAttribute('aria-selected', String(o === b)));
    });
    Object.assign(refs, { min, max, scaling, text, domain, seg });

    const apply = el('button.alc-btn.alc-btn-sm.alc-shiny', { type: 'button' }, [
      el('span.alc-dots', { 'aria-hidden': 'true' }),
      el('span.alc-btn-content', null, [el('span', { text: ALC.t('apply') })])
    ]);
    apply.addEventListener('click', () => {
      ALC.filters.set({
        minDays: min.value === '' ? null : Number(min.value),
        maxDays: max.value === '' ? null : Number(max.value),
        onlyScaling: scaling.checked,
        mediaType: (seg.querySelector('[aria-selected="true"]') || {}).dataset?.media || 'all',
        textContains: text.value.trim(),
        domainContains: domain.value.trim(),
        enabled: true
      });
    });
    const clear = el('button.alc-btn.alc-btn-sm.alc-btn-ghost', {
      type: 'button', text: ALC.t('clearFilters')
    });
    clear.addEventListener('click', () => {
      min.value = ''; max.value = ''; scaling.checked = false;
      text.value = ''; domain.value = '';
      Array.from(seg.children).forEach((o) =>
        o.setAttribute('aria-selected', String(o.dataset.media === 'all')));
      ALC.filters.reset();
      ALC.filters.apply();
    });

    return el('div.alc-pane', { 'data-pane': 'filters' }, [
      el('div.alc-field', null, [
        el('label', { text: 'Dias no ar' }),
        el('div.alc-range-row', null, [min, el('span.alc-caption', { text: 'até' }), max])
      ]),
      el('label.alc-switch', null, [scaling, el('span.alc-switch-track'),
        el('span', { text: 'Somente escalando (2+ cópias)' })]),
      el('div.alc-field', null, [el('label', { text: 'Mídia' }), seg]),
      el('div.alc-field', null, [el('label', { text: 'Texto contém' }), text]),
      el('div.alc-field', null, [el('label', { text: 'Domínio contém' }), domain]),
      el('div.alc-row-actions', null, [clear, apply])
    ]);
  }

  function selectTab(next) {
    tab = next;
    Array.from(refs.tabs.children).forEach((b) =>
      b.setAttribute('aria-selected', String(b.dataset.tab === next)));
    body.querySelectorAll('.alc-pane').forEach((p) =>
      p.classList.toggle('is-on', p.dataset.pane === next));
  }

  async function mount() {
    if (root && document.body.contains(root)) return;
    const ui = await ALC.store.get(ALC.K.UI, {}, 'local');
    const box = ui.panelBox || { x: null, y: null, w: 320, h: 500 };

    const drag = el('div.alc-panel-drag', null, [
      icon('grip', 14),
      el('span.alc-panel-title', { text: 'Biblioteca Extrema' }),
      el('button.alc-icon-btn', {
        type: 'button', 'aria-label': ALC.t('close'), onclick: () => hide()
      }, [icon('close', 14)])
    ]);

    refs.tabs = el('div.alc-seg.alc-panel-tabs', { role: 'tablist' }, [
      ['session', ALC.t('tabSession')], ['collected', ALC.t('tabCollected')],
      ['filters', ALC.t('tabFilters')]
    ].map(([v, l], i) => el('button', {
      type: 'button', role: 'tab', 'data-tab': v,
      'aria-selected': i === 0 ? 'true' : 'false', text: l
    })));
    refs.tabs.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) selectTab(b.dataset.tab);
    });

    body = el('div.alc-panel-body', null, [buildSession(), buildCollected(), buildFilters()]);
    const resize = el('div.alc-panel-resize', { 'aria-hidden': 'true' });

    root = el('div#alc-panel.alc-scope', { 'data-alc-ui': 'panel' },
      [drag, refs.tabs, body, resize]);
    root.style.width = box.w + 'px';
    root.style.height = box.h + 'px';
    document.body.appendChild(root);
    selectTab('session');
    place(box);

    enableDrag(drag);
    enableResize(resize);
    visible = ui.panelVisible !== false;
    root.classList.toggle('is-hidden', !visible);
    push();
  }

  function place(box) {
    const w = root.offsetWidth, h = root.offsetHeight;
    const x = box.x == null ? innerWidth - w - 24 : box.x;
    const y = box.y == null ? Math.max(24, innerHeight - h - 96) : box.y;
    root.style.left = Math.min(Math.max(8, x), Math.max(8, innerWidth - w - 8)) + 'px';
    root.style.top = Math.min(Math.max(8, y), Math.max(8, innerHeight - h - 8)) + 'px';
  }

  /* --- dados --------------------------------------------------------------- */

  const BUCKETS = [
    { label: '0–2 dias', tone: 'neutral' },
    { label: '3–6 dias', tone: 'info' },
    { label: '7–20 dias', tone: 'emerald' },
    { label: '21+ dias', tone: 'warning' }
  ];

  function push() {
    if (!root || !refs.total) return;
    const ads = [];
    ALC.registry.forEach((e) => { if (e.data) ads.push(e.data); });
    const shown = ads.filter((a) => !ALC.filters.isActive() || ALC.filters.pass(a));
    const days = ads.map((a) => a.daysRunning || 0).filter(Boolean);

    refs.total.textContent = ads.length;
    refs.shown.textContent = shown.length;
    refs.avg.textContent = days.length
      ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
    refs.scaling.textContent = ads.filter((a) => (a.activeAdCount || 1) >= 2).length;

    const buckets = [0, 0, 0, 0];
    days.forEach((d) => { buckets[d <= 2 ? 0 : d <= 6 ? 1 : d <= 20 ? 2 : 3]++; });
    const max = Math.max(1, ...buckets);
    refs.dist.replaceChildren(...BUCKETS.map((b, i) => {
      const fill = el('div.alc-dist-fill', { 'data-tone': b.tone });
      fill.style.width = Math.round((buckets[i] / max) * 100) + '%';
      return el('div.alc-dist-row', null, [
        el('span', { text: b.label }),
        el('div.alc-dist-track', null, [fill]),
        el('b', { text: String(buckets[i]) })
      ]);
    }));

    const byAdv = {};
    ads.forEach((a) => { byAdv[a.advertiserName] = (byAdv[a.advertiserName] || 0) + 1; });
    const top = Object.keys(byAdv).map((k) => ({ name: k, n: byAdv[k] }))
      .sort((a, b) => b.n - a.n).slice(0, 5);
    refs.top.replaceChildren(...(top.length
      ? top.map((t) => el('div.alc-top-row', null, [
        el('span.alc-top-name', { text: t.name }),
        el('span.alc-badge.alc-badge-neutral', { text: String(t.n) })
      ]))
      : [el('div.alc-empty-note', { text: 'Nada analisado ainda.' })]));

    const col = ALC.collected || [];
    refs.collected.replaceChildren(...(col.length
      ? col.slice().reverse().map((a) => {
        const thumb = a.creatives && a.creatives[0]
          ? (a.creatives[0].thumbUrl || a.creatives[0].posterUrl || a.creatives[0].url) : '';
        const row = el('button.alc-col-item', { type: 'button' }, [
          thumb ? el('img', { src: thumb, alt: '' }) : icon('image', 16),
          el('span.alc-col-name', { text: a.advertiserName || a.libraryId }),
          el('span.alc-badge.alc-badge-neutral', { text: (a.daysRunning || '?') + 'd' })
        ]);
        row.addEventListener('click', () => window.open(a.libraryUrl, '_blank', 'noopener'));
        return row;
      })
      : [el('div.alc-empty-note', { text: 'Salve, copie ou analise um anúncio para ele aparecer aqui.' })]));

    const f = ALC.filters.state;
    if (document.activeElement && !root.contains(document.activeElement)) {
      refs.min.value = f.minDays == null ? '' : f.minDays;
      refs.max.value = f.maxDays == null ? '' : f.maxDays;
      refs.scaling.checked = !!f.onlyScaling;
      refs.text.value = f.textContains || '';
      refs.domain.value = f.domainContains || '';
      Array.from(refs.seg.children).forEach((o) =>
        o.setAttribute('aria-selected', String(o.dataset.media === (f.mediaType || 'all'))));
    }
  }

  const CSV_COLS = ['library_id', 'anunciante', 'status', 'inicio', 'dias_no_ar',
    'copias_ativas', 'plataformas', 'cta', 'dominio', 'url_destino', 'url_biblioteca',
    'texto_principal', 'titulo', 'descricao'];

  function toCsv(ads) {
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const rows = [CSV_COLS.join(',')];
    ads.forEach((a) => rows.push([
      a.libraryId, a.advertiserName, a.status, a.startDate, a.daysRunning,
      a.activeAdCount, (a.platforms || []).join(' '), a.ctaLabel, a.destinationDomain,
      a.destinationUrl, a.libraryUrl, a.primaryText, a.headline, a.description
    ].map(esc).join(',')));
    return '﻿' + rows.join('\r\n');       // BOM para o Excel ler os acentos
  }

  function exportCollected(format) {
    const source = ALC.collected || [];
    if (!source.length) { ALC.toast.warn('Nada coletado ainda.'); return; }
    const stamp = new Date().toISOString().slice(0, 10);
    const base = (ALC.settings.downloadFolder || 'Biblioteca Extrema') + '/exportacoes/biblioteca_extrema_' + stamp;
    ALC.send(ALC.MSG.DOWNLOAD_TEXT, format === 'csv'
      ? { filename: base + '.csv', content: toCsv(source), mime: 'text/csv' }
      : { filename: base + '.json', content: JSON.stringify(source, null, 2), mime: 'application/json' });
    ALC.toast.success('Exportando ' + source.length + ' anúncios.');
  }

  /* --- arrastar e redimensionar -------------------------------------------- */

  function enableDrag(handle) {
    let sx, sy, ox, oy, on = false;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      on = true; handle.setPointerCapture(e.pointerId);
      const r = root.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
      root.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', (e) => {
      if (!on) return;
      root.style.left = (ox + e.clientX - sx) + 'px';
      root.style.top = (oy + e.clientY - sy) + 'px';
    });
    handle.addEventListener('pointerup', () => {
      if (!on) return;
      on = false;
      root.classList.remove('is-dragging');
      const r = root.getBoundingClientRect();
      save({ x: r.left, y: r.top, w: r.width, h: r.height });
    });
  }

  function enableResize(handle) {
    let sx, sy, sw, sh, on = false;
    handle.addEventListener('pointerdown', (e) => {
      on = true; handle.setPointerCapture(e.pointerId);
      const r = root.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; sw = r.width; sh = r.height;
      root.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', (e) => {
      if (!on) return;
      root.style.width = Math.min(640, Math.max(260, sw + e.clientX - sx)) + 'px';
      root.style.height = Math.min(innerHeight * 0.9, Math.max(320, sh + e.clientY - sy)) + 'px';
    });
    handle.addEventListener('pointerup', () => {
      if (!on) return;
      on = false;
      root.classList.remove('is-dragging');
      const r = root.getBoundingClientRect();
      save({ x: r.left, y: r.top, w: r.width, h: r.height });
    });
  }

  async function save(box) {
    const ui = await ALC.store.get(ALC.K.UI, {}, 'local');
    await ALC.store.set(ALC.K.UI, Object.assign({}, ui, { panelBox: box }), 'local');
  }
  async function saveVisible() {
    const ui = await ALC.store.get(ALC.K.UI, {}, 'local');
    await ALC.store.set(ALC.K.UI, Object.assign({}, ui, { panelVisible: visible }), 'local');
  }

  function show(t) {
    visible = true;
    if (root) root.classList.remove('is-hidden');
    if (t) selectTab(t);
    push();
    saveVisible();
    return visible;
  }
  function hide() {
    visible = false;
    if (root) root.classList.add('is-hidden');
    saveVisible();
    return visible;
  }
  function toggle() { return visible ? hide() : show(); }
  function unmount() { if (root) { root.remove(); root = null; body = null; } }

  return { mount, unmount, push, show, hide, toggle, isVisible: () => visible, toCsv };
})();
