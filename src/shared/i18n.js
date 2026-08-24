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
    saveAll: 'Todos os criativos',
    saveInfo: 'Apenas as informações',
    saveBoth: 'Criativos e informações',
    // menu copiar
    copyPrimary: 'Texto principal', copyHeadline: 'Título', copyDescription: 'Descrição',
    copyUrl: 'URL do site', copyCta: 'Chamada para ação',
    copyLibrary: 'URL do anúncio na Biblioteca', copyAll: 'Todas as informações',
    // menu abrir / enviar
    openSite: 'Site do anúncio', openProfile: 'Perfil do anunciante', openByDomain: 'Pesquisar anúncios deste site',
    openByAdvertiser: 'Pesquisar anúncios deste anunciante', openLibrary: 'URL do anúncio na Biblioteca',
    sendAll: 'Todos os links',
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
    linksCopied: 'Links copiados.',
    syncing: 'Reprocessando os anúncios…',
    noneVisible: 'Nenhum dos {total} anúncios analisados passa no filtro atual.',
    // modais close: 'Fechar', downloadMd: 'Baixar .md', shortcuts: 'Atalhos de teclado',
    // painel
    // menu criar — referência criativa
    refVideo: 'Usar o vídeo como referência', refImage: 'Usar a imagem como referência',
    refEditBusiness: 'Editar o meu negócio',
    refHint: 'Gera o prompt que escreve roteiros para o seu negócio no molde deste criativo',
    refNoCreative: 'Este anúncio não tem criativo que dê para ler.',
    refFillBusiness: 'Preencha o seu negócio primeiro — sem isso o prompt não tem para quem escrever.',
    refReading: 'Lendo o criativo… {i}/{n}', refSaving: 'Salvando as imagens…',
    refReady: 'Referência pronta',
    refSubtitleVideo: '{n} frames do vídeo · pasta {folder}',
    refSubtitleImage: '{n} imagens do anúncio · pasta {folder}',
    refCopyPrompt: 'Copiar o prompt',
    refDownloadPdf: 'Baixar o PDF ({n} frames)',
    refDownloadPdfImg: 'Baixar o PDF ({n} imagens)',
    refDownloadPdfImg1: 'Baixar o PDF (1 imagem)', refBuildingPdf: 'Montando o PDF…',
    refPdfDone: 'Baixado: {file} — {n} páginas, uma por frame. É esse arquivo que você anexa.',
    refDownloadZip: 'Arquivos soltos (.zip)',
    refTranscribing: 'Transcrevendo a fala do anúncio…',
    refNoTranscript: 'Sem transcrição desta vez ({msg}). O prompt segue com os frames.',
    refZipping: 'Montando o .zip…',
    refZipDone: 'Baixado: {file} — a pasta com o material e o prompt.txt está dentro.',
    refFilesDone: '{n} imagens baixadas na pasta.',
    refStep1: 'Baixe o PDF: um arquivo com os {n} frames, uma página por frame — é o que o chat consegue ler.',
    refStep1Img: 'Baixe o PDF: um arquivo com as {n} imagens do anúncio, uma por página — é o que o chat consegue ler.',
    refStep1Img1: 'Baixe o PDF: a imagem do anúncio numa página — é o que o chat consegue ler.',
    refStep2: 'O prompt já está na sua área de transferência: abra o chat e cole.',
    refStep2Transcript: 'O prompt já está na área de transferência, com a fala do anúncio transcrita dentro dele: abra o chat e cole.',
    refStep3: 'Anexe o PDF na mesma mensagem.',
    refStep4: 'Envie. A resposta já vem com os roteiros prontos para gravar.',
    refCopied: 'Prompt copiado.',
    refFail: 'Não deu para ler este criativo: {msg}',
    tabSession: 'Sessão', tabCollected: 'Coletados', tabFilters: 'Filtros',
    // anúncio dinâmico (DCO/DPA)
    dynamicField: 'Anúncio dinâmico: a Meta não publica {field} — o texto muda a cada produto.',
    dynamicBlocked: 'Anúncio dinâmico: a Biblioteca não publica {fields}. A cópia completa sairia com lacunas.',
    dynamicTitle: 'Anúncio dinâmico de catálogo: este campo é gerado por produto e a Biblioteca não o publica.',
  }
};

/* en e es herdam do pt-BR e sobrescrevem o que difere — assim nenhuma chave
   fica faltando quando a interface troca de idioma. */
DICT.en = Object.assign({}, DICT['pt-BR'], {
  save: 'Save', copy: 'Copy', open: 'Open', send: 'Send', create: 'Create',
  days: 'days', day: 'day', daysBadge: '{n} DAYS', dayBadge: '{n} DAY',
  saveMain: 'Main creative only',
  saveAll: 'All creatives', saveInfo: 'Information only', saveBoth: 'Creatives and information',
  copyPrimary: 'Primary text', copyHeadline: 'Headline', copyDescription: 'Description',
  copyUrl: 'Website URL', copyCta: 'Call to action', copyLibrary: 'Ad Library URL',
  copyAll: 'All information', openSite: 'Ad website', openProfile: 'Advertiser profile', openByDomain: 'Search ads from this site',
  openByAdvertiser: 'Search ads from this advertiser', openLibrary: 'Ad Library URL',
  sendAll: 'All links', tabSession: 'Session', tabCollected: 'Collected', tabFilters: 'Filters',
  refVideo: 'Use the video as reference', refImage: 'Use the image as reference',
  refEditBusiness: 'Edit my business',
  refHint: 'Builds the prompt that writes scripts for your business using this creative as the mould',
  refNoCreative: 'This ad has no creative that can be read.',
  refFillBusiness: 'Fill in your business first — without it the prompt has no one to write for.',
  refReading: 'Reading the creative… {i}/{n}', refSaving: 'Saving the images…',
  refReady: 'Reference ready',
  refSubtitleVideo: '{n} frames from the video · folder {folder}',
  refSubtitleImage: '{n} images from the ad · folder {folder}',
  refCopyPrompt: 'Copy the prompt',
  refDownloadPdf: 'Download the PDF ({n} frames)',
  refDownloadPdfImg: 'Download the PDF ({n} images)',
  refDownloadPdfImg1: 'Download the PDF (1 image)', refBuildingPdf: 'Building the PDF…',
  refPdfDone: 'Downloaded: {file} — {n} pages, one per frame. That is the file you attach.',
  refDownloadZip: 'Loose files (.zip)',
  refTranscribing: 'Transcribing the ad speech…',
  refNoTranscript: 'No transcript this time ({msg}). The prompt still carries the frames.',
  refZipping: 'Building the .zip…',
  refZipDone: 'Downloaded: {file} — the folder with the material and prompt.txt is inside.',
  refFilesDone: '{n} images downloaded to the folder.',
  refStep1: 'Download the PDF: one file with the {n} frames, one page each — what the chat can actually read.',
  refStep1Img: 'Download the PDF: one file with the ad\'s {n} images, one per page — what the chat can actually read.',
  refStep1Img1: 'Download the PDF: the ad image on one page — what the chat can actually read.',
  refStep2: 'The prompt is already on your clipboard: open the chat and paste it.',
  refStep2Transcript: 'The prompt is on your clipboard with the ad\'s speech transcribed inside it: open the chat and paste it.',
  refStep3: 'Attach the PDF in the same message.',
  refStep4: 'Send. The answer comes back with the scripts ready to shoot.',
  refCopied: 'Prompt copied.',
  refFail: 'Could not read this creative: {msg}',
  apply: 'Apply', cancel: 'Cancel', clearFilters: 'Clear filters',
  dynamicField: 'Dynamic ad: Meta does not publish {field} — the text changes per product.',
  dynamicBlocked: 'Dynamic ad: the Library does not publish {fields}. The full copy would come out with gaps.',
  dynamicTitle: 'Dynamic catalog ad: this field is generated per product and the Library does not publish it.',
});
DICT.es = Object.assign({}, DICT['pt-BR'], {
  dynamicField: 'Anuncio dinámico: Meta no publica {field} — el texto cambia en cada producto.',
  dynamicBlocked: 'Anuncio dinámico: la Biblioteca no publica {fields}. La copia completa saldría con huecos.',
  dynamicTitle: 'Anuncio dinámico de catálogo: este campo se genera por producto y la Biblioteca no lo publica.',
  refVideo: 'Usar el video como referencia', refImage: 'Usar la imagen como referencia',
  refEditBusiness: 'Editar mi negocio',
  refHint: 'Genera el prompt que escribe guiones para tu negocio con este creativo como molde',
  refNoCreative: 'Este anuncio no tiene creativo que se pueda leer.',
  refFillBusiness: 'Completa tu negocio primero — sin eso el prompt no tiene para quién escribir.',
  refReading: 'Leyendo el creativo… {i}/{n}', refSaving: 'Guardando las imágenes…',
  refReady: 'Referencia lista',
  refSubtitleVideo: '{n} fotogramas del video · carpeta {folder}',
  refSubtitleImage: '{n} imágenes del anuncio · carpeta {folder}',
  refCopyPrompt: 'Copiar el prompt',
  refDownloadPdf: 'Descargar el PDF ({n} fotogramas)',
  refDownloadPdfImg: 'Descargar el PDF ({n} imágenes)',
  refDownloadPdfImg1: 'Descargar el PDF (1 imagen)', refBuildingPdf: 'Armando el PDF…',
  refPdfDone: 'Descargado: {file} — {n} páginas, una por fotograma. Ese es el archivo que adjuntas.',
  refDownloadZip: 'Archivos sueltos (.zip)',
  refTranscribing: 'Transcribiendo el habla del anuncio…',
  refNoTranscript: 'Sin transcripción esta vez ({msg}). El prompt sigue con los fotogramas.',
  refZipping: 'Armando el .zip…',
  refZipDone: 'Descargado: {file} — la carpeta con el material y prompt.txt está adentro.',
  refFilesDone: '{n} imágenes descargadas en la carpeta.',
  refStep1: 'Descarga el PDF: un archivo con los {n} fotogramas, una página por fotograma — es lo que el chat sí lee.',
  refStep1Img: 'Descarga el PDF: un archivo con las {n} imágenes del anuncio, una por página — es lo que el chat sí lee.',
  refStep1Img1: 'Descarga el PDF: la imagen del anuncio en una página — es lo que el chat sí lee.',
  refStep2: 'El prompt ya está en tu portapapeles: abre el chat y pégalo.',
  refStep2Transcript: 'El prompt ya está en tu portapapeles con el habla del anuncio transcrita adentro: abre el chat y pégalo.',
  refStep3: 'Adjunta el PDF en el mismo mensaje.',
  refStep4: 'Envía. La respuesta ya trae los guiones listos para grabar.',
  refCopied: 'Prompt copiado.',
  refFail: 'No se pudo leer este creativo: {msg}',
  save: 'Guardar', copy: 'Copiar', open: 'Abrir', send: 'Enviar', create: 'Crear',
  days: 'días', day: 'día', daysBadge: '{n} DÍAS', dayBadge: '{n} DÍA',
  saveMain: 'Solo el creativo principal',
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
