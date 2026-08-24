/* ============================================================================
   Página de Opções. Salvamento automático com debounce de 400 ms e um
   "Salvo ✓" discreto — nenhum botão de salvar.
   ========================================================================== */
(function () {
  const { el, debounce } = ALC.dom;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  let settings = Object.assign({}, ALC.DEFAULT_SETTINGS);

  const flashSaved = (() => {
    let t;
    return () => {
      const n = $('#saved');
      n.textContent = 'Salvo ✓';
      n.classList.add('is-on');
      clearTimeout(t);
      t = setTimeout(() => n.classList.remove('is-on'), 1600);
    };
  })();

  const persist = debounce(async (patch) => {
    settings = await ALC.store.saveSettings(patch);
    flashSaved();
  }, 400);

  /* --- abas ---------------------------------------------------------------- */
  function selectTab(tab) {
    $$('.side-item').forEach((b) => b.classList.toggle('is-on', b.dataset.tab === tab));
    $$('.tab').forEach((s) => s.classList.toggle('is-on', s.dataset.tab === tab));
    if (location.hash.slice(1) !== tab) history.replaceState(null, '', '#' + tab);
  }
  $$('.side-item').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));

  /* --- tema ----------------------------------------------------------------- */
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  function paintTheme() {
    const pref = settings.theme || 'auto';
    const real = pref === 'auto' ? (mq.matches ? 'dark' : 'light') : pref;
    document.documentElement.setAttribute('data-alc-theme', real);
    $('#theme-icon').className = 'alc-i alc-i-' + (real === 'dark' ? 'moon' : 'sun');
    $('#theme-label').textContent = { auto: 'Automático', light: 'Claro', dark: 'Escuro' }[pref];
    $$('#s-theme button').forEach((b) =>
      b.setAttribute('aria-selected', String(b.dataset.theme === pref)));
  }
  mq.addEventListener('change', paintTheme);
  $('#theme-toggle').addEventListener('click', () => {
    const order = ['auto', 'light', 'dark'];
    settings.theme = order[(order.indexOf(settings.theme || 'auto') + 1) % 3];
    paintTheme();
    persist({ theme: settings.theme });
  });
  $$('#s-theme button').forEach((b) => b.addEventListener('click', () => {
    settings.theme = b.dataset.theme;
    paintTheme();
    persist({ theme: settings.theme });
  }));

  /* --- campos ligados por data-setting -------------------------------------- */
  function bindFields() {
    $$('[data-setting]').forEach((node) => {
      const key = node.dataset.setting;
      const isCheck = node.type === 'checkbox';
      if (isCheck) node.checked = !!settings[key];
      else node.value = settings[key] == null ? '' : settings[key];
      node.addEventListener(isCheck || node.tagName === 'SELECT' ? 'change' : 'input', () => {
        const v = isCheck ? node.checked : node.value;
        settings[key] = v;
        persist({ [key]: v });
        if (key === 'aiProvider') paintModelHints();
      });
    });
  }

  /* --- IA -------------------------------------------------------------------- */
  function paintModelHints() {
    const list = $('#model-list');
    list.replaceChildren();
    const suggestions = {
      anthropic: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'],
      openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
      google: ['gemini-2.0-flash', 'gemini-2.5-pro']
    }[settings.aiProvider || 'anthropic'] || [];
    suggestions.forEach((s) => list.appendChild(el('option', { value: s })));
    $('#s-model').placeholder = ALC.MODEL_DEFAULTS[settings.aiProvider || 'anthropic'];
  }

  async function initKey() {
    const key = await ALC.store.get(ALC.K.API_KEY, '', 'local');
    $('#s-key').value = key;
    $('#s-key').addEventListener('input', debounce(async () => {
      await ALC.store.set(ALC.K.API_KEY, $('#s-key').value.trim(), 'local');
      flashSaved();
    }, 400));
    $('#key-eye').addEventListener('click', () => {
      const f = $('#s-key');
      const showing = f.type === 'text';
      f.type = showing ? 'password' : 'text';
      $('#key-eye').firstChild.className = 'alc-i alc-i-' + (showing ? 'eye' : 'eye-off');
      $('#key-eye').setAttribute('aria-label', showing ? 'Mostrar a chave' : 'Ocultar a chave');
    });
    $$('#s-chat button').forEach((b) => {
      b.setAttribute('aria-selected', String(b.dataset.chat === settings.aiFallbackChat));
      b.addEventListener('click', () => {
        $$('#s-chat button').forEach((o) => o.setAttribute('aria-selected', String(o === b)));
        settings.aiFallbackChat = b.dataset.chat;
        persist({ aiFallbackChat: b.dataset.chat });
      });
    });
  }

  $('#test-conn').addEventListener('click', async () => {
    const out = $('#test-out');
    out.textContent = 'Testando…';
    const res = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'AI_COMPLETE', payload: { prompt: 'Responda apenas OK.', system: 'Responda apenas OK.' } },
        (r) => resolve(r || { ok: false, error: 'sem resposta do service worker' })
      );
    });
    out.textContent = res.ok ? 'Conexão ok — o modelo respondeu.' : 'Falhou: ' + res.error;
    out.style.color = res.ok ? 'var(--alc-emerald-deep)' : 'var(--alc-danger-deep)';
  });

  /* --- nichos ---------------------------------------------------------------- */
  let niches = [];
  let dragIdx = null;

  function saveNiches() {
    ALC.store.set(ALC.K.PRESETS, niches, 'sync').then(flashSaved);
  }

  function renderNiches() {
    const host = $('#niche-list');
    host.replaceChildren();
    niches.forEach((n, i) => {
      const row = el('div.niche-row', { draggable: 'true', 'data-i': i });
      const grab = el('span.grab', { 'aria-hidden': 'true' }, [ALC.dom.icon('grip', 14)]);
      const label = el('input.alc-input', { value: n.label, 'aria-label': 'Rótulo' });
      const query = el('input.alc-input', { value: n.query, 'aria-label': 'Busca' });
      label.addEventListener('input', () => { niches[i].label = label.value; saveNiches(); });
      query.addEventListener('input', () => { niches[i].query = query.value; saveNiches(); });
      const del = el('button.alc-icon-btn', {
        type: 'button', 'aria-label': 'Remover ' + n.label,
        onclick: () => { niches.splice(i, 1); saveNiches(); renderNiches(); }
      }, [ALC.dom.icon('trash', 14)]);
      row.append(grab, label, query, del);

      row.addEventListener('dragstart', () => { dragIdx = i; row.classList.add('is-drag'); });
      row.addEventListener('dragend', () => { dragIdx = null; row.classList.remove('is-drag'); });
      row.addEventListener('dragover', (e) => e.preventDefault());
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === i) return;
        const [moved] = niches.splice(dragIdx, 1);
        niches.splice(i, 0, moved);
        saveNiches();
        renderNiches();
      });
      host.appendChild(row);
    });
  }

  $('#niche-add').addEventListener('click', () => {
    niches.push({ label: 'Novo nicho', query: '' });
    saveNiches();
    renderNiches();
  });
  $('#niche-reset').addEventListener('click', () => {
    niches = ALC.DEFAULT_PRESETS.slice();
    saveNiches();
    renderNiches();
  });

  /* --- prompts ---------------------------------------------------------------- */
  async function renderPrompts() {
    const overrides = await ALC.store.get(ALC.K.PROMPTS, {}, 'sync');
    const host = $('#prompt-list');
    host.replaceChildren();
    ALC.PROMPT_DEFS.forEach((p) => {
      const ta = el('textarea.alc-textarea', { rows: '5' });
      ta.value = overrides[p.id] || p.text;
      const restore = el('button.alc-btn.alc-btn-sm.alc-btn-ghost', {
        type: 'button', text: 'Restaurar original'
      });
      const save = debounce(async () => {
        const cur = await ALC.store.get(ALC.K.PROMPTS, {}, 'sync');
        cur[p.id] = ta.value;
        await ALC.store.set(ALC.K.PROMPTS, cur, 'sync');
        flashSaved();
      }, 400);
      ta.addEventListener('input', save);
      restore.addEventListener('click', async () => {
        ta.value = p.text;
        const cur = await ALC.store.get(ALC.K.PROMPTS, {}, 'sync');
        delete cur[p.id];
        await ALC.store.set(ALC.K.PROMPTS, cur, 'sync');
        flashSaved();
      });
      host.appendChild(el('div.alc-card.prompt-card', null, [
        el('div.prompt-head', null, [
          ALC.dom.icon(p.icon, 16),
          el('h3.alc-h-sm', { text: PT_LABEL[p.label] || p.id }),
          restore
        ]),
        ta
      ]));
    });
  }

  const PT_LABEL = {
    aiKeywords: 'Palavras-chave', aiAudience: 'Segmentação de público',
    aiPersuasion: 'Análise de persuasão', aiVariations: 'Variações para teste A/B',
    aiOffer: 'Estrutura de oferta', aiAvatar: 'Avatar do cliente',
    aiAngles: 'Ângulos de criativos', aiQuiz: 'Funil de quiz'
  };

  /* --- dados ------------------------------------------------------------------ */
  $('#d-export').addEventListener('click', async () => {
    const dump = {
      settings: await ALC.store.settings(),
      presets: await ALC.store.presets(),
      prompts: await ALC.store.get(ALC.K.PROMPTS, {}, 'sync')
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'adlib-copilot-config.json' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    $('#d-out').textContent = 'Configurações exportadas (a chave de API fica de fora, de propósito).';
  });

  $('#d-import').addEventListener('click', () => $('#d-file').click());
  $('#d-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.settings) await ALC.store.set(ALC.K.SETTINGS, data.settings, 'sync');
      if (data.presets) await ALC.store.set(ALC.K.PRESETS, data.presets, 'sync');
      if (data.prompts) await ALC.store.set(ALC.K.PROMPTS, data.prompts, 'sync');
      $('#d-out').textContent = 'Importado. Recarregando…';
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      $('#d-out').textContent = 'Arquivo inválido: ' + err.message;
    }
  });

  $('#d-clear').addEventListener('click', async () => {
    await ALC.store.set(ALC.K.COLLECTED, [], 'local');
    $('#d-out').textContent = 'Lista de coletados limpa.';
  });

  $('#d-reset').addEventListener('click', async () => {
    if (!confirm('Isso apaga configurações, nichos, prompts e a chave de API. Continuar?')) return;
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    location.reload();
  });

  /* --- start ------------------------------------------------------------------ */
  (async function init() {
    settings = await ALC.store.settings();
    niches = await ALC.store.presets();
    bindFields();
    paintTheme();
    paintModelHints();
    await initKey();
    renderNiches();
    await renderPrompts();
    const tab = location.hash.slice(1);
    if (tab && document.querySelector('.tab[data-tab="' + tab + '"]')) selectTab(tab);
  })();
})();
