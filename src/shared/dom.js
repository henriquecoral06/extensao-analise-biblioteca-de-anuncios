/* ============================================================================
   Helpers de DOM. Nada aqui usa innerHTML com conteúdo vindo da página ou da
   IA — só createElement e textContent.
   ========================================================================== */
window.ALC = window.ALC || {};

/** el('button.alc-btn', { 'aria-label': 'x' }, [filhos|texto]) */
function el(spec, attrs, children) {
  const m = String(spec).match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
  const tag = (m && m[1]) || 'div';
  const node = document.createElement(tag);
  if (m && m[2]) {
    m[2].split(/(?=[.#])/).forEach((tok) => {
      if (tok[0] === '.') node.classList.add(tok.slice(1));
      else if (tok[0] === '#') node.id = tok.slice(1);
    });
  }
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'text') node.textContent = String(v);
      else if (k === 'onclick') node.addEventListener('click', v);
      else if (k in node && (k === 'value' || k === 'checked' || k === 'disabled')) node[k] = v;
      else node.setAttribute(k, String(v));
    }
  }
  const kids = children == null ? [] : (Array.isArray(children) ? children : [children]);
  kids.forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    node.appendChild(typeof c === 'string' || typeof c === 'number'
      ? document.createTextNode(String(c)) : c);
  });
  return node;
}

/** Ícone como máscara: a cor vem do currentColor do contexto. */
function icon(name, size) {
  const i = el('span.alc-i.alc-i-' + name, { 'aria-hidden': 'true' });
  if (size) { i.style.width = size + 'px'; i.style.height = size + 'px'; }
  return i;
}

/** Procura um descendente cujo texto visível bate com o padrão. */
function findByText(root, pattern, tags) {
  const sel = tags || '*';
  const nodes = root.querySelectorAll(sel);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.children.length > 2) continue;         // só folhas de texto
    const txt = (n.textContent || '').trim();
    if (!txt || txt.length > 300) continue;
    if (pattern instanceof RegExp ? pattern.test(txt) : txt === pattern) return n;
  }
  return null;
}

/** Todo o texto do container, uma única leitura (evita percorrer a árvore). */
function textOf(node) {
  return node ? (node.innerText || node.textContent || '') : '';
}

function debounce(fn, ms) {
  let id = null;
  return function () {
    const args = arguments, self = this;
    clearTimeout(id);
    id = setTimeout(() => fn.apply(self, args), ms);
  };
}

function waitFor(check, timeout = 8000, step = 200) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    (function tick() {
      let r = null;
      try { r = check(); } catch (_) {}
      if (r) return resolve(r);
      if (Date.now() - t0 > timeout) return resolve(null);
      setTimeout(tick, step);
    })();
  });
}

/** slug para nome de arquivo: só [a-z0-9-_], sem acento, máx. 60 chars. */
function slug(s, max = 60) {
  return String(s || 'anuncio')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max) || 'anuncio';
}

function pad2(n) { return String(n).padStart(2, '0'); }

function fmtDateBR(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
}

function fmtStamp(ts) {
  const d = new Date(ts || Date.now());
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() +
    ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/** Copiar com fallback para navegadores/contextos sem permissão de clipboard. */
async function copyText(text) {
  const s = String(text == null ? '' : text);
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch (_) {
    try {
      const ta = el('textarea', { 'aria-hidden': 'true' });
      ta.value = s;
      ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }
}

/** Desembrulha o l.facebook.com/l.php?u=… e devolve a URL real. */
function unwrapUrl(href) {
  if (!href) return '';
  try {
    const u = new URL(href, location.origin);
    if (/(^|\.)facebook\.com$/.test(u.hostname) && u.pathname === '/l.php') {
      const real = u.searchParams.get('u');
      if (real) return decodeURIComponent(real);
    }
    return u.href;
  } catch (_) { return href; }
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return ''; }
}

/** Publica a posição do ponteiro para o brilho de borda dos cards. */
function spotlight(node) {
  let raf = 0;
  node.addEventListener('pointermove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = node.getBoundingClientRect();
      node.style.setProperty('--alc-spot-x', (e.clientX - r.left) + 'px');
      node.style.setProperty('--alc-spot-y', (e.clientY - r.top) + 'px');
    });
  });
}

ALC.dom = { el, icon, findByText, textOf, debounce, waitFor, slug, fmtDateBR, fmtStamp,
  copyText, unwrapUrl, domainOf, spotlight, pad2 };
