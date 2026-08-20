'use strict';
/* ============================================================
   sprites/sprites.js — composição de sprites (herói, NPCs, youkai,
   pets) a partir de arte em camadas por paleta
   Extraído de index.html (quinta extração estrutural planejada com o
   Graphify, após render/tiles.js, economy/shop.js, quests/quests.js e
   craft/altar.js). Script clássico (não é módulo ES) — compartilha o
   mesmo escopo léxico global de index.html via <script src>. Depende
   por nome (sem import) de: P, G, EQUIP, defaultLook(), lookPal fica
   aqui mas defaultLook() fica em index.html (usado também por
   persistência e criação de personagem), PELE/COR_CABELO/COR_OLHOS/
   ESTILO_CABELO/CORPO (usados também pela tela de criação de
   personagem), WALK_CYCLE (usado também pela perambulação de NPCs em
   index.html), CLASS_BY_WEAPON/CLASS_NAMES/SET_MATCH (usados também
   por curClass()/className()/setActive() em index.html) — todos
   continuam definidos em index.html e acessíveis por nome sem export.
   ============================================================ */

const spriteCache = new Map();
function makeSprite(rows, pal, id) {
  if (id && spriteCache.has(id)) return spriteCache.get(id);
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < rows[y].length; x++) {
    const ch = rows[y][x];
    if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); }
  }
  if (id) spriteCache.set(id, c);
  return c;
}
function flipSprite(spr, id) {
  if (id && spriteCache.has(id)) return spriteCache.get(id);
  const c = document.createElement('canvas'); c.width = spr.width; c.height = spr.height;
  const g = c.getContext('2d');
  g.translate(spr.width, 0); g.scale(-1, 1); g.drawImage(spr, 0, 0);
  if (id) spriteCache.set(id, c);
  return c;
}

// --- Herói: cabeças por classe + corpos compartilhados ---
// --- Herói em estilo anime chibi (16x20: cabeça 12 + corpo 8) ---
// Olhos grandes com brilho, cabelo em mechas, sombreamento em 2 tons.
// Paleta: O contorno · S pele · s sombra da pele · H cabelo · h brilho do cabelo
//         E olho · W brilho do olho · A traje · a traje claro · B detalhe · L calça/hakama
const HEADS = {
  samurai: {
    down: [
      '.....HHHHHH.....',
      '....HhhHHHHH....',
      '...OHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '..OHhHHHHHHhHO..',
      '..OHSSSSSSSSHO..',
      '..OSSSSSSSSSSO..',
      '..OSEWSSSSEWSO..',
      '..OSEESSSSEESO..',
      '..OSsSSmmSSsSO..',
      '...OSSSSSSSSO...',
      '....OSSSSSSO....'],
    up: [
      '.....HHHHHH.....',
      '....HhhHHHHH....',
      '...OHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '..OHhHHHHHHhHO..',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '..OSHHHHHHHHSO..',
      '...OSHHHHHHSO...',
      '....OSSSSSSO....'],
    side: [
      '....HHHHHHH.....',
      '...HhhHHHHHH....',
      '..OHHHHHHHHHO...',
      '.OHHHHHHHHHHHO..',
      '.OHhHHHHHHHHSO..',
      '.OHHHHSSSSSSSO..',
      '.OHHHSSSSSSSSO..',
      '.OHHHSWESSSSSO..',
      '.OHHHSEESSSSO...',
      '.OHHHSSSSmSO....',
      '..OHHSSsSSO.....',
      '...OHSSSSO......']
  },
  onmyoji: {
    down: [
      '.....OOOOOO.....',
      '.....OBBBBO.....',
      '....OOBBBBOO....',
      '...OHHBBBBHHO...',
      '..OHhHHHHHHhHO..',
      '..OHSSSSSSSSHO..',
      '..OSSSSSSSSSSO..',
      '..OSEWSSSSEWSO..',
      '..OSEESSSSEESO..',
      '..OSsSSmmSSsSO..',
      '..HOSSSSSSSSOH..',
      '..H.OSSSSSSO.H..'],
    up: [
      '.....OOOOOO.....',
      '.....OBBBBO.....',
      '....OOBBBBOO....',
      '...OHHBBBBHHO...',
      '..OHhHHHHHHhHO..',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '..HOHHHHHHHHOH..',
      '..H.OSSSSSSO.H..'],
    side: [
      '....OOOOOO......',
      '....OBBBBO......',
      '...OOBBBBOO.....',
      '..OHHBBBBHHO....',
      '.OHhHHHHHHHHSO..',
      '.OHHHHSSSSSSSO..',
      '.OHHHSSSSSSSSO..',
      '.OHHHSWESSSSSO..',
      '.OHHHSEESSSSO...',
      '.OHHHSSSSmSO....',
      '.HOHHSSsSSO.....',
      '.H.OHSSSSO......']
  },
  shinobi: {
    down: [
      '................',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '..OHhHHHHHHhHO..',
      '..OAAAAAAAAAAO..',
      '..OASSSSSSSSAO..',
      '..OASEWSSEWSAO..',
      '..OASEESSEESAO..',
      '..OASSSSSSSSAO..',
      '...OAAAAAAAAO...',
      '....OAAAAAAO....'],
    up: [
      '................',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '..OHhHHHHHHhHO..',
      '..OHHHHHHHHHHO..',
      '..OAHHHHHHHHAO..',
      '..OAAHHHHHHAAO..',
      '..OAAAAAAAAAAO..',
      '..OAAAAAAAAAAO..',
      '...OAAAAAAAAO...',
      '....OAAAAAAO....'],
    side: [
      '................',
      '.....OOOOOO.....',
      '....OHHHHHHO....',
      '...OHHHHHHHHO...',
      '..OHhHHHHHHHhO..',
      '..OAAAAAAAAO....',
      '..OASSSSSSAO....',
      '..OASSSWEAO.....',
      '..OASSSEEAO.....',
      '..OAAAAAAAO.....',
      '...OAAAAAO......',
      '....OAAAAO......']
  },
  kyudoka: {
    down: [
      '.....HHHHHH.....',
      '....HHhhHHHH....',
      '...OHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '..OHhHHHHHHhHO..',
      '..OHSSSSSSSSHO..',
      '..OSSSSSSSSSSO..',
      '..OSEWSSSSEWSO..',
      '..OSEESSSSEESO..',
      '..OSsSSmmSSsSO..',
      '..HOSSSSSSSSOH..',
      '..H.OSSSSSSO....'],
    up: [
      '.....HHHHHH.....',
      '....HHhhHHHH....',
      '...OHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '..OHhHHHHHHhHO..',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '..OHHHHHHHHHHO..',
      '..OSHHHHHHHHSO..',
      '..HOSHHHHHHSOH..',
      '..H.OSSSSSSO....'],
    side: [
      '....HHHHHHH.....',
      '...HHhhHHHHH....',
      '..OHHHHHHHHHO...',
      '.OHHHHHHHHHHHO..',
      '.OHhHHHHHHHHSO..',
      '.OHHHHSSSSSSSO..',
      '.OHHHSSSSSSSSO..',
      '.OHHHSWESSSSSO..',
      '.OHHHSEESSSSO...',
      '.OHHHSSSSmSO....',
      '.HOHHSSsSSO.....',
      '.H.OHSSSSO......']
  }
};
// Corpos: quimono/hakama com mangas largas (8 linhas)
const BODIES = {
  downN: [
    '...OAAAAAAAAO...',
    '..OaAABBBBAAaO..',
    '..OaABBBBBBAaO..',
    '..OaABBBBBBAaO..',
    '...OLLLLLLLLO...',
    '...OLLLLLLLLO...',
    '...OLO....OLO...',
    '...OOO....OOO...'],
  downA: [
    '...OAAAAAAAAO...',
    '..OaAABBBBAAaO..',
    '..OaABBBBBBAaO..',
    '...OABBBBBBAO...',
    '...OLLLLLLLLO...',
    '....OLLLLLLO....',
    '....OLO..OLO....',
    '.....O....O.....'],
  downB: [
    '...OAAAAAAAAO...',
    '..OaAABBBBAAaO..',
    '..OaABBBBBBAaO..',
    '...OABBBBBBAO...',
    '...OLLLLLLLLO...',
    '...OLLO..OLLO...',
    '...OLO....OLO...',
    '...OO......OO...'],
  sideN: [
    '...OAAAAAAAO....',
    '..OaAABBBBAO....',
    '..OaABBBBBaO....',
    '..OaABBBBBAO....',
    '...OLLLLLLO.....',
    '...OLLLLLO......',
    '...OLLLLO.......',
    '...OOOOO........'],
  sideA: [
    '...OAAAAAAAO....',
    '..OaAABBBBAO....',
    '..OaABBBBBaO....',
    '...OABBBBBAO....',
    '...OLLLLLLO.....',
    '....OLLLLO......',
    '....OLO.OLO.....',
    '.....O...O......'],
  sideB: [
    '...OAAAAAAAO....',
    '..OaAABBBBAO....',
    '..OaABBBBBaO....',
    '...OABBBBBAO....',
    '....OLLLLLO.....',
    '...OLL.OLLO.....',
    '...OLO...OO.....',
    '...OO...........']
};

// Paletas com tons de anime: cores saturadas + sombra
const CLASS_PAL = {
  samurai:  { O: '#2a1620', S: '#f8d0a8', s: '#f0a898', b: '#f0a0a0', m: '#c4756a', H: '#241c2e', h: '#4a3f5c', d: '#15101f',
              E: '#2a1620', I: '#8a3a3a', W: '#ffffff', A: '#c8352f', a: '#e05a4e', c: '#8f221f', B: '#3b4a6b', L: '#2f3a52',
              M: '#d8dce8', G: '#3a2a1a' },
  onmyoji:  { O: '#12101c', S: '#f8d0a8', s: '#f0a898', b: '#f0a0a0', m: '#c4756a', H: '#2e2842', h: '#4d4570', d: '#1c1830',
              E: '#12101c', I: '#4a6ae0', W: '#ffffff', A: '#e8e4ee', a: '#ffffff', c: '#b8b2c8', B: '#4a4468', L: '#3a4a8a',
              M: '#d8dce8', G: '#8a6a42' },
  shinobi:  { O: '#0e1220', S: '#f0c8a0', s: '#e0a090', b: '#e09090', m: '#c4756a', H: '#181e30', h: '#2e3a58', d: '#0c1020',
              E: '#0e1220', I: '#3a9a6a', W: '#ffffff', A: '#1f2740', a: '#31405f', c: '#151b2c', B: '#4a5a80', L: '#171d30',
              M: '#c8ccd8', G: '#2a2118' },
  kyudoka:  { O: '#241a14', S: '#f8d0a8', s: '#f0a898', b: '#f0a0a0', m: '#c4756a', H: '#5a3418', h: '#8a5528', d: '#3f2410',
              E: '#241a14', I: '#7a9a3a', W: '#ffffff', A: '#2f6b4a', a: '#3f8a60', c: '#1f4a33', B: '#e8dcc0', L: '#4a4030',
              M: '#e8e0c8', G: '#8a6a42' },
  ronin:    { O: '#241c1c', S: '#f8d0a8', s: '#f0a898', b: '#f0a0a0', m: '#c4756a', H: '#2e2620', h: '#54463a', d: '#1c1712',
              E: '#241c1c', I: '#6a5a3a', W: '#ffffff', A: '#8a7a5a', a: '#a89578', c: '#6a5c42', B: '#6a5a42', L: '#4a3f30',
              M: '#c8c4b8', G: '#3a2a1a' }
};
// rônin (sem arma): mesmo desenho do samurai, paleta desbotada
HEADS.ronin = HEADS.samurai;

// Sprite do mapa (16x20): usa a aparência escolhida e o que está equipado.
// A cabeça varia com o elmo (se houver) ou com o estilo de cabelo.
function mapHeadKind() {
  const elmo = P && P.equip && P.equip.elmo;
  if (elmo) {
    const n = EQUIP[elmo] && EQUIP[elmo].name || '';
    if (n.includes('Eboshi')) return 'onmyoji';
    if (n.includes('Zukin') || n.includes('Menpo')) return 'shinobi';
  }
  const est = (P && P.look ? P.look.cabelo : 0) % ESTILO_CABELO.length;
  // longo e rabo caem dos lados; os demais ficam presos ao alto
  return (est === 2 || est === 4) ? 'kyudoka' : 'samurai';
}
function heroSprite(cls, dir, frame) {
  const step = WALK_CYCLE[(frame | 0) % WALK_CYCLE.length];
  const lk = (P && P.look) || defaultLook();
  const kind = mapHeadKind();
  const corpoId = P && P.equip && P.equip.corpo;
  const id = `hero_${kind}_${lk.pele}_${lk.corCabelo}_${lk.olhos}_${corpoId || 'x'}_${dir}_${step}`;
  if (spriteCache.has(id)) return spriteCache.get(id);
  const pal = lookPal();
  const heads = HEADS[kind] || HEADS.samurai;
  const headDir = (dir === 'left' || dir === 'right') ? 'side' : dir;
  const bodyDir = (dir === 'left' || dir === 'right') ? 'side' : 'down';
  const rows = heads[headDir].concat(BODIES[bodyDir + step]);
  let spr = makeSprite(rows, pal);
  if (dir === 'left') spr = flipSprite(spr);
  spriteCache.set(id, spr);
  return spr;
}

// paleta montada a partir da aparência + equipamento atual
function lookPal() {
  const lk = (P && P.look) || defaultLook();
  const pele = PELE[lk.pele % PELE.length];
  const cab = COR_CABELO[lk.corCabelo % COR_CABELO.length];
  const olho = COR_OLHOS[lk.olhos % COR_OLHOS.length];
  // cores do peitoral: do equipamento, com fallback para roupa simples
  const corpoId = P && P.equip && P.equip.corpo;
  const arte = corpoId && ARMOR_ART[EQUIP[corpoId].atype] ? ARMOR_ART[EQUIP[corpoId].atype] : ARMOR_ART.none;
  return {
    O: '#1a1420',
    S: pele.S, s: pele.s, b: pele.b, m: '#c4756a',
    H: cab.H, h: cab.h, d: cab.d,
    E: '#1a1420', I: olho.I, W: '#ffffff',
    A: arte.A, a: arte.a, c: arte.c, B: arte.B, L: arte.L,
    M: '#d8dce8', G: '#8a6a42', Y: '#e8c050', R: '#c0392b', P: '#e8e4ee'
  };
}

// ---------- Sprites de batalha em camadas (32x48) ----------
// Cada camada usa os mesmos símbolos; a paleta vem de lookPal(), então o
// mesmo desenho muda de cor conforme aparência e equipamento.

// --- corpo base (com rosto): 2 tipos, poses idle e atk ---
const BODY_ART = {
  esbelto: {
    idle: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '......OOSSSSSSSSOO..............',
      '......OSSSSSSSSSSO..............',
      '......OSEWSSSSEWSO..............',
      '......OSEISSSSEISO..............',
      '......OSSSSSSSSSSO..............',
      '.......OSSSSmmSSO...............',
      '........OOSSSSOO................',
      '..........OSSO..................',
      '.....OOOOOOSSOOOOOO.............',
      '...OOSSSSSSSSSSSSSSOO...........',
      '..OSSSSSSSSSSSSSSSSSSO..........',
      '..OSSSSSSSSSSSSSSSSSSO..........',
      '..OSSSSSSSSSSSSSSSSSSO..........',
      '..OSSSSSSSSSSSSSSSSSSO..........',
      '..OSSSSSSSSSSSSSSSSSSO..........',
      '..OSSSSSSSSSSSSSSSSSSO..........',
      '..OSSSSSSSSSSSSSSSSSSO..........',
      '...OSSSSSSSSSSSSSSSSO...........',
      '....OSSSSSSSSSSSSSSO............',
      '....OSSSSSSSSSSSSSSO............',
      '.....OSSSSSSSSSSSSO.............',
      '.....OLLLLLLLLLLLLO.............',
      '.....OLLLLLLLLLLLLO.............',
      '.....OLLLLLLLLLLLLO.............',
      '.....OLLLLLLLLLLLLO.............',
      '....OLLLLLLLLLLLLLLO............',
      '....OLLLLLLLLLLLLLLO............',
      '...OLLLLLLLLLLLLLLLLO...........',
      '...OLLLLLLLLOOLLLLLLO...........',
      '..OLLLLLLLLO..OLLLLLLO..........',
      '..OLLLLLLLO....OLLLLLO..........',
      '..OLLLLLLO......OLLLLO..........',
      '..OLLLLLO........OLLLO..........',
      '..OLLLLO.........OLLLO..........',
      '..OLLLLO.........OLLLO..........',
      '..OLLLO...........OLLO..........',
      '..OLLLO...........OLLO..........',
      '..OMMO............OMMO..........',
      '.OMMMO............OMMMO.........',
      '.OMMMMO...........OMMMMO........',
      '.OOOOOO...........OOOOOO........',
      '................................',
      '................................'],
    atk: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '.......OOSSSSSSSSOO.............',
      '.......OSSSSSSSSSSO.............',
      '.......OSEWSSSSEWSO.............',
      '.......OSEISSSSEISO.............',
      '.......OSSSSSSSSSSO.............',
      '........OSSSSmmSSO..............',
      '.........OOSSSSOO...............',
      '...........OSSO.................',
      '....OOOOOOOOSSOOOOO.............',
      '..OOSSSSSSSSSSSSSSSOO...........',
      '.OSSSSSSSSSSSSSSSSSSSO..........',
      '.OSSSSSSSSSSSSSSSSSSSO..........',
      '.OSSSSSSSSSSSSSSSSSSSO..........',
      '.OSSSSSSSSSSSSSSSSSSSO..........',
      '.OSSSSSSSSSSSSSSSSSSSO..........',
      '.OSSSSSSSSSSSSSSSSSSSO..........',
      '..OSSSSSSSSSSSSSSSSSO...........',
      '..OSSSSSSSSSSSSSSSSSO...........',
      '..OSSSSSSSSSSSSSSSSO............',
      '...OSSSSSSSSSSSSSSO.............',
      '...OSSSSSSSSSSSSSSO.............',
      '...OLLLLLLLLLLLLLLO.............',
      '..OLLLLLLLLLLLLLLLLO............',
      '..OLLLLLLLLLLLLLLLLO............',
      '.OLLLLLLLLLLLLLLLLLLO...........',
      '.OLLLLLLLLLOOLLLLLLLO...........',
      'OLLLLLLLLLO..OLLLLLLLO..........',
      'OLLLLLLLLO....OLLLLLLO..........',
      'OLLLLLLLO......OLLLLLO..........',
      'OLLLLLLO........OLLLLO..........',
      'OLLLLLO..........OLLLO..........',
      'OLLLLO...........OLLLO..........',
      'OLLLO............OLLLO..........',
      'OLLO.............OLLLO..........',
      'OMMO.............OLLLO..........',
      'OMMMO............OMMMO..........',
      'OMMMMO...........OMMMMO.........',
      'OOOOOO...........OOOOOO.........',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................']
  }
};
// corpo robusto: ombros e tronco mais largos
BODY_ART.robusto = {
  idle: BODY_ART.esbelto.idle.map((r, i) =>
    (i >= 14 && i <= 25) ? r.replace('..OSSS', '.OSSSS').replace('SSO...', 'SSSO..') : r),
  atk: BODY_ART.esbelto.atk
};

// --- cabelos (6 estilos) ---
const HAIR_ART = {
  espetado: [
    '.......O...O..O.................',
    '......OHO.OHOOHOO...............',
    '....OOHHHOHHHHHHHHO.............',
    '...OHHHHhHHHHHHHHHHO............',
    '....OHHHHHHHHHHHHHHO............',
    '.....OHH........HHO.............',
    '.....OH..........HO.............',
    '.....OH..........HO.............',
    '.....OH..........HO.............',
    '.....OH..........HO.............',
    '......O..........O..............'],
  topete: [
    '..........OOOO..................',
    '........OOHHHHOO................',
    '.......OHHhHHHHHO...............',
    '......OHHhHHHHHHHO..............',
    '......OHHHHHHHHHHHO.............',
    '.....OHHH........HHO............',
    '.....OHH..........HO............',
    '.....OH...........HO............',
    '.....OH...........HO............',
    '.....OH...........HO............',
    '......O...........O.............'],
  longo: [
    '.........OOOOOOOO...............',
    '.......OOHHHHHHHHOO.............',
    '......OHHhHHHHHHHHHO............',
    '.....OHHhHHHHHHHHHHHO...........',
    '.....OHHHHHHHHHHHHHHO...........',
    '....OHHHH........HHHHO..........',
    '....OHHH..........HHHO..........',
    '....OHHH..........HHHO..........',
    '....OHHH..........HHHO..........',
    '....OHHH..........HHHO..........',
    '....OHHH..........HHHO..........',
    '....OHHH..........HHHO..........',
    '....OHHHO........OHHHO..........',
    '.....OHHO........OHHO...........',
    '.....OHHO........OHHO...........',
    '......OO..........OO............'],
  curto: [
    '.........OOOOOOOO...............',
    '........OHHHHHHHHO..............',
    '.......OHHhHHHHHHHO.............',
    '......OHHhHHHHHHHHHO............',
    '......OHHHHHHHHHHHHO............',
    '......OHH........HHO............',
    '......OH..........HO............',
    '......OH..........HO............',
    '.......O..........O.............'],
  rabo: [
    '.........OOOOOOOO...............',
    '.......OOHHHHHHHHOO.............',
    '......OHHhHHHHHHHHHO............',
    '.....OHHhHHHHHHHHHHHOO..........',
    '.....OHHHHHHHHHHHHHHHHO.........',
    '.....OHH........HHHHHHHO........',
    '.....OH..........HHHHHHO........',
    '.....OH...........OHHHHO........',
    '......O............OHHHO........',
    '....................OHHO........',
    '....................OHHO........',
    '.....................OHO........',
    '.....................OO.........'],
  franja: [
    '.........OOOOOOOO...............',
    '.......OOHHHHHHHHOO.............',
    '......OHHHHHHHHHHHHO............',
    '.....OHHhHHhHHhHHhHHO...........',
    '.....OHHHHHHHHHHHHHHO...........',
    '.....OHHOHHOHHOHHOHHO...........',
    '.....OHH.O..O..O..HHO...........',
    '.....OH...........HHO...........',
    '.....OH............HO...........',
    '......O............O............']
};

// --- peitorais por tipo (define as cores A/a/c/B/L da paleta) ---
const ARMOR_ART = {
  none:    { A: '#8a7a5a', a: '#a89578', c: '#6a5c42', B: '#6a5a42', L: '#4a3f30', rows: null },
  kariginu:{ A: '#e8e4ee', a: '#ffffff', c: '#b8b2c8', B: '#4a4468', L: '#3a4a8a', rows: [
    '.....OOOOAAAAAAOOOO.............',
    '...OOaaaAAAAAAAAAAaaaOO.........',
    '..OaaaaAAAAABBAAAAAaaaaO........',
    '..OaAAaAAAAABBAAAAAaAAaO........',
    '..OaAAaAAAAABBAAAAAaAAaO........',
    '..OaAAaAAAAABBAAAAAaAAaO........',
    '..OaAAaAAAAABBAAAAAaAAaO........',
    '..O..AaAAAAABBAAAAAa..O.........',
    '.....AAAAAAABBAAAAAA............',
    '.....AAAAAAABBAAAAAA............',
    '.....AAAcAAABBAAAAcc............',
    '......AAcAAABBAAAcc.............',
    '.....OBBBBBBBBBBBBBO............',
    '.....OBBBBBBBBBBBBBO............'] },
  oyoroi:  { A: '#c8352f', a: '#e05a4e', c: '#8f221f', B: '#3b4a6b', L: '#2f3a52', rows: [
    '.....OOOOAAAAAAOOOO.............',
    '...OOaaaAAAAAAAAAAaaaOO.........',
    '..OaaaaAAAAABBAAAAAaaaaO........',
    '..OaAAaAAAAABBAAAAAaAAaO........',
    '..OaAAaAAAAABBAAAAAaAAaO........',
    '..OaAAaAAAAABBAAAAAaAAaO........',
    '..OaAAaAAAAABBAAAAAaAAaO........',
    '..O..AaAAAAABBAAAAAa..O.........',
    '.....AAAAAAABBAAAAAA............',
    '.....AAAAAAABBAAAAAA............',
    '.....AAAcAAABBAAAAcc............',
    '......AAcAAABBAAAcc.............',
    '.....OBBBBBBBBBBBBBO............',
    '.....OBBBBBBBBBBBBBO............'] },
  // karuta: placas retangulares costuradas, silhueta média
  karuta:  { A: '#2f6b4a', a: '#3f8a60', c: '#1f4a33', B: '#e8dcc0', L: '#4a4030', rows: [
    '......OOOAAAAAAOOO..............',
    '....OOaaAAAAAAAAAAaaOO..........',
    '...OaaaAAAcAAAAcAAAaaaO.........',
    '...OaAaAAAcAAAAcAAAaAAaO........',
    '...OaAaAAAAABBAAAAAaAAaO........',
    '...OaAaAAAcAAAAcAAAaAAaO........',
    '...OaAaAAAcAAAAcAAAaAAaO........',
    '...O.AaAAAAABBAAAAAa..O.........',
    '.....AAAcAAAAAAcAAAA............',
    '.....AAAcAAABBAAcAAA............',
    '.....AAAAAAABBAAAAAA............',
    '......AAcAAABBAAAcc.............',
    '.....OBBBBBBBBBBBBBO............',
    '.....OBBBBBBBBBBBBBO............'] },
  // shinobi shozoku: traje justo, sem ombreiras, com faixa cruzada
  shinobishozoku: { A: '#1f2740', a: '#31405f', c: '#151b2c', B: '#4a5a80', L: '#171d30', rows: [
    '.......OOOAAAAOOO...............',
    '......OaAAAAAAAAAaO.............',
    '.....OaAAAAAAAAAAAAaO...........',
    '.....OaAAAcAAAAAAAAaO...........',
    '.....OaAAAAcAAAAAAAaO...........',
    '.....OaAAAAAcAAAAAAaO...........',
    '.....OaAAAAAAcAAAAAaO...........',
    '.....O.AAAAAAAcAAAA.O...........',
    '......AAAAAAAAAcAAA.............',
    '......AAAAAAAAAAcAA.............',
    '......AAAcAAAAAAAAA.............',
    '.......AAcAAAAAAcc..............',
    '.....OBBBBBBBBBBBBBO............',
    '.....OBBBBBBBBBBBBBO............'] }
};
// sem armadura: roupa simples de linho
ARMOR_ART.none.rows = [
  '......OOOAAAAAAOOO..............',
  '....OOaaAAAAAAAAAAaaOO..........',
  '...OaaaAAAAAAAAAAAAaaaO.........',
  '...OaAaAAAAABBAAAAAaAAaO........',
  '...OaAaAAAAABBAAAAAaAAaO........',
  '...OaAaAAAAABBAAAAAaAAaO........',
  '...OaAaAAAAABBAAAAAaAAaO........',
  '...O.AaAAAAABBAAAAAa..O.........',
  '.....AAAAAAABBAAAAAA............',
  '.....AAAAAAABBAAAAAA............',
  '.....AAAcAAABBAAAAcc............',
  '......AAcAAABBAAAcc.............',
  '.....OBBBBBBBBBBBBBO............',
  '.....OBBBBBBBBBBBBBO............'];
// o-yoroi ganha ombreiras largas (sode) características do samurai
ARMOR_ART.oyoroi.rows = [
  '....OOOOOAAAAAAOOOOO............',
  '..OOaaaaAAAAAAAAAAaaaaOO........',
  '.OaaaaaAAAAcAAcAAAAaaaaaO.......',
  '.OaAAAaAAAAcAAcAAAAaAAAaO.......',
  '.OaAAAaAAAAABBAAAAAaAAAaO.......',
  '.OaAAAaAAAAcAAcAAAAaAAAaO.......',
  '.OaAAAaAAAAcAAcAAAAaAAAaO.......',
  '.OO..AaAAAAABBAAAAAa..OOO.......',
  '.....AAAcAAABBAAAcAAA...........',
  '.....AAAcAAABBAAAcAAA...........',
  '.....AAAAAAABBAAAAAA............',
  '......AAcAAABBAAAcc.............',
  '.....OBBBBBBBBBBBBBO............',
  '.....OBBBBBBBBBBBBBO............'];

// --- elmos e chapéus ---
const HELM_ART = {
  kabuto: [
    '.......OOOOOOOOOO...............',
    '.....OOMMMMMMMMMMOO.............',
    '....OMMMMMMMMMMMMMMO............',
    '....OMMYMMMMMMMMYMMO............',
    '....OMMMMMMMMMMMMMMO............',
    '...OMMOOOOOOOOOOOOMMO...........',
    '...OMO............OMO...........'],
  eboshi: [
    '.........OOOOOO.................',
    '........OBBBBBBO................',
    '........OBBBBBBO................',
    '.......OOBBBBBBOO...............',
    '......OOOOOOOOOOOO..............'],
  zukin: [
    '.........OOOOOOOO...............',
    '.......OOAAAAAAAAOO.............',
    '......OAAAAAAAAAAAAO............',
    '.....OAAAAAAAAAAAAAAO...........',
    '.....OAAAAAAAAAAAAAAO...........',
    '.....OAA........AAAAO...........',
    '.....OA..........AAAO...........'],
  kasa: [
    '..........OOOO..................',
    '.......OOOYYYYOOO...............',
    '....OOOYYYYYYYYYYOOO............',
    '..OOYYYYYYYYYYYYYYYYOO..........',
    '..OYYYYYYYYYYYYYYYYYYO..........',
    '...OOOOOOOOOOOOOOOOOO...........'],
  hachimaki: [
    '................................',
    '................................',
    '.....ORRRRRRRRRRRRRO............',
    '.....ORRRRRRRRRRRRRO............',
    '....OR............RO............']
};
// cores próprias de cada peça de cabeça
const HELM_PAL = {
  kabuto:    { M: '#5a6478', m: '#8a94a8', Y: '#e8c050', O: '#1a1a24' },   // aço escuro com maedate dourado
  eboshi:    { B: '#181420', O: '#0c0a12' },                              // preto lacado
  zukin:     { A: '#1a2030', O: '#0c1018' },                              // capuz ninja
  kasa:      { Y: '#c8a860', O: '#4a3a1a' },                              // palha trançada
  hachimaki: { R: '#c0392b', O: '#7a1f18' }                               // faixa vermelha
};
// mapeia cada elmo do catálogo para uma arte
const HELM_OF = {
  elm1: 'hachimaki', elm2: 'kabuto', elm3: 'eboshi', elm4: 'zukin',
  elm5: 'kabuto', elm6: 'kasa', elm7: 'kabuto', elm8: 'kabuto'
};

// --- armas (definem a classe) ---
const WEAPON_ART = {
  katana: {
    idle: [
      '...............................M',
      '..............................MM',
      '.............................MMm',
      '............................MMm.',
      '...........................MMm..',
      '..........................MMm...',
      '.........................MMm....',
      '........................MMm.....',
      '.......................GGm......',
      '.......................GGO......'],
    idleY: 12,
    atk: [
      '............................MMM.',
      '..........................MMMm..',
      '........................MMMm....',
      '......................MMMm......',
      '....................MMMm........',
      '..................MGm...........',
      '................GGm.............',
      '...............GGO..............'],
    atkY: 0
  },
  shakujo: {
    idle: [
      '..............................M.',
      '.............................MG.',
      '.............................MG.',
      '.............................MG.',
      '.............................MG.',
      '.............................MG.',
      '.............................MG.',
      '.............................MG.',
      '.............................MG.',
      '.............................MG.',
      '.............................MG.',
      '.............................MG.',
      '.............................MG.',
      '..............................G.'],
    idleY: 10,
    atk: [
      '..........................W.....',
      '.........................WWW....',
      '........................WWWWW...',
      '.........................WWW....',
      '..........................W.....',
      '..........................M.....',
      '.........................MG.....',
      '.........................MG.....',
      '.........................MG.....',
      '.........................MG.....',
      '.........................MG.....',
      '.........................MG.....',
      '.........................MG.....',
      '..........................G.....'],
    atkY: 2
  },
  tanto: {
    idle: [
      '.............................Mm.',
      '............................MMm.',
      '...........................GGO..'],
    idleY: 20,
    atk: [
      '..........................Mm....',
      '.........................MMm....',
      '........................GGO.....'],
    atkY: 14
  },
  yumi: {
    idle: [
      '.............................G..',
      '............................GM..',
      '............................GM..',
      '...........................GM...',
      '...........................GM...',
      '...........................GM...',
      '...........................GM...',
      '...........................GM...',
      '...........................GM...',
      '............................GM..',
      '............................GM..',
      '.............................G..'],
    idleY: 12,
    atk: [
      '..........................G.....',
      '.........................GM.....',
      '.........................GM.....',
      '........................GM......',
      '.....mmmmmmmmmmmmmmmmmmmGM......',
      '........................GM......',
      '.........................GM.....',
      '.........................GM.....',
      '..........................G.....'],
    atkY: 14
  }
};

// --- composição: monta o sprite completo em camadas ---
function composeSprite(pose) {
  const lk = (P && P.look) || defaultLook();
  const wt = weaponType() || 'katana';
  const corpoId = P && P.equip && P.equip.corpo;
  const atype = corpoId ? (EQUIP[corpoId].atype || 'none') : 'none';
  const elmoId = P && P.equip && P.equip.elmo;
  const helm = elmoId ? HELM_OF[elmoId] : null;
  const key = ['bt', pose, lk.corpo, lk.pele, lk.cabelo, lk.corCabelo, lk.olhos, wt, atype, helm || '-'].join('_');
  if (spriteCache.has(key)) return spriteCache.get(key);

  const pal = lookPal();
  const W = 32, H = 48;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const stamp = (rows, oy, palOverride) => {
    if (!rows) return;
    const p = palOverride ? Object.assign({}, pal, palOverride) : pal;
    for (let y = 0; y < rows.length; y++) {
      const yy = y + (oy || 0);
      if (yy < 0 || yy >= H) continue;
      for (let x = 0; x < rows[y].length && x < W; x++) {
        const ch = rows[y][x];
        if (ch !== '.' && p[ch]) { g.fillStyle = p[ch]; g.fillRect(x, yy, 1, 1); }
      }
    }
  };
  // 1. corpo (rosto e pernas)
  const body = BODY_ART[CORPO[lk.corpo % CORPO.length].name.toLowerCase()] || BODY_ART.esbelto;
  stamp(body[pose] || body.idle, 0);
  // 2. peitoral por cima do torso
  const armor = ARMOR_ART[atype] || ARMOR_ART.none;
  stamp(armor.rows, pose === 'atk' ? 13 : 13);
  // 3. cabelo
  const estilo = ESTILO_CABELO[lk.cabelo % ESTILO_CABELO.length].name.toLowerCase();
  stamp(HAIR_ART[estilo] || HAIR_ART.espetado, pose === 'atk' ? 1 : 0);
  // 4. elmo/chapéu
  if (helm && HELM_ART[helm]) stamp(HELM_ART[helm], pose === 'atk' ? 1 : 0, HELM_PAL[helm]);
  // 5. arma
  const w = WEAPON_ART[wt];
  if (w) stamp(pose === 'atk' ? w.atk : w.idle, pose === 'atk' ? w.atkY : w.idleY);

  spriteCache.set(key, c);
  return c;
}
function battleSprite(cls, pose) { return composeSprite(pose === 'atk' ? 'atk' : 'idle'); }

const ENEMY_ART = {
  // Slime → Konpaku (alma errante)
  slime: {
    pal: { O: '#0e2a18', G: '#3fb05a', g: '#7ce88f', W: '#ffffff', E: '#0e2a18' },
    rows: [
      '................',
      '................',
      '................',
      '.......gg.......',
      '......gGGg......',
      '....OOgGGgOO....',
      '...OggGGGGggO...',
      '..OgGGGGGGGGgO..',
      '..OGWEGGGGWEGO..',
      '.OGGWEGGGGWEGGO.',
      '.OGGGGGGGGGGGGO.',
      '.OGGGGGWWGGGGGO.',
      '..OGGGGGGGGGGO..',
      '...OOGGGGGGOO...',
      '.....OOOOOO.....',
      '................']
  },
  // Morcego → Kawahori youkai
  morcego: {
    pal: { O: '#140f22', P: '#5e3f92', p: '#9070d0', W: '#ffffff', R: '#ff5252' },
    rows: [
      '................',
      '................',
      '.OO.........OO..',
      'OppO.OOOO..OppO.',
      'OpPpOOppOOOpPpO.',
      'OpPPpOppOpPPpO..',
      '.OPPpppppppPPO..',
      '..OPpRWppRWpPO..',
      '..OPppppppppPO..',
      '...OPppWWppPO...',
      '....OOpppPOO....',
      '......OppO......',
      '.......OO.......',
      '................',
      '................',
      '................']
  },
  // Lobo → Okuri-inu
  lobo: {
    pal: { O: '#14141c', C: '#7a7a92', c: '#b4b4cc', W: '#ffffff', R: '#ff4444' },
    rows: [
      '................',
      '..OO.......OO...',
      '..OcO.....OcO...',
      '..OccO...OccO...',
      '..OcccOOOccccO..',
      '..OccccccccccO..',
      '.OcRWccccccRWcO.',
      '.OccccccccccccO.',
      '.OcccWWWWcccccO.',
      '..OCCCCCCCCCCCO.',
      '..OCCCCCCCCCCO..',
      '..OCCOCCOCCCO...',
      '..OCO.OCO.OCO...',
      '..OO..OO..OO....',
      '................',
      '................']
  },
  // Esqueleto → Gashadokuro
  esqueleto: {
    pal: { O: '#1a1626', W: '#f0ece0', w: '#b8b0a0', R: '#ff3a3a', E: '#1a1626' },
    rows: [
      '................',
      '....OOOOOOOO....',
      '...OWWWWWWWWO...',
      '..OWWWWWWWWWWO..',
      '..OWEEWWWWEEWO..',
      '..OWERWWWWERWO..',
      '..OWEEWWWWEEWO..',
      '..OWWWWWWWWWWO..',
      '...OWWEWWEWWO...',
      '....OWWWWWWO....',
      '.....OwwwwO.....',
      '...OwwOwwOww O..',
      '..OwOOwwwwOOwO..',
      '..OO..OwwO..OO..',
      '.....OwOOwO.....',
      '.....OO..OO.....']
  },
  // Zumbi → Jikininki
  zumbi: {
    pal: { O: '#101f14', W: '#7fa06e', w: '#5c7a50', R: '#ff4040', E: '#101f14', Y: '#e8e060' },
    rows: [
      '................',
      '....OOOOOOOO....',
      '...OWWWWWWWWO...',
      '..OWWWWWWWWWWO..',
      '..OWEYWWWWEYWO..',
      '..OWERWWWWERWO..',
      '..OWWWWWWWWWWO..',
      '..OWWWwwwwWWWO..',
      '...OWWwYYwWWO...',
      '....OwwwwwwO....',
      '...OwwOwwOwwO...',
      '..OwwOwwwwOwwO..',
      '..OO..OwwO..OO..',
      '.....OwOOwO.....',
      '.....OO..OO.....',
      '................']
  },
  // Goblin → Kappa
  goblin: {
    pal: { O: '#0e2418', G: '#3f9a5a', g: '#66c47e', B: '#c8a860', W: '#ffffff', E: '#0e2418', Y: '#e8d060' },
    rows: [
      '................',
      '.....OOOOOO.....',
      '....OBBBBBBO....',
      '...OBYYYYYYBO...',
      '..OOGGGGGGGGOO..',
      '.OGgGGGGGGGGgGO.',
      '.OGGWEGGGGWEGGO.',
      '.OGGWEGGGGWEGGO.',
      '.OGGGGGGGGGGGGO.',
      '..OGGGWWWWGGGO..',
      '..OGgGGGGGGgGO..',
      '...OGGBBBBGGO...',
      '...OGgBBBBgGO...',
      '....OOBBBBOO....',
      '.....OBOOBO.....',
      '.....OO..OO.....']
  },
  // Aranha → Jorogumo
  aranha: {
    pal: { O: '#12091a', D: '#3d1f4d', d: '#6a3a80', R: '#ff3a5a', W: '#ffffff', S: '#f8d0a8' },
    rows: [
      '................',
      '.O.O......O.O...',
      '..OdO....OdO....',
      '.OdddO..OdddO...',
      '.OddOOOOOOddO...',
      '..OdOSSSSOdO....',
      '.OddOSSSSSOddO..',
      '.OddSRWSSRWSddO.',
      '.OddSSSSSSSSddO.',
      '.OddDDDDDDDDddO.',
      '.OdDDDWWWWDDDdO.',
      '..ODDDDDDDDDDO..',
      '.OdO.OOOOOO.OdO.',
      '.OdO........OdO.',
      '.OO..........OO.',
      '................']
  },
  // Fantasma → Yurei
  fantasma: {
    pal: { O: '#101828', P: '#5c7ab0', p: '#9db4e0', W: '#e8f0ff', E: '#101828', H: '#1a1a2e' },
    rows: [
      '................',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '..OHHpppppHHO...',
      '..OHppppppppO...',
      '..OpEWppppEWpO..',
      '..OpEEppppEEpO..',
      '..OppppppppppO..',
      '..OpppWWWWpppO..',
      '..OPPPPPPPPPPO..',
      '..OPPPPPPPPPPO..',
      '..OPPPPPPPPPPO..',
      '...OPPPPPPPPO...',
      '....OPOPPOPO....',
      '.....O.OO.O.....',
      '................']
  },
  // Orc → Oni
  orc: {
    pal: { O: '#2a0e12', G: '#c4442f', g: '#e06a4a', B: '#3a2a1a', W: '#fff8e0', E: '#2a0e12', Y: '#f0d060' },
    rows: [
      '................',
      '..Y..OOOOOO..Y..',
      '..YOOGGGGGGOOY..',
      '..OGGGGGGGGGGO..',
      '.OGgGGGGGGGGgGO.',
      '.OGGWEGGGGWEGGO.',
      '.OGGWEGGGGWEGGO.',
      '.OGGGGGGGGGGGGO.',
      '.OGGWWWWWWWWGGO.',
      '.OGGWOWOOWOWGGO.',
      '..OGGGGGGGGGGO..',
      '..OGBBBBBBBBGO..',
      '.OGgBBBBBBBBgGO.',
      '.OGGBBOOOOBBGGO.',
      '..OOBBO..OBBOO..',
      '...OOO....OOO...']
  },
  // Harpia → Tengu
  harpia: {
    pal: { O: '#1a0e14', B: '#8a2a2a', b: '#c04040', S: '#f0b890', Y: '#e8c050', R: '#ff4040', W: '#ffffff', H: '#1a1a26' },
    rows: [
      '................',
      '......HHHH......',
      '.....HbbbbH.....',
      '.O..OHSSSSHO..O.',
      'OBO.OSRWWRSO.OBO',
      'OBBO.OSYYSO.OBBO',
      'OBbBOOSSSSOOBbBO',
      'OBbbBObbbbOBbbBO',
      'OBbbbBbbbbBbbbBO',
      '.OBbbBbbbbBbbBO.',
      '..OBbBbbbbBbBO..',
      '...OBObbbbOBO...',
      '....OObbbbOO....',
      '.....ObbbbO.....',
      '.....OYOOYO.....',
      '.....OO..OO.....']
  },
  // Golem → Doro-ningyo (boneco de barro)
  golem: {
    pal: { O: '#161622', C: '#6a5f50', c: '#95886f', Y: '#e8c050', W: '#ffffff', E: '#161622' },
    rows: [
      '................',
      '....OOOOOOOO....',
      '...OccccccccO...',
      '..OccccccccccO..',
      '..OcEYccccYEcO..',
      '..OcEEccccEEcO..',
      '..OccccccccccO..',
      '...OccOOOOccO...',
      '..OCCCCCCCCCCO..',
      '.OCcCCCCCCCCcCO.',
      '.OCcCOCCCCOCcCO.',
      '.OCcCCCCCCCCcCO.',
      '..OOCCCCCCCCOO..',
      '...OCCCOOCCCO...',
      '...OCCO..OCCO...',
      '...OOO....OOO...']
  },
  // Elemental → Onibi (fogo-fátuo)
  elemental: {
    pal: { O: '#2a0e08', R: '#e8502a', r: '#ff8a3a', Y: '#ffd040', W: '#fff8c0', E: '#2a0e08' },
    rows: [
      '.......YY.......',
      '......YWWY......',
      '.....YWWWWY.....',
      '....rYWWWWYr....',
      '....rrYWWYrr....',
      '...RrrrYYrrrR...',
      '...RrEWrrWErR...',
      '..RRrEErrEErRR..',
      '..RRrrrrrrrrRR..',
      '..RRrrrWWrrrRR..',
      '..RRRrrrrrrRRR..',
      '...RRRrrrrRRR...',
      '...OORRRRRROO...',
      '.....OORROO.....',
      '................',
      '................']
  },
  // CHEFES
  // Rei Slime → Nurarihyon (mestre dos youkai)
  reislime: {
    pal: { O: '#0e2a18', G: '#3fb05a', g: '#7ce88f', W: '#ffffff', E: '#0e2a18', Y: '#f0c050', y: '#c89a30' },
    rows: [
      '........................',
      '......Y...Y...Y.........',
      '......YY.YYY.YY.........',
      '......YYYYYYYYY.........',
      '......yyyyyyyyy.........',
      '........................',
      '.........OOOOOO.........',
      '......OOOggggggOOO......',
      '....OOgggggggggggOO.....',
      '...OgggggggggggggggO....',
      '..OggGGGGGGGGGGGGggO....',
      '..OgGGWWEGGGGWWEGGgO....',
      '.OgGGGWWEGGGGWWEGGGgO...',
      '.OgGGGGGGGGGGGGGGGGgO...',
      '.OgGGGGGGWWWWGGGGGGgO...',
      '.OgGGGGGWGGGGWGGGGGgO...',
      '.OgGGGGGGGGGGGGGGGGgO...',
      '..OGGGGGGGGGGGGGGGGO....',
      '..OGGGGGGGGGGGGGGGGO....',
      '...OGGGGGGGGGGGGGGO.....',
      '....OOGGGGGGGGGGOO......',
      '......OOOOOOOOOO........',
      '........................',
      '........................']
  },
  // Necromante → Onmyoji sombrio (Kagemaru)
  necromante: {
    pal: { O: '#120c1e', P: '#3d2a68', p: '#5c4090', D: '#1e1430', G: '#6eff8e', W: '#c8a860', Y: '#c04ae8', S: '#f0d8c0' },
    rows: [
      '.Y..OOOOOOOO....',
      '.W..OPPPPPPO....',
      '.W.OPPPPPPPPO...',
      '.W.OPDDDDDDPO...',
      '.W.OPDGDDGDPO...',
      '.W.OPDDDDDDPO...',
      '.W.OPSSSSSSPO...',
      '.W.OPPPPPPPPO...',
      '.WOppPPPPPPppO..',
      '.WOppPPYYPPppO..',
      '.WOppPPPPPPppO..',
      '.WOpPPPPPPPPpO..',
      '.W.OPPPPPPPPO...',
      '.W.OPPPPPPPPO...',
      '.W.OPPPPPPPPO...',
      '...OOOOOOOOOO...']
  },
  // Dragão → Yamata-no-Orochi
  dragao: {
    pal: { O: '#1c1020', R: '#a82838', r: '#d84a52', D: '#6a1826', Y: '#f0c050', W: '#f0f0e0', G: '#5ce070' },
    rows: [
      '...OO..............OO...',
      '..OWWO............OWWO..',
      '..OWWO....OOOO....OWWO..',
      '...OWO..OORRRROO..OWO...',
      '...OWOOORrrrrrrROOOWO...',
      '....OORrrrrrrrrrrROO....',
      '.....ORrGGrrrrGGrRO.....',
      '.....ORrGWrrrrWGrRO.....',
      '......ORrrrrrrrrRO......',
      '......ORRrWWWWrRRO......',
      '..OO...ORrrrrrrRO...OO..',
      '.ODDO.ORRRRRRRRRRO.ODDO.',
      '.ODDDOORrrrrrrrrROODDDO.',
      '..ODDDORrYYrrYYrRODDDO..',
      '..ODDDORrYYrrYYrRODDDO..',
      '...ODDORrrrrrrrrRODDO...',
      '....OOORrYYrrYYrROOO....',
      '.......ORrrrrrrrRO......',
      '.......ORRrrrrRRO.......',
      '......ORrROrrORrRO......',
      '......ORrRO..ORrRO......',
      '.....OYYRRO..ORRYYO.....',
      '......OOOO....OOOO......',
      '........................']
  }
};

const PET_ART = {
  slimezinho: {
    pal: { O: '#14311c', G: '#4ec065', g: '#7ee88f', W: '#ffffff', P: '#14311c' },
    rows: [
      '............',
      '...OOOOO....',
      '..OgggggO...',
      '.OgGGGGGgO..',
      '.OGWPGGWPO..',
      '.OGGGGGGGO..',
      '.OGGOOGGGO..',
      '.OGGGGGGGO..',
      '..OGGGGGO...',
      '...OOOOO....']
  },
  morceguinho: {
    pal: { O: '#171226', P: '#6b4a9e', p: '#8f6cc4', R: '#e05050' },
    rows: [
      '............',
      '.O.......O..',
      '.OO.OOO.OO..',
      '.OPOpppOPO..',
      '.OPPpppPPO..',
      '..OPpRpPO...',
      '..OpppppO...',
      '...OpOpO....',
      '...OO.OO....']
  },
  lobinho: {
    pal: { O: '#1a1a22', c: '#b8b8c8', C: '#8a8a9a', R: '#d04040' },
    rows: [
      '.O......O...',
      '.OO....OO...',
      '.OcO..OcO...',
      '.OccOOccO...',
      '.OccccccO...',
      '.OcRccRcO...',
      '.OccOOccO...',
      '..OCCCCO....',
      '..OCO.OCO...',
      '..OO...OO...']
  },
  caveirinha: {
    pal: { O: '#1a1626', W: '#e8e4d8', R: '#c03030' },
    rows: [
      '............',
      '..OOOOOO....',
      '.OWWWWWWO...',
      '.OWOWWOWO...',
      '.OWRWWRWO...',
      '.OWWWWWWO...',
      '..OWOOWO....',
      '..OWWWWO....',
      '...OOOO.....']
  },
  golenzinho: {
    pal: { O: '#161622', c: '#8e8ea6', C: '#6a6a80', Y: '#e8c050' },
    rows: [
      '..OOOOOO....',
      '.OccccccO...',
      '.OcYccYcO...',
      '.OccccccO...',
      '.OCCCCCCO...',
      '.OCcCCcCO...',
      '..OCCCCO....',
      '..OCO.OCO...',
      '..OO...OO...']
  },
  slimereal: {
    pal: { O: '#14311c', G: '#4ec065', g: '#7ee88f', W: '#ffffff', P: '#14311c', Y: '#f0c050' },
    rows: [
      '..Y.Y.Y.....',
      '..YYYYY.....',
      '...OOOOO....',
      '..OgggggO...',
      '.OgGGGGGgO..',
      '.OGWPGGWPO..',
      '.OGGGGGGGO..',
      '.OGGOOGGGO..',
      '..OGGGGGO...',
      '...OOOOO....']
  },
  goblinzinho: {
    pal: { O: '#16220f', G: '#7a9a3a', g: '#96b84e', B: '#6a4a2e', R: '#c03030' },
    rows: [
      '............',
      '..OOOOOO....',
      '.OGGGGGGO...',
      '.OGOGGOGO...',
      '.OGRGGRGO...',
      '..OGGGGO....',
      '..OGBBGO....',
      '.OGgBBgGO...',
      '..OBBBBO....',
      '..OO..OO....']
  },
  aranhinha: {
    pal: { O: '#140e18', D: '#3a2a44', d: '#54406a', R: '#e04040' },
    rows: [
      '............',
      '.O.O..O.O...',
      '.OdOOOOdO...',
      '..OddddO....',
      '.OdDDDDdO...',
      '.OdRDDRdO...',
      '.OdDDDDdO...',
      '..OddddO....',
      '.O.O..O.O...']
  },
  fantasminha: {
    pal: { O: '#0e1420', P: '#7a94c8', p: '#a8c0e8', R: '#8ac0ff' },
    rows: [
      '............',
      '..OOOOOO....',
      '.OpppppppO..',
      '.OpROppRpO..',
      '.OpppppppO..',
      '.OPPPPPPPO..',
      '.OPPPPPPPO..',
      '.OPOPPOPPO..',
      '..O.OO.OO...']
  },
  chaminha: {
    pal: { O: '#2a0e08', R: '#e05020', r: '#f08030', Y: '#f8d040', W: '#fff0b0' },
    rows: [
      '.....OO.....',
      '....OYYO....',
      '...OYWWYO...',
      '...OrYYrO...',
      '..ORrrrrRO..',
      '..ORrYYrRO..',
      '..ORRrrRRO..',
      '...ORRRRO...',
      '....OOOO....']
  },
  corvo: {
    pal: { O: '#0e0a16', D: '#2e2440', d: '#453860', G: '#6ee86e', Y: '#e8c050' },
    rows: [
      '....OO......',
      '...ODDO.....',
      '..ODGDDOYO..',
      '..ODDDDDO...',
      '.ODdDDDdO...',
      '.ODDDDDDO...',
      '..ODDDDO....',
      '...ODDO.....',
      '...OO.OO....']
  },
  dragaozinho: {
    pal: { O: '#1c1020', R: '#c03838', r: '#e05848', Y: '#f0c050', W: '#f0f0e0' },
    rows: [
      '.OW....WO...',
      '.OO....OO...',
      '..ORRRRO....',
      '.ORrrrrRO...',
      '.ORYrrYRO...',
      '.ORrrrrRO...',
      '.ORRrrRRO...',
      '..ORrrRO....',
      '..OYO.OYO...']
  }
};
function petSprite(id) {
  const key = 'pet_' + id;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const a = PET_ART[id];
  const s = makeSprite(a.rows, a.pal);
  spriteCache.set(key, s);
  return s;
}

function enemySprite(type) {
  const id = 'enemy_' + type;
  if (spriteCache.has(id)) return spriteCache.get(id);
  const a = ENEMY_ART[type];
  const s = makeSprite(a.rows, a.pal);
  spriteCache.set(id, s);
  return s;
}

// ---------- NPCs: moradores, mascates e mestres de missão ----------
// Reaproveitam o mesmo desenho do herói (HEADS + BODIES), só que com paleta
// própria — cada morador tem pele, cabelo e roupa diferentes.
const NPC_ROUPA = [
  { A: '#6a8a5a', a: '#8aa878', c: '#4a6a3e', B: '#4a5a3a', L: '#3a4630' }, // camponês
  { A: '#8a6a4a', a: '#a88a68', c: '#6a4e34', B: '#5a4230', L: '#42301f' }, // lenhador
  { A: '#4a6a8a', a: '#6a8aa8', c: '#36506a', B: '#38485a', L: '#2a3644' }, // pescador
  { A: '#8a4a5a', a: '#a86a78', c: '#6a3644', B: '#5a3040', L: '#42222e' }, // tecelã
  { A: '#7a6a8a', a: '#9a8aa8', c: '#5a4e6a', B: '#4a4058', L: '#362e42' }, // monge
  { A: '#c8b45a', a: '#e0d078', c: '#a08c3e', B: '#6a5c30', L: '#4e4222' }, // mercador
  { A: '#5a5a6a', a: '#7a7a8a', c: '#42424e', B: '#3a3a46', L: '#2a2a34' }  // andarilho
];
function npcPal(look) {
  const pele = PELE[look.pele % PELE.length];
  const cab = COR_CABELO[look.corCabelo % COR_CABELO.length];
  const olho = COR_OLHOS[look.olhos % COR_OLHOS.length];
  const r = NPC_ROUPA[look.roupa % NPC_ROUPA.length];
  return {
    O: '#1a1420',
    S: pele.S, s: pele.s, b: pele.b, m: '#c4756a',
    H: cab.H, h: cab.h, d: cab.d,
    E: '#1a1420', I: olho.I, W: '#ffffff',
    A: r.A, a: r.a, c: r.c, B: r.B, L: r.L,
    M: '#d8dce8', G: '#8a6a42', Y: '#e8c050', R: '#c0392b', P: '#e8e4ee'
  };
}
// Silhuetas próprias para os mestres de missão: pequenos remendos de cor por
// cima do sprite genérico do NPC (barba, avental, manto), sem precisar de
// arte nova por direção. row/col contam a partir do topo do sprite 16x20
// (cabeça nas linhas 0-11, corpo nas linhas 12-19).
const ACESSORIO_PAL = {
  anciao: { F: '#e0e0e8', K: '#6a4a2a' },
  ferreira: { D: '#a83030', J: '#3a2c22', T: '#5a4230', U: '#7a7a86' },
  monge: { J: '#8a8098', N: '#e8c050' }
};
const ACESSORIO_PATCH = {
  // Ancião Genzo: barba longa caindo do queixo, bengala ao lado do corpo
  anciao: [
    [10, 5, 'F'], [10, 6, 'F'], [10, 7, 'F'], [10, 8, 'F'], [10, 9, 'F'], [10, 10, 'F'],
    [11, 5, 'F'], [11, 6, 'F'], [11, 7, 'F'], [11, 8, 'F'], [11, 9, 'F'],
    [12, 6, 'F'], [12, 7, 'F'], [12, 8, 'F'], [12, 9, 'F'],
    [13, 7, 'F'], [13, 8, 'F'],
    [13, 14, 'K'], [14, 14, 'K'], [15, 14, 'K'], [16, 14, 'K'], [17, 14, 'K'], [18, 14, 'K'], [19, 14, 'K']
  ],
  // Ferreira Sae: bandana amarrada, avental de couro, martelo no quadril
  ferreira: [
    [0, 5, 'D'], [0, 6, 'D'], [0, 7, 'D'], [0, 8, 'D'], [0, 9, 'D'], [0, 10, 'D'],
    [1, 4, 'D'], [1, 5, 'D'], [1, 6, 'D'], [1, 7, 'D'], [1, 8, 'D'], [1, 9, 'D'], [1, 10, 'D'], [1, 11, 'D'],
    [2, 12, 'D'],
    [13, 6, 'J'], [13, 7, 'J'], [13, 8, 'J'], [13, 9, 'J'],
    [14, 5, 'J'], [14, 6, 'J'], [14, 7, 'J'], [14, 8, 'J'], [14, 9, 'J'], [14, 10, 'J'],
    [15, 5, 'J'], [15, 6, 'J'], [15, 7, 'J'], [15, 8, 'J'], [15, 9, 'J'], [15, 10, 'J'],
    [15, 14, 'U'], [15, 15, 'U'], [16, 14, 'T'], [17, 14, 'T']
  ],
  // Monge Eikan: cabeça raspada (a paleta troca H/h/d pela cor da pele),
  // manto longo cobrindo as pernas, contas de oração no peito
  monge: [
    [16, 5, 'J'], [16, 6, 'J'], [16, 7, 'J'], [16, 8, 'J'], [16, 9, 'J'], [16, 10, 'J'], [16, 11, 'J'], [16, 12, 'J'],
    [17, 5, 'J'], [17, 6, 'J'], [17, 7, 'J'], [17, 8, 'J'], [17, 9, 'J'], [17, 10, 'J'], [17, 11, 'J'], [17, 12, 'J'],
    [12, 7, 'N'], [12, 9, 'N']
  ]
};
function npcSprite(npc, dir, frame) {
  const step = WALK_CYCLE[(frame | 0) % WALK_CYCLE.length];
  const lk = npc.look;
  const acess = ACESSORIO_PATCH[npc.id];
  const id = `npc_${lk.cabeca}_${lk.pele}_${lk.corCabelo}_${lk.olhos}_${lk.roupa}_${npc.id}_${dir}_${step}`;
  if (spriteCache.has(id)) return spriteCache.get(id);
  const heads = HEADS[lk.cabeca] || HEADS.samurai;
  const headDir = (dir === 'left' || dir === 'right') ? 'side' : dir;
  const bodyDir = (dir === 'left' || dir === 'right') ? 'side' : 'down';
  let rows = heads[headDir].concat(BODIES[bodyDir + step]);
  let pal = npcPal(lk);
  if (acess) {
    const grid = rows.map(r => r.split(''));
    for (const [r, c, ch] of acess) if (grid[r] && c < grid[r].length) grid[r][c] = ch;
    rows = grid.map(r => r.join(''));
    pal = Object.assign({}, pal, ACESSORIO_PAL[npc.id]);
    if (npc.id === 'monge') pal = Object.assign({}, pal, { H: pal.S, h: pal.s, d: pal.b });
  }
  let spr = makeSprite(rows, pal);
  if (dir === 'left') spr = flipSprite(spr);
  spriteCache.set(id, spr);
  return spr;
}
