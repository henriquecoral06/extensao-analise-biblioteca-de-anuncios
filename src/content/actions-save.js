/* ============================================================================
   Menu SALVAR — downloads de criativos e de informações.
   Regra de arquitetura: quando é um arquivo só, o service worker baixa
   direto da URL do fbcdn (nenhum byte atravessa contextos). Só o modo .zip
   traz os bytes para o content script, que é quem tem JSZip e Blob.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.actionsSave = (function () {
  const { el, slug } = ALC.dom;
  const ZIP_LIMIT_MB = 60;

  function ext(c) {
    const m = String(c.url || '').split('?')[0].match(/\.(mp4|webm|mov|jpe?g|png|webp|gif)$/i);
    if (m) return m[1].toLowerCase();
    return c.type === 'video' ? 'mp4' : 'jpg';
  }

  function nameFor(ad, index) {
    const s = ALC.settings;
    const d = new Date();
    return (s.filenamePattern || '{anunciante}_{libraryId}_{indice}')
      .replace('{anunciante}', slug(ad.advertiserName))
      .replace('{libraryId}', ad.libraryId)
      .replace('{indice}', String(index + 1).padStart(2, '0'))
      .replace('{dias}', String(ad.daysRunning || 0))
      .replace('{data}', d.getFullYear() + ALC.dom.pad2(d.getMonth() + 1) + ALC.dom.pad2(d.getDate()));
  }

  function folder(ad) {
    const base = (ALC.settings.downloadFolder || 'AdLib Copilot').replace(/[\\/]+$/, '');
    return base + '/' + slug(ad.advertiserName) + '/';
  }

  async function downloadOne(ad, creative, index) {
    const filename = folder(ad) + nameFor(ad, index) + '.' + ext(creative);
    const res = await ALC.send(ALC.MSG.DOWNLOAD_URL, { url: creative.url, filename });
    if (!res.ok) throw new Error(res.error || 'download falhou');
    return filename;
  }

  async function downloadInfo(ad) {
    const stem = folder(ad) + slug(ad.advertiserName) + '_' + ad.libraryId;
    await ALC.send(ALC.MSG.DOWNLOAD_TEXT, {
      filename: stem + '_info.txt', content: ALC.buildInfoText(ad), mime: 'text/plain'
    });
    await ALC.send(ALC.MSG.DOWNLOAD_TEXT, {
      filename: stem + '_dados.json', content: JSON.stringify(ad, null, 2), mime: 'application/json'
    });
  }

  /** Empacota criativos (+ info) num .zip montado aqui, com JSZip. */
  async function downloadZip(ad, creatives, withInfo) {
    if (typeof JSZip === 'undefined') {
      ALC.toast.warn('JSZip indisponível — baixando os arquivos separadamente.');
      return downloadEach(ad, creatives);
    }
    const zip = new JSZip();
    const t = ALC.toast.loading(ALC.t('downloading', { i: 0, n: creatives.length }), { progress: 0 });
    let bytes = 0;
    for (let i = 0; i < creatives.length; i++) {
      t.update(ALC.t('downloading', { i: i + 1, n: creatives.length }),
        null, { progress: (i) / creatives.length });
      const res = await ALC.send(ALC.MSG.FETCH_MEDIA, { url: creatives[i].url });
      if (!res.ok) continue;
      bytes += res.data.size || 0;
      if (bytes > ZIP_LIMIT_MB * 1024 * 1024) {
        t.dismiss();
        ALC.toast.warn('Conteúdo acima de ' + ZIP_LIMIT_MB + ' MB — baixando separadamente.');
        return downloadEach(ad, creatives);
      }
      zip.file(nameFor(ad, i) + '.' + ext(creatives[i]), res.data.base64, { base64: true });
    }
    if (withInfo) {
      zip.file('info.txt', ALC.buildInfoText(ad));
      zip.file('dados.json', JSON.stringify(ad, null, 2));
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const dataUrl = await blobToDataUrl(blob);
    t.dismiss();
    const filename = folder(ad) + slug(ad.advertiserName) + '_' + ad.libraryId + '.zip';
    const res = await ALC.send(ALC.MSG.DOWNLOAD_DATA, { dataUrl, filename });
    if (!res.ok) throw new Error(res.error);
    ALC.toast.success(ALC.t('downloadDone', { n: creatives.length + (withInfo ? 2 : 0) }));
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('não foi possível ler o zip'));
      fr.readAsDataURL(blob);
    });
  }

  async function downloadEach(ad, creatives) {
    const t = ALC.toast.loading(ALC.t('downloading', { i: 1, n: creatives.length }), { progress: 0 });
    let done = 0;
    for (let i = 0; i < creatives.length; i++) {
      t.update(ALC.t('downloading', { i: i + 1, n: creatives.length }),
        null, { progress: i / creatives.length });
      try { await downloadOne(ad, creatives[i], i); done++; } catch (_) {}
    }
    t.dismiss();
    if (done) ALC.toast.success(ALC.t('downloadDone', { n: done }));
    else ALC.toast.error(ALC.t('downloadFail', { msg: 'nenhum arquivo pôde ser baixado' }));
  }

  return {
    items(ad) {
      const n = (ad.creatives || []).length;
      return [
        { id: 'main', label: ALC.t('saveMain'), icon: 'download', disabled: n === 0,
          title: n ? '' : 'Nenhum criativo detectado neste card.' },
        { id: 'all', label: ALC.t('saveAll'), icon: 'download', disabled: n < 2,
          title: n < 2 ? 'Este anúncio tem um criativo só — use a opção acima.' : '' },
        { id: 'info', label: ALC.t('saveInfo'), icon: 'file-text' },
        { id: 'both', label: ALC.t('saveBoth'), icon: 'clipboard-check', disabled: n === 0 }
      ];
    },
    async run(ad, id) {
      ALC.collect(ad);
      try {
        const cs = ad.creatives || [];
        if (id === 'main') {
          await downloadOne(ad, cs[0], 0);
          ALC.toast.success(ALC.t('downloadDone', { n: 1 }));
        } else if (id === 'all') {
          if (cs.length > 1 && ALC.settings.zipWhenMultiple) await downloadZip(ad, cs, false);
          else await downloadEach(ad, cs);
        } else if (id === 'info') {
          await downloadInfo(ad);
          ALC.toast.success('Informações salvas (.txt e .json).');
        } else if (id === 'both') {
          await downloadZip(ad, cs, true);
        }
      } catch (e) {
        ALC.toast.error(ALC.t('downloadFail', { msg: e.message || e }));
      }
    }
  };
})();
