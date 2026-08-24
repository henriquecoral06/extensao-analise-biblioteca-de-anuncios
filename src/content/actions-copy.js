/* ============================================================================
   Menu COPIAR — cada item cola exatamente o campo prometido. Campo vazio dá
   aviso em âmbar; nunca copiamos string vazia em silêncio.
   Anúncio dinâmico (DCO/DPA): quando a Meta só publica o gabarito do campo
   ("{{product.name}}"), o scraper já tentou a copy real de cada produto e o
   DOM. O que sobrar sem resolver desliga o item — gabarito não é copy.
   ========================================================================== */
window.ALC = window.ALC || {};

/** Bloco legível usado pelo item "Todas as informações" e pelo info.txt. */
ALC.buildInfoText = function (ad) {
  const L = '════════════════════════════════════════';
  const sep = (t) => '── ' + t + ' ' + '─'.repeat(Math.max(0, 38 - t.length));
  const NA = '— não publicado (anúncio dinâmico: o texto muda a cada produto)';
  const unresolved = ad.unresolved || [];
  const field = (id, v) => (v && String(v).trim())
    ? v
    : (unresolved.indexOf(id) >= 0 ? NA : '—');
  const plat = (ad.platforms || []).map((p) => ({
    facebook: 'Facebook', instagram: 'Instagram', messenger: 'Messenger',
    threads: 'Threads', audience_network: 'Audience Network'
  }[p] || p)).join(', ');
  const creatives = (ad.creatives || []).map((c, i) =>
    (i + 1) + '. ' + c.type + '  · ' +
    (c.type === 'video'
      ? (c.durationSec ? c.durationSec + 's' : '—')
      : ((c.width || '?') + 'x' + (c.height || '?'))) +
    ' · ' + c.url).join('\n') || '—';

  /* Catálogo com mais de um produto: a copy de cada um, que é o que existe de
     concreto quando o campo do topo é gabarito. */
  const variants = ad.productVariants || [];
  const variantBlock = variants.length > 1 ? [
    '',
    sep('PRODUTOS DO CATÁLOGO (' + variants.length + ')'),
    variants.map((v, i) => [
      (i + 1) + '. ' + (v.title || '—'),
      v.description ? '   descrição: ' + v.description : null,
      v.primaryText ? '   texto    : ' + v.primaryText.replace(/\n/g, ' ') : null,
      v.url ? '   destino  : ' + v.url : null
    ].filter(Boolean).join('\n')).join('\n')
  ] : [];

  return [
    L,
    'ANUNCIANTE : ' + (ad.advertiserName || '—'),
    'LIBRARY ID : ' + ad.libraryId,
    'STATUS     : ' + (ad.status === 'ativo' ? 'Ativo' : 'Inativo'),
    'NO AR DESDE: ' + (ad.startDateRaw || '—') +
      (ad.daysRunning ? '  (' + ad.daysRunning + ' dias)' : ''),
    'CÓPIAS ATIVAS DO CRIATIVO: ' + (ad.activeAdCount || 1),
    'PLATAFORMAS: ' + (plat || '—'),
    'DESTINO    : ' + field('url', ad.destinationUrl),
    'CTA        : ' + field('cta', ad.ctaLabel),
    'LINK NA BIBLIOTECA: ' + ad.libraryUrl,
    L,
    '',
    sep('TEXTO PRINCIPAL'),
    field('primary', ad.primaryText),
    '',
    sep('TÍTULO'),
    field('headline', ad.headline),
    '',
    sep('DESCRIÇÃO'),
    field('description', ad.description)
  ].concat(variantBlock).concat([
    '',
    sep('CRIATIVOS'),
    creatives,
    '',
    'Extraído em ' + ALC.dom.fmtStamp(Date.now()) + ' por AdLib Copilot'
  ]).join('\n');
};

ALC.actionsCopy = (function () {
  const F = {
    primary: { label: 'copyPrimary', get: (a) => a.primaryText },
    headline: { label: 'copyHeadline', get: (a) => a.headline },
    description: { label: 'copyDescription', get: (a) => a.description },
    url: { label: 'copyUrl', get: (a) => a.destinationUrl },
    cta: { label: 'copyCta', get: (a) => a.ctaLabel },
    library: { label: 'copyLibrary', get: (a) => a.libraryUrl },
    all: { label: 'copyAll', get: (a) => ALC.buildInfoText(a) }
  };
  const ORDER = ['primary', 'headline', 'description', 'url', 'cta', 'library', 'all'];

  /* O que faz a cópia completa valer: sem texto principal ou título ela vira
     uma ficha sem anúncio dentro. Descrição, CTA e destino que não resolvem
     saem marcados no bloco e com o item próprio desligado — não travam o resto. */
  const CORE = ['primary', 'headline'];

  /** Nomes dos campos que ficaram só no gabarito, para a mensagem do usuário. */
  const listNames = (ids) => ids
    .filter((id) => F[id])
    .map((id) => ALC.t(F[id].label).toLowerCase())
    .join(', ');

  return {
    items(ad) {
      const stuck = ad.unresolved || [];
      return ORDER.map((id) => {
        if (id === 'all') {
          const core = stuck.filter((s) => CORE.indexOf(s) >= 0);
          return {
            id,
            label: ALC.t('copyAll'),
            icon: 'file-text',
            disabled: core.length > 0,
            title: core.length ? ALC.t('dynamicBlocked', { fields: listNames(core) }) : ''
          };
        }
        const dynamic = stuck.indexOf(id) >= 0;
        return {
          id,
          label: ALC.t(F[id].label),
          icon: null,
          disabled: !String(F[id].get(ad) || '').trim(),
          title: dynamic ? ALC.t('dynamicTitle') : ''
        };
      });
    },
    async run(ad, id) {
      const f = F[id];
      if (!f) return;
      const stuck = ad.unresolved || [];
      const name = ALC.t(f.label);
      const core = stuck.filter((s) => CORE.indexOf(s) >= 0);
      if (id === 'all' && core.length) {
        ALC.toast.warn(ALC.t('dynamicBlocked', { fields: listNames(core) }));
        return;
      }
      if (stuck.indexOf(id) >= 0) {
        ALC.toast.warn(ALC.t('dynamicField', { field: name.toLowerCase() }));
        return;
      }
      const value = f.get(ad);
      if (!value || !String(value).trim()) {
        ALC.toast.warn(ALC.t('emptyField', { field: name.toLowerCase() }));
        return;
      }
      const ok = await ALC.dom.copyText(value);
      if (!ok) { ALC.toast.error('Não foi possível copiar.'); return; }
      ALC.toast.success(ALC.t('copied', {
        field: name, n: String(value).length.toLocaleString('pt-BR')
      }));
      ALC.collect(ad);
    }
  };
})();
