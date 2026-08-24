/* ============================================================================
   i18n — nenhuma string de interface solta no código.
   Detecção: preferência do usuário -> lang do documento -> navegador -> pt-BR.
   ========================================================================== */
window.ALC = window.ALC || {};

const DICT = {
  'pt-BR': {
    save: 'Salvar', copy: 'Copiar', open: 'Abrir', send: 'Enviar', create: 'Criar',
    days: 'dias', day: 'dia', daysBadge: '{n} DIAS', dayBadge: '{n} DIA',
    scaling: 'escalando',
    // menu salvar
    saveMain: 'Apenas o criativo principal',
    savePick: 'Escolher os criativos',
    saveAll: 'Todos os criativos',
    saveInfo: 'Apenas as informações',
    saveBoth: 'Criativos e informações',
    // menu copiar
    copyPrimary: 'Texto principal', copyHeadline: 'Título', copyDescription: 'Descrição',
    copyUrl: 'URL do site', copyCta: 'Chamada para ação',
    copyLibrary: 'URL do anúncio na Biblioteca', copyAll: 'Todas as informações',
    // menu abrir / enviar
    openSite: 'Site do anúncio', openProfile: 'Perfil do anunciante',
    openInstagram: 'Instagram do anunciante', openByDomain: 'Pesquisar anúncios deste site',
    openByAdvertiser: 'Pesquisar anúncios deste anunciante', openLibrary: 'URL do anúncio na Biblioteca',
    sendAll: 'Todos os links',
    // menu criar
    aiKeywords: 'Palavras-chave', aiAudience: 'Segmentação de público',
    aiPersuasion: 'Análise de persuasão', aiVariations: 'Variações para teste A/B',
    aiOffer: 'Estrutura de oferta', aiAvatar: 'Avatar do cliente',
    aiAngles: 'Ângulos de criativos', aiQuiz: 'Funil de quiz',
    // navbar
    filterBy: 'Filtrar por tempo no ar', searchNiches: 'Atalhos de nicho',
    activeFor: 'Ativos há {n} dias', oneWeek: 'Ativos há 1 semana',
    twoWeeks: 'Ativos há 2 semanas', threeWeeks: 'Ativos há 3 semanas',
    fourWeeks: 'Ativos há 4 semanas', custom: 'Personalizado…',
    onlyScaling: 'Somente escalando (2+ cópias)', clearFilters: 'Limpar filtros',
    editList: 'Editar lista…', minDays: 'Mínimo de dias', maxDays: 'Máximo de dias',
    apply: 'Aplicar', cancel: 'Cancelar',
    // tray
    hidePanel: 'Ocultar painel', showPanel: 'Mostrar painel',
    filterTip: '{shown} anúncios filtrados de {total} analisados',
    sync: 'Sincronizar dados dos anúncios', backToTop: 'Voltar ao topo',
    support: 'Suporte e atalhos', collapse: 'Recolher ações rápidas',
    expand: 'Expandir ações rápidas', toggleTheme: 'Alternar tema',
    // toasts
    copied: '{field} copiado ({n} caracteres)',
    emptyField: 'Este anúncio não tem {field}.',
    noData: 'Dado indisponível neste anúncio.',
    downloading: 'Baixando {i} de {n}…',
    downloadDone: 'Download concluído: {n} arquivo(s).',
    downloadFail: 'Falha ao baixar: {msg}',
    promptCopied: 'Prompt copiado. Abrindo o chat…',
    analyzing: 'Analisando o anúncio…',
    linksCopied: 'Links copiados.',
    syncing: 'Reprocessando os anúncios…',
    noneVisible: 'Nenhum dos {total} anúncios analisados passa no filtro atual.',
    // modais
    pickCreatives: 'Escolher os criativos', selectAll: 'Selecionar tudo',
    downloadSelected: 'Baixar selecionados ({n})', close: 'Fechar',
    retry: 'Refazer', downloadMd: 'Baixar .md', shortcuts: 'Atalhos de teclado',
    // painel
    tabSession: 'Sessão', tabCollected: 'Coletados', tabFilters: 'Filtros'
  }
};

/* en e es herdam do pt-BR e sobrescrevem o que difere — assim nenhuma chave
   fica faltando quando a interface troca de idioma. */
DICT.en = Object.assign({}, DICT['pt-BR'], {
  save: 'Save', copy: 'Copy', open: 'Open', send: 'Send', create: 'Create',
  days: 'days', day: 'day', daysBadge: '{n} DAYS', dayBadge: '{n} DAY',
  saveMain: 'Main creative only', savePick: 'Choose creatives',
  saveAll: 'All creatives', saveInfo: 'Information only', saveBoth: 'Creatives and information',
  copyPrimary: 'Primary text', copyHeadline: 'Headline', copyDescription: 'Description',
  copyUrl: 'Website URL', copyCta: 'Call to action', copyLibrary: 'Ad Library URL',
  copyAll: 'All information', openSite: 'Ad website', openProfile: 'Advertiser profile',
  openInstagram: 'Advertiser on Instagram', openByDomain: 'Search ads from this site',
  openByAdvertiser: 'Search ads from this advertiser', openLibrary: 'Ad Library URL',
  sendAll: 'All links', tabSession: 'Session', tabCollected: 'Collected', tabFilters: 'Filters',
  apply: 'Apply', cancel: 'Cancel', clearFilters: 'Clear filters'
});
DICT.es = Object.assign({}, DICT['pt-BR'], {
  save: 'Guardar', copy: 'Copiar', open: 'Abrir', send: 'Enviar', create: 'Crear',
  days: 'días', day: 'día', daysBadge: '{n} DÍAS', dayBadge: '{n} DÍA',
  saveMain: 'Solo el creativo principal', savePick: 'Elegir los creativos',
  saveAll: 'Todos los creativos', saveInfo: 'Solo la información',
  saveBoth: 'Creativos e información', copyPrimary: 'Texto principal',
  copyHeadline: 'Título', copyDescription: 'Descripción', copyUrl: 'URL del sitio',
  copyCta: 'Llamada a la acción', copyLibrary: 'URL del anuncio en la Biblioteca',
  copyAll: 'Toda la información', tabSession: 'Sesión', tabCollected: 'Recopilados',
  tabFilters: 'Filtros', apply: 'Aplicar', cancel: 'Cancelar', clearFilters: 'Limpiar filtros'
});

ALC.i18n = {
  lang: 'pt-BR',
  detect(pref) {
    const cands = [
      pref && pref !== 'auto' ? pref : null,
      (document.documentElement.getAttribute('lang') || ''),
      (navigator.language || '')
    ];
    for (const c of cands) {
      if (!c) continue;
      const low = c.toLowerCase();
      if (low.startsWith('pt')) return 'pt-BR';
      if (low.startsWith('es')) return 'es';
      if (low.startsWith('en')) return 'en';
    }
    return 'pt-BR';
  },
  setLang(l) { this.lang = DICT[l] ? l : 'pt-BR'; },
  t(key, vars) {
    const table = DICT[this.lang] || DICT['pt-BR'];
    let s = table[key] != null ? table[key] : (DICT['pt-BR'][key] != null ? DICT['pt-BR'][key] : key);
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
    return s;
  }
};

ALC.t = (k, v) => ALC.i18n.t(k, v);
