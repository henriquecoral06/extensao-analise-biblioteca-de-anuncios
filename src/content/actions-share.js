/* ============================================================================
   Menu ENVIAR — mesmos destinos do Abrir, mas copiando o link em vez de abrir.
   Com Shift, oferece o compartilhamento nativo do sistema quando disponível.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.actionsShare = (function () {
  return {
    items(ad) {
      const links = ALC.buildLinks(ad, ALC.settings.country);
      const base = ALC.OPEN_ITEMS.map((it) => ({
        id: it.id,
        label: ALC.t(it.label),
        disabled: !links[it.id],
        title: links[it.id] || it.why
      }));
      base.push({ separator: true });
      base.push({ id: 'all', label: ALC.t('sendAll'), icon: 'link' });
      return base;
    },
    async run(ad, id) {
      const links = ALC.buildLinks(ad, ALC.settings.country);
      let text;
      if (id === 'all') {
        text = [
          'Anúncio de ' + ad.advertiserName +
            (ad.daysRunning ? ' (' + ad.daysRunning + ' dias no ar)' : ''),
          links.site ? 'Site: ' + links.site : null,
          links.profile ? 'Perfil: ' + links.profile : null,
          'Biblioteca: ' + links.library
        ].filter(Boolean).join('\n');
      } else {
        text = links[id];
      }
      if (!text) { ALC.toast.warn(ALC.t('noData')); return; }

      const wantsNative = ALC.lastShiftKey && navigator.share && window.isSecureContext;
      if (wantsNative) {
        try { await navigator.share({ text }); return; } catch (_) { /* segue para o clipboard */ }
      }
      const ok = await ALC.dom.copyText(text);
      if (ok) ALC.toast.success(id === 'all' ? ALC.t('linksCopied') : 'Link copiado.');
      else ALC.toast.error('Não foi possível copiar.');
      ALC.collect(ad);
    }
  };
})();
