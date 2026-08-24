/* ============================================================================
   Service worker (MV3, módulo ES).
   Faz o que o content script não pode: buscar mídia do fbcdn (CORS), gravar
   downloads e falar com o provedor de IA.
   O worker MORRE a qualquer momento — nada de estado em variável de módulo:
   tudo que precisa sobreviver mora em chrome.storage.
   ========================================================================== */

const K = {
  SETTINGS: 'alc_settings',
  API_KEY: 'alc_api_key'
};

const DEFAULTS = {
  aiProvider: 'anthropic',
  aiModel: '',
  downloadFolder: 'AdLib Copilot'
};

const MODEL_DEFAULTS = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4.1-mini',
  google: 'gemini-2.0-flash'
};

/* --- utilidades ----------------------------------------------------------- */

async function settings() {
  const r = await chrome.storage.sync.get(K.SETTINGS);
  return Object.assign({}, DEFAULTS, (r && r[K.SETTINGS]) || {});
}

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(bin);
}

function textToDataUrl(text, mime) {
  const utf8 = new TextEncoder().encode(text);
  return 'data:' + (mime || 'text/plain') + ';charset=utf-8;base64,' + bytesToBase64(utf8.buffer);
}

/** Sanitiza o caminho: o Chrome recusa nomes com ".." ou caracteres proibidos. */
function safePath(p) {
  return String(p || 'AdLib Copilot/arquivo')
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^\//, '');
}

function download(url, filename) {
  return new Promise((resolve) => {
    try {
      chrome.downloads.download(
        { url, filename: safePath(filename), conflictAction: 'uniquify' },
        (id) => {
          if (chrome.runtime.lastError || id === undefined) {
            resolve({
              ok: false,
              error: (chrome.runtime.lastError || {}).message || 'download recusado'
            });
          } else {
            resolve({ ok: true, data: { id } });
          }
        }
      );
    } catch (e) {
      resolve({ ok: false, error: String(e.message || e) });
    }
  });
}

/** Busca com timeout de 30 s e uma segunda tentativa. */
async function fetchWithRetry(url, tries = 2, timeoutMs = 30000) {
  let lastErr = 'falha desconhecida';
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit' });
      clearTimeout(timer);
      if (!res.ok) { lastErr = 'HTTP ' + res.status; continue; }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e.name === 'AbortError' ? 'tempo esgotado' : String(e.message || e);
    }
  }
  throw new Error(lastErr);
}

/* --- IA -------------------------------------------------------------------- */

function humanError(status) {
  if (status === 401 || status === 403) return 'Chave inválida. Confira nas Opções.';
  if (status === 429) return 'Limite de requisições atingido, tente em alguns segundos.';
  if (status >= 500) return 'O provedor de IA está instável no momento.';
  return 'O provedor recusou a requisição (HTTP ' + status + ').';
}

async function aiComplete({ prompt, system }) {
  const s = await settings();
  const keyRes = await chrome.storage.local.get(K.API_KEY);
  const key = keyRes[K.API_KEY];
  if (!key) return { ok: false, error: 'Nenhuma chave de API configurada.' };

  const provider = s.aiProvider || 'anthropic';
  const model = s.aiModel || MODEL_DEFAULTS[provider];
  let url, init;

  if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    init = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        temperature: 0.7,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    };
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    init = {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ]
      })
    };
  } else {
    url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key);
    init = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
      })
    };
  }

  try {
    const res = await fetch(url, init);
    if (!res.ok) return { ok: false, error: humanError(res.status) };
    const j = await res.json();
    let text = '';
    if (provider === 'anthropic') {
      text = (j.content || []).map((b) => b.text || '').join('\n').trim();
    } else if (provider === 'openai') {
      const choice = (j.choices || [])[0] || {};
      text = ((choice.message || {}).content || '').trim();
    } else {
      const cand = (j.candidates || [])[0] || {};
      text = (((cand.content || {}).parts) || []).map((p) => p.text || '').join('\n').trim();
    }
    if (!text) return { ok: false, error: 'O provedor devolveu uma resposta vazia.' };
    return { ok: true, data: text };
  } catch (e) {
    return { ok: false, error: 'Sem conexão com o provedor de IA.' };
  }
}

/* --- roteador de mensagens -------------------------------------------------- */

const HANDLERS = {
  async PING() {
    return { ok: true, data: { version: chrome.runtime.getManifest().version } };
  },

  async FETCH_MEDIA({ url }) {
    try {
      const res = await fetchWithRetry(url);
      const buf = await res.arrayBuffer();
      return {
        ok: true,
        data: {
          base64: bytesToBase64(buf),
          size: buf.byteLength,
          mime: res.headers.get('content-type') || ''
        }
      };
    } catch (e) {
      return { ok: false, error: String(e.message || e) };
    }
  },

  async DOWNLOAD_URL({ url, filename }) {
    return download(url, filename);
  },

  async DOWNLOAD_DATA({ dataUrl, filename }) {
    return download(dataUrl, filename);
  },

  async DOWNLOAD_TEXT({ filename, content, mime }) {
    return download(textToDataUrl(content, mime), filename);
  },

  async AI_COMPLETE(payload) {
    return aiComplete(payload || {});
  },

  async OPEN_OPTIONS(payload) {
    const base = chrome.runtime.getURL('src/options/options.html');
    const url = payload && payload.tab ? base + '#' + payload.tab : base;
    await chrome.tabs.create({ url });
    return { ok: true };
  }
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = msg && HANDLERS[msg.type];
  if (!handler) {
    sendResponse({ ok: false, error: 'Mensagem desconhecida: ' + (msg && msg.type) });
    return false;
  }
  handler(msg.payload || {})
    .then((r) => sendResponse(r))
    .catch((e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
  return true; // resposta assíncrona
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === 'install') chrome.runtime.openOptionsPage();
});
