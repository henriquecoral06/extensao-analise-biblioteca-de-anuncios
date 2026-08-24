/* ============================================================================
   Wrapper Promise em cima de chrome.storage, com defaults aplicados.
   Regra: chave de API só em `local` (nunca sai do dispositivo); preferências
   e presets em `sync`.
   ========================================================================== */
window.ALC = window.ALC || {};

const area = (a) => (a === 'sync' ? chrome.storage.sync : chrome.storage.local);

ALC.store = {
  async get(key, fallback, a = 'local') {
    try {
      const r = await area(a).get(key);
      return r && r[key] !== undefined ? r[key] : fallback;
    } catch (_) {
      return fallback;
    }
  },
  async set(key, value, a = 'local') {
    try { await area(a).set({ [key]: value }); } catch (_) { /* cota/contexto morto */ }
  },
  async remove(key, a = 'local') {
    try { await area(a).remove(key); } catch (_) {}
  },
  async settings() {
    const s = await this.get(ALC.K.SETTINGS, {}, 'sync');
    return Object.assign({}, ALC.DEFAULT_SETTINGS, s || {});
  },
  async saveSettings(patch) {
    const cur = await this.settings();
    const next = Object.assign({}, cur, patch);
    await this.set(ALC.K.SETTINGS, next, 'sync');
    return next;
  },
  async presets() {
    const p = await this.get(ALC.K.PRESETS, null, 'sync');
    return Array.isArray(p) && p.length ? p : ALC.DEFAULT_PRESETS.slice();
  },
  onChange(cb) {
    try {
      chrome.storage.onChanged.addListener((changes, areaName) => cb(changes, areaName));
    } catch (_) {}
  }
};
