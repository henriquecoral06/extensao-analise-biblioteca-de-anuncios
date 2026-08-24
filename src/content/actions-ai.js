/* ============================================================================
   Menu CRIAR — análise com IA.
   Sem chave configurada a extensão continua útil: monta o prompt, copia e
   abre o chat escolhido. Com chave, chama o provedor pelo service worker e
   devolve o resultado renderizado num modal.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.actionsAI = (function () {
  const { el, icon } = ALC.dom;

  function resultModal(ad, def, prompt, markdown) {
    const body = ALC.modal.renderMarkdown(markdown);

    const btnCopy = el('button.alc-btn.alc-btn-secondary', { type: 'button' }, [
      icon('copy', 14), el('span', { text: ALC.t('copy') })
    ]);
    btnCopy.addEventListener('click', async () => {
      const ok = await ALC.dom.copyText(markdown);
      ALC.toast[ok ? 'success' : 'error'](ok ? 'Análise copiada.' : 'Não foi possível copiar.');
    });

    const btnMd = el('button.alc-btn.alc-btn-secondary', { type: 'button' }, [
      icon('download', 14), el('span', { text: ALC.t('downloadMd') })
    ]);
    btnMd.addEventListener('click', () => {
      const name = (ALC.settings.downloadFolder || 'AdLib Copilot') + '/' +
        ALC.dom.slug(ad.advertiserName) + '/' +
        ALC.dom.slug(ad.advertiserName) + '_' + ad.libraryId + '_' + def.id + '.md';
      ALC.send(ALC.MSG.DOWNLOAD_TEXT, { filename: name, content: markdown, mime: 'text/markdown' });
    });

    const btnRedo = el('button.alc-btn.alc-shiny', { type: 'button' }, [
      el('span.alc-dots', { 'aria-hidden': 'true' }),
      el('span.alc-btn-content', null, [icon('refresh', 14), el('span', { text: ALC.t('retry') })])
    ]);
    btnRedo.addEventListener('click', () => { ALC.modal.close(); run(ad, def.id); });

    ALC.modal.open({
      eyebrow: ad.advertiserName + ' · ' + (ad.daysRunning || '?') + ' dias no ar',
      title: ALC.t(def.label),
      body,
      actions: [btnCopy, btnMd, btnRedo]
    });
  }

  /** Plano B de qualquer erro: copiar o prompt e abrir o chat. */
  async function fallbackToChat(prompt, reason) {
    const ok = await ALC.dom.copyText(prompt);
    const chat = ALC.CHAT_URLS[ALC.settings.aiFallbackChat] || ALC.CHAT_URLS.claude;
    if (ok) ALC.toast.info(ALC.t('promptCopied'), { detail: reason || '' });
    window.open(chat, '_blank', 'noopener');
  }

  async function run(ad, id) {
    const def = ALC.PROMPT_DEFS.find((p) => p.id === id);
    if (!def) return;
    ALC.collect(ad);
    const overrides = await ALC.store.get(ALC.K.PROMPTS, {}, 'sync');
    const prompt = ALC.buildPrompt(ad, id, overrides);
    const key = await ALC.store.get(ALC.K.API_KEY, '', 'local');

    if (!key) { await fallbackToChat(prompt); return; }

    const t = ALC.toast.loading(ALC.t('analyzing'));
    const res = await ALC.send(ALC.MSG.AI_COMPLETE, { prompt, system: ALC.SYSTEM_PROMPT });
    t.dismiss();
    if (res.ok && res.data) { resultModal(ad, def, prompt, res.data); return; }

    ALC.toast.error(res.error || 'Falha na chamada de IA.');
    await fallbackToChat(prompt, 'Usando o plano B: prompt na área de transferência.');
  }

  return {
    items() {
      return ALC.PROMPT_DEFS.map((p) => ({ id: p.id, label: ALC.t(p.label), icon: p.icon }));
    },
    run
  };
})();
