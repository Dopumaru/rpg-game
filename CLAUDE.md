# CLAUDE.md — regras de trabalho deste projeto

Instruções permanentes para sessões de Claude Code neste repositório
(`Forged Legend`, RPG de navegador em arquivo único `index.html`, com
mundo/batalha em three.js e personagens 2D como billboards). Leia isto
antes de alterar qualquer coisa.

Este arquivo segue a estrutura do template universal
(`CLAUDE.md.template`, neste mesmo repositório): seções 1 e 2 são a
metodologia universal (reutilizável em qualquer projeto), seções 3–8
são o preenchimento específico deste projeto.

---

## 1. Princípios universais de engenharia

### 1.1 Fluxo de mudança

- Entender a arquitetura afetada e o impacto da mudança antes de
  editar — nunca editar às cegas.
- Fazer alterações pequenas e verificáveis, uma de cada vez.
- Evitar refatorações não solicitadas. Se uma refatoração parecer
  necessária para cumprir o pedido, explicar o motivo antes de fazê-la.
- Não alterar comportamento existente sem explicar o motivo — nem "de
  passagem" numa mudança que pediu outra coisa.
- Revisar o diff antes de considerar qualquer alteração concluída, e
  confirmar que ele contém *só* o que foi pedido.

### 1.2 Investigação e causa raiz

- Diagnosticar antes de corrigir: ler o código relevante, formular
  hipótese explícita, só então agir.
- Ao investigar algo intermitente, definir um número máximo de
  tentativas de reprodução **antes** de começar. Não reproduzir dentro
  do limite é, em si, um resultado válido a reportar.
- Separar três categorias explicitamente ao encontrar uma falha:
  **bug de produto** (lógica incorreta, reproduzível), **bug de teste**
  (asserção/sincronização errada, produto correto), **problema de
  ambiente** (timing/recursos/infraestrutura, intermitente, não muda
  com o código).
- Antes de tratar uma falha como nova, comparar com a seção 8
  (Histórico de achados) — não reinvestigar do zero algo já
  documentado.
- Nunca mascarar uma falha intermitente apenas aumentando timeout sem
  entender a causa.

### 1.3 Testes

- Usar execução seletiva por escopo sempre que o harness oferecer isso
  — mas um teste seletivo nunca é equivalente à suíte completa; a
  suíte completa continua sendo o gate oficial antes de PR.
- Nunca criar scripts temporários que recortam manualmente pedaços de
  um arquivo de teste real para rodar isolado (isso já causou bugs de
  teste divergentes do arquivo real numa sessão anterior deste
  projeto — não repetir). Usar o mecanismo de seleção existente.
- Unidades de teste com dependência sequencial de estado são
  indivisíveis; não simular estado parcial via atalhos de debug sem
  justificar por escrito a técnica e as consequências.
- Nunca remover ou enfraquecer uma verificação para fazer a suíte
  passar; nunca alterar timeout/condição/asserção só para reduzir
  duração sem antes explicar o impacto e obter concordância.
- Qualquer mudança estrutural no harness de testes deve ser aditiva —
  o comportamento padrão da suíte completa continua idêntico.

### 1.4 Performance e otimização

- Medir antes de otimizar — nunca por intuição de onde "parece" lento.
- Instrumentação usada para medir deve ser sempre aditiva (nunca
  remove/altera lógica testada) e auditável por diff. Preferir cópia
  temporária quando o arquivo real não pode ser tocado, e remover ao
  final.
- A própria instrumentação não pode introduzir a variável que se quer
  medir.
- Priorizar por impacto real medido (percentual do tempo total), nunca
  pela primeira coisa que parece lenta.
- Medir de novo com o mesmo método após qualquer otimização, e
  comparar antes/depois explicitamente.
- Preservar cobertura ao otimizar testes.

### 1.5 Processos longos / background

- Verificar se já existe uma execução equivalente em andamento antes
  de iniciar algo longo — não duplicar.
- Nunca reiniciar um serviço do qual uma execução ativa depende.
- O rótulo "parado"/timeout da interface de tarefas não prova que o
  processo morreu — verificar estado real (`ps -p <pid>`, mtime e
  conteúdo do arquivo de saída) antes de decidir o próximo passo.
- Não ficar consultando um processo em loop; se for esperar, agendar
  uma checagem única mais adiante (ex. `send_later`).
- Se o ambiente reiniciar sozinho no meio de uma tarefa, verificar a
  saúde do ambiente (processos, serviços dependentes) antes de repetir
  o comando que "falhou".

### 1.6 Git / commit / push / PR

- Nunca commitar, dar push ou abrir PR sem pedido explícito para
  aquela ação específica.
- Ao commitar, checar `git status` antes e depois; incluir só os
  arquivos pedidos.
- Suíte completa verde é pré-requisito para PR, salvo pedido explícito
  em contrário.
- Ao reestruturar um arquivo sem mudar sua lógica, usar diff
  insensível a formatação para provar que nada funcional mudou, além
  do diff bruto.

### 1.7 Comunicação em tarefas longas

- Explicar o que está sendo executado e por quê.
- Distinguir processo realmente ativo (verificado no SO) de tarefa
  marcada como parada pela interface.
- Não criar trabalho redundante enquanto se espera algo terminar.
- Ao finalizar: checks executados, quantos passaram, quantos
  falharam, se houve erros de JavaScript, duração aproximada e código
  de saída.
- Ser explícito quando algo não foi confirmado/reproduzido, em vez de
  apresentar uma hipótese como fato.

---

## 2. Protocolo de investigação e otimização

```
0. ESCOPO E TRAVAS
   ↓
1. ENTENDER (ler código + este CLAUDE.md)
   ↓
2. INSPECIONAR EVIDÊNCIA JÁ EXISTENTE ── suficiente? ──sim──→ pular para 6
   ↓ não
3. FORMULAR HIPÓTESE(S) explícita(s), ranqueadas por plausibilidade
   ↓
4. DECIDIR SE PRECISA INSTRUMENTAR ── não precisa ──→ pular para 5
   ↓ precisa
4b. INSTRUMENTAR (aditivo, auditável por diff, cópia temporária)
   ↓
5. MEDIR / REPRODUZIR (limite de tentativas definido ANTES de começar)
   ↓
6. CLASSIFICAR A CAUSA (determinístico vs. intermitente →
   produto vs. teste vs. ambiente)
   ↓
7. [SÓ PERFORMANCE] PRIORIZAR POR IMPACTO MEDIDO
   ↓
8. PROPOR (causa + evidência + confiança + trade-offs) ──→ AGUARDAR APROVAÇÃO
   ↓ aprovado
9. IMPLEMENTAR (uma mudança pequena por vez)
   ↓
10. VALIDAR (teste seletivo relevante → full suite → medir de novo se
    foi otimização → comparar antes/depois)
   ↓
11. REVISAR DIFF
   ↓
12. DOCUMENTAR o achado na seção 8 (Histórico de achados)
```

Árvore de decisão para classificar causa de falha (fase 6):

```
A falha se repete de forma idêntica em toda execução com o mesmo input?
├── SIM → determinístico → bug de produto (ou de teste, se a asserção
│         está errada).
└── NÃO → intermitente → comparar com a seção 8 primeiro; se for nova:
          ├── falta espera/checagem de assentamento no teste? → TESTE
          ├── corrida genuína na lógica do produto? → PRODUTO
          └── ligado ao ambiente (WebGL por software, CPU
              compartilhada)? → AMBIENTE
```

---

## 3. Protocolo de testes deste projeto

O harness de testes é `test.mjs` (Playwright + Chromium headless,
`/opt/pw-browsers/chromium`, servido por `python3 -m http.server 8777`
a partir da raiz do repo). **`test.mjs` não é versionado neste
repositório** — vive no diretório de scratchpad da sessão atual, não
na raiz do repo. Cada sessão nova pode não ter o arquivo pronto;
verifique antes de assumir que ele existe, e não presuma que mudanças
nele persistem entre sessões a menos que sejam explicitamente salvas
em algum lugar durável.

`test.mjs` tem **200 verificações executadas em runtime**
(`check(...)`), organizadas em 22 seções, agrupadas em 5 **unidades de
execução**. (196 é a contagem de *linhas* `check(` no código-fonte —
não confundir com o total real de 200: a seção 16 tem um `check()`
dentro de um loop de 5 inimigos, gerando 5 execuções a partir de 1
único ponto no código-fonte. Ver Histórico de achados.)

| Unidade | Seções | Conteúdo |
|---|---|---|
| `cadeia-progressao` | 1–18 | criação de personagem, classes, status, loot, loja, encantamento, pets, os 3 chefes, game over, save/load, polimento, técnicas, aparência |
| `catalogo-desmonte` | 19 | catálogo de equipamentos, materiais, desmontar |
| `render3d` | 20 | renderizador 3D (WebGL, chunks, billboards, arena de batalha) |
| `npcs-missoes` | 21 | NPCs, mascates, cadeia de missões |
| `pesca-mapa` | 22 | visibilidade dos mestres, pesca, mapa interativo |

`cadeia-progressao` (seções 1–18) é uma única cadeia de estado
sequencial, sem reset entre seções — cada seção depende do que a
anterior deixou (equipamento, nível, flags de chefe, etc.). As seções
12 e 13, por exemplo, são literalmente uma única batalha contínua.
Tratar `cadeia-progressao` como unidade **indivisível**: não existe (e
não deve ser criado) um id de unidade para uma seção solta dentro
desse intervalo.

Use testes seletivos durante o desenvolvimento sempre que o escopo da
alteração permitir:

```
node test.mjs --only=pesca-mapa
node test.mjs --only=npcs-missoes
node test.mjs --only=render3d
node test.mjs --only=catalogo-desmonte
node test.mjs --only=cadeia-progressao
node test.mjs --only=pesca-mapa,npcs-missoes   # múltiplas unidades
```
A ordem de execução ao combinar unidades segue sempre a ordem
canônica da tabela acima, não a ordem em que foram digitadas na flag.

`node test.mjs` sem argumentos é a **suíte completa** e continua
obrigatória antes de considerar qualquer alteração pronta para PR:

- executar exatamente `node test.mjs` (sem flags);
- aguardar a conclusão **real** do processo, não uma estimativa;
- confirmar o resultado final (`RESULTADO: X passaram, Y falharam`);
- confirmar que não há erros de JavaScript (`sem erros de JavaScript`);
- confirmar que a execução terminou normalmente (código de saída,
  processo não mais listado em `ps`, sem exceção não tratada no log);
- não abrir PR enquanto a suíte completa ainda estiver rodando;
- não iniciar uma segunda suíte completa enquanto outra já estiver
  ativa.

## 4. Protocolo de performance deste projeto

- Para medir tempo por unidade/seção sem alterar `test.mjs`: gerar uma
  cópia instrumentada (marcas de tempo síncronas após cada cabeçalho
  de seção + wrapper de tempo em torno de cada `u.run()` no driver),
  rodar **uma única vez**, extrair os números, apagar a cópia.
  Confirmar por diff que a cópia só teve linhas adicionadas.
- Duração de referência da suíte completa (última medição, ver
  Histórico de achados): **≈13–14 minutos**.
- Gargalos conhecidos e candidatos de otimização: ver Histórico de
  achados — nenhum foi implementado ainda.

## 5. Git / commit / push / PR — convenções deste projeto

- Branch de trabalho: `claude/rpg-game-progression-hzcd4f`.
- Repositório: `dopumaru/rpg-game`.
- Nunca incluir modelo/identificador de IA em commits, PRs ou código.
- Fluxo esperado: alteração → teste seletivo relevante → correções →
  teste seletivo de novo → suíte completa → revisão do diff → commit →
  push → PR. Nunca abrir PR antes da suíte completa terminar verde,
  salvo pedido explícito em contrário.

## 6. Ambiente de execução deste projeto

- Servidor local: `python3 -m http.server 8777` a partir da raiz do
  repo (serve `index.html` e os assets do jogo).
- Nunca reiniciar esse servidor enquanto uma suíte que depende dele
  estiver executando — isso já invalidou um run completo numa sessão
  anterior.
- Chromium headless via Playwright: `/opt/pw-browsers/chromium`.
- Logs, cópias instrumentadas e saídas de execução ficam no scratchpad
  da sessão (não no repo) — nada ali é durável entre sessões a menos
  que seja copiado para dentro do repositório e commitado.

## 7. Conhecimento específico do projeto

- Arquitetura: `index.html` era um arquivo único até 2026-08-20;
  desde então o jogo é dividido em 9 módulos carregados via `<script
  src>` clássico (não ES modules — todos compartilham o mesmo escopo
  léxico global de `index.html`, então símbolos são resolvidos por
  nome, sem `import`/`export`):
  `render/tiles.js`, `economy/shop.js`, `quests/quests.js`,
  `craft/altar.js`, `sprites/sprites.js`, `battle/battle.js`,
  `render3d/render3d.js`, `world/world.js`, `ui/screens.js`. O que
  sobrou em `index.html` (núcleo: bootstrap do motor, tabelas de
  dados centrais, estado do jogador `G`/`P`, persistência,
  partículas, o loop principal `frame()` e `window.DBG`) caiu de
  11.657 para ~800 linhas. Detalhes de cada extração (escopo,
  dependências que ficaram cross-cutting no core, validação) estão no
  Histórico de Achados (seção 8). three.js embutido no primeiro
  `<script>` do arquivo (bundle minificado, nunca tocado pelas
  extrações) para o mundo/batalha em 3D; personagens 2D renderizados
  como billboards sobre a cena 3D.
- Renderização neste ambiente de teste roda **WebGL por software**
  (sem GPU) — é a causa raiz de praticamente toda a imprevisibilidade
  de timing observada nos testes deste projeto.
- API de debug do jogo: `window.DBG`, usada extensivamente pelo
  harness para setup determinístico (bypassa navegação de UI real).
  Hooks de teste específicos: `pescaFisgar()`, `pescaExpira()`,
  `clearSave()`, `start()`.
- Helpers de teste que escondem custo de tempo por trás de uma única
  chamada: `grindBattle`, `aguardaMenu`, `exitBattle` (cada um faz seu
  próprio polling interno, com teto de até 12000ms por chamada de
  `aguardaMenu`).
- `page.reload()` completo (reboot do engine/three.js) acontece 5
  vezes no arquivo, em checks de persistência de save/load (seções
  15, 18, 19, 21, 22) — custo real não capturado por contagem de
  `waitForTimeout`/`ateQue`.
- Achado de código (não confirmado como causa de nenhuma flakiness
  até agora, mas real): em `index.html`, a interação por `Z` prioriza
  tiles interativos (inclusive água) sobre conversa com NPC —
  `if (alvoNPC && !TILES_INTERATIVOS.includes(f.t))`. Se um NPC algum
  dia ficar posicionado de forma que o jogador o encare através de uma
  tile de água, a conversa é silenciosamente pulada em favor da pesca.

## 8. Histórico de achados

### 2026-08-19 — Contagem real de checks: 200, não 196
- O que foi investigado: divergência entre a contagem estática de
  `check(` no código-fonte (196 linhas) e o total real reportado por
  `node test.mjs` (`RESULTADO: 200 passaram`).
- Causa encontrada: a seção 16 tem um único `check('inimigo novo em
  batalha: ' + tipo, ...)` dentro de um `for` que itera 5 tipos de
  inimigo — 1 ponto no código-fonte, 5 execuções em runtime.
  `196 - 1 + 5 = 200`, batendo exatamente com o `RESULTADO`.
- Classificação: não é bug — era um erro meu de contagem numa resposta
  anterior desta mesma sessão, corrigido aqui.
- Ação: nenhuma alteração de código; só o registro correto do número.

### 2026-08-19 — Duas flakinesses conhecidas (pré-existentes ao
refactor de `--only`)
- `Z longe da água não inicia pesca` / sequência inicial da seção de
  pesca — corrida de timing ocasional logo após `clearSave()+start()`.
- `morador perambula pelo mapa` (seção 21) — o NPC pode não acumular
  deslocamento suficiente dentro da janela de espera sob carga de
  sistema alta.
- Classificação: ambiente (WebGL por software, timing de quadro
  imprevisível).
- Ação: nenhuma correção implementada; documentadas para não serem
  reinvestigadas do zero.

### 2026-08-19 — Nova falha em cascata observada em `pesca-mapa`
- O que foi investigado: durante uma execução instrumentada da suíte
  completa, `pesca-mapa` teve 4 falhas em cascata a partir de "não
  fisgar a tempo faz o peixe escapar, sem adicionar nada", que
  arrastou "conversar com o pescador abre a peixaria", "comprar a vara
  de bambu" e "vender um peixe".
- Investigação: leitura completa de `iniciaPesca()`, `updatePesca()`,
  `pescaFisgar()`/`pescaExpira()` e do mecanismo de fila de toques
  (`filaToques`/`tap()`, com aging de até 8 quadros) em `index.html`.
  3 tentativas de reprodução com instrumentação de debug adicional —
  nenhuma reproduziu a falha; a máquina de estados se comportou
  corretamente nas 3.
- Causa encontrada: **não confirmada por reprodução**. Hipótese mais
  provável: corrida de timing ambiental (mesma família das duas
  flakinesses acima), possivelmente ligada à ausência de uma espera de
  assentamento entre `pescaExpira()` e a interação seguinte
  (`irPara('pescador')` + `press('z')`) — diferente de outros pontos
  do arquivo que usam `ateQue` depois de transições reais.
- Classificação: ambiente, com confiança moderada (não alta — não foi
  reproduzida).
- Esta falha **não é** a mesma que as duas já documentadas acima —
  é um ponto diferente da mesma área frágil (pesca/timing).
- Correção recomendada, **não implementada**: adicionar uma espera de
  assentamento (`ateQue` checando `state==='world' && !G.pesca`, ou
  equivalente) logo após `pescaExpira()`, antes de `irPara('pescador')`.

### 2026-08-19 — Mapa de gargalos de performance (medição única,
instrumentação temporária e aditiva, depois removida)
- Duração total da suíte completa nesta medição: **≈787s (~13min7s)**.
- Tempo por unidade: `cadeia-progressao` 547.0s (69.5%) ·
  `catalogo-desmonte` 82.7s (10.5%) · `npcs-missoes` 63.4s (8.1%) ·
  `pesca-mapa` 63.4s (8.1%) · `render3d` 29.2s (3.7%).
- Top gargalos individuais (seção/unidade — tempo — classificação):
  1. Seção 16 (Polimento) — 123.7s — batalha + polling + espera
     necessária (medição de corrida vs. caminhada).
  2. Unidade `catalogo-desmonte` — 82.7s — processamento síncrono
     pesado (loops de 600–2000 iterações de rolagem de loot/material)
     + 1 batalha real + esperas fixas de UI.
  3. Unidade `npcs-missoes` — 63.4s — polling (até 25s de
     perambulação) + movimento/NPCs.
  4. Unidade `pesca-mapa` — 63.4s — polling (até 40s de fisgada) +
     pesca.
  5. Seção 17 (Técnicas) — 50.3s — batalha + espera de animação.
  6. Seção 13 (Chefe final) — 42.7s — batalha pura.
  7. Seção 2 (Criação de personagem) — 36.7s — fila de toques sob
     renderização lenta.
  8. Seção 11 (Necromante) — 36.0s — batalha pura.
  9. Seção 18 (Aparência) — 33.4s — renderização/WebGL (`getImageData`
     repetido).
  10. Seção 15 (Save/Load) — 30.0s — custo fixo de `page.reload()`.
- Esses 10 juntos somam 71.4% do tempo total.
- Já disponível hoje, sem nenhuma otimização adicional: usar `--only`
  em `catalogo-desmonte`/`render3d`/`npcs-missoes`/`pesca-mapa` já
  reduz de 787s para 29–83s (~90% de redução) para quem trabalha só
  nessas áreas.
- Otimizações candidatas identificadas — **nenhuma implementada**:
  1. Hooks DBG determinísticos para resolver/pular a fase de animação
     de turno de batalha (mesmo padrão de `pescaFisgar`/`pescaExpira`),
     reduzindo o polling de até 12s por turno em `aguardaMenu`.
  2. Reduzir esperas fixas encadeadas no loop de 5 inimigos da seção
     16 (11.5s só em `waitForTimeout` literais ali).
  3. Investigar consolidação dos 5 `page.reload()` completos sem
     perder a garantia de que cada sistema sobrevive a um reload real.
  4. Paralelizar as 4 unidades independentes (19–22), cada uma com seu
     próprio `browser`/`page` — viável porque não compartilham dado,
     só o processo hoje; exige medir custo de múltiplos Chromiums
     simultâneos no ambiente sem GPU antes de valer a pena.
  5. Revisar se os loops de rolagem de loot/materiais em
     `catalogo-desmonte` (600–2000 iterações por checagem) precisam de
     tantas iterações para significância estatística.
  6. Perfilar quanto do tempo pós-`page.reload()` é boot real do
     motor/assets vs. o `waitForTimeout(1000)` fixo logo depois.
  7. Revisar o custo de `filaVazia()` na sequência de criação de
     personagem (seção 2, ~15 teclas) — hoje é o 7º maior gargalo.
- Próximo passo (quando autorizado): escolher UMA dessas otimizações,
  medir antes com o mesmo método, implementar, medir depois, comparar.

### 2026-08-19 — Fase de otimização da suíte: 3 otimizações validadas,
fase encerrada

- **Baseline vs. estado atual**: full suite caiu de **787.3s** (medição
  original) para a faixa de **495–511s** nas medições após as 3
  otimizações — redução real de **~35%**, sem perder nenhum dos 200
  checks e sem enfraquecer nenhuma asserção.
- Protocolo seguido em todas as 3: medição cirúrgica isolada do bloco
  antes de propor → proposta apresentada (gargalo, causa, mudança,
  impacto esperado, risco, validação) → aprovação → implementação →
  `--only=cadeia-progressao` seletivo → full suite instrumentada →
  comparação antes/depois → remoção da instrumentação temporária.

**Otimização #1 — loop de 5 inimigos novos (Seção 16)**
- Causa do custo: cada uma das 5 iterações fazia `enemy.hp = 0` +
  `waitForTimeout(1400)` + `exitBattle()` (que envolve `press('z')` +
  polling) só para "limpar" entre iterações — nenhum `check()`
  dependia desse ciclo, só da leitura de `G.battle.enemy` logo após
  `battle(t, 5)`.
- Mudança: substituído por reset direto
  `page.evaluate(() => { window.DBG.G.state = 'world'; window.DBG.G.battle = null; })`.
  Validado que `startBattle()` (`index.html:6468`) sobrescreve
  `G.battle`/`G.state` incondicionalmente, sem depender de fechamento
  prévio via UI.
- Resultado: Seção 16 123.7s → 49.1s (**-60.3%**). Full suite 787.3s →
  511.1s nesta medição (com a ressalva de que parte dessa queda total
  veio de variância de ambiente entre as duas execuções, não só da
  mudança — confirmado comparando unidades não tocadas, que também
  caíram).

**Otimização #2 — blocos de bomba e veneno (Seção 16)**
- Causa do custo: mesmo padrão da #1, em mais dois pontos da mesma
  seção (depois de `'Bomba Ninja causou dano fixo'` e depois de
  `'teia da Jorogumo aplica veneno no jogador'`) — 8.20s e 10.12s de
  cleanup isolado, medidos separando explicitamente "tempo até a
  asserção" de "tempo de cleanup".
- Mudança: mesmo reset direto aplicado nos dois pontos.
- Resultado: Seção 16 49.1s → 32.6s (**-33.6%**). Full suite 511.1s →
  495.0s, desta vez sem grande confundidor de ambiente (ganho bateu
  quase 1:1 com o previsto).

**Otimização #3 — blocos de técnica-MP e cinemática (Seção 17)**
- Causa do custo: mesmo padrão, em `'técnica consumiu MP'` e
  `'cinemática dá lugar ao menu'` — 8.18s e 7.96s de cleanup isolado.
- Mudança: mesmo reset direto. Confirmado que nada depois de cada
  bloco depende do fechamento via UI (o próprio código já tinha uma
  defesa `if (await state() !== 'world') {...}` depois de um dos
  blocos, e a Seção 18 já abre com seu próprio `exitBattle()`
  defensivo — reforça que o padrão de reset direto já era
  implicitamente aceito no arquivo).
- Resultado: Seção 17 36.9s → 25.2s (**-31.7%**, bate com a faixa
  prevista pelo probe isolado). Nesta execução da full suite houve 1
  falha (`morador perambula pelo mapa`, seção 21/`npcs-missoes` — não
  tocada por esta mudança) e o total subiu para 510.4s por variância
  de ambiente numa unidade não relacionada. Classificado como a mesma
  flakiness já documentada acima (ambiente, pré-existente), não
  regressão — aceito como validado com essa ressalva registrada.

**Ranking final dos gargalos (última medição, com ressalva de ruído
elevado nesta execução específica — ver nota abaixo)**:
`npcs-missoes` 61.9s (12.1%) · `catalogo-desmonte` 54.1s (10.6%) ·
`pesca-mapa` 51.0s (10.0%) · Seção 13 (Vorax) 34.6s (6.8%) · Seção 16
(Polimento) 31.1s (6.1%) · Seção 11 (Necromante) 25.6s (5.0%) · Seção
17 (Técnicas) 25.2s (4.9%) · Seção 2 (Criação) 23.2s (4.6%) · Seção 18
(Aparência) 21.9s (4.3%) · `render3d` 20.6s (4.0%).

**Candidatos adiados (não implementados) e motivo**:
1. Resquício do mesmo padrão de cleanup não-testado em `render3d`
   (linha ~1010, depois de `'herói avança em 3D ao atacar'`) — não
   implementado por ser de magnitude pequena (poucos segundos), não
   por risco.
2. Hook DBG determinístico para "morador perambula" (mesmo padrão de
   `pescaFisgar`/`pescaExpira`) — adiado porque exige alterar
   `index.html`, categoria de decisão diferente da otimização
   harness-only feita nesta fase.
3. Reduzir iterações dos loops estatísticos de `catalogo-desmonte`
   (600–2000 por checagem) — adiado por risco de comprometer a
   confiança das asserções probabilísticas; exigiria uma análise
   estatística dedicada antes de mexer.
4. Afinar o `waitForTimeout(1000)` fixo pós-`page.reload()` (5
   ocorrências) — adiado por incerteza de quanto é boot real do motor
   vs. margem de segurança, sem medir antes.
5. Paralelizar as unidades independentes (19–22) — já listado na
   entrada anterior, continua não avaliado (custo de múltiplos
   Chromiums no ambiente sem GPU).

**Duas técnicas reutilizáveis identificadas** (candidatas a registrar
também no `CLAUDE.md.template`, fora do escopo desta entrada):
1. Reset direto de estado via hook de debug quando uma checagem só
   depende do estado de ENTRADA de uma operação — trocar "produzir
   efeito colateral real + esperar animação + sair pela UI" por um
   reset direto, sempre que confirmado que nada depende do ciclo
   completo. Usado 5 vezes nesta fase, sempre com o mesmo resultado
   seguro.
2. Hooks de teste determinísticos para vencer temporizadores
   aleatórios do produto (padrão já usado em `pescaFisgar`/
   `pescaExpira`) — candidato natural para a próxima rodada, se/quando
   formos mexer em `index.html` para acelerar `npcs-missoes`.

**Fase de otimização considerada encerrada nesta data.** Próxima etapa
combinada: planejamento do Graphify.

### 2026-08-19 — Primeira extração estrutural (`render/tiles.js`)
validada; nova classe de flakiness em `render3d` documentada

- O que foi feito: extração das 31 funções de bake/desenho de tiles
  (`bakeGrass`..`bakeTemplePath`, `bakeShop`,
  `drawWaterTile`/`drawFountainTile`/`drawAltarTile`/`drawCaveExitTile`,
  `drawTile`) de `index.html` para `render/tiles.js`, carregado via
  `<script src>` clássico (mesmo escopo léxico global, sem
  import/export). Mudança puramente estrutural, planejada com apoio do
  grafo do Graphify (ver achados anteriores). Commit `623d299`.
- Validação: `--only=cadeia-progressao` 94/94; `--only=render3d` 17/17
  em 3 execuções isoladas; suíte completa rodada 2x sem nenhuma
  alteração de código entre as execuções.
- Achado novo: na primeira execução da suíte completa pós-extração
  (197/200 passaram), 3 checks da Seção 20 (`render3d`) falharam
  juntos: "billboard do herói segue a posição do jogador", "câmera
  acompanha o jogador", "billboard reflete a mudança de aparência" —
  nunca antes documentados como flaky neste projeto.
- Investigação: leitura de `test.mjs:936-965` (os 3 checks dependem do
  laço `requestAnimationFrame(frame)` propagar `teleport()` dentro de
  janelas fixas de 400-500ms) e de `frame()`/`R3.mostra()` em
  `index.html:10963-11072`. `git diff` confirmou zero linhas tocando
  `frame()`/`updateWorld()`/`R3.*`/`teleport()`/`updateAmbient()` — a
  extração só mexeu em funções de bake/draw de tile 2D. Os valores
  travados na falha (`x:20,z:52.2`; câmera idêntica antes/depois)
  batem exatamente com o teleport de um check anterior (culling,
  `teleport(20,52)`), indicando que o laço de frames simplesmente não
  avançou dentro da janela de espera daquela execução específica — não
  que a lógica de posição esteja errada.
- Reprodução: 3/3 execuções isoladas de `--only=render3d` passaram
  limpo (17/17 cada, incluindo os 3 checks). Uma segunda execução
  completa da suíte (sem nenhuma alteração) teve 0 falhas na Seção 20,
  mas reproduziu 5 falhas diferentes e não sobrepostas: "correr
  (Shift) é mais rápido que andar" (Seção 16, novo — não documentado
  antes) e a cascata de pesca já registrada no achado de 2026-08-19
  acima ("não fisgar a tempo faz o peixe escapar" → cascata).
- Classificação: ambiente/timing (WebGL por software), mesma família
  das flakinesses já documentadas — não regressão estrutural da
  extração. Confiança moderada-alta: zero sobreposição de código entre
  a mudança e as funções envolvidas nas 3 falhas, zero reprodução em 4
  repetições subsequentes, e padrão disperso (falhas diferentes a cada
  execução) inconsistente com um bug determinístico introduzido pela
  extração.
- Ação: nenhuma correção implementada (fora de escopo desta etapa, não
  autorizada). Extração de `render/tiles.js` aceita como validada e
  commitada (`623d299`), com esta ressalva registrada para não ser
  reinvestigada do zero.
- Novo item para a lista de flakinesses conhecidas (uso futuro):
  cluster de 3 checks de billboard/câmera em `render3d`
  (`test.mjs:946,955,965`) pode falhar junto sob timing de ambiente;
  "correr (Shift) é mais rápido que andar" (Seção 16) também observado
  falhando isoladamente uma vez — nenhum dos dois com causa raiz
  confirmada por reprodução determinística ainda.

### 2026-08-20 — Segunda extração estrutural (`economy/shop.js`) e
terceira (`quests/quests.js`); nova ocorrência da mesma classe de
flakiness

- `economy/shop.js`: extração de 21 funções + constantes `NO_DROP`/
  `SHOP_STOCK` (loot, raridade, dismontar, estoque/preço de mascate,
  itens raros por região, exibição/atualização de loja), espalhadas em
  5 blocos não-contíguos do arquivo original (ao contrário de
  `render/tiles.js`, que era um único bloco). Cada função localizada e
  extraída individualmente por contagem de chaves. `matQty`, `addMats`,
  `emptyMats` e `dismantleYield` ficaram em `index.html` por serem
  usados também por persistência, batalha e o altar de encantamento;
  `varaAtual` ficou por pertencer à pesca, apesar de estar fisicamente
  perto de `rollPeixe`/`comprarVara` no arquivo original. Validação:
  `--only=cadeia-progressao` 94/94; suíte completa 200/200, 0 falhas,
  sem flakiness observada. Commit `b6f292e`, PR #16, mergeado.
- `quests/quests.js`: extração de 18 símbolos (`QUESTS` + cadeia de
  missões, HUD, seta guia, `conversaNPC`, `falaAleatoria`, tela de
  oferta), em 4 blocos majoritariamente contíguos. `TILES_INTERATIVOS`
  e `desenhaMarcaNPC` ficaram em `index.html` por serem usados pela
  interação genérica do mundo e pelo desenho de NPC, não por serem
  lógica de missão em si. Validação: `--only=cadeia-progressao` 94/94;
  `--only=npcs-missoes` isolado 30/30 (limpo, incluindo os 2 checks
  abaixo); suíte completa, 1ª execução: 198/200, com 2 falhas novas
  ("mascate abre a própria loja", "a loja do mascate lista a carga
  dele" — Seção 21); suíte completa, 2ª execução (sem nenhuma
  alteração de código): 200/200, não reproduziu.
- Investigação das 2 falhas: mesmo padrão já registrado para o cluster
  de `render3d` (achado anterior, mesma data de sessão) — falha só
  aparece na execução completa de longa duração, nunca isolada nem em
  repetição imediata. Hipótese mais provável: fila de toques
  (`tap()`/`filaToques`, aging de até 8 quadros) perdendo o `press('z')`
  sob jank de frame acumulado, mesma família de causa raiz (WebGL por
  software) documentada em outros pontos deste arquivo. Não
  investigado com o mesmo nível de profundidade (leitura linha a linha)
  do achado de `render3d`, porque o padrão de sintoma já é conhecido:
  registrado aqui para não precisar reinvestigar do zero, não com a
  mesma confiança "moderada-alta" já estabelecida para o caso anterior.
- Ação: nenhuma correção implementada. `quests/quests.js` aceito como
  validado e commitado, com esta ressalva registrada.
- Novo item para a lista de flakinesses conhecidas: falhas de
  interação por `press('z')` com NPC mascate (Seção 21,
  `test.mjs` próximo à linha 1184) sob suíte completa de longa duração
  — mesma família da fila de toques já suspeita nos achados de pesca.

### 2026-08-20 — Quarta (`craft/altar.js`) e quinta (`sprites/sprites.js`)
extrações estruturais

- `craft/altar.js`: extração de 5 funções (`canEnchant`, `altarList`,
  `drawEnchant`, `encantar`, `updateEnchant`) — o menor módulo até
  então. `enchLvl`, `enchCost`, `enchMatCost`, `eqName`, `enchBonus`,
  `askConfirm`, `drawConfirm`, `drawMatBar` e `ENCH_MAX` ficaram em
  `index.html` por serem usados também pela tela de equipamento do
  menu de pausa. Validação: `--only=cadeia-progressao` 94/94; suíte
  completa 198/200 na 1ª execução (2 falhas de mascate, mesma
  flakiness já documentada), 200/200 na 2ª execução, não reproduziu.
  Commit `5054323`, PR #18, mergeado.
- `sprites/sprites.js`: extração de 26 símbolos — o maior módulo desta
  fase (1.434 linhas), quase todo tabelas de arte pixel (`HEADS`,
  `BODIES`, `ARMOR_ART`, `WEAPON_ART`, `HELM_ART`, `ENEMY_ART`,
  `PET_ART`, `HAIR_ART`, `ACESSORIO_PATCH`) mais funções de
  composição (`heroSprite`, `composeSprite`, `npcSprite`,
  `enemySprite`, `petSprite`). `weaponType`, `curClass`, `className`,
  `defaultLook`, `setActive` e as listas de opções de aparência
  (`PELE`/`COR_CABELO`/`COR_OLHOS`/`ESTILO_CABELO`/`CORPO`) ficaram no
  core por serem usadas também pela tela de criação de personagem.
  Validação: `--only=cadeia-progressao` 93/94 (1 falha já
  documentada — "correr é mais rápido que andar" — sem relação com
  sprites); suíte completa 200/200, 0 falhas. Commit `5449c40`, PR
  #19, mergeado.

### 2026-08-20 — Sexta (`battle/battle.js`) e sétima
(`render3d/render3d.js`) extrações estruturais; reordenação do plano

- `battle/battle.js`: primeira extração combinada desde
  `economy/shop.js` — motor de batalha (técnicas, turnos, dano, IA do
  inimigo, fuga, itens) **e** HUD/desenho da tela de combate no mesmo
  arquivo (1.129 linhas, 29 símbolos), porque a análise do Graphify já
  havia identificado dependência circular real entre eles (17/17
  arestas). `gainXP`, `petDmg`, `spawnParticle`, `barRect`, `matQty` e
  `addMats` ficaram no core (usados também por mundo, persistência e
  menu de pausa). Validação: `--only=cadeia-progressao` 94/94 (todos
  os 3 chefes); suíte completa 200/200, 0 falhas — sem nenhuma
  flakiness desta vez, apesar de ser a mudança de maior superfície até
  então. Commit `20edf3c`, PR #20, mergeado.
- **Achado que mudou a ordem planejada**: ao inspecionar a região que
  seria `world/`, o renderizador 3D (`R3`, `MODELOS3`, ~800 linhas)
  apareceu fisicamente encravado no meio dela, entre `updateNPCs`/
  pesca/mapa e `drawWorld`. Extrair `world/` primeiro exigiria cortar
  ao redor desse bloco inteiro. Decisão (aprovada explicitamente):
  inverter a ordem e extrair `render3d/` antes de `world/`.
- `render3d/render3d.js`: extração de 18 símbolos (944 linhas) — `R3`
  (motor completo, 450 linhas), `MODELOS3`, `GEOS`/`geo3`,
  `escala2x`/`4x`, `desenhaMundo3D`, extensão da arena de batalha 3D
  via `Object.assign(R3, {...})`. Achado durante a inspeção:
  `desenhaPersonagens2D` (renderizador 2D de reserva) e
  `desenhaMarcaNPC` (usado tanto pelo caminho 2D quanto pelo 3D)
  ficaram no core apesar de estarem fisicamente no meio do bloco —
  não são exclusivos do render3d. Validação: `--only=cadeia-progressao`
  94/94; suíte completa 200/200, 0 falhas, incluindo a Seção 20
  (billboards/câmera/arena 3D) diretamente. Commit `641c397`, PR #21,
  mergeado.

### 2026-08-20 — Oitava extração estrutural (`world/world.js`)

- Extração combinada de mapgen (`genOverworld`, `genCave`, `REGIONS`,
  `regionAt`) e simulação (`updateWorld`, `tryMove`, `spawnEnemies`,
  `updateNPCs`, `updateAmbient`) no mesmo arquivo — 590 linhas, 22
  símbolos — mesmo padrão de `battle/battle.js`, por causa da
  dependência circular real (6/8 arestas) já identificada na análise
  do Graphify. `G`/`P`/`newPlayer`, o sistema de partículas completo,
  `fadeTo`, `treeSpecies`, `FALAS`, `TILES_INTERATIVOS` e `drawWorld`
  ficaram no core. Validação: `--only=cadeia-progressao` 94/94; suíte
  completa, 1ª execução: 198/200 (2 falhas de `render3d` já
  documentadas); 2ª execução: 199/200 (1 falha de movimento, também já
  documentada, **zero sobreposição** com a 1ª execução) — nenhuma das
  3 falhas observadas nas duas execuções tem relação de código com
  `world.js`. Commit `9c61267`, PR #22, mergeado.

### 2026-08-20 — Nona e última extração estrutural (`ui/screens.js`);
série de extrações estruturais encerrada

- Módulo final planejado com apoio do Graphify: telas de menu
  (título, pausa/equipamento, criação de personagem, aprender técnica,
  game over, vitória, diálogo, confirmação genérica) mais o sistema de
  pesca completo e o mapa interativo — 1.322 linhas, 42 símbolos.
  `desenhaPersonagens2D`, `drawWorld`, `drawWorldHUD`, `barRect`,
  `ESTADOS_3D` e `desenhaMarcaNPC` ficaram no core por serem chamados
  diretamente por `frame()`, não são telas de menu.
- Validação: `--only=cadeia-progressao` 94/94 (não exercita pesca);
  `--only=pesca-mapa` isolado 32/32, limpo, incluindo os 5 checks que
  falharam na suíte completa; suíte completa, 1ª execução: 195/200 (5
  falhas — cascata de pesca, mesma classe de flakiness de ambiente já
  documentada, mas com 1 check a mais que a cascata original de 4 —
  "a pesca devolve o jogador ao mundo" — registrado aqui como extensão
  do mesmo cluster); 2ª execução sem nenhuma alteração: 200/200, não
  reproduziu. Commit `fbd0872`, PR #23, mergeado.
- **Resumo da série completa (9 módulos)**: `index.html` caiu de
  11.657 para ~800 linhas (~93% de redução no núcleo). Ordem real de
  extração: `render/tiles.js` → `economy/shop.js` → `quests/quests.js`
  → `craft/altar.js` → `sprites/sprites.js` → `battle/battle.js` →
  `render3d/render3d.js` (reordenado, ver achado acima) →
  `world/world.js` → `ui/screens.js`. Cada extração seguiu o mesmo
  protocolo: inspeção precisa de dependências (com correções ao longo
  do caminho — funções que o mapeamento inicial do grafo classificou
  errado, como `bakeShop()`/`drawAltarTile()` para tiles, ou que só a
  leitura direta do código revelou, como `estoqueLoja()`/`ENEMY_ART`/
  `PET_ART` para shop/sprites) → apresentação do plano →
  implementação → `--only=cadeia-progressao` → suíte completa → (se
  flakiness já conhecida: confirmação por repetição, sem reinvestigar
  do zero) → commit → push → PR. Todas as 9 extrações preservaram
  `window.DBG` intacto e não alteraram nenhuma lógica de jogo.

### 2026-08-20 — Investigação do Graphify no repositório real
pós-extração

- Com o código dividido em módulos `.js` reais, `graphify extract .
  --code-only` finalmente processa o código autoral sem precisar do
  workaround de copiar para um diretório isolado (usado durante a POC,
  quando tudo ainda estava em `index.html` e era classificado como
  documento, não código). Resultado: 230 nós, 434 arestas, 9
  comunidades, a partir de 9 arquivos `.js` (`index.html` continua de
  fora — ainda é classificado por extensão como documento, não
  código).
- `graphify benchmark`: 22.1x menos tokens por consulta (custo médio
  ~694 tokens vs. ~15.333 tokens de leitura ingênua do corpus de 9
  arquivos). Duas ressalvas relevantes, verificadas antes de comunicar
  o número: (1) o grafo não inclui `index.html` — o núcleo do jogo
  (`frame()`, `G`, `P`, `window.DBG`) fica fora da cobertura; (2) o
  benchmark mede responder UMA pergunta arquitetural via
  `graphify query` vs. ler o corpus inteiro — não mede trabalho de
  edição/implementação, que é onde a maior parte dos tokens desta
  sessão foi gasta, já que ler o arquivo antes de editar continua
  necessário independente do grafo.
- Investigação do hook `PreToolUse` (`graphify claude install`) via
  leitura direta do código-fonte instalado
  (`graphify/install.py`/`cli.py`, não documentação): dispara em
  `Bash|Grep` (busca) e `Read|Glob` (leitura); não é chamada de LLM,
  custo de execução desprezível; no modo padrão (não-strict) só
  injeta uma sugestão curta (`additionalContext`) para tentar
  `graphify query` antes de ler/grepar — nunca bloqueia. Existe um
  modo `strict` (opt-in, não é o padrão) que bloqueia a primeira
  leitura crua por sessão de um arquivo indexado. Avaliação
  comunicada ao usuário antes da instalação: útil para exploração
  arquitetural (o tipo de pergunta feita durante o planejamento das 9
  extrações), pouco relevante para sessões de edição rotineira.
- Decisão do usuário: instalar mesmo assim (`graphify claude install`,
  modo padrão/não-strict).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
