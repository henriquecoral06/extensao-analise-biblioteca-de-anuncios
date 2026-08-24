/* ============================================================================
   Menu CRIAR — usar um anúncio como referência criativa.

   A extensão lê o criativo (frames do vídeo ou as imagens), grava os arquivos
   numa pasta e copia um prompt que já pede esses arquivos como anexo. Quem
   escreve é o chat que o usuário já usa: sem chave, sem chamada de API, sem
   custo — e sem depender do texto do anúncio, que não descreve o criativo.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.actionsAI = (function () {
  const { el, icon } = ALC.dom;

  /* Vídeo fala em frames, imagem fala em imagens — e uma imagem só não é "1 imagens". */
  function chave(base, pacote, n) {
    if (pacote.kind === 'video') return base;
    return base + 'Img' + (n === 1 ? '1' : '');
  }

  function resultModal(ad, prompt, pacote, arquivos, temTranscricao) {
    const pre = el('pre.alc-prompt-preview', { text: prompt });
    const pasta = ALC.reference.prefixo(ad);

    const btnCopy = el('button.alc-btn.alc-btn-secondary', { type: 'button' }, [
      icon('copy', 14), el('span', { text: ALC.t('refCopyPrompt') })
    ]);
    btnCopy.addEventListener('click', async () => {
      const ok = await ALC.dom.copyText(prompt);
      ALC.toast[ok ? 'success' : 'error'](ok ? ALC.t('refCopied') : 'Não foi possível copiar.');
    });

    /* Um arquivo que o chat abre sozinho: nenhum deles descompacta .zip, e
       mosaico de frames perde a legenda na redução. PDF, uma página por frame. */
    const btnPdf = el('button.alc-btn.alc-shiny', { type: 'button' }, [
      el('span.alc-dots', { 'aria-hidden': 'true' }),
      el('span.alc-btn-content', null, [
        icon('file-text', 14), el('span', {
          text: ALC.t(chave('refDownloadPdf', pacote, arquivos.length), { n: arquivos.length })
        })
      ])
    ]);
    btnPdf.addEventListener('click', async () => {
      btnPdf.disabled = true;
      const tp = ALC.toast.loading(ALC.t('refBuildingPdf'));
      try {
        const r = await ALC.reference.baixarPdf(ad, pacote);
        tp.dismiss();
        ALC.toast.success(ALC.t('refPdfDone', {
          file: r.filename.split('/').pop(), n: r.paginas
        }));
      } catch (e) {
        tp.dismiss();
        ALC.toast.error(ALC.t('refFail', { msg: (e && e.message) ? e.message : String(e) }));
      } finally {
        btnPdf.disabled = false;
      }
    });

    /* Baixar é decisão de quem está olhando o prompt: nada vai para o disco
       antes deste clique. */
    const btnZip = el('button.alc-btn.alc-btn-secondary', { type: 'button' }, [
      icon('download', 14), el('span', { text: ALC.t('refDownloadZip', { n: arquivos.length }) })
    ]);
    btnZip.addEventListener('click', async () => {
      btnZip.disabled = true;
      const t = ALC.toast.loading(ALC.t('refZipping'));
      try {
        const r = await ALC.reference.baixarZip(ad, pacote, prompt);
        t.dismiss();
        ALC.toast.success(ALC.t(r.zipped ? 'refZipDone' : 'refFilesDone', {
          n: arquivos.length, file: r.filename.split('/').pop()
        }));
      } catch (e) {
        t.dismiss();
        ALC.toast.error(ALC.t('refFail', { msg: (e && e.message) ? e.message : String(e) }));
      } finally {
        btnZip.disabled = false;
      }
    });

    const passos = el('ol.alc-steps', null, [
      el('li', { text: ALC.t(chave('refStep1', pacote, arquivos.length), { n: arquivos.length }) }),
      el('li', { text: ALC.t(temTranscricao ? 'refStep2Transcript' : 'refStep2') }),
      el('li', { text: ALC.t('refStep3') }),
      el('li', { text: ALC.t('refStep4') })
    ]);

    ALC.modal.open({
      eyebrow: ad.advertiserName + ' · ' + (ad.daysRunning || '?') + ' dias no ar',
      title: ALC.t('refReady'),
      subtitle: ALC.t(pacote.kind === 'video' ? 'refSubtitleVideo' : 'refSubtitleImage',
        { n: arquivos.length, folder: pasta }),
      body: el('div', null, [passos, pre]),
      actions: [btnZip, btnCopy, btnPdf]
    });
  }

  async function run(ad, id) {
    if (id === 'editBusiness') { ALC.send(ALC.MSG.OPEN_OPTIONS, { tab: 'negocio' }); return; }
    if (id !== 'reference') return;

    const biz = await ALC.store.get(ALC.K.BUSINESS, {}, 'sync');
    if (ALC.missingBusinessFields(biz).length) {
      ALC.toast.warn(ALC.t('refFillBusiness'), { duration: 5000 });
      ALC.send(ALC.MSG.OPEN_OPTIONS, { tab: 'negocio' });
      return;
    }

    ALC.collect(ad);
    const n = ALC.settings.referenceFrames || 8;
    const t = ALC.toast.loading(ALC.t('refReading', { i: 0, n: n }), { progress: 0 });
    let falhaTranscricao = '';
    try {
      /* Os frames ficam em memória; o disco só é tocado se a pessoa clicar em baixar. */
      const pacote = await ALC.reference.capture(ad, n, (i, total) => {
        t.update(ALC.t('refReading', { i: i, n: total }), null, { progress: i / total });
      });
      const arquivos = ALC.reference.nomes(pacote);

      /* A fala é o roteiro do criativo: transcrita, ela entra no próprio prompt e
         passa a funcionar em qualquer chat — inclusive nos que não aceitam áudio. */
      let transcript = '';
      if (pacote.audio) {
        t.update(ALC.t('refTranscribing'), null, { progress: 0.97 });
        const b64 = await ALC.reference.audioBase64(pacote);
        const res = await ALC.send(ALC.MSG.TRANSCRIBE, { base64: b64, mime: 'audio/wav' });
        if (res.ok && res.data) transcript = String(res.data).trim();
        else falhaTranscricao = res.error || '';
      }

      const prompt = ALC.buildReferencePrompt(ad, biz, {
        kind: pacote.kind, durationSec: pacote.durationSec, files: arquivos, transcript,
        aspect: ALC.reference.proporcao(pacote)
      });
      await ALC.dom.copyText(prompt);
      t.dismiss();
      if (falhaTranscricao) {
        ALC.toast.warn(ALC.t('refNoTranscript', { msg: falhaTranscricao }), { duration: 6000 });
      }
      resultModal(ad, prompt, pacote, arquivos, !!transcript);
    } catch (e) {
      t.dismiss();
      ALC.toast.error(ALC.t('refFail', { msg: (e && e.message) ? e.message : String(e) }));
    }
  }

  return {
    items(ad) {
      const cs = ad.creatives || [];
      const temVideo = cs.some((c) => c.type === 'video' && !/^blob:/.test(c.url) && !c.note);
      const temImagem = cs.some((c) => c.type === 'image');
      return [
        {
          id: 'reference',
          label: ALC.t(temVideo ? 'refVideo' : 'refImage'),
          icon: temVideo ? 'video' : 'image',
          disabled: !temVideo && !temImagem,
          title: ALC.t((temVideo || temImagem) ? 'refHint' : 'refNoCreative')
        },
        { separator: true },
        { id: 'editBusiness', label: ALC.t('refEditBusiness'), icon: 'settings' }
      ];
    },
    run
  };
})();
