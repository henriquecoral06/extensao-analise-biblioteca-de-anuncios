/* ============================================================================
   Service worker (MV3, módulo ES).
   Faz o que o content script não pode: buscar mídia do fbcdn (CORS), gravar
   downloads e falar com o Gemini.
   O worker MORRE a qualquer momento — nada de estado em variável de módulo:
   tudo que precisa sobreviver mora em chrome.storage.
   ========================================================================== */

const K = {
  SETTINGS: 'alc_settings',
  API_KEY: 'alc_api_key'
};

const GEMINI_PADRAO = 'gemini-3.6-flash';

const DEFAULTS = {
  transcribeModel: '',
  downloadFolder: 'Biblioteca Extrema'
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
  return String(p || 'Biblioteca Extrema/arquivo')
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^\//, '');
}

/* 'uniquify' é o certo para criativo (baixar duas vezes = ter duas cópias),
   mas errado para a referência: regerar o mesmo anúncio criaria "(1)" ao lado
   dos originais e a pessoa anexaria os dois jogos no chat. */
function download(url, filename, conflictAction) {
  return new Promise((resolve) => {
    try {
      chrome.downloads.download(
        { url, filename: safePath(filename), conflictAction: conflictAction || 'uniquify' },
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
  if (status >= 500) return 'O Gemini está instável no momento.';
  return 'O Gemini recusou a requisição (HTTP ' + status + ').';
}

/* Transcrição da fala do criativo — Gemini e só. O Flash aceita áudio no nível
   gratuito da Google, então exigir OpenAI aqui só criava um pedágio para quem
   quer a fala do criativo dentro do prompt. */
async function transcribe({ base64, mime }) {
  const s = await settings();
  const keyRes = await chrome.storage.local.get(K.API_KEY);
  const key = keyRes[K.API_KEY];
  if (!key) return { ok: false, error: 'Nenhuma chave do Gemini configurada. Gere em aistudio.google.com/apikey.' };

  try {
    /* Nome de modelo do Gemini envelhece rápido. Quando ele responde 404, a própria
       mensagem indica o substituto — vale uma segunda tentativa com o que ela diz,
       em vez de devolver o erro e deixar o usuário caçando o nome novo. */
    const pedir = async (modelo) => {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' +
        encodeURIComponent(modelo) + ':generateContent?key=' + encodeURIComponent(key), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Transcreva a fala deste áudio literalmente, em português, sem comentar, ' +
                        'sem resumir e sem marcar tempo. Só o texto falado.' },
                { inline_data: { mime_type: mime || 'audio/wav', data: base64 } }
              ]
            }]
          })
        });
      return { res, json: await res.json() };
    };

    let modelo = s.transcribeModel || GEMINI_PADRAO;
    let { res, json } = await pedir(modelo);
    if (!res.ok && res.status === 404) {
      const sugerido = (JSON.stringify(json).match(/models\/([a-zA-Z0-9.\-]+)/g) || [])
        .map((m) => m.replace('models/', ''))
        .find((m) => m !== modelo);
      if (sugerido) ({ res, json } = await pedir(sugerido));
    }
    if (!res.ok) return { ok: false, error: recorta(JSON.stringify(json)) };
    const texto = ((((json.candidates || [])[0] || {}).content || {}).parts || [])
      .map((p) => p.text || '').join('').trim();
    return texto ? { ok: true, data: texto } : { ok: false, error: 'O Gemini devolveu áudio sem fala.' };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

const recorta = (t) => String(t || '').slice(0, 220);

/* Teste de chave: uma chamada barata que só confirma se a credencial vale. */
async function testKey() {
  const keyRes = await chrome.storage.local.get(K.API_KEY);
  const key = keyRes[K.API_KEY];
  if (!key) return { ok: false, error: 'Nenhuma chave do Gemini configurada. Gere em aistudio.google.com/apikey.' };
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' +
      encodeURIComponent(key));
    if (res.ok) return { ok: true, data: 'chave válida' };
    return { ok: false, error: recorta(await res.text()) };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

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

  async DOWNLOAD_DATA({ dataUrl, filename, overwrite }) {
    return download(dataUrl, filename, overwrite ? 'overwrite' : 'uniquify');
  },

  async DOWNLOAD_TEXT({ filename, content, mime, overwrite }) {
    return download(textToDataUrl(content, mime), filename, overwrite ? 'overwrite' : 'uniquify');
  },

  async TEST_KEY() {
    return testKey();
  },

  async TRANSCRIBE(payload) {
    return transcribe(payload || {});
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
