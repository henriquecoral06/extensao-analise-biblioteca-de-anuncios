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

**Menu Criar** — oito análises prontas (palavras-chave, público, persuasão, variações A/B,
oferta, avatar, ângulos de criativo, funil de quiz). Com chave de API configurada, a
resposta abre num modal. **Sem chave**, a extensão copia o prompt já preenchido com os
dados do anúncio e abre o Claude, o ChatGPT ou o Gemini — ou seja, é útil desde o primeiro
minuto, sem configurar nada.

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

## Chave de IA (opcional)

Em **Opções → Inteligência artificial**, escolha o provedor, cole a chave e, se quiser,
troque o modelo. O botão **Testar conexão** faz uma chamada real e diz o que aconteceu.

| Provedor | Modelo padrão |
|---|---|
| Anthropic (Claude) | `claude-sonnet-4-5` |
| OpenAI | `gpt-4.1-mini` |
| Google (Gemini) | `gemini-2.0-flash` |

A chave é gravada em `chrome.storage.local` — só neste dispositivo, nunca sincronizada,
nunca registrada no console e nunca incluída no arquivo de exportação de configurações.

Sem chave, tudo continua funcionando pelo caminho "copiar o prompt e abrir o chat".

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
