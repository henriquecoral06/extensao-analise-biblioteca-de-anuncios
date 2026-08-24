/* ============================================================================
   Menu ABRIR — item sem dado fica desabilitado e explica por quê no title;
   nunca some da lista (a posição do item é memória muscular).
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.buildLinks = function (ad, country) {
  const c = country || 'BR';
  const base = ALC.LIBRARY_BASE + '?active_status=active&ad_type=all&country=' + c;
  const porNome = ad.advertiserName
    ? base + '&q=' + encodeURIComponent(ad.advertiserName) + '&search_type=keyword_unordered'
    : '';
  return {
    site: ad.destinationUrl || '',
    profile: ad.advertiserProfileUrl || '',
    byDomain: ad.destinationDomain
      ? base + '&q=' + encodeURIComponent(ad.destinationDomain) + '&search_type=keyword_unordered'
      : '',
    /* view_all_page_id só aceita o page_id do anúncio (o que vem no GraphQL).
       O número da URL do perfil é id de perfil e devolve "Nenhum anúncio" —
       nesse caso a busca por nome é o que de fato encontra o anunciante. */
    byAdvertiser: ad.advertiserPageId
      ? base + '&view_all_page_id=' + ad.advertiserPageId + '&search_type=page&media_type=all'
      : porNome,
    library: ad.libraryUrl
  };
};

ALC.OPEN_ITEMS = [
  { id: 'site', label: 'openSite', why: 'Este anúncio não expõe um link de destino.' },
  { id: 'profile', label: 'openProfile', why: 'Perfil do anunciante não identificado.' },
  { id: 'byDomain', label: 'openByDomain', why: 'Sem domínio de destino para pesquisar.' },
  { id: 'byAdvertiser', label: 'openByAdvertiser', why: 'Sem página nem nome de anunciante.' },
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
