/* ============================================================================
   Menu ABRIR — item sem dado fica desabilitado e explica por quê no title;
   nunca some da lista (a posição do item é memória muscular).
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.buildLinks = function (ad, country) {
  const c = country || 'BR';
  const base = ALC.LIBRARY_BASE + '?active_status=active&ad_type=all&country=' + c;
  const handle = (ad.advertiserName || '').toLowerCase().replace(/[^a-z0-9._]/g, '');
  return {
    site: ad.destinationUrl || '',
    profile: ad.advertiserProfileUrl || '',
    instagram: handle
      ? 'https://www.instagram.com/' + handle
      : (ad.advertiserName
        ? 'https://www.instagram.com/explore/search/keyword/?q=' + encodeURIComponent(ad.advertiserName)
        : ''),
    byDomain: ad.destinationDomain
      ? base + '&q=' + encodeURIComponent(ad.destinationDomain) + '&search_type=keyword_unordered'
      : '',
    byAdvertiser: ad.advertiserPageId ? base + '&view_all_page_id=' + ad.advertiserPageId : '',
    library: ad.libraryUrl
  };
};

ALC.OPEN_ITEMS = [
  { id: 'site', label: 'openSite', why: 'Este anúncio não expõe um link de destino.' },
  { id: 'profile', label: 'openProfile', why: 'Perfil do anunciante não identificado.' },
  { id: 'instagram', label: 'openInstagram', why: 'Sem nome de anunciante para inferir o perfil.' },
  { id: 'byDomain', label: 'openByDomain', why: 'Sem domínio de destino para pesquisar.' },
  { id: 'byAdvertiser', label: 'openByAdvertiser', why: 'ID da página do anunciante não encontrado.' },
  { id: 'library', label: 'openLibrary', why: '' }
];

ALC.actionsOpen = (function () {
  return {
    items(ad) {
      const links = ALC.buildLinks(ad, ALC.settings.country);
      return ALC.OPEN_ITEMS.map((it) => ({
        id: it.id,
        label: ALC.t(it.label),
        disabled: !links[it.id],
        title: links[it.id] ? links[it.id] : it.why
      }));
    },
    run(ad, id) {
      const links = ALC.buildLinks(ad, ALC.settings.country);
      const url = links[id];
      if (!url) { ALC.toast.warn(ALC.t('noData')); return; }
      window.open(url, '_blank', 'noopener');
      ALC.collect(ad);
    }
  };
})();
