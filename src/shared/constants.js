/* ============================================================================
   Constantes: chaves de storage, limiares, presets e padrões de texto.
   Tudo que pode quebrar quando o Facebook mexer no DOM mora aqui ou no
   scraper.js — são os dois únicos arquivos que precisam de manutenção.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.K = {
  // chrome.storage.sync — acompanha o usuário
  SETTINGS: 'alc_settings',
  PRESETS: 'alc_niche_presets',
  PROMPTS: 'alc_prompts',
  // chrome.storage.local — só neste dispositivo
  API_KEY: 'alc_api_key',
  UI: 'alc_ui_state',
  FILTERS: 'alc_filters',
  COLLECTED: 'alc_collected'
};

/* Escala de leitura de mercado: quanto tempo o anúncio está no ar.
   Cada faixa vira um par soft/deep do design system, nunca um hex solto. */
ALC.DAY_SCALE = [
  { max: 2, tone: 'neutral', hint: 'teste novo' },
  { max: 6, tone: 'info', hint: 'em validação' },
  { max: 20, tone: 'emerald', hint: 'validado' },
  { max: Infinity, tone: 'warning', hint: 'campeão' }
];

ALC.toneForDays = function (days) {
  const d = Number(days) || 0;
  return (ALC.DAY_SCALE.find((f) => d <= f.max) || ALC.DAY_SCALE[0]);
};

ALC.DEFAULT_SETTINGS = {
  theme: 'auto',              // auto | light | dark
  lang: 'auto',               // auto | pt-BR | en | es
  country: 'BR',
  showDaysBadge: true,
  highlightScaling: true,
  autoExpandSeeMore: true,
  downloadFolder: 'AdLib Copilot',
  filenamePattern: '{anunciante}_{libraryId}_{indice}',
  zipWhenMultiple: true,
  includeInfoTxt: true,
  aiProvider: 'anthropic',    // anthropic | openai | google
  aiModel: '',
  aiFallbackChat: 'claude'    // claude | chatgpt | gemini
};

ALC.MODEL_DEFAULTS = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4.1-mini',
  google: 'gemini-2.0-flash'
};

ALC.CHAT_URLS = {
  claude: 'https://claude.ai/new',
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app'
};

/* Presets de nicho de fábrica (o usuário edita nas Opções). */
ALC.DEFAULT_PRESETS = [
  { label: 'Emagrecimento', query: 'emagrecimento' },
  { label: 'Diabetes', query: 'diabetes' },
  { label: 'Impotência', query: 'impotência' },
  { label: 'Renda Extra', query: 'renda extra' },
  { label: 'Relacionamentos', query: 'relacionamento' },
  { label: 'Espiritualidade', query: 'espiritualidade' },
  { label: 'Pele & Rugas', query: 'rugas' },
  { label: 'Dores', query: 'dor nas articulações' },
  { label: 'Memória', query: 'memória' },
  { label: 'Visão', query: 'visão' },
  { label: 'Rejuvenescimento', query: 'rejuvenescimento' },
  { label: 'Próstata', query: 'próstata' },
  { label: 'Maternidade', query: 'maternidade' },
  { label: 'Constipação', query: 'constipação' }
];

ALC.DAY_FILTERS = [3, 5, 7, 14, 21, 28];

/* Padrões de texto por idioma — a Biblioteca muda conforme a conta. */
ALC.PATTERNS = {
  libraryId: /(?:identifica(?:ção|dor)\s+d[ae]\s+biblioteca|library\s*id)\s*:?\s*(\d{5,})/i,
  activeCount: /(\d+)\s+(?:an[úu]ncios?\s+usam|ads?\s+use)/i,
  seeMore: /^(ver mais|see more|ver más)$/i,
  active: /^(ativo|active|activo)$/i,
  inactive: /^(inativo|inactive|inactivo)$/i,
  multipleVersions: /(v[áa]rias vers[õo]es|multiple versions|varias versiones)/i,
  startPt: /veicula[çc][ãa]o iniciada em (\d{1,2}) de ([a-zç]{3,})\.? de (\d{4})/i,
  startEn: /started running on ([a-z]{3,}) (\d{1,2}),? (\d{4})/i,
  startEs: /comenz[óo] a publicarse el (\d{1,2}) de ([a-zá]{3,})\.? de (\d{4})/i,
  dateRangePt: /(\d{1,2}) de ([a-zç]{3,})\.? de (\d{4})\s*[–-]\s*(\d{1,2}) de ([a-zç]{3,})\.? de (\d{4})/i
};

ALC.MONTHS = {
  pt: { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 },
  en: { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 },
  es: { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 }
};

ALC.LIBRARY_BASE = 'https://www.facebook.com/ads/library/';
