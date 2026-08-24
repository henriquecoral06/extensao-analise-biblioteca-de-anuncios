/* ============================================================================
   O prompt de referência criativa.

   A entrega é o roteiro novo, não a análise do anúncio alheio: o chat estuda o
   molde por conta própria e responde com as peças prontas para gravar — escritas
   para pequeno e médio negócio, que é quem usa a extensão.

   O molde são os frames, nunca o texto do anúncio. O que faz um criativo
   funcionar está no que ele mostra e no que é dito nele — gancho, ordem dos
   argumentos, prova exibida, ritmo. Copy, título e CTA o gestor duplica de uma
   peça para outra: descrevem a embalagem, não o mecanismo.

   A saída é um prompt para colar num chat com as imagens anexadas: nenhuma
   chamada de API, nenhuma chave, nenhum custo.
   ========================================================================== */
window.ALC = window.ALC || {};

/** Rótulos e ordem dos campos do perfil — usados no prompt e na tela Opções. */
ALC.BUSINESS_FIELDS = [
  { id: 'niche', label: 'Nicho / mercado', ph: 'Ex.: emagrecimento feminino acima dos 40' },
  { id: 'product', label: 'Produto ou serviço', ph: 'O que você vende, em uma linha' },
  { id: 'offer', label: 'Oferta e preço', ph: 'Ex.: desafio de 21 dias por R$ 29,90, com garantia de 7 dias' },
  { id: 'region', label: 'Cidade e região que você atende', ph: 'Ex.: Curitiba, bairros Batel e Água Verde, atendo num raio de 10 km' },
  { id: 'audience', label: 'Público', ph: 'Quem compra: idade, momento de vida, nível de consciência' },
  { id: 'promise', label: 'Promessa central', ph: 'O resultado concreto que você entrega' },
  { id: 'proofs', label: 'Provas que você tem', ph: 'Depoimentos, antes e depois, números, autoridade, mídia' },
  { id: 'objections', label: 'Objeções mais comuns', ph: 'O que faz a pessoa não comprar' },
  { id: 'tone', label: 'Tom de voz', ph: 'Ex.: direto, acolhedor, sem infantilizar' },
  { id: 'restrictions', label: 'O que você não pode prometer', ph: 'Restrições de compliance, promessas proibidas no seu nicho' },
  { id: 'format', label: 'Formato e duração', ph: 'Ex.: Reels de 30 a 45 segundos' }
];

/** Bloco "meu negócio": só entra o que o usuário preencheu. */
function businessBlock(biz) {
  const linhas = ALC.BUSINESS_FIELDS
    .map((f) => ({ label: f.label, value: String((biz && biz[f.id]) || '').trim() }))
    .filter((l) => l.value)
    .map((l) => l.label + ': ' + l.value);
  return linhas.length ? linhas.join('\n') : '(perfil não preenchido)';
}

/** Quais campos ainda faltam — o menu usa para avisar antes de gerar. */
ALC.missingBusinessFields = function (biz) {
  const essenciais = ['niche', 'product', 'offer', 'promise'];
  return essenciais.filter((id) => !String((biz && biz[id]) || '').trim());
};

/**
 * Monta o prompt.
 * @param ad     anúncio de referência (só o que descreve desempenho e formato)
 * @param biz    perfil do negócio do usuário
 * @param shot   { kind, files: [{name, seconds}], durationSec, transcript }
 */
ALC.buildReferencePrompt = function (ad, biz, shot) {
  const L = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  const ehVideo = shot.kind === 'video';
  const n = shot.files.length;
  const variacoes = (ALC.settings && ALC.settings.referenceVariations) || 3;

  /* O anexo é o PDF: uma página por frame. Citar nome de arquivo .jpg confundia,
     porque esse arquivo não existe dentro do PDF — só no .zip. */
  const mapa = shot.files
    .map((f, i) => '  página ' + (i + 1) + ' — ' +
      (ehVideo ? 'segundo ' + f.seconds : 'imagem ' + (i + 1) + ' do anúncio'))
    .join('\n');

  const sinal = [
    ad.daysRunning ? ad.daysRunning + (ad.daysRunning === 1 ? ' dia no ar' : ' dias no ar') : null,
    (ad.activeAdCount || 1) > 1 ? ad.activeAdCount + ' cópias ativas do mesmo criativo' : null,
    ehVideo ? 'vídeo' + (shot.durationSec ? ' de ' + shot.durationSec + 's' : '') : 'anúncio de imagem',
    (ad.platforms || []).length ? (ad.platforms || []).join(', ') : null
  ].filter(Boolean).join(' · ');

  const abertura = [
    ehVideo
      ? 'Você escreve anúncios para pequenos e médios negócios — o comércio e o serviço que'
      : 'Você cria anúncios em imagem para pequenos e médios negócios — o comércio e o serviço',
    ehVideo
      ? 'atendem gente de verdade, no bairro e na cidade.'
      : 'que atendem gente de verdade, no bairro e na cidade.'
  ];

  const porQue = [
    '',
    L,
    'POR QUE ESTE MOLDE',
    L,
    sinal || 'anúncio ativo na Biblioteca de Anúncios da Meta',
    (ad.activeAdCount || 1) > 1
      ? 'Tempo no ar e número de cópias ativas dizem que o mercado já validou'
      : 'O tempo no ar diz que o mercado já validou',
    'esta peça — trate a estrutura dela como testada, não como opinião.',
    '',
    L,
    'MEU NEGÓCIO',
    L,
    businessBlock(biz)
  ];

  const regrasComuns = [
    '  • Nunca copie frases, nomes, números ou provas da referência.',
    '  • Se o molde for de infoproduto, curso ou negócio digital, traduza para a realidade',
    '    de um negócio que atende pessoa a pessoa: agenda, atendimento, bairro, cidade,',
    '    cliente da região. Nada de linguagem de lançamento.',
    '  • Use só as provas que eu listei. Se faltar prova para alguma parte, diga em uma',
    '    linha no fim qual prova eu preciso ter — não invente.',
    '  • Respeite as restrições que eu marquei: nenhuma promessa fora delas.',
    '  • Escreva no meu tom de voz.'
  ];

  const linhas = ehVideo
    ? montarVideo(shot, mapa, n, variacoes, L, abertura, porQue, regrasComuns)
    : montarImagem(shot, mapa, n, variacoes, L, abertura, porQue, regrasComuns);

  return linhas.filter((l) => l !== null).join('\n');
};

/* --- criativo em vídeo: a entrega é o texto falado ------------------------- */
function montarVideo(shot, mapa, n, variacoes, L, abertura, porQue, regrasComuns) {
  return abertura.concat([
    'Escreva ' + variacoes + ' roteiros de criativo para o MEU negócio, usando como molde o',
    'anúncio anexado, que está no ar agora.',
    '',
    L,
    'O MOLDE — PDF anexado, ' + n + ' páginas, uma por frame do vídeo' +
      (shot.transcript ? ', mais a fala transcrita aqui embaixo' : ''),
    L,
    mapa,
    '(Se você recebeu as imagens soltas em vez do PDF, elas estão na mesma ordem: 01, 02, 03…)',
    '',
    shot.transcript ? L : null,
    shot.transcript ? 'A FALA DO ANÚNCIO — transcrição do áudio original' : null,
    shot.transcript ? L : null,
    shot.transcript ? shot.transcript : null,
    shot.transcript ? '' : null,
    shot.transcript
      ? 'Essa é a locução do criativo, transcrita do áudio. É o roteiro dele: ordem dos\nargumentos, jeito de falar, momento em que cada coisa entra. As páginas do PDF mostram\no que aparece na tela nos mesmos instantes.'
      : null,
    shot.transcript ? '' : null,
    'Estude esse material por conta própria: o gancho dos primeiros segundos, a ordem dos',
    'blocos, a prova que aparece, a objeção que ele trata sem falar, o ritmo dos cortes.',
    shot.transcript
      ? 'Cruze a fala com as páginas: o que é dito em cada momento e o que aparece na tela junto.'
      : 'Onde houver legenda queimada, ela é o roteiro falado — use para entender a estrutura.',
    shot.transcript
      ? 'Use SOMENTE a fala transcrita e o que aparece nas páginas. Ignore o texto, o título'
      : 'Use SOMENTE o que está nas páginas do PDF. Ignore o texto, o título',
    'e o CTA do anúncio: quem sobe a campanha repete esses campos de um criativo para o',
    'outro, então eles não dizem nada sobre como a peça funciona.',
    '',
    'Não me devolva a análise do anúncio de referência. Ela é meio, não entrega.'
  ]).concat(porQue).concat([
    '',
    L,
    'O QUE VOCÊ ENTREGA',
    L,
    variacoes + ' roteiros, um embaixo do outro, assim:',
    '',
    '  ROTEIRO 1 — um título curto, de três a cinco palavras',
    '  O texto falado do começo ao fim, em parágrafos curtos, na ordem de dizer.',
    '  Outra abertura: uma frase',
    '  Outra abertura: uma frase',
    '',
    'Como escrever:',
    '  • Só o que sai da boca. Nada de tabela, marcação de tempo, direção de câmera,',
    '    enquadramento, cenário ou sugestão de texto na tela.',
    '  • Escreva como se fala: frase curta, palavra do dia a dia, sem termo técnico,',
    '    sem jargão de marketing e sem soar como propaganda.',
    '  • O texto tem que caber no formato que eu pedi, falado em ritmo normal — conte',
    '    umas duas palavras por segundo e escreva dentro disso.',
    '  • Fale comigo no singular, como se eu estivesse na sua frente.',
    '',
    'Regras:',
    '  • Siga a ordem dos assuntos do molde: o que ele diz primeiro, você diz primeiro.',
    '    O produto é outro, o esqueleto é o mesmo.'
  ]).concat(regrasComuns).concat([
    '',
    'Comece direto pelo ROTEIRO 1. Sem introdução, sem resumo do anúncio de referência, sem',
    'explicar o que você fez e sem comentário no fim. Só os roteiros.'
  ]);
}

/* --- criativo em imagem: a entrega é a imagem ----------------------------
   Aqui o chat não é redator: é diretor de arte que também gera a peça. Anúncio
   estático não tem gancho de três segundos — o que se copia dele é a hierarquia
   visual. E o prompt de imagem precisa sair completo e literal: os modelos de
   hoje escrevem texto na arte, então pedir "área limpa para eu escrever depois"
   devolvia trabalho pela metade para quem só queria o criativo pronto.
   -------------------------------------------------------------------------- */
function montarImagem(shot, mapa, n, variacoes, L, abertura, porQue, regrasComuns) {
  const proporcao = shot.aspect || '4:5 (vertical de feed, 1080x1350)';
  return abertura.concat([
    'Crie ' + variacoes + ' criativos em IMAGEM para o MEU negócio, no molde do anúncio',
    'anexado, que está no ar agora. Quero as peças prontas, não um plano de peça.',
    '',
    L,
    'O MOLDE — PDF anexado, ' + n + (n === 1 ? ' página com a imagem do anúncio' : ' páginas, uma por imagem do anúncio'),
    L,
    mapa,
    '(Se você recebeu as imagens soltas em vez do PDF, elas estão na mesma ordem: 01, 02, 03…)',
    '',
    'Olhe as páginas como referência VISUAL e copie o esqueleto, nunca o conteúdo:',
    '  • a hierarquia — o que está maior, o que se lê primeiro, o que fica no rodapé;',
    '  • onde cada bloco de texto se apoia na imagem e quanto respiro sobra em volta;',
    '  • o tipo de imagem que sustenta a peça: foto de pessoa, produto, ambiente, fundo liso;',
    '  • a paleta, o peso da tipografia e o clima geral.',
    'Ignore o texto, o título e o CTA do anúncio: quem sobe a campanha repete esses campos',
    'de um criativo para o outro, então eles não dizem nada sobre como a peça funciona.',
    '',
    'Não me devolva a análise do anúncio de referência. Ela é meio, não entrega.'
  ]).concat(porQue).concat([
    '',
    L,
    'O QUE VOCÊ ENTREGA',
    L,
    'Para cada um dos ' + variacoes + ' criativos, só duas coisas:',
    '',
    '  CRIATIVO 1 — um nome curto para eu me achar depois',
    '',
    '  TEXTO DA ARTE — as palavras que precisam aparecer escritas na imagem:',
    '    Chamada: "…"        (no máximo 8 palavras, é a que se lê de longe)',
    '    Apoio: "…"          (no máximo 12 palavras)',
    '    Selo: "…"           (no máximo 5 palavras, só se acrescentar credibilidade)',
    '    Botão: "…"          (no máximo 3 palavras)',
    '',
    '  PROMPT DE IMAGEM — em bloco de código, para eu colar num gerador, escrito em',
    '  um parágrafo corrido e nesta ordem:',
    '    1. o que é a peça e a proporção: anúncio para Instagram e Facebook, ' + proporcao + ';',
    '    2. a cena: quem ou o que aparece, idade e traço da pessoa, roupa, ambiente,',
    '       o que ela está fazendo, enquadramento e distância da câmera;',
    '    3. luz, paleta com as cores nomeadas e o clima da imagem;',
    '    4. a composição: onde entra cada bloco de texto e quanto espaço ele ocupa;',
    '    5. as palavras exatas a escrever na arte, entre aspas, dizendo qual é a maior',
    '       e qual é a menor, e a cor de cada uma;',
    '    6. acabamento: fotografia real ou ilustração, nitidez, sem marca d\'água,',
    '       sem moldura, sem logotipo de marca conhecida.',
    '',
    'Se você mesmo gera imagem, gere o CRIATIVO 1 agora e me mostre. Depois pergunte se',
    'eu quero seguir para o 2. Se não gera, me entregue só os prompts e eu levo para o',
    'gerador.',
    '',
    'Como escrever o texto da arte:',
    '  • Palavra do dia a dia, sem termo técnico e sem jargão de marketing.',
    '  • Tudo somado, a arte não passa de 25 palavras. Anúncio não é folheto — e gerador',
    '    de imagem erra frase longa.',
    '  • Fale comigo no singular, como se eu estivesse na sua frente.',
    '',
    'Como escrever o prompt de imagem:',
    '  • Escreva o prompt em português, corrido, sem lista e sem títulos dentro dele.',
    '  • Repita as palavras da arte dentro do prompt, exatamente iguais e entre aspas —',
    '    é assim que o gerador sabe o que escrever.',
    '  • Descreva pessoa real e comum, do público que eu atendo, em ambiente do dia a dia.',
    '    Nada de banco de imagem sorrindo para o nada.',
    '  • Se a peça só funcionar com foto de verdade do meu negócio (meu espaço, minha',
    '    equipe, eu, o meu produto), diga isso no lugar do prompt e me explique em duas',
    '    linhas o que fotografar, de onde e com que luz.',
    '',
    'Regras:',
    '  • Siga a hierarquia do molde: o que ele destaca primeiro, você destaca primeiro.',
    '    O produto é outro, o esqueleto é o mesmo.',
    '  • A proporção é ' + proporcao + ', igual à do molde.',
    '  • Ignore o campo de formato do meu perfil se ele falar em vídeo ou segundos.'
  ]).concat(regrasComuns).concat([
    '',
    'Comece direto pelo CRIATIVO 1. Sem introdução, sem resumo do anúncio de referência,',
    'sem explicar o que você fez e sem comentário no fim.'
  ]);
}
