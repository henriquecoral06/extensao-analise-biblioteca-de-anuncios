/* ============================================================================
   scraper.js — descoberta dos cards e extração do AdData.
   Junto de constants.js, é o único arquivo que precisa de manutenção quando o
   Facebook mexe no DOM. Nada aqui depende de classe ofuscada: só texto
   visível, estrutura relativa e atributos estáveis (role, href, aria-label).
   Toda função devolve null em vez de quebrar.

   Duas regras aprendidas testando contra o DOM real da Biblioteca:
   1. O card é o ancestral mais ALTO que ainda contém um único Library ID.
      Parar no primeiro ancestral largo pega só o bloco de metadados (104px),
      que não tem a copy, nem o criativo, nem o contador de cópias.
   2. Toda leitura precisa ignorar os nós que a própria extensão injetou —
      senão "SALVAR COPIAR ABRIR ENVIAR CRIAR" entra no texto do anúncio.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.scraper = (function () {
  const { unwrapUrl, domainOf } = ALC.dom;
  const P = ALC.PATTERNS;
  const UI = '[data-alc-ui]';

  const CTA_WORDS = /^(saiba mais|comprar agora|cadastre-se|inscreva-se|enviar mensagem|baixar|assistir mais|ver mais no site|acessar o site|acessar o perfil[^]*|comprar|solicitar|reservar( agora)?|fazer pedido|obter oferta|candidatar-se( agora)?|entre em contato|ligar agora|como chegar|ver menu|doar agora|assinar|instalar( agora)?|jogar|usar aplicativo|fale no whatsapp|learn more|shop now|sign up|download|send message|get offer|apply now|subscribe|contact us|book now|play game|watch more|order now|see menu|donate now|más información|comprar ahora|registrarse)$/i;

  const BLOCK = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'SECTION', 'ARTICLE', 'TR', 'TD',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'FIGURE', 'HEADER', 'FOOTER']);

  /* --- 0. Leitura de texto sem os nós da extensão ------------------------- */

  /** innerText aproximado, pulando qualquer subárvore marcada como UI nossa. */
  function textOfClean(root) {
    if (!root) return '';
    let out = '';
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === 1 && n.hasAttribute && n.hasAttribute('data-alc-ui')) {
          return NodeFilter.FILTER_REJECT;      // descarta a subárvore inteira
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 1) {
        if (n.tagName === 'BR') out += '\n';
        else if (BLOCK.has(n.tagName) && out && !out.endsWith('\n')) out += '\n';
      } else if (n.nodeValue && n.nodeValue.trim()) {
        out += n.nodeValue;
      }
    }
    return out.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  const isOurs = (el) => !!(el && el.closest && el.closest(UI));

  /* --- 1. Descoberta ------------------------------------------------------ */

  const countIds = (el) =>
    ((el.textContent || '').match(/Identifica(?:ção|dor)\s+d[ae]\s+biblioteca|Library\s*ID/gi) || []).length;

  /**
   * Sobe até o card de verdade: o ancestral mais alto que ainda contém UM
   * único anúncio. Para quando o pai já contém dois (chegamos na grade) ou
   * quando o pai é muito mais largo (busca com um resultado só).
   */
  /* O card é o ancestral mais alto que ainda contém UM único Library ID — o pai
     seguinte já é a grade, com todos os outros anúncios. Largura não serve de
     âncora: a Meta aninha wrappers de larguras diferentes dentro do próprio
     card, e a razão de 1.5x fazia a leitura parar no cabeçalho, deixando copy,
     criativo e destino de fora. A largura só entra como trava para a página de
     anúncio único, onde não existe grade para marcar o limite. */
  function ascendToCard(node) {
    let cur = node.parentElement;
    let best = null;
    for (let i = 0; i < 14 && cur && cur !== document.body; i++) {
      if (countIds(cur) === 1) best = cur;
      const parent = cur.parentElement;
      if (!parent || parent === document.body) break;
      if (countIds(parent) > 1) break;
      if (parent.getBoundingClientRect().width > window.innerWidth * 0.75) break;
      cur = parent;
    }
    return best;
  }

  /** Devolve [{ el, libraryId }] dos cards ainda não decorados. */
  function discover(limit = 200) {
    const found = [];
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const t = n.nodeValue;
        if (!t || t.length < 10 || t.length > 160) return NodeFilter.FILTER_REJECT;
        return /identifica(?:ção|dor)\s+d[ae]\s+biblioteca|library\s*id/i.test(t)
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let n;
    while ((n = walker.nextNode()) && found.length < limit) {
      if (isOurs(n.parentElement)) continue;
      let host = n.parentElement;
      let id = null;
      for (let up = 0; up < 3 && host; up++) {
        const m = (host.textContent || '').match(P.libraryId);
        if (m) { id = m[1]; break; }
        host = host.parentElement;
      }
      if (!id) continue;
      const card = ascendToCard(n.parentElement || n);
      if (!card || card.classList.contains('alc-card') || seen.has(card)) continue;
      seen.add(card);
      found.push({ el: card, libraryId: id });
    }
    return found;
  }

  /* --- 2. Ajudantes de leitura -------------------------------------------- */

  /** Expande "Ver mais" DENTRO do card (o "Ver mais" da paginação fica fora). */
  function expandSeeMore(card) {
    let clicked = 0;
    card.querySelectorAll('div[role="button"],span[role="button"],button').forEach((b) => {
      if (clicked > 4 || isOurs(b)) return;
      if (P.seeMore.test((b.textContent || '').trim())) {
        try { b.click(); clicked++; } catch (_) {}
      }
    });
    return clicked;
  }

  function parseDate(text) {
    let m = text.match(P.startPt);
    if (m) return build(m[3], ALC.MONTHS.pt[m[2].slice(0, 3).toLowerCase()], m[1]);
    m = text.match(P.startEs);
    if (m) return build(m[3], ALC.MONTHS.es[m[2].slice(0, 3).toLowerCase()], m[1]);
    m = text.match(P.startEn);
    if (m) return build(m[3], ALC.MONTHS.en[m[1].slice(0, 3).toLowerCase()], m[2]);
    return null;
    function build(y, mo, d) {
      if (mo == null || isNaN(mo)) return null;
      const dt = new Date(Number(y), Number(mo), Number(d), 12);
      return isNaN(dt) ? null : dt;
    }
  }

  /** Anúncio inativo mostra intervalo: a segunda data é o fim da veiculação. */
  function parseEndDate(text) {
    const m = text.match(P.dateRangePt);
    if (!m) return null;
    const mo = ALC.MONTHS.pt[m[5].slice(0, 3).toLowerCase()];
    if (mo == null) return null;
    const dt = new Date(Number(m[6]), mo, Number(m[4]), 12);
    return isNaN(dt) ? null : dt;
  }

  const iso = (d) => d.getFullYear() + '-' + ALC.dom.pad2(d.getMonth() + 1) + '-' + ALC.dom.pad2(d.getDate());

  const META_LINE = [
    P.libraryId, P.active, P.inactive, P.multipleVersions, P.activeCount,
    /^(patrocinado|sponsored|publicidad)$/i,
    /veicula[çc][ãa]o iniciada|started running|comenz[óo] a publicarse/i,
    /^(plataformas|platforms|plataformas?)\s*:?$/i,
    /^(categorias?|categories)\b/i,
    /^(ver detalhes do an[úu]ncio|see ad details|detalhes do an[úu]ncio|ver resumo)/i,
    /^(transpar[êe]ncia da ue|eu transparency)/i,
    /^(esse an[úu]ncio tem|this ad has|este anuncio tiene)/i,
    /^ver mais$|^see more$|^ver más$/i,
    /^menu$/i,
    /^\d{1,2}:\d{2}$/,              // marcadores de tempo do player
    /^\/$/,
    /^[​\s]*$/                 // espaços de largura zero do layout do FB
  ];
  const isMeta = (t) => !t || t.length > 4000 || META_LINE.some((re) => re.test(t));

  /* --- 3. Blocos de texto e mídia ----------------------------------------- */

  /**
   * Percorre o card em ordem de documento devolvendo blocos de texto e mídias.
   * Um "bloco" é o elemento mais raso que contém um trecho de texto e nenhuma
   * mídia — assim uma copy com <br> e <span> continua sendo UM bloco, em vez
   * de sumir (era o bug: só folhas sem filhos eram consideradas).
   */
  function collectParts(card) {
    const parts = [];
    const claimed = new Set();
    const w = document.createTreeWalker(card, NodeFilter.SHOW_ELEMENT, {
      acceptNode(el) {
        if (el.hasAttribute('data-alc-ui')) return NodeFilter.FILTER_REJECT;
        if (el.tagName === 'IMG' || el.tagName === 'VIDEO') return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let el;
    while ((el = w.nextNode())) {
      if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
        const r = el.getBoundingClientRect();
        parts.push({ kind: 'media', el, big: r.width > 200 || r.height > 200 });
        continue;
      }
      if (claimed.has(el)) continue;
      if (el.querySelector('img,video')) continue;         // ainda é wrapper
      const text = (el.innerText || el.textContent || '').trim();
      if (!text) continue;
      parts.push({ kind: 'text', el, text });
      // marca a subárvore como já contabilizada, para não repetir o trecho
      el.querySelectorAll('*').forEach((d) => claimed.add(d));
    }
    return parts;
  }

  /**
   * A copy do anúncio: entre os blocos antes do criativo, o que sobra mais
   * texto depois de remover as linhas de metadados. Em empate, o mais enxuto
   * — assim pegamos o container da copy, não o card inteiro.
   */
  function pickCopy(before, advertiser) {
    let best = null, bestClean = 0, bestRaw = Infinity;
    before.forEach((p) => {
      if (p.kind !== 'text') return;
      const clean = cleanCopy(p.text, advertiser);
      if (clean.length < 12) return;
      if (clean.length > bestClean + 2 ||
         (clean.length >= bestClean - 2 && p.text.length < bestRaw)) {
        best = p; bestClean = Math.max(bestClean, clean.length); bestRaw = p.text.length;
      }
    });
    return best ? cleanCopy(best.el.innerText || best.text, advertiser) : '';
  }

  function cleanCopy(raw, advertiser) {
    return String(raw || '')
      .split('\n')
      .filter((l) => {
        const t = l.trim();
        if (!t) return true;                       // preserva linhas em branco
        if (advertiser && t === advertiser) return false;
        return !isMeta(t);
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /* --- 4. Extração completa ----------------------------------------------- */

  function scrape(card, libraryId, opts = {}) {
    try {
      if (opts.expand !== false) expandSeeMore(card);

      const text = textOfClean(card);
      const gql = ALC.gql && ALC.gql.get ? ALC.gql.get(libraryId) : null;

      /* Anúncio dinâmico (DCO/DPA): o topo do snapshot traz o gabarito
         ("{{product.name}}") e a copy real fica em cada card de produto.
         Ordem de resolução: snapshot -> cards do produto -> DOM. O que não
         resolver fica registrado em `unresolved` — e o menu Copiar desliga o
         item em vez de entregar "{{...}}" como se fosse copy. */
      const gqlCards = (gql && gql.cards) || [];
      const unresolved = [];
      const fromCards = (key, raw) => {
        for (let i = 0; i < gqlCards.length; i++) {
          const v = raw ? String(gqlCards[i][key] || '').trim() : ALC.firstReal(gqlCards[i][key]);
          if (v) return v;
        }
        return '';
      };
      const resolve = (id, snapValue, cardKey, domValue) => {
        const v = ALC.firstReal(snapValue, fromCards(cardKey), domValue);
        if (!v && ALC.isTemplateText(snapValue)) unresolved.push(id);
        return v;
      };
      const isDynamic = !!gql && [gql.body, gql.title, gql.linkDescription].some(ALC.isTemplateText);

      /* status */
      const status = P.active.test(text) || /(^|\n)\s*(ativo|active|activo)\s*(\n|$)/i.test(text)
        ? 'ativo'
        : (P.inactive.test(text) || /(^|\n)\s*(inativo|inactive|inactivo)\s*(\n|$)/i.test(text)
          ? 'inativo'
          : (gql && gql.isActive ? 'ativo' : 'inativo'));

      /* datas e dias no ar */
      let start = parseDate(text);
      if (!start && gql && gql.startDate) start = new Date(gql.startDate * 1000);
      const end = status === 'inativo' ? parseEndDate(text) : null;
      const startISO = start ? iso(start) : null;
      const ref = end || new Date();
      const daysRunning = start ? Math.max(1, Math.floor((ref - start) / 86400000)) : null;

      /* cópias ativas do mesmo criativo */
      const mCount = text.match(P.activeCount);
      const activeAdCount = mCount ? parseInt(mCount[1], 10) : 1;

      /* anunciante */
      const links = Array.from(card.querySelectorAll('a[href]')).filter((a) => !isOurs(a));
      const profileLink = links.find((a) => {
        const h = a.getAttribute('href') || '';
        return /^(https?:\/\/(www\.|web\.)?facebook\.com)?\/(?!ads\/)/.test(h) &&
          (a.textContent || '').trim().length > 1;
      });
      let advertiserName = profileLink ? (profileLink.textContent || '').trim() : '';
      if (!advertiserName && gql) advertiserName = gql.pageName || '';
      const advertiserProfileUrl = profileLink
        ? new URL(profileLink.getAttribute('href'), location.origin).href : '';
      /* Só o page_id do snapshot serve para view_all_page_id. O número que
         aparece na URL do perfil é id de perfil e a Biblioteca responde
         "Nenhum anúncio" com ele. */
      const advertiserPageId = (gql && gql.pageId) || '';
      const avatar = Array.from(card.querySelectorAll('img')).find((i) => !isOurs(i) &&
        i.getBoundingClientRect().width < 80);
      const advertiserAvatarUrl = avatar ? (avatar.currentSrc || avatar.src) : '';

      /* partes ordenadas: o que vem antes e o que vem depois do criativo */
      const parts = collectParts(card);
      const firstBig = parts.findIndex((p) => p.kind === 'media' && p.big);
      const before = parts.slice(0, firstBig < 0 ? parts.length : firstBig);
      const after = firstBig < 0 ? [] : parts.slice(firstBig + 1);

      /* texto principal */
      const primaryText = resolve('primary', gql && gql.body, 'body',
        pickCopy(before, advertiserName));

      /* destino */
      const outLink = links.find((a) => {
        const host = domainOf(unwrapUrl(a.getAttribute('href')));
        return !!host && !/(^|\.)(facebook|fb|instagram|messenger|threads)\.(com|net|me)$/i.test(host);
      });
      const gqlUrl = gql && gql.linkUrl;
      const domUrl = outLink ? unwrapUrl(outLink.getAttribute('href')) : '';
      const destinationUrl = ALC.cleanUrlMacros(gqlUrl) ||
        ALC.cleanUrlMacros(fromCards('linkUrl', true)) ||
        ALC.cleanUrlMacros(domUrl);
      if (!destinationUrl && (ALC.isTemplateText(gqlUrl) || ALC.isTemplateText(domUrl))) {
        unresolved.push('url');
      }
      const destinationDomain = domainOf(destinationUrl);

      /* headline, descrição e CTA (bloco abaixo do criativo) */
      const tail = after.filter((p) => p.kind === 'text' && !isMeta(p.text));
      /* Só um nó de linha única pode ser "o CTA": quando a Meta entrega o rodapé
         inteiro num nó só, ele casava com a heurística de botão e levava junto o
         título — que virava CTA "Fechacom Tecidos\nShop Now" e sumia do card. */
      const ctaPart = tail.find((p) => !/\n/.test(p.text) &&
        ((p.el.closest('a,[role="button"]') && p.text.length < 42) || CTA_WORDS.test(p.text)));
      let ctaLabel = resolve('cta', gql && gql.ctaText, 'ctaText', ctaPart ? ctaPart.text : '');
      /* O rodapé do card tem sempre a mesma ordem — domínio, título, descrição,
         CTA — mas a Meta ora quebra em elementos separados, ora entrega tudo num
         nó só, com quebras de linha. Achatar em linhas e filtrar linha a linha
         trata os dois casos com a mesma regra; sem isso o título saía como
         "ORNEDECOR.COM\nLuminária...\nORNE™\nShop Now". */
      const isDomainLine = (t) =>
        (destinationDomain && t.toLowerCase() === destinationDomain.toLowerCase()) ||
        /^[A-Z0-9.\-]+\.[A-Z]{2,}$/.test(t) ||
        /^(WHATSAPP|INSTAGRAM|FACEBOOK|MESSENGER)$/i.test(t);
      const isCtaLine = (t) => CTA_WORDS.test(t) && t.length < 42;
      const lines = tail
        .filter((p) => p !== ctaPart)
        .reduce((acc, p) => acc.concat(String(p.text || '').split('\n')), [])
        .map((t) => t.trim())
        .filter(Boolean);
      if (!ctaLabel) {
        const l = lines.find(isCtaLine);
        if (l) ctaLabel = l;
      }
      const rest = lines.filter((t) => !isDomainLine(t) && !isCtaLine(t));
      const headline = resolve('headline', gql && gql.title, 'title', rest[0] || '');
      /* A legenda (o domínio sob o título) é o último recurso: vale menos que a
         descrição do produto, então entra só depois do DOM. */
      const description = resolve('description', gql && gql.linkDescription, 'linkDescription',
        rest[1] || (gql && gql.caption) || '');

      return {
        libraryId,
        advertiserName: advertiserName || '—',
        advertiserPageId,
        advertiserProfileUrl,
        advertiserAvatarUrl,
        status,
        startDateRaw: start ? ALC.dom.fmtDateBR(startISO) : '',
        startDate: startISO,
        endDate: end ? iso(end) : null,
        daysRunning,
        platforms: collectPlatforms(gql),
        hasMultipleVersions: P.multipleVersions.test(text),
        activeAdCount,
        primaryText,
        headline,
        description,
        ctaLabel,
        destinationUrl,
        destinationDomain,
        isDynamic,
        productVariants: collectVariants(gqlCards),
        unresolved,
        creatives: collectCreatives(card, gql),
        libraryUrl: ALC.LIBRARY_BASE + '?id=' + libraryId,
        scrapedAt: Date.now()
      };
    } catch (e) {
      console.warn('[Biblioteca Extrema] falha ao ler o card', e);
      return null;
    }
  }

  /** Produtos distintos de um anúncio de catálogo, na ordem em que a Meta manda. */
  function collectVariants(cards) {
    const out = [];
    const seen = new Set();
    (cards || []).forEach((c) => {
      const v = {
        title: ALC.firstReal(c.title),
        description: ALC.firstReal(c.linkDescription),
        primaryText: ALC.firstReal(c.body),
        url: ALC.firstReal(c.linkUrl),
        ctaLabel: ALC.firstReal(c.ctaText)
      };
      if (!v.title && !v.description && !v.primaryText && !v.url) return;
      const key = v.title + '|' + v.url + '|' + v.primaryText;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(v);
    });
    return out;
  }

  /** Identidade estável do arquivo: só o nome no caminho, sem query de tamanho. */
  function assetKey(url) {
    try { return new URL(url, location.origin).pathname.split('/').pop() || String(url); }
    catch (_) { return String(url || '').split('?')[0]; }
  }

  function collectCreatives(card, gql) {
    const out = [];
    const seen = new Set();
    const add = (c) => {
      const k = assetKey(c.url);
      if (!c.url || seen.has(k)) return;
      seen.add(k);
      out.push(c);
    };
    /* O GraphQL entrega a lista completa do anúncio, incluindo todos os cards do
       carrossel. O DOM, quando o GraphQL já respondeu, só devolve o MESMO vídeo
       com outro nome de arquivo (variante de entrega) — era isso que fazia
       "todos os criativos" baixar o mesmo material duas vezes. */
    if (gql && Array.isArray(gql.creatives) && gql.creatives.length) {
      gql.creatives.forEach(add);
      return semCapas(out);
    }
    card.querySelectorAll('video').forEach((v) => {
      if (isOurs(v)) return;
      const src = v.currentSrc || v.src || '';
      const poster = v.getAttribute('poster') || '';
      const url = /^blob:/.test(src) ? '' : src;
      const key = assetKey(url || poster);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({
        type: 'video',
        url: url || poster,
        posterUrl: poster,
        durationSec: v.duration && isFinite(v.duration) ? Math.round(v.duration) : null,
        note: url ? '' : 'poster (a URL do vídeo só vem pelo GraphQL)'
      });
    });
    card.querySelectorAll('img').forEach((img) => {
      if (isOurs(img)) return;
      const r = img.getBoundingClientRect();
      if (r.width < 200 && r.height < 200) return;        // avatar e ícones fora
      const url = bestFromSrcset(img);
      if (!url || seen.has(assetKey(url))) return;
      seen.add(assetKey(url));
      out.push({
        type: 'image',
        url,
        thumbUrl: img.currentSrc || img.src,
        width: img.naturalWidth || Math.round(r.width),
        height: img.naturalHeight || Math.round(r.height)
      });
    });
    return semCapas(out);
  }

  /** Capa de vídeo não é criativo próprio. */
  function semCapas(list) {
    const capas = new Set(list.filter((c) => c.type === 'video' && c.posterUrl)
      .map((c) => assetKey(c.posterUrl)));
    return list.filter((c) => !(c.type === 'image' && capas.has(assetKey(c.url))));
  }

  function bestFromSrcset(img) {
    const ss = img.getAttribute('srcset');
    if (ss) {
      const best = ss.split(',').map((s) => {
        const [u, d] = s.trim().split(/\s+/);
        return { u, w: parseFloat(d) || 0 };
      }).sort((a, b) => b.w - a.w)[0];
      if (best && best.u) return best.u;
    }
    return img.currentSrc || img.src || '';
  }

  /**
   * Plataformas vêm do GraphQL. No DOM a Meta desenha os ícones como divs de
   * 12px sem alt, sem aria-label e sem background-image inspecionável — não há
   * sinal honesto para ler, e chutar seria pior do que devolver vazio.
   */
  function collectPlatforms(gql) {
    return gql && gql.platforms && gql.platforms.length ? gql.platforms : [];
  }

  return { discover, scrape, expandSeeMore, parseDate, textOfClean, ascendToCard };
})();
