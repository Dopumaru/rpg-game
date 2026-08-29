'use strict';
/* ============================================================
   world/world.js — geração de mapa e simulação do mundo (mapgen +
   simulation no mesmo arquivo)
   Extraído de index.html (oitava extração estrutural planejada com o
   Graphify, após render/tiles.js, economy/shop.js, quests/quests.js,
   craft/altar.js, sprites/sprites.js, battle/battle.js e
   render3d/render3d.js). Mapgen (genOverworld, genCave, REGIONS,
   regionAt) e simulation (updateWorld, tryMove, spawnEnemies,
   updateNPCs...) ficam no MESMO arquivo (mesmo padrão de
   battle/battle.js) porque a análise de dependências do Graphify
   encontrou uma dependência circular real entre eles (6/8 arestas).
   Script clássico (não é módulo ES) — compartilha o mesmo escopo
   léxico global de index.html via <script src>. Depende por nome (sem
   import) de: G, P, ENEMIES, EQUIP, TILE, VW, VH, ctx, AU,
   spawnParticle(), burst(), toast(), showMsg(), saveGame(), fadeTo(),
   hash2() (render/tiles.js) e conversaNPC() (quests/quests.js) —
   continuam definidos em seus módulos e acessíveis por nome sem
   export.
   ============================================================ */

// tiles: 0 grama 1 árvore 2 água 3 caminho 4 flor 5 muro-pedra 6 piso-pedra
// 7 ponte 8 montanha 9 piso-caverna 10 parede-caverna 11 entrada-caverna
// 12 saída-caverna 13 fonte 14 loja 15 placa 16 baú 17 baú-aberto 18 telhado 19 porta
// 20 lápide · 21 altar · 22 arbusto · 23 pedra · 24 cogumelo (decorativos)
// 31 saída de interior (some tiles further: 25/26 topo-torii, 27 lanterna,
// 28 caminho-templo, 29/30 base-torii — já existiam, listados só por ordem)
// 32 estátua do Herói-Rei — monumento fixo nas duas vilas, sem interação (só
// cenário: reforça a lore de Kuniyasu no próprio mapa, não só em diálogo)
const SOLID = new Set([1, 2, 5, 8, 10, 14, 16, 17, 18, 20, 21, 23, 27, 29, 30, 32]);
const MAPS = {};

function genOverworld() {
  const W = 384, H = 256;
  const t = [];
  for (let y = 0; y < H; y++) { t.push(new Array(W).fill(0)); }
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = v; };
  const rect = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, v); };
  // Mapa em escala 2x do layout original (posição e tamanho de toda
  // estrutura/feature dobrados, para as regiões existentes ficarem maiores
  // sem mudar a composição relativa entre elas). Colocações de 1 tile viram
  // blocos 2x2 para preservar a proporção de estruturas compostas por várias
  // peças (torii, prédios).
  // bordas de árvores
  rect(0, 0, W, 4, 1); rect(0, H - 4, W, 4, 1); rect(0, 0, 4, H, 1); rect(W - 4, 0, 4, H, 1);
  // montanhas ao norte + entrada da caverna
  rect(0, 0, W, 20, 8);
  rect(96, 18, 2, 2, 11); rect(94, 20, 2, 2, 3); rect(96, 20, 2, 2, 3); rect(98, 20, 2, 2, 3);
  rect(94, 22, 2, 2, 25); rect(96, 22, 2, 2, 26); // torii guardando a caverna (topo)
  rect(94, 24, 2, 2, 29); rect(96, 24, 2, 2, 30); // pilares
  // rio horizontal + pontes
  rect(4, 56, 184, 6, 2);
  rect(40, 56, 4, 6, 7); rect(96, 56, 4, 6, 7); rect(152, 56, 4, 6, 7);
  // FLORESTA UMBRIA (oeste) com clareira do Rei Slime
  for (let y = 64; y < 86; y++) for (let x = 12; x < 54; x++) {
    if (hash2(x, y) < 0.6) set(x, y, 1);
  }
  rect(22, 70, 14, 10, 0);
  // BOSQUE SOMBRIO (leste)
  for (let y = 68; y < 98; y++) for (let x = 112; x < 182; x++) {
    if (hash2(x + 7, y + 3) < 0.55) set(x, y, 1);
  }
  // bolsões de árvores no norte e campos
  for (let i = 0; i < 160; i++) {
    const cx = irnd(8, 182), cy = irnd(22, 120), r = irnd(2, 4);
    if (cx > 20 && cx < 60 && cy > 84) continue;      // Vila Sakuramura
    if (cx > 128 && cx < 172 && cy > 24 && cy < 52) continue; // Vila Iwamura
    if (cx > 144 && cy > 96) continue;                  // cemitério
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (hash2(x * 3, y * 3) < 0.7 && t[y] && t[y][x] === 0) set(x, y, 1);
    }
  }
  // lagoa central
  for (let y = 70; y < 84; y++) for (let x = 62; x < 78; x++) {
    if (Math.hypot(x - 69, y - 76) < 6.4) set(x, y, 2);
  }
  // lago do planalto (noroeste, longe da vila)
  for (let y = 30; y < 44; y++) for (let x = 24; x < 40; x++) {
    if (Math.hypot(x - 32, y - 36) < 6.0) set(x, y, 2);
  }
  // lago dos arrozais (sul, perto da estrada do cemitério)
  for (let y = 106; y < 120; y++) for (let x = 82; x < 98; x++) {
    if (Math.hypot(x - 90, y - 112) < 6.0) set(x, y, 2);
  }
  // ALDEIA VERDE (sul)
  rect(24, 88, 34, 26, 0);
  rect(28, 90, 8, 4, 18); rect(28, 94, 8, 4, 5); rect(30, 96, 2, 2, 19);
  rect(46, 90, 8, 4, 18); rect(46, 94, 8, 4, 5); rect(48, 96, 2, 2, 19);
  rect(40, 100, 2, 2, 13); // chozuya (fonte)
  rect(46, 104, 6, 2, 18); rect(46, 106, 2, 2, 5); rect(48, 106, 2, 2, 19); rect(50, 106, 2, 2, 5); // loja (porta leva ao interior)
  rect(40, 88, 2, 26, 28); rect(26, 100, 30, 2, 28); // piso de pedra do templo
  rect(40, 100, 2, 2, 13);
  rect(32, 106, 2, 2, 21); // altar de encantamento
  rect(38, 84, 2, 2, 25); rect(40, 84, 2, 2, 26);  // torii na entrada norte (topo)
  rect(38, 86, 2, 2, 29); rect(40, 86, 2, 2, 30);  // pilares
  set(43, 92, 32); // estátua do Herói-Rei, à margem do caminho (um só tile — em bloco 2x2 o mesmo desenho se repetia 4 vezes)
  rect(36, 102, 2, 2, 27); rect(44, 102, 2, 2, 27);  // lanternas junto ao chozuya
  rect(28, 104, 2, 2, 27); rect(52, 104, 2, 2, 27);
  // VILA ROCHA (nordeste, junto às montanhas)
  rect(132, 26, 38, 24, 0);
  rect(136, 28, 8, 4, 18); rect(136, 32, 8, 4, 5); rect(138, 34, 2, 2, 19);
  rect(160, 28, 8, 4, 18); rect(160, 32, 8, 4, 5); rect(162, 34, 2, 2, 19);
  rect(148, 40, 2, 2, 13); // chozuya
  rect(154, 42, 6, 2, 18); rect(154, 44, 2, 2, 5); rect(156, 44, 2, 2, 19); rect(158, 44, 2, 2, 5); // loja (porta leva ao interior)
  rect(152, 26, 2, 24, 28); rect(134, 40, 34, 2, 28);
  rect(148, 40, 2, 2, 13);
  rect(142, 44, 2, 2, 21); // altar de encantamento
  rect(150, 46, 2, 2, 25); rect(152, 46, 2, 2, 26);  // torii ao sul (topo)
  rect(150, 48, 2, 2, 29); rect(152, 48, 2, 2, 30);  // pilares
  set(150, 34, 32); // estátua do Herói-Rei, à margem do caminho (um só tile)
  rect(144, 36, 2, 2, 27); rect(154, 36, 2, 2, 27);  // lanternas
  // PEIXARIA (margem leste da Lagoa Central, terreno aberto)
  rect(76, 64, 8, 4, 18); rect(76, 68, 8, 4, 5); rect(78, 70, 2, 2, 19); // porta leva ao interior
  // CEMITÉRIO ANTIGO (sudeste)
  for (let y = 100; y < 122; y++) for (let x = 148; x < 182; x++) {
    if (t[y][x] === 1) set(x, y, 0);
    if (hash2(x * 11, y * 11) < 0.14 && t[y][x] === 0) set(x, y, 20);
  }
  // ---------- Expansão (Fase 1): dobra o mapa, 3 regiões selvagens novas ----------
  // Só geometria/terreno nesta fase — cidades, NPCs e youkai novos entram nas
  // fases seguintes. Nenhum tile novo: reaproveita o vocabulário existente
  // (montanha/pedra pros picos, água/árvore pro pântano, água pra baía).
  // PICOS DE TAKARA (nordeste) — cordilheira rochosa nova, ao leste de Iwamura
  for (let y = 24; y < 124; y++) for (let x = 196; x < 380; x++) {
    const h = hash2(x * 5 + 1, y * 5 + 3);
    if (h < 0.20) set(x, y, 8);
    else if (h < 0.28) set(x, y, 23);
  }
  // PÂNTANO NEGRO (sudoeste) — água estagnada entre árvores densas, ao sul
  // da estrada do cemitério
  for (let y = 132; y < 252; y++) for (let x = 4; x < 188; x++) {
    const h = hash2(x * 4 + 9, y * 4 + 2);
    if (h < 0.16) set(x, y, 2);
    else if (h < 0.42) set(x, y, 1);
  }
  // BAÍA DE MINATO (sudeste) — a água cresce em gradiente até o canto do
  // mapa, deixando praia/terra firme mais perto das outras duas regiões
  for (let y = 132; y < 252; y++) for (let x = 196; x < 380; x++) {
    const dist = (x - 196) + (y - 132);
    const chanceAgua = clamp((dist - 90) / 120, 0, 0.9);
    if (hash2(x * 3 + 1, y * 3 + 4) < chanceAgua) set(x, y, 2);
    else if (hash2(x * 6 + 2, y * 6 + 5) < 0.05) set(x, y, 1);
  }
  // ---------- Cidades da expansão (Fase 2) ----------
  // 3 vilas novas, uma por região da Fase 1, seguindo o mesmo vocabulário de
  // tiles e a mesma composição (2 casas + loja + chozuya + altar + torii +
  // estátua) já usada em Sakuramura/Iwamura — sem tile novo. Cada bloco é a
  // vila de referência (Sakuramura ou Iwamura) inteira deslocada por um
  // delta fixo, pra garantir a mesma proporção interna sem redesenhar do
  // zero. Colocado depois dos 3 loops de ruído da Fase 1 (picos/pântano/
  // baía) de propósito — se viesse antes, o ruído desenharia por cima.
  // VILA TAKARA (Picos de Takara) — vila-tesouro nas montanhas, layout de
  // Iwamura deslocado por (+96,+14)
  rect(228, 40, 38, 24, 0);
  rect(232, 42, 8, 4, 18); rect(232, 46, 8, 4, 5); rect(234, 48, 2, 2, 19);
  rect(256, 42, 8, 4, 18); rect(256, 46, 8, 4, 5); rect(258, 48, 2, 2, 19);
  rect(244, 54, 2, 2, 13); // chozuya
  rect(250, 56, 6, 2, 18); rect(250, 58, 2, 2, 5); rect(252, 58, 2, 2, 19); rect(254, 58, 2, 2, 5); // loja
  rect(248, 40, 2, 24, 28); rect(230, 54, 34, 2, 28);
  rect(244, 54, 2, 2, 13);
  rect(238, 58, 2, 2, 21); // altar
  rect(246, 60, 2, 2, 25); rect(248, 60, 2, 2, 26);
  rect(246, 62, 2, 2, 29); rect(248, 62, 2, 2, 30);
  set(246, 48, 32); // estátua
  rect(240, 50, 2, 2, 27); rect(250, 50, 2, 2, 27);
  // VILA KUROGANE (Pântano Negro) — vila de ferreiros exilados no pântano,
  // layout de Sakuramura deslocado por (+36,+67)
  rect(60, 155, 34, 26, 0);
  rect(64, 157, 8, 4, 18); rect(64, 161, 8, 4, 5); rect(66, 163, 2, 2, 19);
  rect(82, 157, 8, 4, 18); rect(82, 161, 8, 4, 5); rect(84, 163, 2, 2, 19);
  rect(76, 167, 2, 2, 13); // chozuya
  rect(82, 171, 6, 2, 18); rect(82, 173, 2, 2, 5); rect(84, 173, 2, 2, 19); rect(86, 173, 2, 2, 5); // loja
  rect(76, 155, 2, 26, 28); rect(62, 167, 30, 2, 28);
  rect(76, 167, 2, 2, 13);
  rect(68, 173, 2, 2, 21); // altar
  rect(74, 151, 2, 2, 25); rect(76, 151, 2, 2, 26);
  rect(74, 153, 2, 2, 29); rect(76, 153, 2, 2, 30);
  set(79, 159, 32); // estátua
  rect(72, 169, 2, 2, 27); rect(80, 169, 2, 2, 27);
  rect(64, 171, 2, 2, 27); rect(88, 171, 2, 2, 27);
  // VILA MINATO (Baía de Minato) — porto de pesca e comércio, layout de
  // Sakuramura deslocado por (+236,+67), com um cais extra ao sul
  rect(260, 155, 34, 26, 0);
  rect(264, 157, 8, 4, 18); rect(264, 161, 8, 4, 5); rect(266, 163, 2, 2, 19);
  rect(282, 157, 8, 4, 18); rect(282, 161, 8, 4, 5); rect(284, 163, 2, 2, 19);
  rect(276, 167, 2, 2, 13); // chozuya
  rect(282, 171, 6, 2, 18); rect(282, 173, 2, 2, 5); rect(284, 173, 2, 2, 19); rect(286, 173, 2, 2, 5); // loja
  rect(276, 155, 2, 26, 28); rect(262, 167, 30, 2, 28);
  rect(268, 173, 2, 2, 21); // altar
  rect(274, 151, 2, 2, 25); rect(276, 151, 2, 2, 26);
  rect(274, 153, 2, 2, 29); rect(276, 153, 2, 2, 30);
  set(279, 159, 32); // estátua
  rect(272, 169, 2, 2, 27); rect(280, 169, 2, 2, 27);
  rect(264, 171, 2, 2, 27); rect(288, 171, 2, 2, 27);
  // cais de pesca, colado à borda sul da vila — água só ao sul dele. Limpa
  // a praça inteira ao redor do prédio ANTES de desenhar telhado/parede/
  // porta: a porta fica na parede sul (mesma convenção de toda casa deste
  // jogo — telhado embaixo do topo, porta na fileira de baixo), então o
  // jogador precisa contornar o prédio pelos lados a partir da vila (norte)
  // até chegar na porta por baixo. Sem limpar a praça inteira, os dois
  // lados e a frente ficavam com o que o ruído da Baía tivesse desenhado
  // ali (água inclusa, sólida) — isolando a porta mesmo com o telhado e a
  // parede corretos.
  rect(266, 180, 20, 12, 0);
  rect(272, 183, 8, 4, 18); rect(272, 187, 8, 4, 5); rect(274, 189, 2, 2, 19);
  rect(268, 194, 16, 8, 2);
  // estradas (largura 4 — 2 era estreito demais para desviar de inimigo no caminho)
  rect(39, 62, 4, 26, 3);              // ponte oeste -> Sakuramura
  rect(39, 22, 4, 34, 3);              // ponte oeste -> norte
  rect(40, 20, 58, 4, 3);              // norte -> caverna (alargada só para cima: evita os pilares do torii em y=24-25)
  rect(96, 22, 4, 34, 3);              // caverna -> ponte central (alargada só para a direita: evita o pilar esquerdo em x=94-95)
  rect(95, 62, 4, 38, 3);              // ponte central -> estrada sul
  rect(42, 99, 112, 4, 3);             // estrada sul: aldeia -> cemitério
  rect(151, 50, 4, 6, 3);              // Iwamura -> ponte leste
  rect(151, 62, 4, 38, 3);             // ponte leste -> estrada sul
  // estradas novas da expansão — ligam as 3 regiões novas ao mapa antigo e
  // entre si, cruzando as costuras em x=192 e y=128
  rect(170, 36, 30, 4, 3);             // Iwamura -> Picos de Takara (nordeste)
  rect(90, 99, 4, 40, 3);              // estrada sul -> Pântano Negro (sudoeste)
  rect(290, 100, 4, 40, 3);            // Picos de Takara -> Baía de Minato (sudeste)
  rect(150, 180, 50, 4, 3);            // Pântano Negro -> Baía de Minato (leste-oeste)
  // ramais que ligam as 3 vilas novas (Fase 2) às estradas acima
  rect(200, 38, 50, 4, 3);             // estrada Iwamura->Picos -> Vila Takara
  rect(90, 138, 4, 24, 3);             // estrada sul->Pântano -> Vila Kurogane
  rect(290, 139, 4, 24, 3);            // estrada Picos->Baía -> Vila Minato
  // placas
  rect(38, 92, 2, 2, 15); rect(38, 64, 2, 2, 15); rect(100, 24, 2, 2, 15); rect(146, 100, 2, 2, 15); rect(146, 38, 2, 2, 15);
  rect(230, 38, 2, 2, 15); rect(74, 149, 2, 2, 15); rect(274, 149, 2, 2, 15);
  // decoração: flores, arbustos, pedras e cogumelos espalhados pela grama
  for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
    if (t[y][x] !== 0) continue;
    const d = hash2(x * 7, y * 7);
    if (d < 0.05) set(x, y, 4);            // flor
    else if (d < 0.075) set(x, y, 22);     // arbusto
    else if (d < 0.088) set(x, y, 23);     // pedra
    else if (d < 0.095 && y > 60 && x < 60) set(x, y, 24); // cogumelo (floresta)
  }
  // baús escondidos — dentro da margem que a câmera consegue acompanhar
  // (ver comentário de SPAWN_ZONES); os 2 baús do leste/sudeste estavam
  // além dela, ficando visualmente cortados perto da borda
  rect(20, 66, 2, 2, 16); rect(170, 72, 2, 2, 16); rect(168, 104, 2, 2, 16);
  // garante que os pontos fixos de mini-chefe/chefe sejam alcançáveis — a
  // floresta aleatória (bolsões acima) podia isolar um deles sem isso. o alvo
  // da peixaria é o tile de grama logo ao sul da porta (onde o jogador
  // precisa chegar a pé), não a porta em si — a peixaria inteira entra em
  // `protegidos` pra um corredor de acesso nunca arrancar pedaço do prédio
  const protPeixaria = new Set();
  for (let y = 64; y <= 71; y++) for (let x = 76; x <= 83; x++) protPeixaria.add(x + ',' + y);
  // vilas da Fase 2: protege o retângulo inteiro de cada uma (prédio nenhum
  // pode virar corredor, mesmo que a estrada desenhada à mão falhe em
  // alcançar algum canto) — mesma técnica de protPeixaria, só que cobrindo
  // o footprint inteiro por ser bem maior que um prédio isolado
  const protVilasFase2 = new Set();
  const protRect = (x1, y1, x2, y2) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) protVilasFase2.add(x + ',' + y); };
  protRect(228, 40, 265, 63);   // Vila Takara
  protRect(60, 155, 93, 180);   // Vila Kurogane
  protRect(260, 155, 293, 201); // Vila Minato + cais
  const protComuns = new Set([
    '20,66', '21,66', '20,67', '21,67', '170,72', '171,72', '170,73', '171,73', '168,104', '169,104', '168,105', '169,105',
    ...protPeixaria, ...protVilasFase2
  ]);
  garanteAcesso(t, W, H, [
    [28, 74], [164, 106],       // reislime, necromante
    [42, 78], [120, 34], [160, 102],   // aranharainha, tenguveterano, onigeneral
    [100, 108], [150, 80],      // amanojaku, yamauba
    [79, 72],                   // acesso à porta da peixaria
    [246, 62], [77, 165], [277, 165], [274, 191]  // Takara, Kurogane, Minato, cais de Minato
  ], [40, 100], protComuns);
  // fecha qualquer bolsão minúsculo isolado que a floresta aleatória tenha
  // deixado pra trás (nenhum youkai nasce mais preso pra sempre no meio de
  // árvores) — roda por último, depois de garanteAcesso já ter conectado
  // tudo que precisava
  seleBolsoesIsolados(t, W, H, protComuns, 1);
  return { w: W, h: H, tiles: t, name: 'overworld' };
}

// regiões nomeadas (toast ao entrar)
const REGIONS = [
  { x1: 24, y1: 88, x2: 56, y2: 112, name: 'Vila Sakuramura' },
  { x1: 132, y1: 26, x2: 168, y2: 48, name: 'Vila Iwamura' },
  { x1: 12,  y1: 64, x2: 52, y2: 84, name: 'Bosque de Bambu' },
  { x1: 148, y1: 98, x2: 180, y2: 122, name: 'Templo Abandonado' },
  { x1: 112, y1: 66, x2: 180, y2: 98, name: 'Floresta de Aokigahara' },
  { x1: 4,  y1: 20, x2: 186, y2: 54, name: 'Planalto do Norte' },
  { x1: 4,  y1: 62, x2: 186, y2: 122, name: 'Campos de Arroz' },
  // regiões da expansão (Fase 1) — as caixas das 3 vilas da Fase 2 vêm
  // ANTES da região selvagem que as contém (mesmo motivo de Sakuramura/
  // Iwamura virem antes de Campos de Arroz): regionAt() usa a primeira
  // caixa que bater, e a caixa da vila é um subconjunto da caixa selvagem
  { x1: 228, y1: 40,  x2: 265, y2: 63,  name: 'Vila Takara' },
  { x1: 196, y1: 20,  x2: 380, y2: 124, name: 'Picos de Takara' },
  { x1: 60,  y1: 155, x2: 93,  y2: 202, name: 'Vila Kurogane' },
  { x1: 4,   y1: 132, x2: 188, y2: 252, name: 'Pântano Negro' },
  { x1: 260, y1: 155, x2: 293, y2: 202, name: 'Vila Minato' },
  { x1: 196, y1: 132, x2: 380, y2: 252, name: 'Baía de Minato' }
];
function regionAt(tx, ty) {
  for (const r of REGIONS) if (tx >= r.x1 && tx <= r.x2 && ty >= r.y1 && ty <= r.y2) return r.name;
  return null;
}

function genCave() {
  const W = 36, H = 26;
  const t = [];
  for (let y = 0; y < H; y++) t.push(new Array(W).fill(9));
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = v; };
  const rect = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, v); };
  rect(0, 0, W, 2, 10); rect(0, H - 2, W, 2, 10); rect(0, 0, 2, H, 10); rect(W - 2, 0, 2, H, 10);
  // cogumelos luminosos decorativos
  for (let i = 0; i < 14; i++) {
    const cx = irnd(3, W - 4), cy = irnd(3, H - 4);
    if (t[cy][cx] === 9) set(cx, cy, 24);
  }
  // formações rochosas
  for (let i = 0; i < 22; i++) {
    const cx = irnd(3, W - 4), cy = irnd(3, H - 4), r = irnd(1, 2);
    if (Math.abs(cx - 18) < 5 && cy < 9) continue; // não no covil
    if (Math.abs(cx - 18) < 3 && cy > H - 7) continue; // não na entrada
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (hash2(x * 5, y * 5) < 0.65) set(x, y, 10);
    }
  }
  // covil do dragão
  rect(13, 2, 11, 7, 9);
  // saída
  set(18, 23, 12); set(17, 23, 9); set(19, 23, 9); set(18, 22, 9);
  // baús
  set(4, 4, 16); set(31, 20, 16);
  // garante acesso ao covil do dragão e à teia do tsuchigumo
  const protCave = new Set(['4,4', '31,20']);
  garanteAcesso(t, W, H, [[18, 4], [10, 15]], [17, 23], protCave);
  // mesma limpeza de bolsão isolado do overworld, aqui com parede de pedra
  seleBolsoesIsolados(t, W, H, protCave, 10);
  return { w: W, h: H, tiles: t, name: 'cave' };
}

// garante que os pontos fixos de chefe/mini-chefe sejam alcançáveis a pé:
// busca em largura a partir de um ponto sempre aberto (âncora) e, pra
// qualquer alvo isolado pela floresta aleatória ou pousado em cima de tile
// sólido, limpa a área dele e escava um corredor até o tile aberto já
// alcançado mais próximo. Roda por último em cada gerador de mapa — depois
// de toda decoração/baú — pra nada sobrescrever o corredor depois. Tiles em
// `protegidos` (baús) nunca são limpos, mesmo se um corredor passar perto.
// sela bolsões minúsculos isolados (1 tile de grama cercado de árvore/água/
// pedra por todo lado, sobra do ruído aleatório da floresta) — sem isso um
// youkai cujo spawn caísse ali ficava preso pra sempre, sem nenhuma direção
// livre pra sair. Roda depois de garanteAcesso() (pra não engolir nenhum
// ponto que ele acabou de conectar) e nunca mexe em tile protegido (baú).
function seleBolsoesIsolados(t, W, H, protegidos, tileSolido) {
  const prot = protegidos || new Set();
  const solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || SOLID.has(t[y][x]);
  const visited = Array.from({ length: H }, () => new Array(W).fill(false));
  let melhorComp = [], melhorLen = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (visited[y][x] || solid(x, y)) continue;
    const q = [[x, y]]; visited[y][x] = true; let head = 0; const comp = [];
    while (head < q.length) {
      const [cx, cy] = q[head++]; comp.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || visited[ny][nx] || solid(nx, ny)) continue;
        visited[ny][nx] = true; q.push([nx, ny]);
      }
    }
    if (comp.length > melhorLen) { melhorLen = comp.length; melhorComp = comp; }
  }
  const naMaior = new Set(melhorComp.map(([x, y]) => x + ',' + y));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (solid(x, y) || naMaior.has(x + ',' + y) || prot.has(x + ',' + y)) continue;
    t[y][x] = tileSolido;
  }
}
function garanteAcesso(t, W, H, alvos, ancora, protegidos) {
  const prot = protegidos || new Set();
  const clr = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H && !prot.has(x + ',' + y)) t[y][x] = 0; };
  const clrRect = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) clr(x, y); };
  const solid = (x, y) => x < 0 || y < 0 || x >= W || y >= H || SOLID.has(t[y][x]);
  const visited = Array.from({ length: H }, () => new Array(W).fill(false));
  const q = [ancora];
  visited[ancora[1]][ancora[0]] = true;
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || visited[ny][nx] || solid(nx, ny)) continue;
      visited[ny][nx] = true;
      q.push([nx, ny]);
    }
  }
  for (const [tx, ty] of alvos) {
    clrRect(tx, ty, 3);
    if (visited[ty][tx]) continue;
    // tile já limpo agora, mas ainda isolado: acha o tile já alcançado mais
    // próximo (anéis crescentes) e escava um corredor reto (largura 3) até lá
    let melhor = null, melhorD = Infinity;
    for (let ring = 1; ring < Math.max(W, H) && !melhor; ring++) {
      for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const nx = tx + dx, ny = ty + dy;
        if (ny < 0 || ny >= H || nx < 0 || nx >= W || !visited[ny][nx]) continue;
        const d = dx * dx + dy * dy;
        if (d < melhorD) { melhorD = d; melhor = [nx, ny]; }
      }
    }
    if (!melhor) continue;
    let [cx, cy] = [tx, ty];
    const [gx, gy] = melhor;
    let guard = 0;
    while ((cx !== gx || cy !== gy) && guard++ < 400) {
      clrRect(cx, cy, 1);
      if (cx !== gx) cx += cx < gx ? 1 : -1;
      else if (cy !== gy) cy += cy < gy ? 1 : -1;
    }
    clrRect(gx, gy, 1);
    visited[ty][tx] = true;
  }
}

// ---------- Interiores ----------
// sala genérica pequena (chão de pedra, paredes de pedra, saída ao sul) usada
// por toda estrutura interagível que vira um espaço explorável de verdade —
// reaproveita 100% os tiles/render já existentes (piso 6, muro 5, porta 19
// pra saída), sem nenhuma arte nova
function genInterior(opts) {
  const W = 22, H = 14;
  const t = [];
  for (let y = 0; y < H; y++) t.push(new Array(W).fill(6));
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = v; };
  const rect = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, v); };
  rect(0, 0, W, 1, 5); rect(0, H - 1, W, 1, 5); rect(0, 0, 1, H, 5); rect(W - 1, 0, 1, H, 5);
  rect(Math.floor(W / 2) - 1, H - 1, 2, 1, 31); // saída, centro da parede sul
  if (opts.shopId) rect(Math.floor(W / 2) - 1, 3, 2, 2, 14); // balcão da loja
  // decoração: lanternas emoldurando a porta, um arranjo de flores em cada
  // canto — e, se for loja, mais um par de lanternas junto ao balcão. Tudo
  // reaproveita tiles/arte que já existem no jogo, sem asset novo.
  set(8, H - 2, 27); set(W - 9, H - 2, 27);
  set(2, 2, 4); set(3, 2, 4); set(W - 3, 2, 4); set(W - 4, 2, 4);
  if (opts.shopId) { set(8, 3, 27); set(W - 9, 3, 27); }
  const map = { w: W, h: H, tiles: t, name: opts.name, exitTo: opts.exitTo };
  if (opts.shopId) map.shopId = opts.shopId;
  return map;
}
// geradores de cada interior — nomes usados tanto em MAPS quanto em
// DOORS/NPC_DEFS. ponto de entrada padrão (2 tiles ao norte da saída) só é
// calculado dentro de função (não no topo do arquivo): script clássico
// compartilha escopo global com index.html, e TILE só existe depois que o
// <script> do núcleo roda — avaliar "11 * TILE" fora de função aqui em cima
// dispararia TDZ se este arquivo carregar antes daquele const existir
function interiorEntry() { return { x: 11 * TILE, y: 11 * TILE }; }
const INTERIORES = {
  loja_aldeia: () => genInterior({ name: 'loja_aldeia', shopId: 'aldeia', exitTo: { map: 'overworld', x: 48 * TILE, y: 108 * TILE } }),
  loja_rocha:  () => genInterior({ name: 'loja_rocha',  shopId: 'rocha',  exitTo: { map: 'overworld', x: 156 * TILE, y: 46 * TILE } }),
  peixaria:    () => genInterior({ name: 'peixaria',    exitTo: { map: 'overworld', x: 78 * TILE, y: 72 * TILE } }),
  casa_aldeia: () => genInterior({ name: 'casa_aldeia', exitTo: { map: 'overworld', x: 30 * TILE, y: 98 * TILE } }),
  casa_rocha:  () => genInterior({ name: 'casa_rocha',  exitTo: { map: 'overworld', x: 138 * TILE, y: 36 * TILE } }),
  // --- vilas da Fase 2
  loja_takara:    () => genInterior({ name: 'loja_takara',    shopId: 'takara',    exitTo: { map: 'overworld', x: 252 * TILE, y: 60 * TILE } }),
  casa_takara:    () => genInterior({ name: 'casa_takara',    exitTo: { map: 'overworld', x: 234 * TILE, y: 50 * TILE } }),
  loja_kurogane:  () => genInterior({ name: 'loja_kurogane',  shopId: 'kurogane',  exitTo: { map: 'overworld', x: 84 * TILE,  y: 175 * TILE } }),
  casa_kurogane:  () => genInterior({ name: 'casa_kurogane',  exitTo: { map: 'overworld', x: 66 * TILE,  y: 165 * TILE } }),
  loja_minato:    () => genInterior({ name: 'loja_minato',    shopId: 'minato',    exitTo: { map: 'overworld', x: 284 * TILE, y: 175 * TILE } }),
  casa_minato:    () => genInterior({ name: 'casa_minato',    exitTo: { map: 'overworld', x: 266 * TILE, y: 165 * TILE } }),
  peixaria_minato:() => genInterior({ name: 'peixaria_minato',exitTo: { map: 'overworld', x: 274 * TILE, y: 191 * TILE } })
};
// portas do mundo aberto que levam a um interior (as demais mostram "trancada")
const DOORS = {};
function registraPorta(mapName, x, y, w, h, destino) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) DOORS[mapName + ',' + i + ',' + j] = destino;
}
registraPorta('overworld', 48, 106, 2, 2, { to: 'loja_aldeia' });
registraPorta('overworld', 156, 44, 2, 2, { to: 'loja_rocha' });
registraPorta('overworld', 78, 70, 2, 2, { to: 'peixaria' });
registraPorta('overworld', 30, 96, 2, 2, { to: 'casa_aldeia' });
registraPorta('overworld', 138, 34, 2, 2, { to: 'casa_rocha' });
registraPorta('overworld', 252, 58, 2, 2, { to: 'loja_takara' });
registraPorta('overworld', 234, 48, 2, 2, { to: 'casa_takara' });
registraPorta('overworld', 84, 173, 2, 2, { to: 'loja_kurogane' });
registraPorta('overworld', 66, 163, 2, 2, { to: 'casa_kurogane' });
registraPorta('overworld', 284, 173, 2, 2, { to: 'loja_minato' });
registraPorta('overworld', 266, 163, 2, 2, { to: 'casa_minato' });
registraPorta('overworld', 274, 189, 2, 2, { to: 'peixaria_minato' });

// ---------- Mundo ----------
function tileAt(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return 1;
  return map.tiles[ty][tx];
}
function isSolid(map, tx, ty) { return SOLID.has(tileAt(map, tx, ty)); }

function enterMap(name, px, py) {
  if (!MAPS[name]) MAPS[name] = name === 'cave' ? genCave() : (INTERIORES[name] ? INTERIORES[name]() : genOverworld());
  G.map = MAPS[name];
  P.mapName = name;
  // rede de segurança: se o destino cair em cima de um tile sólido (posição
  // salva de antes de um mapa mudar de tamanho, ou qualquer outro bug de
  // coordenada), realoca pro tile livre mais próximo em vez de prender o
  // jogador dentro da parede pra sempre — inclusive resgata saves antigos já
  // corrompidos por esse tipo de bug, não só previne novos
  let tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
  if (isSolid(MAPS[name], tx, ty)) {
    [tx, ty] = tileLivrePerto(MAPS[name], tx, ty);
    // tileLivrePerto só busca num raio de 6 tiles — não basta pra escapar de
    // dentro de um bloco sólido bem mais largo (ex.: a faixa de montanha no
    // norte do overworld). Último recurso: o ponto de entrada padrão do
    // próprio mapa, sempre garantido livre.
    if (isSolid(MAPS[name], tx, ty)) {
      const seguro = name === 'overworld' ? START : name === 'cave' ? { x: 18 * TILE, y: 21 * TILE } : interiorEntry();
      tx = Math.floor(seguro.x / TILE); ty = Math.floor(seguro.y / TILE);
    }
  }
  P.x = tx * TILE; P.y = ty * TILE;
  G.petX = P.x - 14; G.petY = P.y;
  G.entities = [];
  spawnEnemies(true);
  if (name === 'cave') {
    if (!G.flags.dragao) G.entities.push(makeEntity('dragao', 18 * TILE, 4 * TILE, 12, true));
    if (!G.flags.tsuchigumo) G.entities.push(makeEntity('tsuchigumo', 10 * TILE, 15 * TILE, 11, true));
    G.region = 'Caverna de Orochi';
    toast('Caverna de Orochi');
  } else if (INTERIORES[name]) {
    // interior: sem chefe, sem mob (spawnEnemies já não gera nada aqui —
    // SPAWN_ZONES não tem entrada pro nome do interior)
    G.region = null;
  } else {
    if (!G.flags.reislime) G.entities.push(makeEntity('reislime', 28 * TILE, 74 * TILE, 5, true));
    if (!G.flags.necromante) G.entities.push(makeEntity('necromante', 164 * TILE, 106 * TILE, 8, true));
    if (!G.flags.amanojaku) G.entities.push(makeEntity('amanojaku', 100 * TILE, 108 * TILE, 6, true));
    if (!G.flags.yamauba) G.entities.push(makeEntity('yamauba', 150 * TILE, 80 * TILE, 9, true));
    if (!G.flags.aranharainha) G.entities.push(makeEntity('aranharainha', 42 * TILE, 78 * TILE, 5, true));
    if (!G.flags.tenguveterano) G.entities.push(makeEntity('tenguveterano', 120 * TILE, 34 * TILE, 6, true));
    if (!G.flags.onigeneral) G.entities.push(makeEntity('onigeneral', 160 * TILE, 102 * TILE, 7, true));
    G.region = null;
  }
  AU.setTrack(name === 'cave' ? AU.CAVE : AU.WORLD);
  spawnNPCs(G.map);
}

// cada zona é dividida em uma faixa vertical por tipo (agrupa cada youkai
// no seu próprio canto da zona, em vez de espalhar todos os tipos
// misturados pela caixa inteira — ajuda a achar o alvo de uma missão)
// os limites x/y de cada zona ficam dentro de [20,172]x[20,108] — a mesma
// margem que a câmera do mundo usa pra travar antes da borda do mapa
// (camMX/camMZ em desenhaMundo3D()). Fora dessa faixa a câmera não consegue
// centralizar no jogador, então um youkai nascido ali fica visualmente
// cortado/fora do quadro mesmo perto do jogador — bug relatado pelo usuário
// na borda sul. Zonas que batiam nessa faixa foram recuadas.
const SPAWN_ZONES = {
  overworld: [
    { x1: 20, y1: 64, x2: 140, y2: 108, types: ['slime', 'morcego', 'goblin'], lv: [1, 2], count: 12,
      exclude: [{ x1: 22, y1: 86, x2: 58, y2: 114 }, { x1: 10, y1: 62, x2: 54, y2: 86 }] },
    { x1: 20, y1: 64, x2: 52, y2: 84, types: ['lobo', 'aranha', 'goblin', 'rokuro'], lv: [3, 5], count: 9 },
    { x1: 20, y1: 22, x2: 172, y2: 52, types: ['lobo', 'esqueleto', 'harpia', 'yukionna'], lv: [4, 6], count: 12,
      exclude: [{ x1: 130, y1: 24, x2: 170, y2: 50 }] },
    { x1: 112, y1: 68, x2: 172, y2: 96, types: ['esqueleto', 'aranha', 'harpia', 'nue'], lv: [5, 7], count: 10 },
    { x1: 148, y1: 100, x2: 172, y2: 108, types: ['zumbi', 'fantasma', 'esqueleto'], lv: [6, 8], count: 9 }
  ],
  cave: [
    { x1: 3, y1: 9, x2: 33, y2: 22, types: ['orc', 'golem', 'elemental', 'fantasma'], lv: [7, 9], count: 13 }
  ]
};
function makeEntity(type, x, y, lvl, isBoss) {
  return {
    type, x, y, lvl, isBoss: !!isBoss,
    dir: pick(['up', 'down', 'left', 'right']),
    moveT: rnd(0.5, 2), vx: 0, vy: 0, animT: 0,
    homeX: x, homeY: y
  };
}
function spawnEnemies(initial) {
  const zones = SPAWN_ZONES[G.map.name] || [];
  for (const z of zones) {
    const nTypes = z.types.length;
    const faixaW = (z.x2 - z.x1) / nTypes;
    for (let ti = 0; ti < nTypes; ti++) {
      const type = z.types[ti];
      const fx1 = z.x1 + ti * faixaW, fx2 = z.x1 + (ti + 1) * faixaW;
      const cur = G.entities.filter(e => !e.isBoss && e.zone === z && e.type === type).length;
      const wantType = Math.ceil(z.count / nTypes);
      const want = initial ? wantType : Math.min(wantType, cur + 1);
      for (let i = cur; i < want; i++) {
        for (let tries = 0; tries < 30; tries++) {
          const tx = irnd(fx1, fx2), ty = irnd(z.y1, z.y2);
          if (z.exclude && z.exclude.some(ex => tx >= ex.x1 && tx <= ex.x2 && ty >= ex.y1 && ty <= ex.y2)) continue;
          if (isSolid(G.map, tx, ty)) continue;
          const px = tx * TILE, py = ty * TILE;
          if (Math.hypot(px - P.x, py - P.y) < TILE * 7) continue;
          const e = makeEntity(type, px, py, irnd(z.lv[0], z.lv[1]));
          e.zone = z;
          G.entities.push(e);
          break;
        }
      }
    }
  }
}

function tryMove(ent, dx, dy) {
  // colisão por caixa (12x10 nos pés)
  const bw = 10, bh = 8, ox = 3, oy = 7;
  let nx = ent.x + dx, ny = ent.y + dy;
  const corners = (x, y) => [
    [x + ox, y + oy], [x + ox + bw, y + oy], [x + ox, y + oy + bh], [x + ox + bw, y + oy + bh]
  ];
  let okX = true;
  for (const [cx, cy] of corners(nx, ent.y)) {
    if (isSolid(G.map, Math.floor(cx / TILE), Math.floor(cy / TILE))) { okX = false; break; }
  }
  if (okX) ent.x = nx;
  let okY = true;
  for (const [cx, cy] of corners(ent.x, ny)) {
    if (isSolid(G.map, Math.floor(cx / TILE), Math.floor(cy / TILE))) { okY = false; break; }
  }
  if (okY) ent.y = ny;
  return okX || okY;
}

function facingTile() {
  const cx = P.x + 8, cy = P.y + 11;
  let tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
  if (P.dir === 'up') ty--;
  if (P.dir === 'down') ty++;
  if (P.dir === 'left') tx--;
  if (P.dir === 'right') tx++;
  return { tx, ty, t: tileAt(G.map, tx, ty) };
}

// chaves em coordenada de tile — corrigidas para a escala 2x da Fase 1: o
// mapa inteiro foi redesenhado em posições dobradas (ver comentário no topo
// de genOverworld()), mas esta tabela tinha ficado pra trás na metade da
// escala antiga, deixando as 5 placas originais mudas (SIGNS[key] nunca
// batia com o tile de placa de verdade). Corrigido multiplicando por 2.
const SIGNS = {
  '38,92': 'Vila Sakuramura.\nQue as cerejeiras te abençoem,\nviajante.',
  '38,64': 'Bosque de Bambu a oeste.\nDizem que Nurarihyon, mestre\ndos youkai, reina na clareira.',
  '100,24': 'PERIGO! Caverna de Orochi.\nSó guerreiros de alma firme\ndevem cruzar este torii.',
  '146,100': 'Templo Abandonado.\nOs mortos não descansam...\nKagemaru os comanda.',
  '146,38': 'Vila Iwamura.\nFerreiros e bons negócios.',
  '230,38': 'Vila Takara.\nOuro e jade descem da montanha —\ne quem trabalha a pedra, também.',
  '74,149': 'Vila Kurogane.\nOs que forjam aqui não voltam\npara as outras vilas. Nem querem.',
  '274,149': 'Vila Minato.\nTudo que chega por água,\nchega primeiro aqui.'
};

function updateWorld(dt) {
  // Konoha-ko: acompanha quantas das 7 regiões o jogador já pisou
  if (G.map && G.map.name === 'overworld') {
    const rg = regionAt(Math.floor(P.x / TILE), Math.floor(P.y / TILE));
    if (rg) {
      if (!P.regioesVistas) P.regioesVistas = [];
      if (!P.regioesVistas.includes(rg)) {
        P.regioesVistas.push(rg);
        if (P.regioesVistas.length >= REGIONS.length) awardPet('konohako');
      }
    }
  }
  // movimento do jogador: aceleração suave + corrida (Shift)
  let dx = 0, dy = 0;
  if (keys.up) dy -= 1;
  if (keys.down) dy += 1;
  if (keys.left) dx -= 1;
  if (keys.right) dx += 1;
  const wantMove = !!(dx || dy);
  const running = keys.run && wantMove;
  const spdMax = running ? 122 : 76;
  // velocidade alvo, suavizada (dá peso ao personagem sem atrasar o controle)
  let tvx = 0, tvy = 0;
  if (wantMove) {
    const n = Math.hypot(dx, dy);
    tvx = dx / n * spdMax; tvy = dy / n * spdMax;
    if (dy < 0) P.dir = 'up';
    if (dy > 0) P.dir = 'down';
    if (dx < 0) P.dir = 'left';
    if (dx > 0) P.dir = 'right';
  }
  const accel = wantMove ? 16 : 22;
  P.vx = lerp(P.vx || 0, tvx, Math.min(1, dt * accel));
  P.vy = lerp(P.vy || 0, tvy, Math.min(1, dt * accel));
  const speed = Math.hypot(P.vx, P.vy);
  P.moving = speed > 6;
  if (P.moving) {
    tryMove(P, P.vx * dt, P.vy * dt);
    if (running) marcaTutorial('mover');
    // ciclo de 4 frames: passo, neutro, passo oposto, neutro
    P.animT += dt * (running ? 1.5 : 1);
    if (P.animT > 0.14) { P.animT = 0; P.frame = (P.frame + 1) % 4; }
    // poeira sob os pés (mais forte correndo)
    G.dustT -= dt;
    if (G.dustT <= 0) {
      G.dustT = running ? 0.09 : 0.2;
      const cave = G.map.name === 'cave';
      spawnParticle({
        x: P.x + 8 + rnd(-2, 2), y: P.y + 15, vx: -P.vx * 0.12, vy: rnd(-10, -3),
        life: running ? 0.45 : 0.32, size: running ? 2 : 1, shrink: true,
        color: cave ? '#4a4458' : '#b8a878'
      });
    }
  } else { P.frame = 0; P.animT = 0; }

  // portais / tiles especiais
  const ptx = Math.floor((P.x + 8) / TILE), pty = Math.floor((P.y + 11) / TILE);
  const cur = tileAt(G.map, ptx, pty);
  if (cur === 11) { // entrada caverna
    fadeTo(() => { enterMap('cave', 18 * TILE, 21 * TILE); P.dir = 'up'; saveGame(); });
  } else if (cur === 12) { // saída caverna
    // (97,21) é o tile de estrada logo ao sul da entrada real (96-97,18-19).
    // 48*TILE,10*TILE era a posição de antes do mapa dobrar de tamanho (nunca
    // reescalada junto) — caía dentro da montanha sólida rect(0,0,W,20,8),
    // prendendo e "sumindo" o personagem pra sempre, inclusive no save.
    fadeTo(() => { enterMap('overworld', 97 * TILE, 21 * TILE); P.dir = 'down'; saveGame(); });
  } else if (cur === 31 && G.map.exitTo) { // saída de um interior
    const dest = G.map.exitTo;
    fadeTo(() => { enterMap(dest.map, dest.x, dest.y); P.dir = 'down'; saveGame(); });
  }
  // toast de região + troca de trilha (Vila Sakuramura fica no tema padrão)
  if (G.map.name === 'overworld') {
    const rg = regionAt(ptx, pty);
    if (rg && rg !== G.region) { G.region = rg; toast(rg); AU.setTrack(REGION_TRACKS[rg] || AU.WORLD); }
  }

  // interação (Z)
  if (tap('ok')) {
    const f = facingTile();
    const key = f.tx + ',' + f.ty;
    const alvoNPC = npcPerto();
    if (alvoNPC && !TILES_INTERATIVOS.includes(f.t)) { conversaNPC(alvoNPC); return; }
    if (f.t === 13) { // fonte
      const E0 = eff();
      if (P.hp < E0.maxHp || P.mp < E0.maxMp) {
        P.hp = E0.maxHp; P.mp = E0.maxMp;
        AU.sfx('heal');
        addFloater(P.x + 8, P.y - 4, '+HP/MP', '#6ee86e');
        burst(P.x + 8, P.y + 8, 24, { color: ['#8ec6f0', '#c6e2f8', '#6ee86e'], spdMax: 50, lifeMax: 1.1, size: 1, lift: 30, g: 30 });
        showMsg('A água sagrada do chozuya\nrestaurou suas forças!\n(jogo salvo)');
        saveGame();
      } else showMsg('A água do chozuya reflete\nas pétalas de sakura.');
    } else if (f.t === 14) { // loja (estoque vem do interior onde o balcão está)
      G.shopId = G.map.shopId || (f.tx < 50 ? 'aldeia' : 'rocha');
      G.state = 'shop'; G.shopIdx = 0; AU.sfx('ok');
    } else if (f.t === 21) { // altar de encantamento
      G.state = 'enchant'; G.menuIdx = 0; G.altarMode = 0; AU.sfx('magic');
    } else if (f.t === 2) { // água: lança a linha
      if (P.varas.length) iniciaPesca();
      else showMsg('Precisaria de uma vara para pescar aqui.\nUm pescador deve vender uma por perto.');
    } else if (f.t === 15 && SIGNS[key]) {
      showMsg(SIGNS[key]);
    } else if (f.t === 16) { // baú
      const cid = G.map.name + ':' + key;
      if (!G.chests[cid]) {
        G.chests[cid] = true;
        G.map.tiles[f.ty][f.tx] = 17;
        AU.sfx('chest');
        if (Math.random() < 0.06) awardPetChance('tsukiusagi');
        burst(f.tx * TILE + 8, f.ty * TILE + 6, 26, {
          color: ['#ffd94e', '#f0d878', '#fff0a0'], spdMax: 70, lifeMax: 1, size: 2, lift: 40, g: 110
        });
        const loot = G.map.name === 'cave'
          ? pick([{ gold: 80 }, { item: 'elixir' }, { item: 'bomba', n: 2 },
                  { eq: pick(['arm5', 'esp4', 'caj4', 'ada4', 'arc4', 'bot4', 'arm11', 'luv5', 'elm7', 'amu8']) },
                  { eq: pick(['arm8', 'amu5', 'bot5', 'luv6', 'elm8']) }])
          : pick([{ item: 'pocao', n: 2 }, { gold: 45 }, { item: 'pergaminho' },
                  { eq: pick(['esp3', 'caj3', 'ada3', 'arc3', 'arm3', 'arm4', 'arm10', 'elm3', 'elm4', 'amu3', 'amu7', 'bot3', 'luv3', 'luv4']) }]);
        if (loot.gold) { P.gold += loot.gold; showMsg('Você encontrou ' + loot.gold + ' de ouro!'); }
        else if (loot.eq) {
          const r = addEquipToInv(loot.eq);
          showMsg('Você encontrou:\n' + EQUIP[loot.eq].name + ' [' + RARITY[EQUIP[loot.eq].rar].name + ']' + (r.full ? '\n(inventário cheio: +' + r.gold + ' ouro)' : ''));
        }
        else {
          const n = loot.n || 1;
          const dado = Math.min(n, Math.max(0, ITEM_CAP - P.items[loot.item]));
          P.items[loot.item] += dado;
          if (dado === 0) showMsg('Havia ' + ITEMS[loot.item].name + ' no baú, mas a mochila já está cheia.');
          else showMsg('Você encontrou ' + (dado > 1 ? dado + 'x ' : '') + ITEMS[loot.item].name + '!' + (dado < n ? '\n(mochila cheia — só coube ' + dado + ')' : ''));
        }
        saveGame();
      }
    } else if (f.t === 19) {
      const porta = DOORS[G.map.name + ',' + f.tx + ',' + f.ty];
      if (porta) {
        fadeTo(() => { const e = interiorEntry(); enterMap(porta.to, e.x, e.y); P.dir = 'up'; saveGame(); });
      } else {
        showMsg('A porta shoji está fechada.\nOs aldeões se escondem\ndos youkai...');
      }
    }
  }
  if (tap('menu')) { G.state = 'menu'; G.menuIdx = 0; G.menuTab = 0; AU.sfx('menu'); marcaTutorial('menu'); }
  if (tap('mapa')) { G.state = 'mapa'; AU.sfx('menu'); marcaTutorial('mapa'); }
  if (tap('log')) { G.state = 'questlog'; AU.sfx('menu'); }
  if (tap('back')) { G.optFrom = 'world'; G.optIdx = 0; G.state = 'options'; AU.sfx('menu'); }

  // inimigos
  for (const e of G.entities) {
    e.animT += dt;
    const dist = Math.hypot(e.x - P.x, e.y - P.y);
    const chaseR = e.isBoss ? TILE * 4 : TILE * 4.5;
    let tvx = 0, tvy = 0;
    const espd = e.isBoss ? 30 : (e.type === 'morcego' || e.type === 'lobo' ? 46 : 28);
    if (dist < chaseR) {
      tvx = (P.x - e.x) / dist * espd;
      tvy = (P.y - e.y) / dist * espd;
    } else if (!e.isBoss) {
      e.moveT -= dt;
      if (e.moveT <= 0) {
        e.moveT = rnd(0.8, 2.4);
        // coleira: longe demais de casa (onde nasceu), volta pra lá em vez
        // de vagar livre — impede deriva pra dentro da vila ou de outra zona
        const dxh = (e.homeX ?? e.x) - e.x, dyh = (e.homeY ?? e.y) - e.y;
        const dh = Math.hypot(dxh, dyh);
        if (dh > TILE * 5) {
          e.tvx = dxh / dh * espd * 0.6; e.tvy = dyh / dh * espd * 0.6;
        } else {
          const d = irnd(0, 4);
          e.tvx = d === 0 ? espd * 0.6 : d === 1 ? -espd * 0.6 : 0;
          e.tvy = d === 2 ? espd * 0.6 : d === 3 ? -espd * 0.6 : 0;
        }
      }
      tvx = e.tvx || 0; tvy = e.tvy || 0;
    }
    // velocidade suavizada (mesmo peso da aceleração do herói), em vez de
    // saltar direto pra velocidade alvo a cada troca de direção
    e.vx = lerp(e.vx || 0, tvx, Math.min(1, dt * 10));
    e.vy = lerp(e.vy || 0, tvy, Math.min(1, dt * 10));
    if (Math.abs(e.vx) > 0.5 || Math.abs(e.vy) > 0.5) tryMove(e, e.vx * dt, e.vy * dt);
    // toque = batalha
    if (dist < 13 && G.state === 'world') {
      startBattle(e);
      break;
    }
  }
  // respawn
  G.spawnTimer -= dt;
  if (G.spawnTimer <= 0) { G.spawnTimer = 6; spawnEnemies(false); }

  // pet seguidor
  if (P.activePet) {
    if (G.petX === undefined) { G.petX = P.x - 14; G.petY = P.y; }
    const off = { up: [0, 16], down: [0, -16], left: [14, 0], right: [-14, 0] }[P.dir];
    const tx = P.x + off[0], ty = P.y + off[1];
    const d = Math.hypot(tx - G.petX, ty - G.petY);
    if (d > 4) {
      G.petX = lerp(G.petX, tx, Math.min(1, dt * 5));
      G.petY = lerp(G.petY, ty, Math.min(1, dt * 5));
    }
  }

  // câmera: segue o herói com leve inércia, mas trava em pixel inteiro (zero
  // tremor ao andar) — um salto grande (teleporte, entrar em mapa novo) corta
  // direto em vez de deslizar pela tela
  const camTX = clamp(P.x + 8 - VW / 2, 0, G.map.w * TILE - VW);
  const camTY = clamp(P.y + 11 - VH / 2, 0, G.map.h * TILE - VH);
  if (G.camXf === undefined || Math.hypot(camTX - G.camXf, camTY - G.camYf) > TILE) {
    G.camXf = camTX; G.camYf = camTY;
  } else {
    G.camXf = lerp(G.camXf, camTX, Math.min(1, dt * 12));
    G.camYf = lerp(G.camYf, camTY, Math.min(1, dt * 12));
  }
  G.camX = Math.round(G.camXf);
  G.camY = Math.round(G.camYf);
}

// fonte (cura) e altar (encantamento) das duas vilas — brilho ambiente sobe
// deles o tempo todo, mesmo parado, pra ficar óbvio que são especiais antes
// de qualquer interação (Z). Cor ecoa a mesma paleta do desenho de cada um.
const PONTOS_MAGICOS = [
  { x: 40.5, y: 100.5, tipo: 'fonte' }, { x: 148.5, y: 40.5, tipo: 'fonte' },
  { x: 245.5, y: 55.5, tipo: 'fonte' }, { x: 77.5, y: 168.5, tipo: 'fonte' }, { x: 277.5, y: 168.5, tipo: 'fonte' },
  { x: 32.5, y: 106.5, tipo: 'altar' }, { x: 142.5, y: 44.5, tipo: 'altar' },
  { x: 239.5, y: 59.5, tipo: 'altar' }, { x: 69.5, y: 174.5, tipo: 'altar' }, { x: 269.5, y: 174.5, tipo: 'altar' }
];
// ambiente: vagalumes, folhas, poeira — depende da região
function updateAmbient(dt) {
  G.ambT -= dt;
  if (G.ambT > 0) return;
  G.ambT = 0.16;
  const cave = G.map.name === 'cave';
  const forest = G.region === 'Bosque de Bambu' || G.region === 'Floresta de Aokigahara';
  const grave = G.region === 'Templo Abandonado';
  const x0 = G.camX, y0 = G.camY;
  if (G.map.name === 'overworld') {
    for (const p of PONTOS_MAGICOS) {
      const wx = p.x * TILE, wy = p.y * TILE;
      if (Math.hypot(wx - P.x, wy - P.y) > TILE * 9) continue;
      if (Math.random() < 0.4) spawnParticle({
        x: wx + rnd(-4, 4), y: wy + rnd(-2, 2), vx: rnd(-3, 3), vy: rnd(-16, -10), h: 0.6,
        life: rnd(0.9, 1.5), size: 1,
        color: p.tipo === 'fonte' ? pick(['#8ec6f0', '#c6e2f8', '#5a92d6']) : pick(['#b06ae8', '#e0b8ff', '#8a3ac8'])
      });
    }
  }
  if (cave) {
    // faíscas subindo dos cristais
    if (Math.random() < 0.5) spawnParticle({
      x: x0 + rnd(0, VW), y: y0 + rnd(0, VH), vx: rnd(-4, 4), vy: rnd(-14, -6),
      life: rnd(1.2, 2.2), color: pick(['#8a7ac0', '#6a5a9a', '#b06ae8']), size: 1
    });
  } else if (forest) {
    // vagalumes entre os bambus
    if (Math.random() < 0.45) spawnParticle({
      x: x0 + rnd(0, VW), y: y0 + rnd(0, VH), vx: rnd(-6, 6), vy: rnd(-8, -2),
      life: rnd(1.4, 2.6), color: pick(['#c8e860', '#a0d848', '#e8f090']), size: 1
    });
    // folhas de bambu caindo
    if (Math.random() < 0.25) spawnParticle({
      x: x0 + rnd(0, VW), y: y0 - 4, vx: rnd(-12, -4), vy: rnd(10, 18), g: 4,
      life: rnd(1.8, 3), color: pick(['#3a7a34', '#4c8a44', '#2f6b30']), size: 2
    });
  } else if (grave) {
    // névoa subindo
    if (Math.random() < 0.4) spawnParticle({
      x: x0 + rnd(0, VW), y: y0 + VH - rnd(0, 40), vx: rnd(-3, 3), vy: rnd(-10, -4),
      life: rnd(1.6, 3), color: pick(['#6a7a8a', '#8a94a4', '#556070']), size: 2
    });
  } else {
    // pétalas de sakura ao vento (mais densas perto das vilas)
    const vila = G.region === 'Vila Sakuramura' || G.region === 'Vila Iwamura' ||
      G.region === 'Vila Takara' || G.region === 'Vila Kurogane' || G.region === 'Vila Minato';
    if (Math.random() < (vila ? 0.3 : 0.16)) spawnParticle({
      x: x0 + rnd(-8, VW), y: y0 - 6 + rnd(0, VH * 0.5),
      vx: rnd(8, 20), vy: rnd(6, 14), g: 2, drag: 0.4,
      life: rnd(2.4, 4), color: pick(['#f7b3c6', '#ffd6e2', '#e88fa8', '#ffc2d4']), size: 2
    });
    if (Math.random() < 0.07) spawnParticle({
      x: x0 - 4, y: y0 + rnd(0, VH), vx: rnd(10, 22), vy: rnd(-4, 4),
      life: rnd(2, 3.4), color: pick(['#e8e060', '#f0e8a0']), size: 1
    });
  }
}

// paradas dos mascates: pontos por onde circulam
const NPC_DEFS = [
  // --- Vila Sakuramura: mestre de missão, moradores
  { id: 'anciao',  tipo: 'quest',   nome: 'Reiko',   x: 46, y: 102, tema: 'vila',
    look: { cabeca: 'onmyoji', pele: 1, corCabelo: 4, olhos: 4, roupa: 4 },
    linha: 'Meu avô ergueu isso tudo sozinho.\nEu mal consigo defender a entrada leste.' },
  { id: 'ald_kioko', tipo: 'aldeao', nome: 'Kioko',  x: 34, y: 106, raio: 8, tema: 'vila',
    look: { cabeca: 'samurai', pele: 0, corCabelo: 0, olhos: 0, roupa: 3 } },
  { id: 'ald_taro',  tipo: 'aldeao', nome: 'Taro',   x: 52, y: 108, raio: 10, tema: 'vila',
    look: { cabeca: 'samurai', pele: 2, corCabelo: 1, olhos: 3, roupa: 0 } },
  { id: 'ald_hana',  tipo: 'aldeao', nome: 'Hana',   x: 40, y: 92, raio: 8, tema: 'vila',
    look: { cabeca: 'kyudoka', pele: 1, corCabelo: 6, olhos: 2, roupa: 3 } },
  { id: 'ald_goro',  tipo: 'aldeao', nome: 'Goro',   x: 58, y: 98, raio: 12, tema: 'campo',
    look: { cabeca: 'samurai', pele: 3, corCabelo: 0, olhos: 0, roupa: 1 } },
  // --- Vila Iwamura: ferreira e moradores
  { id: 'ferreira', tipo: 'quest',   nome: 'Homura',  x: 156, y: 50, tema: 'forja',
    look: { cabeca: 'shinobi', pele: 2, corCabelo: 2, olhos: 5, roupa: 5 },
    linha: 'Minha primeira lâmina saiu de uma\ncorrente. A de vocês vai sair de ferro de verdade.' },
  { id: 'ald_ren',   tipo: 'aldeao', nome: 'Ren',    x: 148, y: 44, raio: 8, tema: 'forja',
    look: { cabeca: 'samurai', pele: 1, corCabelo: 3, olhos: 1, roupa: 1 } },
  { id: 'ald_mika',  tipo: 'aldeao', nome: 'Mika',   x: 164, y: 54, raio: 10, tema: 'forja',
    look: { cabeca: 'kyudoka', pele: 0, corCabelo: 5, olhos: 2, roupa: 2 } },
  { id: 'ald_sora',  tipo: 'aldeao', nome: 'Sora',   x: 140, y: 56, raio: 12, tema: 'montanha',
    look: { cabeca: 'shinobi', pele: 2, corCabelo: 0, olhos: 4, roupa: 6 } },
  // --- monge no caminho do templo
  { id: 'monge',    tipo: 'quest',   nome: 'Monge Eikan',   x: 120, y: 116, tema: 'templo',
    look: { cabeca: 'onmyoji', pele: 3, corCabelo: 4, olhos: 5, roupa: 4 },
    linha: 'O templo chora à noite.\nAlguém precisa calar esse choro.' },
  { id: 'ald_yuki',  tipo: 'aldeao', nome: 'Yuki',   x: 68, y: 80, raio: 14, tema: 'bambu',
    look: { cabeca: 'shinobi', pele: 1, corCabelo: 1, olhos: 0, roupa: 0 } },
  { id: 'ald_ken',   tipo: 'aldeao', nome: 'Ken',    x: 122, y: 100, raio: 14, tema: 'bambu',
    look: { cabeca: 'samurai', pele: 0, corCabelo: 2, olhos: 3, roupa: 1 } },
  // --- pescador, agora dentro da peixaria (interior perto da Lagoa Central)
  { id: 'pescador', tipo: 'pesca', nome: 'Umi, o Pescador', x: 11, y: 5, map: 'peixaria', tema: 'vila',
    look: { cabeca: 'kyudoka', pele: 2, corCabelo: 3, olhos: 1, roupa: 2 } },
  // --- moradores dentro das casas "relevantes" de cada vila
  { id: 'morador_aldeia', tipo: 'aldeao', nome: 'Obaachan Suzu', x: 11, y: 5, map: 'casa_aldeia', raio: 2, tema: 'vila',
    look: { cabeca: 'onmyoji', pele: 1, corCabelo: 4, olhos: 2, roupa: 3 } },
  { id: 'morador_rocha', tipo: 'aldeao', nome: 'Jiisan Taku', x: 11, y: 5, map: 'casa_rocha', raio: 2, tema: 'forja',
    look: { cabeca: 'samurai', pele: 3, corCabelo: 4, olhos: 4, roupa: 6 } },
  // --- Vila Takara: mestre de missão, moradores
  { id: 'gemologa', tipo: 'quest', nome: 'Aiko', x: 252, y: 64, tema: 'takara',
    look: { cabeca: 'onmyoji', pele: 2, corCabelo: 5, olhos: 3, roupa: 2 },
    linha: 'A montanha só entrega jade a quem\nescuta antes de cavar.' },
  { id: 'ald_kaito', tipo: 'aldeao', nome: 'Kaito', x: 244, y: 58, raio: 8, tema: 'takara',
    look: { cabeca: 'samurai', pele: 1, corCabelo: 2, olhos: 0, roupa: 5 } },
  { id: 'ald_emi',  tipo: 'aldeao', nome: 'Emi', x: 260, y: 68, raio: 10, tema: 'takara',
    look: { cabeca: 'kyudoka', pele: 0, corCabelo: 6, olhos: 4, roupa: 3 } },
  { id: 'ald_daichi', tipo: 'aldeao', nome: 'Daichi', x: 236, y: 70, raio: 12, tema: 'montanha',
    look: { cabeca: 'shinobi', pele: 3, corCabelo: 0, olhos: 5, roupa: 6 } },
  { id: 'morador_takara', tipo: 'aldeao', nome: 'Baa-san Yui', x: 11, y: 5, map: 'casa_takara', raio: 2, tema: 'takara',
    look: { cabeca: 'onmyoji', pele: 2, corCabelo: 4, olhos: 2, roupa: 4 } },
  // --- Vila Kurogane: mestre de missão, moradores
  { id: 'ferreiro_negro', tipo: 'quest', nome: 'Sumi', x: 82, y: 169, tema: 'kurogane',
    look: { cabeca: 'shinobi', pele: 3, corCabelo: 0, olhos: 5, roupa: 5 },
    linha: 'O pântano cospe osso velho.\nEu forjo com o que ele cospe.' },
  { id: 'ald_ryu', tipo: 'aldeao', nome: 'Ryu', x: 70, y: 173, raio: 8, tema: 'kurogane',
    look: { cabeca: 'samurai', pele: 2, corCabelo: 0, olhos: 1, roupa: 6 } },
  { id: 'ald_nao', tipo: 'aldeao', nome: 'Nao', x: 88, y: 175, raio: 10, tema: 'kurogane',
    look: { cabeca: 'kyudoka', pele: 1, corCabelo: 1, olhos: 3, roupa: 5 } },
  { id: 'ald_mei', tipo: 'aldeao', nome: 'Mei', x: 76, y: 159, raio: 12, tema: 'kurogane',
    look: { cabeca: 'onmyoji', pele: 3, corCabelo: 3, olhos: 5, roupa: 2 } },
  { id: 'morador_kurogane', tipo: 'aldeao', nome: 'Ojiisan Ittetsu', x: 11, y: 5, map: 'casa_kurogane', raio: 2, tema: 'kurogane',
    look: { cabeca: 'samurai', pele: 3, corCabelo: 4, olhos: 4, roupa: 5 } },
  // --- Vila Minato: mestre de missão, moradores, pescador do porto
  { id: 'porteiro_minato', tipo: 'quest', nome: 'Tsukasa', x: 282, y: 169, tema: 'minato',
    look: { cabeca: 'kyudoka', pele: 2, corCabelo: 2, olhos: 1, roupa: 6 },
    linha: 'Todo barco que atraca aqui\ntraz uma história atrasada.' },
  { id: 'ald_hiro', tipo: 'aldeao', nome: 'Hiro', x: 270, y: 173, raio: 8, tema: 'minato',
    look: { cabeca: 'samurai', pele: 0, corCabelo: 1, olhos: 2, roupa: 1 } },
  { id: 'ald_nami', tipo: 'aldeao', nome: 'Nami', x: 288, y: 175, raio: 10, tema: 'minato',
    look: { cabeca: 'kyudoka', pele: 1, corCabelo: 3, olhos: 0, roupa: 2 } },
  { id: 'ald_kenji', tipo: 'aldeao', nome: 'Kenji', x: 276, y: 159, raio: 12, tema: 'minato',
    look: { cabeca: 'shinobi', pele: 2, corCabelo: 6, olhos: 4, roupa: 3 } },
  { id: 'morador_minato', tipo: 'aldeao', nome: 'Baa-san Chiyo', x: 11, y: 5, map: 'casa_minato', raio: 2, tema: 'minato',
    look: { cabeca: 'onmyoji', pele: 0, corCabelo: 4, olhos: 3, roupa: 1 } },
  { id: 'pescador_minato', tipo: 'pesca', nome: 'Isamu, o Pescador do Porto', x: 11, y: 5, map: 'peixaria_minato', tema: 'minato',
    look: { cabeca: 'kyudoka', pele: 3, corCabelo: 5, olhos: 5, roupa: 4 } },
  // --- mascates que circulam por trechos largos
  { id: 'merc_tobei', tipo: 'viajante', nome: 'Tobei, o mascate', x: 80, y: 100, raio: 24, tema: 'mascate',
    look: { cabeca: 'kyudoka', pele: 2, corCabelo: 1, olhos: 3, roupa: 5 }, margem: 0.62 },
  { id: 'merc_orin',  tipo: 'viajante', nome: 'Orin das Estradas', x: 124, y: 60, raio: 24, tema: 'mascate',
    look: { cabeca: 'onmyoji', pele: 0, corCabelo: 6, olhos: 2, roupa: 6 }, margem: 0.72 },
  { id: 'merc_sanzo', tipo: 'viajante', nome: 'Sanzo, o raro', x: 100, y: 124, raio: 20, tema: 'mascate',
    look: { cabeca: 'shinobi', pele: 3, corCabelo: 0, olhos: 5, roupa: 5 }, margem: 0.9 }
];

// encontra o tile livre mais próximo, para nenhum NPC nascer dentro de parede
function tileLivrePerto(map, tx, ty) {
  if (!isSolid(map, tx, ty)) return [tx, ty];
  for (let r = 1; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
      const nx = tx + dx, ny = ty + dy;
      if (nx > 0 && ny > 0 && nx < map.w - 1 && ny < map.h - 1 && !isSolid(map, nx, ny)) return [nx, ny];
    }
  }
  return [tx, ty];
}
function spawnNPCs(map) {
  G.npcs = [];
  if (map.name !== 'overworld' && !INTERIORES[map.name]) return;
  for (const d of NPC_DEFS) {
    if ((d.map || 'overworld') !== map.name) continue;
    const [tx, ty] = tileLivrePerto(map, d.x, d.y);
    G.npcs.push({
      ...d,
      x: tx * TILE, y: ty * TILE,
      casaX: tx * TILE, casaY: ty * TILE,
      dir: 'down', frame: 0, animT: 0, moveT: rnd(0.5, 2), vx: 0, vy: 0,
      falaIdx: Math.floor(Math.random() * 97)
    });
  }
}
function updateNPCs(dt) {
  if (!G.npcs) return;
  for (const n of G.npcs) {
    n.animT += dt;
    if (n.tipo === 'quest') { n.frame = 0; continue; }   // mestres ficam no posto
    // longe do jogador nem se mexe: não adianta simular o mapa todo
    if (Math.hypot(n.x - P.x, n.y - P.y) > TILE * 26) continue;
    n.moveT -= dt;
    if (n.moveT <= 0) {
      n.moveT = rnd(1.1, 3.2);
      const vel = n.tipo === 'viajante' ? 22 : 16;
      // volta para casa se andou demais
      const dx = n.casaX - n.x, dy = n.casaY - n.y;
      const lonje = Math.hypot(dx, dy) > (n.raio || 4) * TILE;
      if (lonje) {
        const d = Math.hypot(dx, dy) || 1;
        n.tvx = dx / d * vel; n.tvy = dy / d * vel;
      } else {
        const d = irnd(0, 5);
        n.tvx = d === 0 ? vel : d === 1 ? -vel : 0;
        n.tvy = d === 2 ? vel : d === 3 ? -vel : 0;
      }
    }
    // mesma suavização de velocidade dos mobs: sem salto instantâneo ao
    // trocar de direção
    n.vx = lerp(n.vx || 0, n.tvx || 0, Math.min(1, dt * 10));
    n.vy = lerp(n.vy || 0, n.tvy || 0, Math.min(1, dt * 10));
    if (Math.hypot(n.vx, n.vy) > 3) {
      const nx = n.x + n.vx * dt, ny = n.y + n.vy * dt;
      if (!isSolid(G.map, Math.floor((nx + 8) / TILE), Math.floor((n.y + 12) / TILE))) n.x = nx;
      else n.vx = 0;
      if (!isSolid(G.map, Math.floor((n.x + 8) / TILE), Math.floor((ny + 12) / TILE))) n.y = ny;
      else n.vy = 0;
      if (Math.abs(n.vx) > Math.abs(n.vy)) n.dir = n.vx > 0 ? 'right' : 'left';
      else if (n.vy) n.dir = n.vy > 0 ? 'down' : 'up';
      n.frame = Math.floor(n.animT * 6) % WALK_CYCLE.length;
    } else n.frame = 0;
  }
}
// NPC ao alcance de conversa. Quem está na direção encarada tem preferência,
// para um morador passando por perto não roubar a conversa de quem está à
// frente.
function npcPerto() {
  if (!G.npcs) return null;
  const dx = P.dir === 'left' ? -1 : P.dir === 'right' ? 1 : 0;
  const dy = P.dir === 'up' ? -1 : P.dir === 'down' ? 1 : 0;
  let melhor = null, melhorNota = -Infinity;
  for (const n of G.npcs) {
    const d = Math.hypot(n.x - P.x, n.y - P.y);
    if (d > TILE * 1.7) continue;
    // 1 quando está exatamente na direção encarada, 0 quando está atrás
    const proj = d > 1 ? ((n.x - P.x) * dx + (n.y - P.y) * dy) / d : 1;
    const nota = proj * 2 + (1 - d / (TILE * 1.7));
    if (nota > melhorNota) { melhorNota = nota; melhor = n; }
  }
  return melhor;
}
