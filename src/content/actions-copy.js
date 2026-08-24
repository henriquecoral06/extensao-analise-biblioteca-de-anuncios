/* ============================================================================
   Menu COPIAR — cada item cola exatamente o campo prometido. Campo vazio dá
   aviso em âmbar; nunca copiamos string vazia em silêncio.
   ========================================================================== */
window.ALC = window.ALC || {};

/** Bloco legível usado pelo item "Todas as informações" e pelo info.txt. */
ALC.buildInfoText = function (ad) {
  const L = '════════════════════════════════════════';
  const sep = (t) => '── ' + t + ' ' + '─'.repeat(Math.max(0, 38 - t.length));
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

  return [
    L,
    'ANUNCIANTE : ' + (ad.advertiserName || '—'),
    'LIBRARY ID : ' + ad.libraryId,
    'STATUS     : ' + (ad.status === 'ativo' ? 'Ativo' : 'Inativo'),
    'NO AR DESDE: ' + (ad.startDateRaw || '—') +
      (ad.daysRunning ? '  (' + ad.daysRunning + ' dias)' : ''),
    'CÓPIAS ATIVAS DO CRIATIVO: ' + (ad.activeAdCount || 1),
    'PLATAFORMAS: ' + (plat || '—'),
    'DESTINO    : ' + (ad.destinationUrl || '—'),
    'CTA        : ' + (ad.ctaLabel || '—'),
    'LINK NA BIBLIOTECA: ' + ad.libraryUrl,
    L,
    '',
    sep('TEXTO PRINCIPAL'),
    ad.primaryText || '—',
    '',
    sep('TÍTULO'),
    ad.headline || '—',
    '',
    sep('DESCRIÇÃO'),
    ad.description || '—',
    '',
    sep('CRIATIVOS'),
    creatives,
    '',
    'Extraído em ' + ALC.dom.fmtStamp(Date.now()) + ' por AdLib Copilot'
  ].join('\n');
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

  return {
    items(ad) {
      return ORDER.map((id) => ({
        id,
        label: ALC.t(F[id].label),
        icon: id === 'all' ? 'file-text' : null,
        disabled: false
      })).concat();
    },
    async run(ad, id) {
      const f = F[id];
      if (!f) return;
      const value = f.get(ad);
      const name = ALC.t(f.label);
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
