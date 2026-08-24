/* ============================================================================
   Os 8 prompts do menu CRIAR. O usuário pode editar cada um nas Opções; o
   texto de fábrica fica aqui e o botão "Restaurar original" volta para cá.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.SYSTEM_PROMPT =
`Você é um estrategista sênior de marketing de resposta direta, especialista em anúncios
de Facebook e Instagram para o mercado brasileiro. Analisa anúncios de concorrentes com
frieza analítica e devolve material acionável, específico e pronto para usar.
Nunca invente dados que não estejam no anúncio: quando algo for inferência sua, marque
como "hipótese". Responda em português do Brasil, em Markdown, sem introdução nem
despedida — comece direto pelo conteúdo.`;

ALC.PROMPT_DEFS = [
  { id: 'keywords', label: 'aiKeywords', icon: 'search', text:
`Extraia deste anúncio: (a) 15 palavras-chave e termos de busca que o público-alvo dele usaria no Google e na própria Biblioteca de Anúncios para encontrar ofertas semelhantes; (b) 10 termos de dor e 10 termos de desejo literalmente presentes ou fortemente implícitos na copy; (c) 5 buscas prontas para espionar concorrentes desse mesmo nicho. Entregue em três listas separadas, sem explicações.` },

  { id: 'audience', label: 'aiAudience', icon: 'sliders', text:
`Descreva o público que esse anúncio persegue: faixa etária, gênero predominante, renda estimada, momento de vida, nível de consciência (Eugene Schwartz: inconsciente → mais consciente) e nível de sofisticação do mercado. Depois, monte 3 conjuntos de segmentação prontos para o Gerenciador de Anúncios (interesses, comportamentos, públicos semelhantes), e 3 sinais de que o público real pode ser diferente do aparente.` },

  { id: 'persuasion', label: 'aiPersuasion', icon: 'sparkle', text:
`Disseque a mecânica persuasiva: (1) qual é o gancho das 3 primeiras linhas e por que ele para o scroll; (2) a promessa central e a promessa implícita; (3) todos os gatilhos mentais usados, citando o trecho exato de cada um; (4) a estrutura da copy (ex.: AIDA, PAS, história-ponte-oferta); (5) as objeções que ele antecipa e como; (6) as 3 maiores fraquezas do anúncio e como você as exploraria em um anúncio concorrente. Seja específico e cite trechos.` },

  { id: 'variations', label: 'aiVariations', icon: 'copy', text:
`Escreva 5 variações completas dessa copy (texto principal + título + descrição), cada uma mudando UMA variável isolada, declarada no começo: (1) ângulo — mesma oferta, promessa diferente; (2) formato — história pessoal; (3) prova — dados e números; (4) urgência/escassez; (5) contra-intuitivo/polêmico. Mantenha o mesmo público e a mesma oferta. Cada variação deve ser publicável como está, no mesmo tom e comprimento do original.` },

  { id: 'offer', label: 'aiOffer', icon: 'file-text', text:
`Faça a engenharia reversa da oferta: produto ou serviço aparente, mecanismo único, promessa principal, entregáveis prováveis, faixa de preço estimada, tipo de funil provável (VSL, webinário, quiz, direto para checkout, WhatsApp) e a escada de valor completa (isca → produto de entrada → principal → upsell → continuidade). Marque cada inferência como hipótese e diga qual sinal do anúncio a sustenta. Termine com uma oferta concorrente que superaria essa, item por item.` },

  { id: 'avatar', label: 'aiAvatar', icon: 'eye', text:
`Construa o avatar do cliente ideal desse anúncio em primeira pessoa: nome, idade, profissão, rotina, situação financeira, um dia típico. Depois liste: 5 dores profundas (com a frase que ele usaria para descrever cada uma, na linguagem dele), 5 desejos, 5 medos, 5 objeções à compra, 3 falsas soluções que ele já tentou e por que falharam, e onde ele passa o tempo online. Use a linguagem real do público, não linguagem de marketing.` },

  { id: 'angles', label: 'aiAngles', icon: 'video', text:
`Proponha 8 ângulos de criativo distintos para atacar esse mesmo público, cada um com: nome do ângulo, gancho visual dos 3 primeiros segundos, roteiro de vídeo de 30 segundos (falas + indicações de cena), texto sobreposto sugerido e por que esse ângulo pega uma fatia do público que o anúncio original não pega. Varie formatos: UGC, depoimento, demonstração, comparação, storytelling, autoridade, antes-e-depois, bastidores.` },

  { id: 'quiz', label: 'aiQuiz', icon: 'clipboard-check', text:
`Projete um funil de quiz completo para essa oferta: (1) título e subtítulo da página de entrada, com a promessa de descoberta; (2) 7 perguntas com alternativas, cada pergunta segmentando por dor, nível de consciência ou perfil, explicando o que cada uma revela; (3) 3 a 4 resultados/arquétipos possíveis, com o texto de cada um e o produto recomendado; (4) a lógica de pontuação; (5) a copy da página de resultado que leva à oferta; (6) uma sequência de 5 e-mails de acompanhamento, com assunto e o objetivo de cada um.` }
];

/** Bloco de contexto que prefixa todos os prompts. */
ALC.buildContext = function (ad) {
  const formats = (ad.creatives || []).map((c) => c.type).join(', ') || 'não identificado';
  return [
    '=== ANÚNCIO ANALISADO ===',
    'Anunciante: ' + (ad.advertiserName || '—'),
    'No ar desde: ' + (ad.startDateRaw || '—') + ' (' + (ad.daysRunning || '?') + ' dias)',
    'Cópias ativas do mesmo criativo: ' + (ad.activeAdCount || 1),
    'Plataformas: ' + ((ad.platforms || []).join(', ') || '—'),
    'CTA: ' + (ad.ctaLabel || '—'),
    'Domínio de destino: ' + (ad.destinationDomain || '—'),
    'Formato do criativo: ' + formats,
    '',
    '--- TEXTO PRINCIPAL ---',
    ad.primaryText || '—',
    '',
    '--- TÍTULO ---',
    ad.headline || '—',
    '',
    '--- DESCRIÇÃO ---',
    ad.description || '—',
    '=========================',
    '',
    'Leitura de mercado: um anúncio no ar há ' + (ad.daysRunning || '?') + ' dias com ' +
      (ad.activeAdCount || 1) + ' cópias ativas é um forte sinal de que está performando — ' +
      'trate o que ele faz como validado pelo mercado, não como opinião.',
    ''
  ].join('\n');
};

ALC.buildPrompt = function (ad, id, overrides) {
  const def = ALC.PROMPT_DEFS.find((p) => p.id === id);
  if (!def) return '';
  const body = (overrides && overrides[id]) || def.text;
  return ALC.buildContext(ad) + '\n' + body;
};
