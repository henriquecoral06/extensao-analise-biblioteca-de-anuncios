/* ============================================================================
   Contrato de mensagens content <-> service worker.
   Toda resposta é { ok: boolean, data?, error? } — quem chama nunca precisa
   adivinhar o formato.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.MSG = {
  FETCH_MEDIA: 'FETCH_MEDIA',     // bytes de uma mídia, em base64, para zipar
  DOWNLOAD_URL: 'DOWNLOAD_URL',   // baixa direto do fbcdn (sem passar bytes)
  DOWNLOAD_DATA: 'DOWNLOAD_DATA', // baixa um data: URL já montado (zip)
  DOWNLOAD_TEXT: 'DOWNLOAD_TEXT', // gera .txt/.json e baixa
  TEST_KEY: 'TEST_KEY',       // confere se a chave do Gemini é válida
  TRANSCRIBE: 'TRANSCRIBE',   // áudio do criativo -> texto, pelo Gemini
  OPEN_OPTIONS: 'OPEN_OPTIONS',
  PING: 'PING'
};

ALC.send = function (type, payload) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type, payload }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(res || { ok: false, error: 'Sem resposta do service worker.' });
      });
    } catch (e) {
      resolve({ ok: false, error: String(e && e.message ? e.message : e) });
    }
  });
};
