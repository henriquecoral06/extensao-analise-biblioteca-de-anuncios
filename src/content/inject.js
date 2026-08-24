/* ============================================================================
   Interceptação SOMENTE LEITURA do GraphQL da Biblioteca.
   Roda no contexto da página para enxergar fetch/XHR. Não altera nenhuma
   requisição, não toca em cookies nem tokens: só lê a resposta que já chegou
   e reemite os campos do anúncio para o content script.
   A Biblioteca entrega aqui a URL real do vídeo, todos os cards do carrossel,
   título, descrição, CTA e link de destino — dados que o DOM esconde.
   ========================================================================== */
(function () {
  if (window.__ALC_GQL__) return;
  window.__ALC_GQL__ = true;

  const emit = (ads) => {
    if (ads.length) window.postMessage({ source: 'ALC_GQL', payload: ads }, '*');
  };

  /* O mesmo arquivo volta com query diferente a cada tamanho pedido
     (stp=dst-jpg_s600x600) e com validade nova a cada resposta: a identidade
     estável é o nome do arquivo no caminho. */
  const keyOf = (url) => {
    try { return new URL(url).pathname.split('/').pop() || url; }
    catch (_) { return String(url || '').split('?')[0]; }
  };

  function pickCreatives(snap) {
    const out = [];
    const push = (type, url, extra) => {
      if (!url) return;
      const k = keyOf(url);
      if (out.some((c) => keyOf(c.url) === k)) return;
      out.push(Object.assign({ type, url }, extra || {}));
    };
    /* Card de vídeo traz junto a imagem de capa; ela não é um criativo à parte,
       era ela que fazia "todos os criativos" baixar o mesmo material duas vezes. */
    const fromCard = (c) => {
      if (!c) return;
      const video = c.video_hd_url || c.video_sd_url;
      if (video) {
        push('video', video, { posterUrl: c.video_preview_image_url || '' });
        return;
      }
      push('image', c.original_image_url || c.resized_image_url, {});
    };
    (snap.videos || []).forEach(fromCard);
    (snap.images || []).forEach(fromCard);
    (snap.cards || []).forEach(fromCard);
    return out;
  }

  const plain = (v) => (typeof v === 'string' ? v : ((v && (v.text || (v.markup && v.markup.__html))) || ''))
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');

  /* Cada card do carrossel/catálogo carrega a copy real do produto. Em anúncio
     dinâmico é a única fonte: o topo do snapshot vem com "{{product.name}}". */
  function readCards(snap) {
    return (snap.cards || []).map((c) => ({
      body: plain(c.body),
      title: c.title || '',
      linkDescription: c.link_description || c.caption || '',
      linkUrl: c.link_url || '',
      ctaText: c.cta_text || ''
    })).filter((c) => c.body || c.title || c.linkDescription || c.linkUrl);
  }

  function readAd(node) {
    try {
      const id = String(node.ad_archive_id || node.adArchiveID || '');
      if (!/^\d{5,}$/.test(id)) return null;
      const snap = node.snapshot || {};
      return {
        libraryId: id,
        pageName: snap.page_name || node.page_name || '',
        pageId: String(snap.page_id || node.page_id || ''),
        isActive: node.is_active !== false,
        startDate: node.start_date || node.startDate || null,
        endDate: node.end_date || null,
        body: plain(snap.body),
        title: snap.title || '',
        linkDescription: snap.link_description || '',
        caption: snap.caption || '',
        ctaText: snap.cta_text || '',
        linkUrl: snap.link_url || '',
        platforms: (node.publisher_platform || node.publisherPlatform || [])
          .map((p) => String(p).toLowerCase()),
        displayFormat: snap.display_format || '',
        cards: readCards(snap),
        creatives: pickCreatives(snap)
      };
    } catch (_) { return null; }
  }

  /** Varre a resposta procurando objetos de anúncio, sem saber o schema todo. */
  function harvest(text) {
    const ads = [];
    if (!text || text.indexOf('ad_archive_id') === -1) return ads;
    const chunks = text.split('\n');
    chunks.forEach((chunk) => {
      let data;
      try { data = JSON.parse(chunk); } catch (_) { return; }
      const stack = [data];
      let guard = 0;
      while (stack.length && guard++ < 20000) {
        const cur = stack.pop();
        if (!cur || typeof cur !== 'object') continue;
        if (cur.ad_archive_id || cur.adArchiveID) {
          const ad = readAd(cur);
          if (ad) ads.push(ad);
        }
        for (const k in cur) {
          const v = cur[k];
          if (v && typeof v === 'object') stack.push(v);
        }
      }
    });
    return ads;
  }

  const origFetch = window.fetch;
  window.fetch = function () {
    const p = origFetch.apply(this, arguments);
    try {
      const url = String((arguments[0] && arguments[0].url) || arguments[0] || '');
      if (/\/api\/graphql/.test(url)) {
        p.then((res) => {
          res.clone().text().then((t) => emit(harvest(t))).catch(() => {});
        }).catch(() => {});
      }
    } catch (_) {}
    return p;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__alcUrl = String(url || '');
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    try {
      if (/\/api\/graphql/.test(this.__alcUrl || '')) {
        this.addEventListener('load', () => {
          try { emit(harvest(this.responseText)); } catch (_) {}
        });
      }
    } catch (_) {}
    return origSend.apply(this, arguments);
  };
})();
