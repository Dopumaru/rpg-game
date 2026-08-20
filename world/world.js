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
const SOLID = new Set([1, 2, 5, 8, 10, 14, 16, 17, 18, 20, 21, 23, 27, 29, 30]);
const MAPS = {};

function genOverworld() {
  const W = 96, H = 64;
  const t = [];
  for (let y = 0; y < H; y++) { t.push(new Array(W).fill(0)); }
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H) t[y][x] = v; };
  const rect = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, v); };
  // bordas de árvores
  rect(0, 0, W, 2, 1); rect(0, H - 2, W, 2, 1); rect(0, 0, 2, H, 1); rect(W - 2, 0, 2, H, 1);
  // montanhas ao norte + entrada da caverna
  rect(0, 0, W, 10, 8);
  set(48, 9, 11); set(47, 10, 3); set(48, 10, 3); set(49, 10, 3);
  set(47, 11, 25); set(48, 11, 26); // torii guardando a caverna (topo)
  set(47, 12, 29); set(48, 12, 30); // pilares
  // rio horizontal + pontes
  rect(2, 28, 92, 3, 2);
  rect(20, 28, 2, 3, 7); rect(48, 28, 2, 3, 7); rect(76, 28, 2, 3, 7);
  // FLORESTA UMBRIA (oeste) com clareira do Rei Slime
  for (let y = 32; y < 43; y++) for (let x = 6; x < 27; x++) {
    if (hash2(x, y) < 0.6) set(x, y, 1);
  }
  rect(11, 35, 7, 5, 0);
  // BOSQUE SOMBRIO (leste)
  for (let y = 34; y < 49; y++) for (let x = 56; x < 91; x++) {
    if (hash2(x + 7, y + 3) < 0.55) set(x, y, 1);
  }
  // bolsões de árvores no norte e campos
  for (let i = 0; i < 40; i++) {
    const cx = irnd(4, 91), cy = irnd(11, 60), r = irnd(1, 2);
    if (cx > 10 && cx < 30 && cy > 42) continue;      // Vila Sakuramura
    if (cx > 64 && cx < 86 && cy > 12 && cy < 26) continue; // Vila Iwamura
    if (cx > 72 && cy > 48) continue;                  // cemitério
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (hash2(x * 3, y * 3) < 0.7 && t[y] && t[y][x] === 0) set(x, y, 1);
    }
  }
  // lagoa central
  for (let y = 35; y < 42; y++) for (let x = 31; x < 39; x++) {
    if (Math.hypot(x - 34.5, y - 38) < 3.2) set(x, y, 2);
  }
  // lago do planalto (noroeste, longe da vila)
  for (let y = 15; y < 22; y++) for (let x = 12; x < 20; x++) {
    if (Math.hypot(x - 16, y - 18) < 3.0) set(x, y, 2);
  }
  // lago dos arrozais (sul, perto da estrada do cemitério)
  for (let y = 53; y < 60; y++) for (let x = 41; x < 49; x++) {
    if (Math.hypot(x - 45, y - 56) < 3.0) set(x, y, 2);
  }
  // ALDEIA VERDE (sul)
  rect(12, 44, 17, 13, 0);
  rect(14, 45, 4, 2, 18); rect(14, 47, 4, 2, 5); set(15, 48, 19);
  rect(23, 45, 4, 2, 18); rect(23, 47, 4, 2, 5); set(24, 48, 19);
  set(20, 50, 13); // chozuya (fonte)
  rect(23, 52, 3, 1, 18); set(23, 53, 5); set(24, 53, 14); set(25, 53, 5); // loja
  rect(20, 44, 1, 13, 28); rect(13, 50, 15, 1, 28); // piso de pedra do templo
  set(20, 50, 13);
  set(16, 53, 21); // altar de encantamento
  set(19, 42, 25); set(20, 42, 26);  // torii na entrada norte (topo)
  set(19, 43, 29); set(20, 43, 30);  // pilares
  set(18, 51, 27); set(22, 51, 27);  // lanternas junto ao chozuya
  set(14, 52, 27); set(26, 52, 27);
  // VILA ROCHA (nordeste, junto às montanhas)
  rect(66, 13, 19, 12, 0);
  rect(68, 14, 4, 2, 18); rect(68, 16, 4, 2, 5); set(69, 17, 19);
  rect(80, 14, 4, 2, 18); rect(80, 16, 4, 2, 5); set(81, 17, 19);
  set(74, 20, 13); // chozuya
  rect(77, 21, 3, 1, 18); set(77, 22, 5); set(78, 22, 14); set(79, 22, 5); // loja
  rect(76, 13, 1, 12, 28); rect(67, 20, 17, 1, 28);
  set(74, 20, 13);
  set(71, 22, 21); // altar de encantamento
  set(75, 23, 25); set(76, 23, 26);  // torii ao sul (topo)
  set(75, 24, 29); set(76, 24, 30);  // pilares
  set(72, 18, 27); set(77, 18, 27);  // lanternas
  // CEMITÉRIO ANTIGO (sudeste)
  for (let y = 50; y < 61; y++) for (let x = 74; x < 91; x++) {
    if (t[y][x] === 1) set(x, y, 0);
    if (hash2(x * 11, y * 11) < 0.14 && t[y][x] === 0) set(x, y, 20);
  }
  // estradas
  rect(20, 31, 1, 13, 3);              // ponte oeste -> Sakuramura
  rect(20, 11, 1, 17, 3);              // ponte oeste -> norte
  rect(20, 11, 29, 1, 3);              // norte -> caverna
  rect(48, 11, 1, 17, 3);              // caverna -> ponte central
  rect(48, 31, 1, 19, 3);              // ponte central -> estrada sul
  rect(21, 50, 56, 1, 3);              // estrada sul: aldeia -> cemitério
  rect(76, 25, 1, 3, 3);               // Iwamura -> ponte leste
  rect(76, 31, 1, 19, 3);              // ponte leste -> estrada sul
  // placas
  set(19, 46, 15); set(19, 32, 15); set(50, 12, 15); set(73, 50, 15); set(73, 19, 15);
  // decoração: flores, arbustos, pedras e cogumelos espalhados pela grama
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (t[y][x] !== 0) continue;
    const d = hash2(x * 7, y * 7);
    if (d < 0.05) set(x, y, 4);            // flor
    else if (d < 0.075) set(x, y, 22);     // arbusto
    else if (d < 0.088) set(x, y, 23);     // pedra
    else if (d < 0.095 && y > 30 && x < 30) set(x, y, 24); // cogumelo (floresta)
  }
  // baús escondidos
  set(8, 33, 16); set(88, 36, 16); set(89, 59, 16);
  return { w: W, h: H, tiles: t, name: 'overworld' };
}

// regiões nomeadas (toast ao entrar)
const REGIONS = [
  { x1: 12, y1: 44, x2: 28, y2: 56, name: 'Vila Sakuramura' },
  { x1: 66, y1: 13, x2: 84, y2: 24, name: 'Vila Iwamura' },
  { x1: 6,  y1: 32, x2: 26, y2: 42, name: 'Bosque de Bambu' },
  { x1: 74, y1: 49, x2: 90, y2: 61, name: 'Templo Abandonado' },
  { x1: 56, y1: 33, x2: 90, y2: 49, name: 'Floresta de Aokigahara' },
  { x1: 2,  y1: 10, x2: 93, y2: 27, name: 'Planalto do Norte' },
  { x1: 2,  y1: 31, x2: 93, y2: 61, name: 'Campos de Arroz' }
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
  return { w: W, h: H, tiles: t, name: 'cave' };
}

// ---------- Mundo ----------
function tileAt(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return 1;
  return map.tiles[ty][tx];
}
function isSolid(map, tx, ty) { return SOLID.has(tileAt(map, tx, ty)); }

function enterMap(name, px, py) {
  if (!MAPS[name]) MAPS[name] = name === 'cave' ? genCave() : genOverworld();
  G.map = MAPS[name];
  P.mapName = name;
  P.x = px; P.y = py;
  G.petX = px - 14; G.petY = py;
  G.entities = [];
  spawnEnemies(true);
  if (name === 'cave') {
    if (!G.flags.dragao) G.entities.push(makeEntity('dragao', 18 * TILE, 4 * TILE, 12, true));
    G.region = 'Caverna de Orochi';
    toast('Caverna de Orochi');
  } else {
    if (!G.flags.reislime) G.entities.push(makeEntity('reislime', 14 * TILE, 37 * TILE, 5, true));
    if (!G.flags.necromante) G.entities.push(makeEntity('necromante', 82 * TILE, 55 * TILE, 8, true));
    G.region = null;
  }
  AU.setTrack(name === 'cave' ? AU.CAVE : AU.WORLD);
  spawnNPCs(G.map);
}

const SPAWN_ZONES = {
  overworld: [
    { x1: 6, y1: 32, x2: 70, y2: 61, types: ['slime', 'morcego', 'goblin'], lv: [1, 2], count: 8,
      exclude: [{ x1: 11, y1: 43, x2: 29, y2: 57 }, { x1: 5, y1: 31, x2: 27, y2: 43 }] },
    { x1: 6, y1: 32, x2: 26, y2: 42, types: ['lobo', 'aranha', 'goblin'], lv: [3, 5], count: 6 },
    { x1: 6, y1: 11, x2: 90, y2: 26, types: ['lobo', 'esqueleto', 'harpia'], lv: [4, 6], count: 8,
      exclude: [{ x1: 65, y1: 12, x2: 85, y2: 25 }] },
    { x1: 56, y1: 34, x2: 90, y2: 48, types: ['esqueleto', 'aranha', 'harpia'], lv: [5, 7], count: 7 },
    { x1: 74, y1: 50, x2: 90, y2: 60, types: ['zumbi', 'fantasma', 'esqueleto'], lv: [6, 8], count: 6 }
  ],
  cave: [
    { x1: 3, y1: 9, x2: 33, y2: 22, types: ['orc', 'golem', 'elemental', 'fantasma'], lv: [7, 9], count: 9 }
  ]
};
function makeEntity(type, x, y, lvl, isBoss) {
  return {
    type, x, y, lvl, isBoss: !!isBoss,
    dir: pick(['up', 'down', 'left', 'right']),
    moveT: rnd(0.5, 2), vx: 0, vy: 0, animT: 0
  };
}
function spawnEnemies(initial) {
  const zones = SPAWN_ZONES[G.map.name] || [];
  for (const z of zones) {
    const cur = G.entities.filter(e => !e.isBoss && e.zone === z).length;
    const want = initial ? z.count : Math.min(z.count, cur + 1);
    for (let i = cur; i < want; i++) {
      for (let tries = 0; tries < 30; tries++) {
        const tx = irnd(z.x1, z.x2), ty = irnd(z.y1, z.y2);
        if (z.exclude && z.exclude.some(ex => tx >= ex.x1 && tx <= ex.x2 && ty >= ex.y1 && ty <= ex.y2)) continue;
        if (isSolid(G.map, tx, ty)) continue;
        const px = tx * TILE, py = ty * TILE;
        if (Math.hypot(px - P.x, py - P.y) < TILE * 7) continue;
        const e = makeEntity(pick(z.types), px, py, irnd(z.lv[0], z.lv[1]));
        e.zone = z;
        G.entities.push(e);
        break;
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

const SIGNS = {
  '19,46': 'Vila Sakuramura.\nQue as cerejeiras te abençoem,\nviajante.',
  '19,32': 'Bosque de Bambu a oeste.\nDizem que Nurarihyon, mestre\ndos youkai, reina na clareira.',
  '50,12': 'PERIGO! Caverna de Orochi.\nSó guerreiros de alma firme\ndevem cruzar este torii.',
  '73,50': 'Templo Abandonado.\nOs mortos não descansam...\nKagemaru os comanda.',
  '73,19': 'Vila Iwamura.\nFerreiros e bons negócios.'
};

function updateWorld(dt) {
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
    fadeTo(() => { enterMap('overworld', 48 * TILE, 10 * TILE); P.dir = 'down'; saveGame(); });
  }
  // toast de região
  if (G.map.name === 'overworld') {
    const rg = regionAt(ptx, pty);
    if (rg && rg !== G.region) { G.region = rg; toast(rg); }
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
    } else if (f.t === 14) { // loja (estoque depende da cidade)
      G.shopId = f.tx < 50 ? 'aldeia' : 'rocha';
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
        else { const n = loot.n || 1; P.items[loot.item] += n; showMsg('Você encontrou ' + (n > 1 ? n + 'x ' : '') + ITEMS[loot.item].name + '!'); }
        saveGame();
      }
    } else if (f.t === 19) {
      showMsg('A porta shoji está fechada.\nOs aldeões se escondem\ndos youkai...');
    }
  }
  if (tap('menu')) { G.state = 'menu'; G.menuIdx = 0; G.menuTab = 0; AU.sfx('menu'); }
  if (tap('mapa')) { G.state = 'mapa'; AU.sfx('menu'); }

  // inimigos
  for (const e of G.entities) {
    e.animT += dt;
    const dist = Math.hypot(e.x - P.x, e.y - P.y);
    const chaseR = e.isBoss ? TILE * 4 : TILE * 4.5;
    let evx = 0, evy = 0;
    const espd = e.isBoss ? 30 : (e.type === 'morcego' || e.type === 'lobo' ? 46 : 28);
    if (dist < chaseR) {
      evx = (P.x - e.x) / dist * espd;
      evy = (P.y - e.y) / dist * espd;
    } else if (!e.isBoss) {
      e.moveT -= dt;
      if (e.moveT <= 0) {
        e.moveT = rnd(0.8, 2.4);
        const d = irnd(0, 4);
        e.vx = d === 0 ? espd * 0.6 : d === 1 ? -espd * 0.6 : 0;
        e.vy = d === 2 ? espd * 0.6 : d === 3 ? -espd * 0.6 : 0;
      }
      evx = e.vx; evy = e.vy;
    }
    if (evx || evy) tryMove(e, evx * dt, evy * dt);
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

  // câmera: segue o herói travada em pixel inteiro (zero tremor ao andar)
  G.camX = clamp(Math.round(P.x) + 8 - VW / 2, 0, G.map.w * TILE - VW);
  G.camY = clamp(Math.round(P.y) + 11 - VH / 2, 0, G.map.h * TILE - VH);
}

// ambiente: vagalumes, folhas, poeira — depende da região
function updateAmbient(dt) {
  G.ambT -= dt;
  if (G.ambT > 0) return;
  G.ambT = 0.16;
  const cave = G.map.name === 'cave';
  const forest = G.region === 'Bosque de Bambu' || G.region === 'Floresta de Aokigahara';
  const grave = G.region === 'Templo Abandonado';
  const x0 = G.camX, y0 = G.camY;
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
    const vila = G.region === 'Vila Sakuramura' || G.region === 'Vila Iwamura';
    if (Math.random() < (vila ? 0.55 : 0.3)) spawnParticle({
      x: x0 + rnd(-8, VW), y: y0 - 6 + rnd(0, VH * 0.5),
      vx: rnd(8, 20), vy: rnd(6, 14), g: 2, drag: 0.4,
      life: rnd(2.4, 4), color: pick(['#f7b3c6', '#ffd6e2', '#e88fa8', '#ffc2d4']), size: 2
    });
    if (Math.random() < 0.12) spawnParticle({
      x: x0 - 4, y: y0 + rnd(0, VH), vx: rnd(10, 22), vy: rnd(-4, 4),
      life: rnd(2, 3.4), color: pick(['#e8e060', '#f0e8a0']), size: 1
    });
  }
}

// paradas dos mascates: pontos por onde circulam
const NPC_DEFS = [
  // --- Vila Sakuramura: mestre de missão, moradores
  { id: 'anciao',  tipo: 'quest',   nome: 'Ancião Genzo',   x: 23, y: 51, tema: 'vila',
    look: { cabeca: 'onmyoji', pele: 1, corCabelo: 4, olhos: 4, roupa: 4 },
    linha: 'Sakuramura resiste, mas mal.\nUm braço firme faria diferença.' },
  { id: 'ald_kioko', tipo: 'aldeao', nome: 'Kioko',  x: 17, y: 53, raio: 4, tema: 'vila',
    look: { cabeca: 'samurai', pele: 0, corCabelo: 0, olhos: 0, roupa: 3 } },
  { id: 'ald_taro',  tipo: 'aldeao', nome: 'Taro',   x: 26, y: 54, raio: 5, tema: 'vila',
    look: { cabeca: 'samurai', pele: 2, corCabelo: 1, olhos: 3, roupa: 0 } },
  { id: 'ald_hana',  tipo: 'aldeao', nome: 'Hana',   x: 20, y: 46, raio: 4, tema: 'vila',
    look: { cabeca: 'kyudoka', pele: 1, corCabelo: 6, olhos: 2, roupa: 3 } },
  { id: 'ald_goro',  tipo: 'aldeao', nome: 'Goro',   x: 29, y: 49, raio: 6, tema: 'campo',
    look: { cabeca: 'samurai', pele: 3, corCabelo: 0, olhos: 0, roupa: 1 } },
  // --- Vila Iwamura: ferreira e moradores
  { id: 'ferreira', tipo: 'quest',   nome: 'Ferreira Sae',  x: 78, y: 25, tema: 'forja',
    look: { cabeca: 'shinobi', pele: 2, corCabelo: 2, olhos: 5, roupa: 5 },
    linha: 'Martelo não bate sozinho.\nSe quiser aço, traga do que se faz aço.' },
  { id: 'ald_ren',   tipo: 'aldeao', nome: 'Ren',    x: 74, y: 22, raio: 4, tema: 'forja',
    look: { cabeca: 'samurai', pele: 1, corCabelo: 3, olhos: 1, roupa: 1 } },
  { id: 'ald_mika',  tipo: 'aldeao', nome: 'Mika',   x: 82, y: 27, raio: 5, tema: 'forja',
    look: { cabeca: 'kyudoka', pele: 0, corCabelo: 5, olhos: 2, roupa: 2 } },
  { id: 'ald_sora',  tipo: 'aldeao', nome: 'Sora',   x: 70, y: 28, raio: 6, tema: 'montanha',
    look: { cabeca: 'shinobi', pele: 2, corCabelo: 0, olhos: 4, roupa: 6 } },
  // --- monge no caminho do templo
  { id: 'monge',    tipo: 'quest',   nome: 'Monge Eikan',   x: 60, y: 58, tema: 'templo',
    look: { cabeca: 'onmyoji', pele: 3, corCabelo: 4, olhos: 5, roupa: 4 },
    linha: 'O templo chora à noite.\nAlguém precisa calar esse choro.' },
  { id: 'ald_yuki',  tipo: 'aldeao', nome: 'Yuki',   x: 34, y: 40, raio: 7, tema: 'bambu',
    look: { cabeca: 'shinobi', pele: 1, corCabelo: 1, olhos: 0, roupa: 0 } },
  { id: 'ald_ken',   tipo: 'aldeao', nome: 'Ken',    x: 66, y: 44, raio: 7, tema: 'bambu',
    look: { cabeca: 'samurai', pele: 0, corCabelo: 2, olhos: 3, roupa: 1 } },
  // --- pescador junto à Lagoa Central
  { id: 'pescador', tipo: 'pesca', nome: 'Umi, o Pescador', x: 30, y: 39, tema: 'vila',
    look: { cabeca: 'kyudoka', pele: 2, corCabelo: 3, olhos: 1, roupa: 2 } },
  // --- mascates que circulam por trechos largos
  { id: 'merc_tobei', tipo: 'viajante', nome: 'Tobei, o mascate', x: 40, y: 50, raio: 12, tema: 'mascate',
    look: { cabeca: 'kyudoka', pele: 2, corCabelo: 1, olhos: 3, roupa: 5 }, margem: 0.62 },
  { id: 'merc_orin',  tipo: 'viajante', nome: 'Orin das Estradas', x: 62, y: 30, raio: 12, tema: 'mascate',
    look: { cabeca: 'onmyoji', pele: 0, corCabelo: 6, olhos: 2, roupa: 6 }, margem: 0.72 },
  { id: 'merc_sanzo', tipo: 'viajante', nome: 'Sanzo, o raro', x: 50, y: 62, raio: 10, tema: 'mascate',
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
  if (map.name !== 'overworld') return;   // por ora, só o mundo aberto
  for (const d of NPC_DEFS) {
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
        n.vx = dx / d * vel; n.vy = dy / d * vel;
      } else {
        const d = irnd(0, 5);
        n.vx = d === 0 ? vel : d === 1 ? -vel : 0;
        n.vy = d === 2 ? vel : d === 3 ? -vel : 0;
      }
    }
    if (n.vx || n.vy) {
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
