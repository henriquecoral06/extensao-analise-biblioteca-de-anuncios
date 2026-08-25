/* ============================================================================
   Modal — overlay + caixa central. Foco preso, fecha em Esc, no overlay e no ×.
   Dois usos: seleção de criativos e resultado de IA.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.modal = (function () {
  const { el, icon } = ALC.dom;
  let current = null;

  function close() {
    if (!current) return;
    const { root, onClose, lastFocus } = current;
    document.removeEventListener('keydown', current.keyHandler, true);
    root.remove();
    current = null;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (_) {} }
    if (onClose) onClose();
  }

  /** open({ title, subtitle, body: Node, actions: [Node], onClose }) */
  function open(opts) {
    close();
    const root = el('div#alc-modal.alc-scope', { role: 'presentation' });
    const overlay = el('div.alc-modal-overlay', { onclick: close });
    const box = el('div.alc-modal-box', {
      role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || 'Biblioteca Extrema'
    });

    const head = el('div.alc-modal-head', null, [
      el('div', null, [
        opts.eyebrow ? el('div.alc-eyebrow', { text: opts.eyebrow }) : null,
        el('h2.alc-h-md', { text: opts.title || '' }),
        opts.subtitle ? el('p.alc-caption', { text: opts.subtitle }) : null
      ]),
      el('button.alc-icon-btn', {
        type: 'button', 'aria-label': ALC.t('close'), onclick: close
      }, [icon('close', 15)])
    ]);

    const body = el('div.alc-modal-body', null, [opts.body || null]);
    const foot = opts.actions && opts.actions.length
      ? el('div.alc-modal-foot', null, opts.actions) : null;

    box.append(head, body);
    if (foot) box.appendChild(foot);
    root.append(overlay, box);
    document.body.appendChild(root);

    const keyHandler = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyHandler, true);
    current = { root, onClose: opts.onClose, keyHandler, lastFocus: document.activeElement, box };
    const target = box.querySelector('button:not(.alc-icon-btn)') || box.querySelector('button');
    if (target) setTimeout(() => target.focus(), 0);
    return { close, box, body };
  }

  /* --- mini renderer de Markdown -------------------------------------------
     Só #, ##, ###, **negrito**, `código`, listas e blocos de código. Constrói
     nós de verdade; nada de innerHTML com texto de terceiros. */
  function renderMarkdown(md) {
    const wrap = el('div.alc-md');
    const lines = String(md || '').split('\n');
    let list = null, pre = null;

    const inline = (text, into) => {
      const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
      let last = 0, m;
      while ((m = re.exec(text))) {
        if (m.index > last) into.appendChild(document.createTextNode(text.slice(last, m.index)));
        const tok = m[0];
        if (tok.startsWith('**')) into.appendChild(el('strong', { text: tok.slice(2, -2) }));
        else into.appendChild(el('code', { text: tok.slice(1, -1) }));
        last = m.index + tok.length;
      }
      if (last < text.length) into.appendChild(document.createTextNode(text.slice(last)));
    };

    lines.forEach((raw) => {
      const line = raw.replace(/\s+$/, '');
      if (/^```/.test(line)) {
        if (pre) { pre = null; } else { pre = el('pre'); wrap.appendChild(pre); }
        return;
      }
      if (pre) { pre.appendChild(document.createTextNode(raw + '\n')); return; }
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        list = null;
        const node = el(['h3', 'h4', 'h5', 'h5'][h[1].length - 1]);
        inline(h[2], node);
        wrap.appendChild(node);
        return;
      }
      const li = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
      if (li) {
        if (!list) { list = el('ul'); wrap.appendChild(list); }
        const item = el('li');
        inline(li[1], item);
        list.appendChild(item);
        return;
      }
      list = null;
      if (!line.trim()) return;
      const p = el('p');
      inline(line, p);
      wrap.appendChild(p);
    });
    return wrap;
  }

  return { open, close, renderMarkdown, isOpen: () => !!current };
})();
