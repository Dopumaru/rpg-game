'use strict';
/* ============================================================
   render/tiles.js — renderização de tiles (chão, cenário, objetos)
   Extraído de index.html (Etapa 1 da separação estrutural planejada
   com o Graphify). Script clássico (não é módulo ES) — compartilha o
   mesmo escopo léxico global de index.html via <script src>, então
   TILE, ctx, G, hash2(), treeSpecies() e tileAt() continuam
   acessíveis por nome sem import; bakeTile(), tileVarCache, px(),
   seeded() e as funções de bake e desenho de tile continuam
   acessíveis de volta em index.html sem export.
   ============================================================ */

// ---------- Desenho: tiles ----------
// Tiles são pré-renderizados em canvas próprios (variantes por hash) e só
// blitados no frame — muito mais barato que centenas de fillRect por quadro.
const tileVarCache = new Map();
function bakeTile(key, painter) {
  let c = tileVarCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = TILE; c.height = TILE;
  const g = c.getContext('2d');
  painter(g);
  tileVarCache.set(key, c);
  return c;
}
const px = (g, color, x, y, w, h) => { g.fillStyle = color; g.fillRect(x, y, w || 1, h || 1); };
// PRNG determinístico por variante: garante posições bem espalhadas dentro do tile
function seeded(seed) {
  let s = seed * 2654435761 >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967295;
  };
}

// --- grama: 6 variantes com tufos e manchas de tom ---
// tons muito próximos: variam a textura sem deixar a grade de 16px visível
const GRASS_BASE = ['#3f7a3a', '#407b3b', '#3e793a', '#417c3c', '#3f7a39', '#407a3b'];
function bakeGrass(v) {
  return bakeTile('grass' + v, g => {
    px(g, GRASS_BASE[v % GRASS_BASE.length], 0, 0, TILE, TILE);
    const r = seeded(v * 97 + 13);
    // manchas de tom
    for (let i = 0; i < 8; i++) {
      px(g, i % 3 === 0 ? '#356e30' : '#4a8945',
        Math.floor(r() * 14), Math.floor(r() * 15), 2, 1);
    }
    // tufos de capim
    for (let i = 0; i < 3; i++) {
      const hx = 1 + Math.floor(r() * 13), hy = 2 + Math.floor(r() * 11);
      px(g, '#4d8b4a', hx, hy, 1, 2);
      px(g, '#569a56', hx + 1, hy + 1, 1, 1);
    }
  });
}
// --- caminho de terra ---
function bakeDirt(v) {
  return bakeTile('dirt' + v, g => {
    px(g, '#b5a06e', 0, 0, TILE, TILE);
    const r = seeded(v * 131 + 29);
    for (let i = 0; i < 10; i++) {
      px(g, i % 2 ? '#a89162' : '#c1ad7c', Math.floor(r() * 15), Math.floor(r() * 15), 2, 1);
    }
    for (let i = 0; i < 3; i++) {
      px(g, '#8e7a52', 1 + Math.floor(r() * 12), 1 + Math.floor(r() * 12), 2, 2);
    }
  });
}
// --- árvores: 3 espécies ---
function bakeTree(v, gv) {
  return bakeTile('tree' + v + '_' + gv, g => {
    g.drawImage(bakeGrass(gv), 0, 0);
    if (v === 0) {         // sakura em flor
      // tronco com galhos
      px(g, '#4a3020', 7, 9, 3, 7);
      px(g, '#3a2418', 7, 9, 1, 7);
      px(g, '#4a3020', 4, 8, 3, 1);
      px(g, '#4a3020', 10, 8, 3, 1);
      // copa larga em camadas
      px(g, '#b8536e', 1, 5, 14, 5);
      px(g, '#c9647f', 0, 3, 16, 4);
      px(g, '#e88fa8', 1, 2, 13, 4);
      px(g, '#f7b3c6', 2, 1, 10, 3);
      px(g, '#ffd6e2', 4, 1, 5, 2);
      // flores soltas nas pontas
      px(g, '#ffd6e2', 13, 4, 2, 1);
      px(g, '#f7b3c6', 1, 7, 2, 1);
      px(g, '#b8536e', 3, 9, 3, 1);
      px(g, '#b8536e', 11, 9, 3, 1);
    } else if (v === 1) {  // bambu (colmos verticais)
      px(g, '#2f6b30', 2, 0, 3, TILE);
      px(g, '#3f8a3c', 2, 0, 1, TILE);
      px(g, '#254f26', 2, 5, 3, 1);
      px(g, '#254f26', 2, 11, 3, 1);
      px(g, '#2f6b30', 7, 0, 3, TILE);
      px(g, '#3f8a3c', 7, 0, 1, TILE);
      px(g, '#254f26', 7, 3, 3, 1);
      px(g, '#254f26', 7, 9, 3, 1);
      px(g, '#2f6b30', 12, 0, 2, TILE);
      px(g, '#3f8a3c', 12, 0, 1, TILE);
      px(g, '#254f26', 12, 7, 2, 1);
      px(g, '#4f9a4a', 5, 2, 2, 1);
      px(g, '#4f9a4a', 10, 8, 2, 1);
    } else {               // pinheiro japonês (matsu) em camadas
      px(g, '#54381f', 7, 11, 3, 5);
      px(g, '#3f2818', 7, 11, 1, 5);
      px(g, '#17421f', 2, 8, 12, 3);
      px(g, '#20612c', 3, 7, 10, 3);
      px(g, '#17421f', 4, 4, 8, 3);
      px(g, '#20612c', 5, 3, 6, 3);
      px(g, '#2b7534', 5, 1, 6, 2);
      px(g, '#37883d', 6, 1, 3, 1);
    }
  });
}
// --- pedra na grama ---
function bakeRock(v) {
  return bakeTile('rock' + v, g => {
    g.drawImage(bakeGrass(v % 4), 0, 0);
    px(g, '#1a1626', 3, 7, 10, 7);
    px(g, '#77778a', 4, 6, 8, 7);
    px(g, '#9393a6', 5, 6, 5, 3);
    px(g, '#5c5c6e', 4, 11, 8, 2);
  });
}
// --- arbusto ---
function bakeBush(v) {
  return bakeTile('bush' + v, g => {
    g.drawImage(bakeGrass(v % 6), 0, 0);
    // silhueta arredondada por camadas
    px(g, '#16331a', 4, 5, 8, 2);
    px(g, '#16331a', 2, 7, 12, 6);
    px(g, '#16331a', 4, 13, 8, 1);
    px(g, '#28602c', 5, 6, 6, 2);
    px(g, '#28602c', 3, 8, 10, 4);
    px(g, '#348038', 5, 7, 4, 3);
    px(g, '#3f9042', 6, 7, 2, 1);
    px(g, '#1e4a22', 4, 11, 8, 2);
    if (v === 1) { px(g, '#d04848', 5, 9, 2, 2); px(g, '#e06060', 5, 9, 1, 1); px(g, '#d04848', 10, 8, 2, 2); }
  });
}
// --- flores (3 cores) ---
function bakeFlower(v) {
  return bakeTile('flower' + v, g => {
    g.drawImage(bakeGrass(v % 4), 0, 0);
    const c = ['#e8e060', '#e07898', '#e8e8f0', '#8ab0f0'][v % 4];
    px(g, '#4c8a44', 7, 8, 1, 4);
    px(g, c, 6, 5, 4, 4);
    px(g, '#f0d040', 7, 6, 2, 2);
    px(g, '#4c8a44', 11, 11, 1, 2);
    px(g, c, 10, 9, 3, 3);
  });
}
// --- cogumelos: vermelhos na floresta, luminosos na caverna ---
function bakeMushroom(v, cave) {
  return bakeTile('shroom' + v + (cave ? 'c' : 'g'), g => {
    g.drawImage(cave ? bakeCaveFloor(v % 4) : bakeGrass(v % 4), 0, 0);
    px(g, cave ? '#c8c0e0' : '#e8e0d0', 7, 9, 3, 4);
    px(g, cave ? '#6a4ac0' : '#c04040', 5, 6, 7, 4);
    px(g, cave ? '#9a7ae8' : '#e06060', 6, 6, 4, 2);
    px(g, cave ? '#d8c0ff' : '#f0f0e0', 7, 7, 1, 1);
    px(g, cave ? '#d8c0ff' : '#f0f0e0', 9, 8, 1, 1);
    px(g, '#4a4034', 5, 12, 7, 1);
  });
}
// --- muro de pedra ---
// parede de taipa clara com viga de madeira (estilo machiya)
function bakeStoneWall(v) {
  return bakeTile('wall' + v, g => {
    px(g, '#ddd2bb', 0, 0, TILE, TILE);
    px(g, '#eae0cc', 0, 0, TILE, 2);
    px(g, '#c4b79c', 0, 14, TILE, 2);
    // vigas de madeira escura
    px(g, '#6b4b30', 0, 0, 2, TILE);
    px(g, '#6b4b30', 14, 0, 2, TILE);
    px(g, '#7d5a3a', 0, 0, 1, TILE);
    px(g, '#6b4b30', 0, 6, TILE, 2);
    px(g, '#7d5a3a', 0, 6, TILE, 1);
  });
}
// --- montanha ---
function bakeMountain(v) {
  return bakeTile('mtn' + v, g => {
    px(g, '#6a6478', 0, 0, TILE, TILE);
    px(g, '#7e788e', 2, 8, 5, 5);
    px(g, '#7e788e', 8, 3, 6, 6);
    px(g, '#565064', 1, 13, 6, 2);
    px(g, '#565064', 9, 9, 6, 2);
    px(g, '#9a94ac', 9, 2, 4, 2);
    px(g, '#4a4458', 0, 0, TILE, 1);
    if (v % 3 === 0) { px(g, '#b0aac0', 10, 3, 2, 1); }
  });
}
// --- piso e parede de caverna ---
function bakeCaveFloor(v) {
  return bakeTile('cfloor' + v, g => {
    px(g, '#3a3446', 0, 0, TILE, TILE);
    const r = seeded(v * 211 + 41);
    for (let i = 0; i < 6; i++) {
      px(g, i % 2 ? '#443e52' : '#332e3e', Math.floor(r() * 14), Math.floor(r() * 15), 2, 1);
    }
    if (v === 2) { px(g, '#524a66', 6, 6, 2, 2); }
    if (v === 3) { px(g, '#2c2838', 3, 10, 4, 2); }
  });
}
function bakeCaveWall(v) {
  return bakeTile('cwall' + v, g => {
    px(g, '#221e2e', 0, 0, TILE, TILE);
    const r = seeded(v * 419 + 61);
    // blocos rochosos irregulares
    for (let i = 0; i < 6; i++) {
      const bx = Math.floor(r() * 11), by = Math.floor(r() * 11);
      const bw = 3 + Math.floor(r() * 4), bh = 3 + Math.floor(r() * 4);
      px(g, '#2e2a3c', bx, by, bw, bh);
      px(g, '#3a3450', bx, by, bw, 1);
      px(g, '#191524', bx, by + bh - 1, bw, 1);
    }
    // veios de cristal ocasionais
    if (v % 4 === 0) { px(g, '#6a5a9a', 11, 10, 2, 4); px(g, '#8a7ac0', 11, 11, 1, 2); }
    if (v % 5 === 2) { px(g, '#5a4a86', 3, 3, 1, 3); }
  });
}
// --- lápide ---
function bakeGrave(v) {
  return bakeTile('grave' + v, g => {
    px(g, '#38583a', 0, 0, TILE, TILE);
    const r = seeded(v * 307 + 17);
    for (let i = 0; i < 6; i++) px(g, '#31502f', Math.floor(r() * 14), Math.floor(r() * 15), 2, 1);
    // estátua jizo com babador vermelho
    px(g, '#1a1626', 4, 3, 8, 12);
    px(g, '#a8a598', 5, 4, 6, 10);
    px(g, '#c2bfb0', 6, 3, 4, 3);
    px(g, '#8f8c80', 6, 6, 1, 1);
    px(g, '#8f8c80', 9, 6, 1, 1);
    px(g, '#c0392b', 5, 9, 6, 3);
    px(g, '#e05548', 5, 9, 6, 1);
    px(g, '#7a7870', 4, 14, 8, 1);
  });
}
// --- telhado e porta ---
// telhado de telhas kawara (azul-acinzentado, com beiral)
function bakeRoof() {
  return bakeTile('roof', g => {
    px(g, '#3f4a5c', 0, 0, TILE, TILE);
    px(g, '#4d5a6e', 0, 1, TILE, 3);
    px(g, '#4d5a6e', 0, 7, TILE, 3);
    px(g, '#333c4b', 0, 4, TILE, 1);
    px(g, '#333c4b', 0, 10, TILE, 1);
    px(g, '#5d6c82', 0, 0, TILE, 1);
    // beiral saliente
    px(g, '#2a323e', 0, 13, TILE, 3);
    px(g, '#6b7b93', 0, 13, TILE, 1);
    // sulcos das telhas
    px(g, '#333c4b', 3, 0, 1, 13);
    px(g, '#333c4b', 8, 0, 1, 13);
    px(g, '#333c4b', 13, 0, 1, 13);
  });
}
// porta shoji: papel translúcido com grade de madeira
function bakeDoor() {
  return bakeTile('door', g => {
    px(g, '#ddd2bb', 0, 0, TILE, TILE);
    px(g, '#6b4b30', 2, 1, 12, 15);
    px(g, '#f2ecd8', 3, 2, 10, 13);
    // grade
    px(g, '#8a6540', 3, 6, 10, 1);
    px(g, '#8a6540', 3, 10, 10, 1);
    px(g, '#8a6540', 7, 2, 1, 13);
    px(g, '#c9bfa4', 3, 2, 10, 1);
  });
}
// --- ponte ---
// ponte laqueada de vermelho (estilo taiko-bashi)
function bakeBridge() {
  return bakeTile('bridge', g => {
    px(g, '#b8453a', 0, 0, TILE, TILE);
    px(g, '#c9564a', 0, 2, TILE, 1);
    px(g, '#c9564a', 0, 8, TILE, 1);
    px(g, '#8f2f28', 0, 5, TILE, 1);
    px(g, '#8f2f28', 0, 11, TILE, 1);
    // guarda-corpo
    px(g, '#8f2f28', 0, 0, 2, TILE);
    px(g, '#8f2f28', 14, 0, 2, TILE);
    px(g, '#d4675a', 0, 0, 1, TILE);
    px(g, '#d4675a', 14, 0, 1, TILE);
  });
}
// --- baús ---
function bakeChest(open, cave) {
  return bakeTile('chest' + (open ? 'O' : 'C') + (cave ? 'v' : 'g'), g => {
    if (cave) g.drawImage(bakeCaveFloor(0), 0, 0); else g.drawImage(bakeGrass(0), 0, 0);
    if (open) {
      px(g, '#1a1626', 2, 6, 12, 8);
      px(g, '#5a3a1c', 3, 7, 10, 6);
      px(g, '#2a1c10', 4, 8, 8, 4);
      px(g, '#8a5a2a', 2, 4, 12, 2);
    } else {
      px(g, '#1a1626', 2, 4, 12, 10);
      px(g, '#8a5a2a', 3, 5, 10, 8);
      px(g, '#a8763c', 3, 5, 10, 3);
      px(g, '#c08a4a', 4, 5, 8, 1);
      px(g, '#6a4420', 3, 9, 10, 1);
      px(g, '#e8c050', 7, 8, 2, 3);
      px(g, '#f0d878', 7, 8, 2, 1);
    }
  });
}
// --- placa ---
function bakeSign() {
  return bakeTile('sign', g => {
    g.drawImage(bakeGrass(1), 0, 0);
    px(g, '#4a3020', 7, 8, 2, 7);
    px(g, '#8a6a42', 2, 2, 12, 7);
    px(g, '#a07f52', 2, 2, 12, 1);
    px(g, '#755835', 3, 4, 10, 1);
    px(g, '#755835', 3, 6, 8, 1);
    px(g, '#5c4426', 2, 8, 12, 1);
  });
}
// --- balcão da loja ---
function bakeShop() {
  return bakeTile('shop', g => {
    px(g, '#8a6a42', 0, 0, TILE, TILE);
    px(g, '#755835', 0, 6, TILE, 10);
    px(g, '#96754a', 0, 6, TILE, 1);
    px(g, '#e8c050', 4, 1, 8, 5);
    px(g, '#f0d878', 4, 1, 8, 1);
    px(g, '#4a3020', 5, 2, 6, 3);
    px(g, '#e8c050', 7, 3, 2, 1);
  });
}
// --- entrada/saída de caverna ---
function bakeCaveMouth() {
  return bakeTile('cmouth', g => {
    px(g, '#6a6478', 0, 0, TILE, TILE);
    px(g, '#565064', 0, 0, TILE, 3);
    px(g, '#0c0a12', 2, 4, 12, 12);
    px(g, '#1c1826', 3, 3, 10, 3);
    px(g, '#2a2438', 4, 4, 8, 1);
  });
}

// --- torii (portal xintoísta): 2 tiles de largura x 2 de altura ---
// topo = travessas kasagi/nuki; base = pilares
function bakeToriiTop(half) {
  return bakeTile('toriiT' + half, g => {
    g.drawImage(bakeGrass(2), 0, 0);
    // kasagi (travessa curva superior) atravessa os dois tiles
    px(g, '#8f2f28', 0, 3, TILE, 4);
    px(g, '#c0392b', 0, 3, TILE, 3);
    px(g, '#e05548', 0, 3, TILE, 1);
    // ponta erguida nas extremidades
    if (half === 0) { px(g, '#c0392b', 0, 1, 4, 2); px(g, '#e05548', 0, 1, 4, 1); }
    else { px(g, '#c0392b', 12, 1, 4, 2); px(g, '#e05548', 12, 1, 4, 1); }
    // nuki (travessa inferior)
    px(g, '#8f2f28', 0, 10, TILE, 3);
    px(g, '#c0392b', 0, 10, TILE, 2);
    px(g, '#e05548', 0, 10, TILE, 1);
    // pilares descendo
    const cx = half === 0 ? 3 : 10;
    px(g, '#8f2f28', cx, 7, 3, 9);
    px(g, '#c0392b', cx, 7, 2, 9);
    px(g, '#e05548', cx, 7, 1, 9);
  });
}
function bakeToriiBase(half) {
  return bakeTile('toriiB' + half, g => {
    g.drawImage(bakeGrass(3), 0, 0);
    const cx = half === 0 ? 3 : 10;
    px(g, '#8f2f28', cx, 0, 3, 14);
    px(g, '#c0392b', cx, 0, 2, 14);
    px(g, '#e05548', cx, 0, 1, 14);
    // base de pedra
    px(g, '#6e6e78', cx - 1, 13, 5, 3);
    px(g, '#8a8a94', cx - 1, 13, 5, 1);
  });
}
// --- lanterna de pedra (toro) ---
function bakeLantern() {
  return bakeTile('lantern', g => {
    g.drawImage(bakeGrass(1), 0, 0);
    px(g, '#4a4a52', 5, 13, 6, 3);
    px(g, '#6e6e78', 6, 10, 4, 4);
    px(g, '#8a8a94', 4, 6, 8, 5);
    px(g, '#3a3a42', 5, 7, 6, 3);
    px(g, '#ffd98a', 6, 8, 4, 2);
    px(g, '#fff0c0', 7, 8, 2, 1);
    px(g, '#6e6e78', 3, 4, 10, 2);
    px(g, '#8a8a94', 3, 4, 10, 1);
    px(g, '#6e6e78', 6, 2, 4, 2);
  });
}
// --- piso de pedra do templo ---
function bakeTemplePath(v) {
  return bakeTile('tpath' + v, g => {
    px(g, '#9a9384', 0, 0, TILE, TILE);
    const r = seeded(v * 71 + 23);
    for (let i = 0; i < 6; i++) px(g, '#8a8375', Math.floor(r() * 14), Math.floor(r() * 15), 2, 1);
    px(g, '#7d7668', 0, 7, TILE, 1);
    px(g, '#7d7668', 7, 0, 1, TILE);
    px(g, '#a9a294', 0, 0, TILE, 1);
    px(g, '#a9a294', 0, 8, TILE, 1);
  });
}

// tiles animados/dinâmicos ficam em funções de desenho direto
function drawWaterTile(g0, x, y, tx, ty, map) {
  const v = hash2(tx, ty);
  const ph = (G.time * 1.6 + v * 3) % 2;
  ctx.fillStyle = ph < 1 ? '#2a5a9a' : '#2e62a6';
  ctx.fillRect(x, y, TILE, TILE);
  // ondas
  ctx.fillStyle = '#3d72b6';
  const w1 = Math.floor((G.time * 8 + tx * 5 + ty * 3) % 16);
  ctx.fillRect(x + w1 % 12 + 1, y + 4, 4, 1);
  ctx.fillRect(x + (w1 + 7) % 12 + 2, y + 10, 3, 1);
  if (v < 0.35) { ctx.fillStyle = '#5a92d6'; ctx.fillRect(x + (w1 + 3) % 11 + 2, y + 7, 3, 1); }
  // espuma nas margens (autotile simples contra tiles não-água)
  const isW = (ax, ay) => tileAt(map, ax, ay) === 2;
  ctx.fillStyle = '#8ec2ea';
  if (!isW(tx, ty - 1)) ctx.fillRect(x, y, TILE, 1);
  if (!isW(tx, ty + 1)) ctx.fillRect(x, y + TILE - 1, TILE, 1);
  if (!isW(tx - 1, ty)) ctx.fillRect(x, y, 1, TILE);
  if (!isW(tx + 1, ty)) ctx.fillRect(x + TILE - 1, y, 1, TILE);
}
function drawFountainTile(x, y) {
  ctx.fillStyle = '#b09a6a'; ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#8e8ea2'; ctx.fillRect(x + 1, y + 1, 14, 14);
  ctx.fillStyle = '#6e6e82'; ctx.fillRect(x + 1, y + 1, 14, 1);
  const ph = Math.floor(G.time * 3) % 2;
  ctx.fillStyle = ph ? '#4a82c6' : '#5a92d6'; ctx.fillRect(x + 3, y + 3, 10, 10);
  ctx.fillStyle = '#8ec6f0'; ctx.fillRect(x + 6 + (ph ? 1 : 0), y + 5, 3, 3);
  ctx.fillStyle = '#c6e2f8'; ctx.fillRect(x + 7, y + 7, 2, 2);
  // jato central
  const jy = Math.floor(Math.sin(G.time * 4) * 1.5);
  ctx.fillStyle = '#d8eeff'; ctx.fillRect(x + 7, y + 2 + jy, 2, 3);
}
function drawAltarTile(x, y) {
  ctx.fillStyle = '#3f7a3a'; ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#4a4458'; ctx.fillRect(x + 2, y + 10, 12, 5);
  ctx.fillStyle = '#5c5c6e'; ctx.fillRect(x + 3, y + 9, 10, 5);
  ctx.fillStyle = '#8e8ea2'; ctx.fillRect(x + 4, y + 8, 8, 2);
  const fl = Math.sin(G.time * 3) * 1.5;
  const cy = y + 2 + Math.round(fl);
  ctx.fillStyle = 'rgba(176,106,232,0.25)'; ctx.fillRect(x + 4, cy + 1, 8, 8);
  ctx.fillStyle = '#8a3ac8'; ctx.fillRect(x + 6, cy, 4, 6);
  ctx.fillStyle = '#b06ae8'; ctx.fillRect(x + 6, cy + 1, 3, 4);
  ctx.fillStyle = '#e0b8ff'; ctx.fillRect(x + 7, cy + 2, 1, 2);
}
function drawCaveExitTile(x, y) {
  ctx.drawImage(bakeCaveFloor(0), x, y);
  const gl = 0.6 + Math.sin(G.time * 2) * 0.2;
  ctx.fillStyle = '#7a8ac0'; ctx.fillRect(x + 3, y + 3, 10, 10);
  ctx.globalAlpha = gl;
  ctx.fillStyle = '#aabce0'; ctx.fillRect(x + 4, y + 4, 8, 8);
  ctx.fillStyle = '#dce6ff'; ctx.fillRect(x + 6, y + 6, 4, 4);
  ctx.globalAlpha = 1;
}

function drawTile(t, x, y, tx, ty, map) {
  const v = hash2(tx, ty);
  switch (t) {
    case 0:  ctx.drawImage(bakeGrass(Math.floor(v * 6) % 6), x, y); break;
    case 1:  ctx.drawImage(bakeTree(treeSpecies(tx, ty), Math.floor(v * 6) % 6), x, y); break;
    case 2:  drawWaterTile(null, x, y, tx, ty, map); break;
    case 3:  ctx.drawImage(bakeDirt(Math.floor(v * 4) % 4), x, y); break;
    case 4:  ctx.drawImage(bakeFlower(Math.floor(v * 4) % 4), x, y); break;
    case 5:  ctx.drawImage(bakeStoneWall(0), x, y); break;
    case 6:  ctx.drawImage(bakeDirt(2), x, y); break;
    case 7:  ctx.drawImage(bakeBridge(), x, y); break;
    case 8:  ctx.drawImage(bakeMountain(Math.floor(hash2(tx * 13 + 2, ty * 29 + 7) * 3) % 3), x, y); break;
    case 9:  ctx.drawImage(bakeCaveFloor(Math.floor(hash2(tx * 37 + 1, ty * 19 + 9) * 4) % 4), x, y); break;
    case 10: ctx.drawImage(bakeCaveWall(Math.floor(hash2(tx * 23 + 5, ty * 41 + 11) * 8) % 8), x, y); break;
    case 11: ctx.drawImage(bakeCaveMouth(), x, y); break;
    case 12: drawCaveExitTile(x, y); break;
    case 13: drawFountainTile(x, y); break;
    case 14: ctx.drawImage(bakeShop(), x, y); break;
    case 15: ctx.drawImage(bakeSign(), x, y); break;
    case 16: ctx.drawImage(bakeChest(false, map.name === 'cave'), x, y); break;
    case 17: ctx.drawImage(bakeChest(true, map.name === 'cave'), x, y); break;
    case 18: ctx.drawImage(bakeRoof(), x, y); break;
    case 19: ctx.drawImage(bakeDoor(), x, y); break;
    case 20: ctx.drawImage(bakeGrave(Math.floor(v * 3) + 1), x, y); break;
    case 21: drawAltarTile(x, y); break;
    case 22: ctx.drawImage(bakeBush(Math.floor(v * 2)), x, y); break;
    case 23: ctx.drawImage(bakeRock(Math.floor(v * 4) % 4), x, y); break;
    case 24: ctx.drawImage(bakeMushroom(Math.floor(v * 2), map.name === 'cave'), x, y); break;
    case 25: ctx.drawImage(bakeToriiTop(0), x, y); break;
    case 26: ctx.drawImage(bakeToriiTop(1), x, y); break;
    case 29: ctx.drawImage(bakeToriiBase(0), x, y); break;
    case 30: ctx.drawImage(bakeToriiBase(1), x, y); break;
    case 27: ctx.drawImage(bakeLantern(), x, y); break;
    case 28: ctx.drawImage(bakeTemplePath(Math.floor(v * 3) % 3), x, y); break;
    case 31: ctx.drawImage(bakeDoor(), x, y); break;
  }
}
