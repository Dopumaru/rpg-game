# CLAUDE.md — regras de trabalho deste projeto

Instruções permanentes para sessões de Claude Code neste repositório
(`Forged Legend`, RPG de navegador em arquivo único `index.html`, com
mundo/batalha em three.js e personagens 2D como billboards). Leia isto
antes de alterar qualquer coisa.

## 1. Fluxo de desenvolvimento

- Antes de alterar código, entender a arquitetura afetada e o impacto da
  mudança — não editar às cegas.
- Fazer alterações pequenas e verificáveis, uma de cada vez.
- Evitar refatorações não solicitadas. Se uma refatoração parecer
  necessária para cumprir o pedido, explicar o motivo antes de fazê-la.
- Não alterar comportamento existente sem explicar o motivo — nem "de
  passagem" numa mudança que pediu outra coisa.

## 2. Testes

O harness de testes é `test.mjs` (Playwright + Chromium headless,
`/opt/pw-browsers/chromium`, servido por `python3 -m http.server 8777`
a partir da raiz do repo). **`test.mjs` não é versionado neste
repositório** — ele vive no diretório de scratchpad da sessão atual, não
na raiz do repo. Isso significa: cada sessão nova pode não ter o arquivo
pronto; verifique antes de assumir que ele existe, e não presuma que
mudanças nele persistem entre sessões a menos que sejam explicitamente
salvas em algum lugar durável.

`test.mjs` tem 200 verificações (`check(...)`) organizadas em 22 seções,
agrupadas em 5 **unidades de execução**:

| Unidade | Seções | Conteúdo |
|---|---|---|
| `cadeia-progressao` | 1–18 | criação de personagem, classes, status, loot, loja, encantamento, pets, os 3 chefes, game over, save/load, polimento, técnicas, aparência |
| `catalogo-desmonte` | 19 | catálogo de equipamentos, materiais, desmontar |
| `render3d` | 20 | renderizador 3D (WebGL, chunks, billboards, arena de batalha) |
| `npcs-missoes` | 21 | NPCs, mascates, cadeia de missões |
| `pesca-mapa` | 22 | visibilidade dos mestres, pesca, mapa interativo |

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

`node test.mjs` sem argumentos é a **full suite** e continua obrigatória
antes de considerar qualquer alteração pronta para PR.

## 3. Regra de seleção

- Não criar scripts temporários copiando trechos de `test.mjs` para
  rodar uma seção à parte (isso já causou bugs de teste divergentes do
  arquivo real numa sessão anterior — não repetir).
- Não extrair manualmente seções para arquivos `.mjs` separados.
- Usar sempre o mecanismo `--only` existente.
- Nunca tratar um teste seletivo como equivalente à full suite — um
  `--only` verde não é sinal de PR pronto.
- Se a alteração afetar múltiplos sistemas, selecionar todas as
  unidades relevantes (`--only=a,b,c`), não só uma.
- Se houver dúvida sobre qual unidade cobre a área alterada, analisar
  o código/os nomes das seções primeiro em vez de simplesmente rodar a
  full suite por segurança.

## 4. Cadeia de progressão

- `cadeia-progressao` (seções 1–18) é uma única cadeia de estado
  sequencial, sem reset entre seções — cada seção depende do que a
  anterior deixou (equipamento, nível, flags de chefe, etc.). As seções
  12 e 13, por exemplo, são literalmente uma única batalha contínua.
- Tratar `cadeia-progressao` como unidade **indivisível**: não tentar
  executar uma seção isolada de 1–18. Não existe (e não deve ser
  criado) um id de unidade para uma seção solta dentro desse intervalo.
- Não criar fixtures artificiais para simular um pedaço da cadeia (ex.:
  forçar nível/equipamento via DBG para "pular" para a seção 10) sem
  antes explicar por escrito a justificativa técnica e as consequências
  — isso pode mascarar dependências reais entre seções.

## 5. Full suite

Antes de abrir um PR:

- executar exatamente `node test.mjs` (sem flags);
- aguardar a conclusão **real** do processo, não uma estimativa;
- confirmar o resultado final (`RESULTADO: X passaram, Y falharam`);
- confirmar que não há erros de JavaScript (`sem erros de JavaScript`);
- confirmar que a execução terminou normalmente (código de saída,
  processo não mais listado em `ps`, sem exceção não tratada no log);
- não abrir PR enquanto a full suite ainda estiver rodando;
- não iniciar uma segunda full suite enquanto outra já estiver ativa.

## 6. Processos em background

- Antes de iniciar um teste potencialmente longo, verificar se já
  existe uma execução equivalente em andamento (`ps aux`, arquivo de
  output do run anterior) — não duplicar trabalho.
- Nunca iniciar uma segunda full suite redundante.
- Nunca reiniciar o servidor HTTP local (`python3 -m http.server 8777`)
  enquanto uma suíte que depende dele estiver executando — isso já
  invalidou um run completo numa sessão anterior.
- Se um comando atingir o timeout do mecanismo de espera mas o processo
  real continuar ativo, não assumir que o teste falhou. A interface de
  tarefas pode mostrar "parado" enquanto o processo do SO segue vivo —
  isso já aconteceu nesta sessão.
- Antes de decidir o próximo passo, verificar o estado real: `ps -p
  <pid>`, `mtime` e conteúdo do arquivo de saída, não só o rótulo da
  ferramenta de tarefas.
- Não ficar consultando um processo em loop sem necessidade — se for
  esperar, agendar uma checagem única mais adiante (ex. `send_later`)
  em vez de sondar repetidamente.

## 7. Flakiness

Já existem duas flakinesses conhecidas e documentadas, ligadas ao
ambiente (WebGL renderizado por software, sem GPU, com timing de quadro
imprevisível):

- `Z longe da água não inicia pesca` / sequência inicial da seção de
  pesca — corrida de timing ocasional logo após `clearSave()+start()`.
- `morador perambula pelo mapa` (seção 21) — o NPC pode não acumular
  deslocamento suficiente dentro da janela de espera sob carga de
  sistema alta.

Se um teste seletivo (ou a full suite) falhar:

1. determinar primeiro se é falha determinística ou flakiness — rodar
   de novo uma vez ajuda a diferenciar, mas não é investigação por si
   só;
2. não repetir indefinidamente o mesmo teste até sair verde sem
   entender a causa;
3. comparar com execuções anteriores quando houver log/evidência
   disponível (esta seção já lista duas flakinesses conhecidas — consultar
   antes de tratar algo como novo);
4. procurar a causa raiz antes de alterar qualquer código;
5. não mascarar flakiness apenas aumentando timeouts sem entender por
   que o teste está no limite;
6. se a causa for ambiente/WebGL/timing, documentar isso explicitamente
   na resposta ao usuário — não apresentar como bug de produto sem essa
   ressalva, nem esconder que a falha existiu.

## 8. PR

Fluxo esperado:

```
alteração → teste seletivo relevante → correções →
teste seletivo de novo → full suite → revisão do diff →
commit → push → PR
```

Nunca abrir PR antes da full suite terminar verde, salvo pedido
explícito do usuário em contrário.

## 9. Segurança da suíte

- `node test.mjs` sem argumentos é a referência oficial da suíte
  completa e deve continuar funcionando exatamente como hoje.
- Não remover nem enfraquecer `check(...)` para fazer a suíte passar.
- Não alterar timeouts, condições ou asserções apenas para reduzir a
  duração sem antes explicar o impacto e obter concordância.
- Qualquer alteração no harness de testes (`test.mjs`) deve preservar o
  comportamento existente por padrão — mudanças estruturais (como a
  introdução das unidades `--only`) são aditivas, nunca substituem o
  comportamento padrão de `node test.mjs`.

## 10. Comunicação

Quando uma tarefa demorar:

- explicar o que está sendo executado e por quê;
- distinguir processo realmente ativo (verificado no SO) de tarefa
  marcada como parada pela interface — não confundir os dois;
- não criar trabalho redundante enquanto se espera algo terminar;
- ao finalizar, informar: checks executados, quantos passaram, quantos
  falharam, se houve erros de JavaScript, duração aproximada e código de
  saída.
