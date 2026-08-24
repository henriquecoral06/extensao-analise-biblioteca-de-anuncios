/* ============================================================================
   Toasts — superfície com hairline de 1px e uma barra de acento na cor do
   estado. Sem preenchimento colorido: o par soft/deep fica só no ícone.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.toast = (function () {
  const { el, icon } = ALC.dom;
  let host = null;

  const ICONS = { success: 'check', error: 'warning', warn: 'warning', info: 'info', loading: null };

  function mount() {
    if (host && document.body.contains(host)) return host;
    host = el('div#alc-toasts.alc-scope', { role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(host);
    return host;
  }

  function trim() {
    const items = host.querySelectorAll('.alc-toast');
    for (let i = 0; i < items.length - 4; i++) items[i].remove();
  }

  function show(message, variant = 'info', opts = {}) {
    mount();
    const box = el('div.alc-toast.alc-toast-' + variant);
    const mark = variant === 'loading'
      ? el('span.alc-spinner')
      : icon(ICONS[variant] || 'info', 15);
    const body = el('div.alc-toast-body', null, [
      el('div.alc-toast-msg', { text: message }),
      opts.detail ? el('div.alc-toast-detail', { text: opts.detail }) : null
    ]);
    const close = el('button.alc-toast-x', {
      type: 'button', 'aria-label': ALC.t('close'),
      onclick: () => box.remove()
    }, [icon('close', 12)]);
    box.append(mark, body, close);
    if (opts.progress != null) {
      const bar = el('div.alc-toast-bar', null, [el('i')]);
      bar.firstChild.style.width = Math.round(opts.progress * 100) + '%';
      box.appendChild(bar);
    }
    host.appendChild(box);
    trim();

    const api = {
      node: box,
      update(msg, v, o) {
        const m = box.querySelector('.alc-toast-msg');
        if (m && msg) m.textContent = msg;
        if (o && o.progress != null) {
          let bar = box.querySelector('.alc-toast-bar i');
          if (!bar) {
            const wrap = el('div.alc-toast-bar', null, [el('i')]);
            box.appendChild(wrap);
            bar = wrap.firstChild;
          }
          bar.style.width = Math.round(o.progress * 100) + '%';
        }
        if (v && v !== variant) { box.remove(); return show(msg, v, o); }
        return api;
      },
      dismiss() { box.remove(); }
    };
    if (variant !== 'loading') setTimeout(() => box.remove(), opts.duration || 3500);
    return api;
  }

  return {
    show,
    success: (m, o) => show(m, 'success', o),
    error: (m, o) => show(m, 'error', o),
    warn: (m, o) => show(m, 'warn', o),
    info: (m, o) => show(m, 'info', o),
    loading: (m, o) => show(m, 'loading', o)
  };
})();
