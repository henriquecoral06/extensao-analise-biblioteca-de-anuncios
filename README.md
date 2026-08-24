# AdLib Copilot

Uma camada de produtividade injetada por cima da **Biblioteca de Anúncios da Meta**
(`facebook.com/ads/library`). Ela transforma o mural de anúncios em ferramenta de análise
de concorrência: mostra há quantos dias cada anúncio está no ar, destaca os que estão
sendo escalados e dá, dentro do próprio card, botões para baixar criativos, copiar as
copies, abrir os destinos e gerar análises com IA.

Interface e código em português. Zero build: é só carregar a pasta no Chrome.

---

## O que ela faz

**Dentro de cada card** — cinco menus (Salvar · Copiar · Abrir · Enviar · Criar) e um selo
com o tempo no ar. O selo muda de tom conforme a leitura de mercado:

| Tempo no ar | Tom | Leitura |
|---|---|---|
| 0–2 dias | neutro | teste novo |
| 3–6 dias | azul | em validação |
| 7–20 dias | esmeralda | validado |
| 21+ dias | âmbar | campeão |

Anúncio com **2 ou mais cópias ativas do mesmo criativo** ganha um anel esmeralda: é o
sinal de que está escalando.

**Na barra da Meta** — dois botões: filtro por tempo no ar (3, 5, 7, 14, 21, 28 dias,
faixa personalizada e "somente escalando") e atalhos para os seus nichos de busca.

**No tray flutuante** — liga/desliga o filtro com o contador `exibidos/analisados`,
sincroniza, volta ao topo, alterna o tema e abre a ajuda. Arrastável, com snap nos cantos.

**No painel lateral** — estatísticas ao vivo da busca (média de dias no ar, quantos estão
escalando, top anunciantes, distribuição por faixa), a lista do que você coletou na sessão
com exportação em `.csv` e `.json`, e o formulário completo de filtros.

**Menu Criar — referência criativa.** Escolha um anúncio que está no ar e a extensão
transforma o criativo dele em material de briefing para o **seu** negócio.

O que faz um criativo funcionar está no que ele mostra e no que é dito nele: o gancho dos
primeiros três segundos, a ordem dos argumentos, a prova que aparece na tela, o ritmo dos
cortes. O texto do anúncio (copy, título, CTA) o gestor duplica de uma peça para outra —
descrever o criativo por ele é descrever a embalagem. Por isso a leitura é feita em cima
do **vídeo e das imagens**, e o prompt manda ignorar o texto do anúncio.

Ao clicar, a extensão lê o criativo — no vídeo, frames em ordem, quatro deles nos três
primeiros segundos, o resto distribuído até o fim (vídeo longo ganha mais frames, até 12) —
e, se você tiver chave de transcrição configurada, extrai o áudio e **embute a fala
transcrita dentro do próprio prompt**. Nada vai para o disco antes de você pedir.

**Anúncio de imagem gera outro prompt.** Peça estática não tem gancho de três segundos
nem ritmo de corte: o que se copia dela é a hierarquia — o que está maior, o que o olho lê
primeiro, onde entra a prova, onde entra a chamada. Aí a entrega deixa de ser roteiro
falado e passa a ser a peça: para cada criativo, o **texto que vai escrito na arte**
(chamada, apoio, selo, botão, com limite de palavras em cada) e um **prompt de imagem
completo em bloco de código**, com cena, luz, paleta, composição e as palavras exatas a
renderizar entre aspas. O prompt ainda manda o chat **gerar o primeiro criativo na hora**,
se ele gerar imagem. A proporção não é chutada: sai do próprio arquivo do molde — 4:5,
1:1, 9:16 ou 16:9.

O botão principal baixa um **PDF com uma página por frame** (ou por imagem). É o formato que resolve o
problema real: chat nenhum descompacta `.zip`, e mosaico de frames numa imagem só perde a
legenda queimada quando o modelo reduz a imagem. Em PDF cada página é lida por conta
própria, e os três chats abrem PDF nativamente. Cola o prompt, anexa o PDF, envia.

Quem quiser os arquivos crus tem o botão secundário: `.zip` com os frames soltos, o
`audio.wav` e o `prompt.txt`.

**Quem escreve é o chat que você já usa** — a extensão não gera texto por API. A única
chamada externa opcional é a transcrição do áudio, em **Opções → Transcrição da fala**:
OpenAI (Whisper) ou Google (Gemini), por volta de US$ 0,006 por minuto de vídeo. A
Anthropic não transcreve áudio. Sem chave, o prompt vai só com os frames — e as legendas
queimadas cobrem boa parte da fala nos criativos de negócio local. Preencha **Opções → Meu negócio** antes: nicho, oferta, promessa, provas,
objeções, cidade que você atende, tom e o que você não pode prometer. É esse bloco que
impede a copy genérica.

**Criativos** — a lista vem do GraphQL quando ele responde, que é a fonte completa
(todos os cards do carrossel); o DOM entra só como reserva, porque devolve o mesmo vídeo
com outro nome de arquivo. Capa de vídeo e variação de tamanho do mesmo arquivo não contam
como criativo. Por isso **Todos os criativos** fica desligado em anúncio de peça única — ele
só aparece quando há mesmo mais de um arquivo para baixar.

**Instagram do anunciante** não existe como item: a Biblioteca não publica o @ do perfil em
lugar nenhum da resposta, e montar o link a partir do nome da página é chute.

**Pesquisar anúncios deste anunciante** usa `view_all_page_id` com o `page_id` do anúncio —
o número que aparece na URL do perfil é id de perfil e a Biblioteca responde "Nenhum anúncio"
com ele. Sem `page_id`, cai para busca por nome do anunciante.

**Anúncios dinâmicos (DCO/DPA)** — nesses, a Biblioteca publica o gabarito no lugar da
copy: `{{product.name}}`, `{{product.brand}}`. A extensão resolve pelo caminho que tem o
texto de verdade — a copy de cada produto do catálogo, e depois o DOM — e o bloco de
informações ganha a lista dos produtos com descrição, preço e link. O que não resolver
não é copiado: o item do menu fica desligado, com o motivo no tooltip, e a cópia completa
só sai bloqueada quando falta texto principal ou título. Na URL de destino, macro em
parâmetro de rastreio (`utm_campaign={{campaign.name}}`) é descartada e o link continua
utilizável; macro no domínio ou no caminho invalida o link.

---

## Instalação (sem a Chrome Web Store)

1. Baixe ou clone esta pasta.
2. Abra `chrome://extensions`.
3. Ligue o **Modo do desenvolvedor**, no canto superior direito.
4. Clique em **Carregar sem compactação** e escolha a pasta do projeto (a que tem o
   `manifest.json`).
5. Abra uma busca na Biblioteca de Anúncios. Os cards ganham a barra de botões em menos
   de um segundo.

Depois de qualquer alteração no código, volte em `chrome://extensions` e clique no botão
de recarregar do cartão da extensão.

---

## Meu negócio

Em **Opções → Meu negócio** ficam os campos que entram no prompt de referência: nicho,
produto, oferta e preço, público, promessa central, provas que você tem, objeções, tom de
voz, restrições e a duração do vídeo. Nicho, produto, oferta e promessa são obrigatórios —
sem eles o menu Criar avisa e abre a tela.

Na mesma página você ajusta quantas imagens o prompt anexa (padrão 8, teto de 12 por causa
do limite dos chats) e quantos roteiros pedir.

O perfil fica em `chrome.storage.sync`, junto das outras preferências, e entra no arquivo
de exportação de configurações.
---

## Atalhos de teclado

Funcionam na página da Biblioteca, exceto quando o foco está num campo de texto.

| Tecla | Ação |
|---|---|
| `F` | liga/desliga o filtro ativo |
| `H` | mostra/esconde o painel lateral |
| `T` | volta ao topo |
| `R` | sincroniza (reprocessa todos os cards) |
| `Esc` | fecha o menu ou o modal aberto |
| `?` | abre a ajuda com os atalhos |

Segurando `Shift`: clique no botão de filtro do tray abre o painel de filtros; itens do
menu **Enviar** usam o compartilhamento nativo do sistema quando disponível.

---

## Privacidade

Tudo roda localmente, no seu navegador. A extensão **não tem backend, não coleta e não
envia nada para servidor nenhum** — a única requisição externa que ela faz é para o
provedor de IA que você mesmo configurar, e só quando você clica num item do menu Criar.
Zero telemetria.

A leitura do GraphQL descrita abaixo é **somente observação**: nenhuma requisição do
Facebook é alterada, reenviada ou criada, e cookies e tokens nunca são tocados.

---

## Se parar de funcionar

O Facebook reescreve o DOM da Biblioteca com frequência, e as classes CSS dele são
ofuscadas (`x1plvlek`, `xh8yej3`…) e mudam toda semana. Por isso **nenhuma linha desta
extensão depende de classe do Facebook**: os cards são achados pelo texto visível
("Identificação da biblioteca"), pela estrutura relativa e por atributos estáveis
(`role`, `href`, `aria-label`).

Quando algo quebrar, o conserto está concentrado em dois arquivos:

- `src/shared/constants.js` — as expressões regulares de cada idioma (Library ID, datas,
  "Ativo", "Ver mais", "N anúncios usam…").
- `src/content/scraper.js` — a descoberta dos cards e a extração campo a campo.

Há ainda uma segunda fonte de dados, mais confiável, em `src/content/inject.js`: ela lê as
respostas do GraphQL que a própria página já recebeu e delas tira a URL do vídeo em alta,
todos os cards do carrossel, título, descrição, CTA e o link real. Quando o GraphQL está
disponível, ele tem prioridade; o scraping do DOM fica como reserva.

Para um retrato do estado atual, abra o tray → **ℹ** → **Exportar diagnóstico**: ele copia
um JSON com versão, idioma, tema, quantos cards foram registrados, os filtros ativos e se
o service worker está respondendo.

---

## Estrutura

```
manifest.json
assets/         tokens.css · components.css · icons.css · Geist · ícones da extensão
vendor/         jszip.min.js
src/shared/     constants · i18n · storage · dom · messages · prompts
src/content/    index · scraper · card-ui · actions-* · filters · navbar · tray ·
                panel · toast · modal · theme · inject · content.css
src/background/ service-worker.js
src/panel/      painel lateral (iframe)
src/options/    página de opções
```

O design segue o design system **Conversão Extrema**: tokens semânticos de cor que trocam
entre claro e escuro, superfícies definidas por borda de 1px, tipografia Geist com tracking
negativo nos títulos e o acento esmeralda usado com parcimônia — incluindo a assinatura da
marca, a borda esmeralda giratória, contínua no CTA primário e revelada no hover dos
botões secundários. Os tokens ficam em `assets/tokens.css`; mudou lá, mudou em toda a
extensão.

---

## Licença e escopo

Reimplementação independente a partir de uma descrição funcional. Lê apenas dados que a
Biblioteca de Anúncios da Meta já publica abertamente, na tela do próprio usuário. Não
automatiza, não burla nada e não faz requisição em nome de ninguém.

---

## Créditos de terceiros

- **JSZip** (`vendor/jszip.min.js`) — MIT / GPLv3, usado para empacotar os criativos.
- **Geist** (`assets/geist.woff2`) — SIL Open Font License 1.1, © Vercel em colaboração
  com basement.studio. Texto da licença em `assets/GEIST-LICENSE.txt`.
