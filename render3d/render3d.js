'use strict';
/* ============================================================
   render3d/render3d.js — renderizador 3D (three.js): geometria do
   mundo em chunks, billboards de personagens/youkai/pets, arena de
   batalha em volume
   Extraído de index.html (sétima extração estrutural planejada com o
   Graphify, após render/tiles.js, economy/shop.js, quests/quests.js,
   craft/altar.js, sprites/sprites.js e battle/battle.js). Script
   clássico (não é módulo ES) — compartilha o mesmo escopo léxico
   global de index.html via <script src>, carregado depois de
   render/tiles.js e sprites/sprites.js (dos quais depende: hash2(),
   treeSpecies(), drawTile(), heroSprite(), npcSprite(), enemySprite(),
   petSprite()). Depende também por nome de: tileAt(), TILE, VW, VH,
   ctx, G, P, THREE — todos continuam definidos em index.html e
   acessíveis por nome sem export. desenhaPersonagens2D() (o
   renderizador 2D de reserva) e desenhaMarcaNPC() (usado tanto pelo
   caminho 2D quanto pelo 3D) ficaram em index.html.
   ============================================================ */

// ---------- Ampliação do pixel art (EPX / Scale2x) ----------
// Dobra a resolução de um sprite preservando as bordas: cada pixel vira quatro,
// e as diagonais deixam de ser degraus grosseiros. A arte muda um pouco (os
// cantos arredondam), em troca de aguentar ser ampliada na tela sem virar
// bloco. É a mesma ideia dos filtros de emulador.
const _epxCache = new Map();
function escala2x(spr) {
  let c = _epxCache.get(spr);
  if (c) return c;
  const w = spr.width, h = spr.height;
  const gi = spr.getContext('2d').getImageData(0, 0, w, h).data;
  c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;
  const g = c.getContext('2d');
  const saida = g.createImageData(w * 2, h * 2);
  const px = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return -1;
    const i = (y * w + x) * 4;
    return (gi[i] << 24 | gi[i + 1] << 16 | gi[i + 2] << 8 | gi[i + 3]) >>> 0;
  };
  const poe = (x, y, cor) => {
    const i = (y * w * 2 + x) * 4;
    saida.data[i] = (cor >>> 24) & 255;
    saida.data[i + 1] = (cor >>> 16) & 255;
    saida.data[i + 2] = (cor >>> 8) & 255;
    saida.data[i + 3] = cor & 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = px(x, y), A = px(x, y - 1), B = px(x + 1, y), C = px(x - 1, y), D = px(x, y + 1);
    let p1 = P, p2 = P, p3 = P, p4 = P;
    if (C === A && C !== D && A !== B) p1 = A;
    if (A === B && A !== C && B !== D) p2 = B;
    if (D === C && D !== B && C !== A) p3 = C;
    if (B === D && B !== A && D !== C) p4 = D;
    poe(x * 2, y * 2, p1); poe(x * 2 + 1, y * 2, p2);
    poe(x * 2, y * 2 + 1, p3); poe(x * 2 + 1, y * 2 + 1, p4);
  }
  g.putImageData(saida, 0, 0);
  if (_epxCache.size > 400) _epxCache.clear();
  _epxCache.set(spr, c);
  return c;
}
function escala4x(spr) { return escala2x(escala2x(spr)); }

// ---------- Peças do cenário em geometria de verdade ----------
// Nada de cubo com a arte colada: cada coisa que ocupa espaço tem forma
// própria (tronco, copa, telhado inclinado, pedra facetada, poste, viga).
// As cores saem da mesma paleta da arte 2D, para o mundo continuar coerente.
// pool máximo de luzes de lanterna simultâneas (Fase 3) — nunca uma por
// lanterna do mapa inteiro, só as mais perto do jogador
const LUZ_LANTERNA_MAX = 10;
const LUZ_LANTERNA_RAIO = 16;
const GEOS = {};
function geo3(k) {
  if (GEOS[k]) return GEOS[k];
  const G2 = {
    caixa: () => new THREE.BoxGeometry(1, 1, 1),
    cil:   () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
    cil6:  () => new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
    cone:  () => new THREE.ConeGeometry(0.5, 1, 12),
    cone4: () => new THREE.ConeGeometry(0.5, 1, 4),
    cone5: () => new THREE.ConeGeometry(0.5, 1, 5),
    tronco:() => new THREE.CylinderGeometry(0.34, 0.5, 1, 6),   // afunila para cima
    esf:   () => new THREE.SphereGeometry(0.5, 12, 10),
    pedra: () => new THREE.DodecahedronGeometry(0.5, 0),
    lasca: () => new THREE.TetrahedronGeometry(0.5, 0)
  };
  GEOS[k] = G2[k]();
  return GEOS[k];
}
// p = posição (centro da peça, y a partir do chão), s = escala, r = rotação
const M3 = (k, c, p, s, r) => ({ k, c, p, s, r });
// espécie da árvore, variação da pedra: peças do mesmo tipo não saem iguais
function varTile3(t, tx, ty) {
  if (t === 1) return treeSpecies(tx, ty);
  if (t === 23 || t === 8 || t === 10 || t === 22) return Math.floor(hash2(tx * 7 + 1, ty * 5 + 3) * 3);
  return 0;
}
// peças que podem girar em qualquer ângulo (naturais) e variar de tamanho
const MODELOS3_GIRA = new Set([1, 22, 23, 24, 8, 10]);
const MODELOS3_VARIA = new Set([1, 22, 23, 24, 8, 10]);
const MODELOS3 = {
  // --- árvores: tronco afunilado + copa em camadas, por espécie
  1: v => v === 0 ? [                                   // sakura em flor
      M3('tronco', 0x4a3020, [0, .55, 0], [.2, 1.1, .2]),
      M3('tronco', 0x4a3020, [-.22, .95, .05], [.09, .5, .09], [0, 0, .7]),
      M3('tronco', 0x4a3020, [.24, 1.0, -.05], [.09, .5, .09], [0, 0, -.6]),
      M3('esf', 0xb8536e, [-.1, 1.32, .06], [1.05, .5, .95]),
      M3('esf', 0xc9647f, [.3, 1.44, -.2], [.72, .44, .68]),
      M3('esf', 0xe88fa8, [-.3, 1.62, .2], [.7, .5, .66]),
      M3('esf', 0xf7b3c6, [.22, 1.72, .1], [.62, .46, .6]),
      M3('esf', 0xffd6e2, [-.04, 1.9, -.08], [.46, .38, .44])
    ] : v === 1 ? [                                     // bambu: colmos e folhagem
      M3('cil6', 0x2f6b30, [-.24, 1.2, .1], [.11, 2.4, .11]),
      M3('cil6', 0x3f8a3c, [.06, 1.35, -.16], [.1, 2.7, .1]),
      M3('cil6', 0x2f6b30, [.28, 1.05, .18], [.09, 2.1, .09]),
      M3('cone', 0x4f9a4a, [-.2, 2.42, .1], [.62, .5, .62]),
      M3('cone', 0x3f8a3c, [.12, 2.8, -.14], [.56, .46, .56]),
      M3('cone', 0x5aa851, [.3, 2.16, .18], [.5, .42, .5]),
      M3('cone', 0x2f6b30, [-.05, 1.75, .02], [.7, .4, .7])
    ] : [                                               // matsu: pinheiro em cones
      M3('tronco', 0x54381f, [0, .5, 0], [.22, 1.0, .22]),
      M3('cone', 0x17421f, [0, 1.15, 0], [1.25, .8, 1.25]),
      M3('cone', 0x20612c, [0, 1.6, 0], [1.0, .75, 1.0]),
      M3('cone', 0x2b7534, [0, 2.05, 0], [.72, .65, .72]),
      M3('cone', 0x37883d, [0, 2.42, 0], [.42, .5, .42])
    ],
  // --- arbusto: touceira arredondada
  22: v => [
      M3('esf', 0x2f6a30, [0, .28, 0], [.86, .5, .86]),
      M3('esf', 0x3a7a3e, [-.18, .4, .14], [.5, .38, .5]),
      M3('esf', 0x256427, [.2, .34, -.16], [.44, .32, .44])
    ],
  // --- pedra facetada, com lascas em volta
  23: v => [
      M3('pedra', 0x77778a, [0, .3, 0], [.8, .62, .74], [.4 + v, .9 * v, .2]),
      M3('pedra', 0x9393a6, [.16, .46, .1], [.34, .3, .32], [1.1, .5, .8]),
      M3('lasca', 0x5c5c6e, [-.26, .16, -.2], [.34, .3, .34], [.3, 1.2, 0])
    ],
  // --- lanterna de pedra (toro): base, fuste, câmara de luz, telhadinho e joia
  27: v => [
      M3('cil', 0x6a5a4a, [0, .1, 0], [.56, .2, .56]),
      M3('cil', 0x7a6a58, [0, .42, 0], [.24, .5, .24]),
      M3('caixa', 0x8a7a64, [0, .78, 0], [.44, .3, .44]),
      M3('caixa', 0xffe6a0, [0, .78, 0], [.3, .18, .46]),
      M3('cone4', 0x6a5a4a, [0, 1.02, 0], [.86, .3, .86], [0, .78, 0]),
      M3('esf', 0x8a7a64, [0, 1.2, 0], [.16, .18, .16])
    ],
  // --- placa de madeira
  15: v => [
      M3('cil', 0x6a4a2a, [0, .3, 0], [.12, .6, .12]),
      M3('caixa', 0x8a6a48, [0, .62, .04], [.72, .34, .1], [-.12, 0, 0])
    ],
  // --- baú: caixa com tampa abaulada e ferragem
  16: v => [
      M3('caixa', 0x8a5a28, [0, .2, 0], [.72, .4, .56]),
      M3('cil', 0xa06a30, [0, .42, 0], [.56, .72, .56], [0, 0, Math.PI / 2]),
      M3('caixa', 0xc8a24a, [0, .3, .29], [.16, .5, .04])
    ],
  17: v => [
      M3('caixa', 0x5a4a3a, [0, .2, 0], [.72, .4, .56]),
      M3('cil', 0x6a5a48, [0, .42, 0], [.56, .72, .56], [0, 0, Math.PI / 2])
    ],
  // --- cogumelo
  24: v => [
      M3('cil', 0xe8e0d0, [0, .18, 0], [.16, .36, .16]),
      M3('esf', 0xc85a5a, [0, .4, 0], [.6, .42, .6]),
      M3('esf', 0xffe8e8, [.14, .5, .1], [.14, .1, .14])
    ],
  // --- túmulo: lápide com topo arredondado
  20: v => [
      M3('caixa', 0x6a6470, [0, .06, 0], [.62, .12, .5]),
      M3('caixa', 0x8a8a94, [0, .44, 0], [.42, .66, .16]),
      M3('cil', 0x9a9aa4, [0, .77, 0], [.42, .16, .42], [Math.PI / 2, 0, 0])
    ],
  // --- altar: pedestal com cristal
  21: v => [
      M3('cil6', 0x5a4a6a, [0, .16, 0], [.9, .32, .9]),
      M3('cil6', 0x6a5a7a, [0, .38, 0], [.6, .18, .6]),
      M3('cone', 0xb06ae8, [0, .78, 0], [.34, .7, .34]),
      M3('cone', 0x8a4ac8, [0, .5, 0], [.34, .3, .34], [Math.PI, 0, 0])
    ],
  // --- chozuya: bacia de pedra com água
  13: v => [
      M3('cil6', 0x6a6470, [0, .16, 0], [.92, .32, .92]),
      M3('cil6', 0x8a8494, [0, .34, 0], [.78, .12, .78]),
      M3('cil6', 0x4a8ac0, [0, .4, 0], [.66, .06, .66])
    ],
  // --- muro de taipa: base de pedra, corpo e cobertura inclinada
  5: v => [
      M3('caixa', 0x6a6470, [0, .18, 0], [1, .36, 1]),
      M3('caixa', 0xbdb2a0, [0, .95, 0], [.94, 1.2, .94]),
      M3('caixa', 0x4a4a58, [0, 1.66, 0], [1.06, .22, 1.06]),
      M3('caixa', 0x5a5a68, [0, 1.8, 0], [.86, .1, .86])
    ],
  // --- telhado kawara: corpo da casa + telhado de quatro águas
  18: v => [
      M3('caixa', 0xd8ccb0, [0, .7, 0], [1, 1.4, 1]),
      M3('cone4', 0x5a6478, [0, 1.72, 0], [1.5, .66, 1.5], [0, Math.PI / 4, 0]),
      M3('caixa', 0x3a4050, [0, 1.42, 0], [1.24, .1, 1.24])
    ],
  14: v => [
      M3('caixa', 0xd8ccb0, [0, .7, 0], [1, 1.4, 1]),
      M3('cone4', 0x8a3a32, [0, 1.72, 0], [1.5, .66, 1.5], [0, Math.PI / 4, 0]),
      M3('caixa', 0x5a241e, [0, 1.42, 0], [1.24, .1, 1.24]),
      M3('caixa', 0xe0d8c0, [0, .9, .58], [.86, .5, .16])
    ],
  // --- porta shoji
  19: v => [
      M3('caixa', 0x4a3420, [0, .66, .56], [.82, 1.3, .14]),
      M3('caixa', 0xe8e0c8, [0, .66, .64], [.64, 1.04, .04]),
      M3('caixa', 0x2a1c12, [0, .06, .6], [.9, .12, .28])
    ],
  // --- torii: pilar e vigas laqueadas
  29: v => [M3('cil', 0xc2352e, [.18, 1.3, 0], [.26, 2.6, .26], [0, 0, .03])],
  30: v => [M3('cil', 0xc2352e, [-.18, 1.3, 0], [.26, 2.6, .26], [0, 0, -.03])],
  25: v => [
      M3('caixa', 0xc2352e, [.1, .2, 0], [1.1, .18, .34]),
      M3('caixa', 0x8a1f1a, [.05, .52, 0], [1.2, .2, .42]),
      M3('caixa', 0xc2352e, [.05, .68, 0], [1.24, .12, .5])
    ],
  26: v => [
      M3('caixa', 0xc2352e, [-.1, .2, 0], [1.1, .18, .34]),
      M3('caixa', 0x8a1f1a, [-.05, .52, 0], [1.2, .2, .42]),
      M3('caixa', 0xc2352e, [-.05, .68, 0], [1.24, .12, .5])
    ],
  // --- montanha: massa rochosa com pico, altura variando por tile
  8: v => [
      M3('caixa', 0x5a5468, [0, 1.3, 0], [1, 2.6, 1]),
      M3('cone5', 0x6a6478, [0, 2.9, 0], [1.3, 1.0, 1.3], [0, v * 1.2, 0]),
      M3('pedra', 0x46405a, [.3, .5, .3], [.5, .5, .5], [.5, v, .3])
    ],
  // --- parede de caverna: rocha bruta empilhada
  10: v => [
      M3('caixa', 0x2a2438, [0, 1.1, 0], [1, 2.2, 1]),
      M3('pedra', 0x3a3450, [.1, 2.3, -.1], [1.1, .8, 1.1], [.3 + v, v, .2]),
      M3('pedra', 0x241e34, [-.28, 1.6, .3], [.5, .5, .5], [1, v, .4])
    ],
  // --- boca da caverna
  11: v => [
      M3('caixa', 0x2a2438, [0, 1.1, 0], [1, 2.2, 1]),
      M3('cil', 0x0a0812, [0, .5, .42], [.66, 1.0, .3], [Math.PI / 2, 0, 0])
    ],
  // --- estátua do Herói-Rei: pedestal + figura de pé com manto e lâmina
  // erguida, coroa dourada. Só cenário — reforça a lore de Kuniyasu no
  // próprio mapa, sem depender só de diálogo.
  32: v => [
      M3('caixa', 0x5a5468, [0, .1, 0], [.9, .2, .9]),
      M3('caixa', 0x6a6470, [0, .34, 0], [.62, .28, .62]),
      M3('caixa', 0x8a8a94, [0, 1.0, 0], [.4, 1.0, .26]),
      M3('esf', 0x9a9aa4, [0, 1.62, 0], [.24, .26, .24]),
      M3('cone4', 0xffd94e, [0, 1.82, 0], [.14, .1, .14]),
      M3('caixa', 0xa8a8b2, [.22, 1.15, .04], [.1, .7, .1], [0, 0, -.5])
    ]
};
// saída de interior: mesmo modelo da porta shoji (19)
MODELOS3[31] = MODELOS3[19];
// recolorização por bioma (Fase 4) dos modelos 3D "altos" — bakeMountain()
// (render/tiles.js) já dá tom próprio à VERSÃO EM TEXTURA 2D da montanha,
// mas a montanha no mundo 3D usa MODELOS3[8] (geometria de verdade, cor
// fixa), que bakeMountain() nunca toca. Sem isso, "Picos de Takara" teria
// grama tingida mas montanhas sempre cinza-padrão — a peça mais visível da
// região ficaria de fora da variedade por bioma. Mesma ordem de partes de
// MODELOS3[8]: base, pico, detalhe de pedra.
const MODELOS3_BIOME_COR = {
  8: { 'Picos de Takara': [0x5c6478, 0x6a7488, 0x3e4658] }
};

// ---------- Renderizador 3D ----------
// O mundo vira geometria: cada tile é um bloco cuja face de cima usa a MESMA
// arte em pixels do jogo 2D, então o cenário continua idêntico, só que com
// volume. Personagens seguem sendo sprites 2D (billboards) virados para a
// câmera — é o paper doll de sempre, agora dentro de uma cena 3D.
const GL3 = { W: 640, H: 360 };          // atualizado no redimensionamento
// altura de cada tipo de tile, em tiles. Tudo que se anda tem 0.5 para o
// personagem apoiar sempre na mesma cota.
const ALT3 = {
  0: .5, 3: .5, 4: .5, 6: .5, 7: .5, 9: .5, 11: .5, 12: .5, 13: .5, 15: .5,
  19: .5, 22: .5, 24: .5, 25: .5, 26: .5, 28: .5, 31: .5,
  2: .3,                                    // água, rebaixada
  1: 2.6, 5: 2.4, 8: 4.2, 10: 3.6, 14: 2.6, 18: 2.4, 20: .95, 21: 1.2,
  16: .8, 17: .8, 23: .9, 27: 1.4, 29: 3.0, 30: 3.0, 32: 2.0
};
const LADO3 = {                            // cor das laterais do bloco
  0: 0x5a4a30, 4: 0x5a4a30, 22: 0x5a4a30, 3: 0x6a5238, 28: 0x6a5238, 6: 0x6a5238,
  2: 0x2a4a6a, 7: 0x6a4a2a, 1: 0x3a2a18, 5: 0x6a6470, 8: 0x46405a, 10: 0x2a2438,
  9: 0x3a3448, 18: 0x6a2a24, 19: 0x4a3420, 31: 0x4a3420, 14: 0x6a2a24, 20: 0x6a6470,
  23: 0x5a5a66, 27: 0x4a3a2a, 21: 0x6a4a9a, 29: 0x8a2420, 30: 0x8a2420,
  11: 0x2a2438, 13: 0x4a6a8a, 16: 0x8a6a2a, 17: 0x8a6a2a, 24: 0x6a3a3a,
  25: 0x8a2420, 26: 0x8a2420, 12: 0x3a3448, 15: 0x6a5238, 32: 0x6a6470
};
// grão de cada tipo de chão: quantidade, cores e se são fiapos verticais
const GRAO3 = {
  0:  { n: 150, a: .5, alto: true,  cores: ['#4d8f46', '#376b32', '#5aa04f', '#2f5f2b'] },
  4:  { n: 130, a: .45, alto: true, cores: ['#4d8f46', '#5aa04f', '#c8d060', '#e0a8c0'] },
  3:  { n: 130, a: .38, alto: false, cores: ['#7a5c3e', '#9a7a56', '#6a4e34', '#a89070'] },
  6:  { n: 130, a: .38, alto: false, cores: ['#7a5c3e', '#9a7a56', '#6a4e34'] },
  28: { n: 120, a: .32, alto: false, cores: ['#8a7a5c', '#a89a78', '#786a50'] },
  9:  { n: 140, a: .42, alto: false, cores: ['#3f3a52', '#4e4862', '#2f2a40'] },
  2:  { n: 70,  a: .22, alto: false, cores: ['#5a9ad0', '#3f7ab0', '#7ab6e0'] },
  7:  { n: 90,  a: .34, alto: false, cores: ['#6a4a2a', '#8a6a48', '#5a3a20'] },
  12: { n: 120, a: .4,  alto: false, cores: ['#3f3a52', '#4e4862'] }
};
const R3 = {
  ok: false, ligado: false, forcado2D: false, rend: null, cena: null, cam: null, sol: null,
  mapaNome: null, grupoMapa: null, texTile: new Map(), texSpr: new Map(),
  bill: new Map(), usados: new Set(),
  inc: 0.82, dist: 34, zoom: 34, alvo: null, ceu: null,

  init() {
    if (this.ok) return true;
    const cvGl = document.getElementById('gl');
    try {
      this.rend = new THREE.WebGLRenderer({ canvas: cvGl, antialias: true, alpha: false });
    } catch (e) { return false; }
    if (!this.rend) return false;
    // antes fixo em 1: em telas de alta densidade (retina/HiDPI) a cena
    // saía borrada mesmo com toda a geometria/luz corretas — cap em 2x
    // pra não pagar custo de GPU desproporcional em telas 3x/4x.
    this.rend.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    GL3.W = cv.width; GL3.H = cv.height;
    this.rend.setSize(GL3.W, GL3.H, false);
    this.rend.shadowMap.enabled = true;
    this.rend.shadowMap.type = THREE.PCFSoftShadowMap;
    // (tentativa de tonemapping filmico revertida: este bundle vendorizado
    // do three.js não exporta nenhuma constante *ToneMapping — confirmado
    // via Object.keys(THREE) — então THREE.ACESFilmicToneMapping era
    // sempre undefined; a linha não fazia nada além de gerar aviso de
    // shader a cada material novo compilado. Achado durante a Fase 4.)
    this.cena = new THREE.Scene();
    this.ceu = new THREE.Color('#2a3a56');
    this.cena.background = this.ceu;
    this.cena.fog = new THREE.Fog('#2a3a56', 34, 82);
    // perspectiva estreita: dá profundidade de verdade sem distorcer o
    // pixel art, como nos RPGs 3D vistos de cima
    this.cam = new THREE.PerspectiveCamera(30, GL3.W / GL3.H, 0.5, 220);
    this.alvo = new THREE.Vector3(0, 0, 0);
    this.sol = new THREE.DirectionalLight('#ffe6c0', 1.85);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(2048, 2048);
    const s = this.sol.shadow.camera;
    s.left = -20; s.right = 20; s.top = 20; s.bottom = -20; s.near = 1; s.far = 70;
    this.sol.shadow.bias = -0.0015;
    this.sol.shadow.normalBias = 0.05;
    this.cena.add(this.sol, this.sol.target);
    this.hemi = new THREE.HemisphereLight('#bcd0ff', '#4a5a38', 1.35);
    this.cena.add(this.hemi);
    // luzes de lanterna: um pool pequeno e fixo de PointLight, nunca uma
    // por lanterna do mapa inteiro — culling() liga só as mais perto do
    // jogador nos pontos guardados em this._lanternas. Sem sombra própria
    // (uma luz de ponto com sombra custa um cubemap de profundidade inteiro;
    // já existe 1 luz com sombra — o sol — não vale multiplicar isso).
    this._lanternas = [];
    this._poolLuzes = [];
    for (let i = 0; i < LUZ_LANTERNA_MAX; i++) {
      const l = new THREE.PointLight(0xffe6a0, 0, 4.2, 2);
      l.castShadow = false;
      // sempre visible:true — só a intensidade (0 = apagada) muda por
      // quadro; ver atualizaLuzesLanterna() pro motivo de nunca alternar
      // `visible` depois de criada
      this.cena.add(l);
      this._poolLuzes.push(l);
    }
    this.ok = true;
    return true;
  },

  // textura da face de cima: a arte do tile é redesenhada num canvas próprio
  tex(t, tx, ty, map) {
    const chave = t + ':' + (map.name === 'cave' ? 'c' : 'o') + ':' + (tx % 4) + ',' + (ty % 4);
    if (this.texTile.has(chave)) return this.texTile.get(chave);
    const c = document.createElement('canvas');
    c.width = TILE; c.height = TILE;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, TILE, TILE);
    try { drawTile(t, 0, 0, tx, ty, map); } catch (e) {}
    c.getContext('2d').drawImage(buf, 0, 0, TILE, TILE, 0, 0, TILE, TILE);
    ctx.restore();
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    this.texTile.set(chave, tex);
    return tex;
  },

  limparMapa() {
    if (!this.grupoMapa) return;
    this.cena.remove(this.grupoMapa);
    this.grupoMapa.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
    this.grupoMapa = null;
    this.chunks = null;
  },

  // Terreno em chunks: o chão de cada pedaço do mapa é assado numa textura
  // única (a mesma arte 2D) sobre um plano — 1 draw call por chunk em vez de
  // um por tipo de tile. Só as peças altas continuam sendo blocos, porque são
  // elas que dão volume. Chunks longe do jogador saem da cena.
  // Monta só o essencial (setup + casas do mapa inteiro, que é barato — só
  // percorre tiles) e deixa a geometria pesada (pedaço por pedaço) para
  // garanteChunksPerto(), chamada todo quadro a partir de culling(). Antes,
  // esta função construía TODOS os pedaços do mapa de uma vez, de forma
  // síncrona — com o mapa expandido (4x mais pedaços) isso passou a travar
  // o carregamento por dezenas de segundos (medido: 72s+, e uma vez o
  // navegador chegou a fechar por esgotamento de recursos). Agora só os
  // pedaços perto do jogador nascem construídos; o resto entra sob demanda
  // conforme ele anda, alguns por quadro, sem travar nada.
  montarMapa(map) {
    this.limparMapa();
    this.mapaNome = map.name;
    this.mapaAtual = map;
    this.chunks = [];
    this.chunksFeitos = new Set();
    this._lanternas = [];   // pontos de âncora das lanternas deste mapa (luz de verdade, Fase 3)
    const grupo = new THREE.Group();
    this.grupoMapa = grupo;
    this.cena.add(grupo);
    const CH = 16, base = map.name === 'cave' ? 9 : 0;
    this._chunkCH = CH; this._chunkBase = base;
    // Uma casa neste mapa é uma fileira de telhado (18) com as fileiras de
    // parede (5/19/14) logo abaixo. Junta tudo num prédio só, senão cada tile
    // vira uma caixinha e o conjunto fica com cara de grade. Isso é feito
    // pro mapa inteiro de uma vez (é só um flood-fill sobre os tiles, barato
    // mesmo num mapa grande) porque uma casa pode ficar perto da costura
    // entre dois pedaços.
    const ehTeto = t => t === 18;
    const ehParede = t => t === 5 || t === 19 || t === 14;
    const dono = new Map(), casas = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const t = map.tiles[y][x];
      if (!ehTeto(t) || dono.has(x + ',' + y)) continue;
      const fila = [[x, y]], celulas = [];
      dono.set(x + ',' + y, 1);
      while (fila.length) {
        const [cx2, cy2] = fila.pop();
        celulas.push([cx2, cy2]);
        for (const [dx2, dy2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx2 = cx2 + dx2, ny2 = cy2 + dy2, ch2 = nx2 + ',' + ny2;
          if (nx2 < 0 || ny2 < 0 || nx2 >= map.w || ny2 >= map.h) continue;
          if (dono.has(ch2) || !ehTeto(map.tiles[ny2][nx2])) continue;
          dono.set(ch2, 1);
          fila.push([nx2, ny2]);
        }
      }
      const xs = celulas.map(c => c[0]), ys = celulas.map(c => c[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const y0 = Math.min(...ys);
      let y1 = Math.max(...ys), loja = false;
      // desce enquanto a fileira inteira for parede: é o corpo da casa
      for (let yy = y1 + 1; yy < map.h; yy++) {
        let todaParede = true;
        for (let xx = x0; xx <= x1; xx++) if (!ehParede(map.tiles[yy][xx])) { todaParede = false; break; }
        if (!todaParede) break;
        for (let xx = x0; xx <= x1; xx++) {
          if (map.tiles[yy][xx] === 14) loja = true;
          // a porta continua sendo desenhada, para aparecer na fachada
          if (map.tiles[yy][xx] !== 19) dono.set(xx + ',' + yy, 1);
        }
        y1 = yy;
      }
      casas.push({ x0, x1, y0, y1, loja });
    }
    this.casas = casas;
    this._donoCasas = dono;
    const SS = 2;   // supersample da textura do chão
    const cvT = document.createElement('canvas');
    cvT.width = CH * TILE * SS; cvT.height = CH * TILE * SS;
    this._cvChunk = cvT;
    this.ambiente(map);
    // constrói sem limite (não é o mapa inteiro, só a vizinhança imediata)
    // pra não nascer num vazio por alguns quadros
    const hx = P.x / TILE, hz = P.y / TILE;
    this.garanteChunksPerto(hx, hz, 1, Infinity);
  },
  // constrói a geometria de UM pedaço (cx,cz em unidade de pedaço, não de
  // tile) — mesma lógica que antes rodava pra todos de uma vez
  construirChunk(cx, cz) {
    const map = this.mapaAtual, CH = this._chunkCH, base = this._chunkBase;
    const dono = this._donoCasas, casas = this.casas, cvT = this._cvChunk;
    // ganha geometria própria quem é alto OU quem tem modelo (arbusto, placa,
    // porta, viga do torii, chozuya... coisas baixas mas que ocupam espaço)
    const alto = t => (ALT3[t] !== undefined ? ALT3[t] : 0.5) > 0.6 || !!MODELOS3[t];
    const SS = 2;
    const g2 = cvT.getContext('2d');
    g2.imageSmoothingEnabled = false;
    g2.clearRect(0, 0, cvT.width, cvT.height);
    const altos = new Map();
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
      const tx = cx * CH + x, ty = cz * CH + y;
      if (tx >= map.w || ty >= map.h) continue;
      const t = map.tiles[ty][tx];
      // sob uma peça alta vai o chão da região, não a arte dela
      this.pinta(g2, (alto(t) || dono.has(tx + ',' + ty)) ? base : t, tx, ty, map, x * TILE * SS, y * TILE * SS, SS);
      if (dono.has(tx + ',' + ty)) continue;
      if (alto(t)) {
        const vv = varTile3(t, tx, ty);
        const ch = t + '#' + vv;
        if (!altos.has(ch)) { const a2 = []; a2.t = t; a2.v = vv; altos.set(ch, a2); }
        altos.get(ch).push([tx, ty]);
      }
    }
    const c2 = document.createElement('canvas');
    c2.width = cvT.width; c2.height = cvT.height;
    c2.getContext('2d').drawImage(cvT, 0, 0);
    const tex = new THREE.CanvasTexture(c2);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    const plano = new THREE.Mesh(
      new THREE.PlaneGeometry(CH, CH),
      new THREE.MeshLambertMaterial({ map: tex })
    );
    plano.rotation.x = -Math.PI / 2;
    plano.position.set(cx * CH + CH / 2 - 0.5, 0.5, cz * CH + CH / 2 - 0.5);
    plano.receiveShadow = true;
    const pedaco = new THREE.Group();
    pedaco.add(plano);
    // peças altas: cada tipo vira um modelo de verdade (tronco + copa,
    // telhado inclinado, pedra facetada...), uma InstancedMesh por parte
    const m4 = new THREE.Matrix4();
    const _q = new THREE.Quaternion(), _e = new THREE.Euler();
    const _p = new THREE.Vector3(), _s = new THREE.Vector3();
    for (const [chave, lista] of altos) {
      const t = lista.t, vv = lista.v;
      const modelo = MODELOS3[t] ? MODELOS3[t](vv) : null;
      if (!modelo) {   // sem modelo próprio: bloco com a arte, como antes
        const alt = ALT3[t];
        const tx3 = this.tex(t, lista[0][0], lista[0][1], map);
        const lado = new THREE.MeshLambertMaterial({ map: tx3, color: 0xb8b8c4 });
        const mesh = new THREE.InstancedMesh(geo3('caixa'),
          [lado, lado, new THREE.MeshLambertMaterial({ map: tx3 }),
           new THREE.MeshLambertMaterial({ color: 0x1a1626 }), lado, lado], lista.length);
        mesh.castShadow = true; mesh.receiveShadow = true;
        lista.forEach(([x, y], k) => {
          m4.makeScale(1, alt, 1); m4.setPosition(x, 0.5 + alt / 2, y);
          mesh.setMatrixAt(k, m4);
        });
        mesh.instanceMatrix.needsUpdate = true;
        pedaco.add(mesh);
        continue;
      }
      // região do primeiro tile do grupo — aproximação aceitável: um chefe
      // de 16x16 tiles raramente atravessa duas regiões nomeadas
      const biomaCor = MODELOS3_BIOME_COR[t] && map.name === 'overworld'
        ? MODELOS3_BIOME_COR[t][regionAt(lista[0][0], lista[0][1])] : null;
      modelo.forEach((parte, pi) => {
        const mesh = new THREE.InstancedMesh(geo3(parte.k),
          new THREE.MeshLambertMaterial({ color: (biomaCor && biomaCor[pi] !== undefined) ? biomaCor[pi] : parte.c,
            flatShading: parte.k === 'pedra' || parte.k === 'lasca' }),
          lista.length);
        mesh.castShadow = true; mesh.receiveShadow = true;
        lista.forEach(([x, y], k) => {
          // variação por tile: gira e redimensiona um pouco, senão a
          // floresta vira uma fileira de clones
          const h1 = hash2(x * 13 + 5, y * 11 + 2), h2b = hash2(x * 3 + 9, y * 17 + 4);
          const giro = MODELOS3_GIRA.has(t) ? h1 * Math.PI * 2 : 0;
          const esc = 1 + (MODELOS3_VARIA.has(t) ? (h2b - 0.5) * 0.34 : 0);
          _e.set(parte.r ? parte.r[0] : 0, (parte.r ? parte.r[1] : 0) + giro, parte.r ? parte.r[2] : 0);
          _q.setFromEuler(_e);
          _p.set(x + (parte.p[0]) * esc, 0.5 + parte.p[1] * esc, y + (parte.p[2]) * esc);
          _s.set(parte.s[0] * esc, parte.s[1] * esc, parte.s[2] * esc);
          m4.compose(_p, _q, _s);
          mesh.setMatrixAt(k, m4);
        });
        mesh.instanceMatrix.needsUpdate = true;
        pedaco.add(mesh);
      });
      // lanterna (tile 27): guarda o ponto de luz de cada instância — vira
      // luz de verdade em culling(), não só geometria com caixa "acesa"
      if (t === 27) for (const [x, y] of lista) this._lanternas.push(new THREE.Vector3(x, 1.28, y));
    }
    for (const c of casas) {
      if (c.x0 < cx * CH || c.x0 >= (cx + 1) * CH || c.y0 < cz * CH || c.y0 >= (cz + 1) * CH) continue;
      pedaco.add(this.constroiCasa(c));
    }
    pedaco.userData.centro = new THREE.Vector2(cx * CH + CH / 2, cz * CH + CH / 2);
    this.chunks.push(pedaco);
    this.grupoMapa.add(pedaco);
  },
  // constrói (uma vez cada) os pedaços dentro de `raio` pedaços do ponto
  // (wx,wz), até `maxPorChamada` pedaços novos por chamada — chamada todo
  // quadro a partir de culling(), então o resto do mapa vai nascendo aos
  // poucos conforme o jogador anda, sem travar um quadro inteiro
  garanteChunksPerto(wx, wz, raio, maxPorChamada) {
    const map = this.mapaAtual;
    if (!map) return;
    const CH = this._chunkCH;
    const ccx = Math.floor(wx / CH), ccz = Math.floor(wz / CH);
    let feitos = 0;
    for (let dz = -raio; dz <= raio; dz++) {
      for (let dx = -raio; dx <= raio; dx++) {
        if (feitos >= maxPorChamada) return;
        const cx = ccx + dx, cz = ccz + dz;
        if (cx < 0 || cz < 0 || cx * CH >= map.w || cz * CH >= map.h) continue;
        const chave = cx + ',' + cz;
        if (this.chunksFeitos.has(chave)) continue;
        this.chunksFeitos.add(chave);
        this.construirChunk(cx, cz);
        feitos++;
      }
    }
  },
  // Uma construção japonesa: embasamento de pedra, parede de shikkui com
  // travamento de madeira aparente, engawa na frente e telhado de kawara com
  // beiral saliente e cumeeira. A loja se distingue de longe: telhado
  // vermelho, noren na porta, lanternas acesas e placa.
  constroiCasa(c) {
    const g = new THREE.Group();
    const larg = c.x1 - c.x0 + 1, prof = c.y1 - c.y0 + 1;
    const mx = (c.x0 + c.x1) / 2, mz = (c.y0 + c.y1) / 2;
    const frente = c.y1 + 0.5;                 // fachada voltada para o sul
    const cai = (geo, cor, x, y, z, sx, sy, sz, ry) => {
      const m = new THREE.Mesh(geo, cor);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      if (ry) m.rotation.y = ry;
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const CX = geo3('caixa'), CIL = geo3('cil');
    const matPedra  = new THREE.MeshLambertMaterial({ color: 0x6f6a72 });
    const matParede = new THREE.MeshLambertMaterial({ color: 0xe6dfcd });
    const matMad    = new THREE.MeshLambertMaterial({ color: 0x4a3524 });
    const matMadC   = new THREE.MeshLambertMaterial({ color: 0x6b5136 });
    const matTelha  = new THREE.MeshLambertMaterial({ color: c.loja ? 0x9c3a30 : 0x4e5768 });
    const matCume   = new THREE.MeshLambertMaterial({ color: c.loja ? 0x6d241d : 0x333a49 });
    const matPapel  = new THREE.MeshLambertMaterial({ color: 0xf2ead2 });

    const hEmb = 0.22, hPar = 1.35;
    const yEmb = 0.5 + hEmb / 2, yPar = 0.5 + hEmb + hPar / 2;
    // embasamento de pedra
    cai(CX, matPedra, mx, yEmb, mz, larg + 0.16, hEmb, prof + 0.16);
    // corpo em shikkui
    cai(CX, matParede, mx, yPar, mz, larg, hPar, prof);
    // travamento de madeira: pilares nos cantos e viga de amarração
    const topoPar = 0.5 + hEmb + hPar;
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      cai(CX, matMad, mx + sx * (larg / 2 - 0.06), yPar, mz + sz * (prof / 2 - 0.06), 0.13, hPar, 0.13);
    // pilares intermediários a cada tile na fachada
    for (let k = 1; k < larg; k++)
      cai(CX, matMad, c.x0 - 0.5 + k, yPar, frente - 0.04, 0.1, hPar, 0.1);
    cai(CX, matMad, mx, topoPar - 0.07, mz, larg + 0.04, 0.13, prof + 0.04);
    cai(CX, matMadC, mx, 0.5 + hEmb + hPar * 0.42, mz, larg + 0.03, 0.08, prof + 0.03);

    // engawa: tábua corrida na frente, com degrau
    cai(CX, matMadC, mx, 0.5 + hEmb * 0.9, frente + 0.28, larg - 0.2, 0.12, 0.58);
    cai(CX, matPedra, mx, 0.5 + hEmb * 0.35, frente + 0.6, 0.9, 0.14, 0.2);

    // telhado: beiral saliente, duas águas de kawara e cumeeira
    const yBeiral = topoPar + 0.06;
    cai(CX, matCume, mx, yBeiral, mz, larg + 0.5, 0.12, prof + 0.5);
    const altT = 0.5 + Math.min(larg, prof) * 0.24;
    const teto = new THREE.Mesh(geo3('cone4'), matTelha);
    teto.geometry = teto.geometry.clone();
    teto.geometry.rotateY(Math.PI / 4);
    teto.scale.set((larg + 0.44) / 0.7071, altT, (prof + 0.44) / 0.7071);
    teto.position.set(mx, yBeiral + 0.06 + altT / 2, mz);
    teto.castShadow = true; teto.receiveShadow = true;
    g.add(teto);
    // cumeeira no topo, no sentido mais longo
    const deitado = larg >= prof;
    cai(CX, matCume, mx, yBeiral + 0.04 + altT * 0.97, mz,
        deitado ? larg * 0.55 : 0.22, 0.14, deitado ? 0.22 : prof * 0.55);

    if (c.loja) {
      // noren na porta, lanternas e placa: dá para saber o que é de longe
      const matNoren = new THREE.MeshLambertMaterial({ color: 0xd8483a });
      cai(CX, matNoren, mx, 0.5 + hEmb + hPar * 0.78, frente + 0.03, larg * 0.62, hPar * 0.42, 0.05);
      cai(CX, new THREE.MeshLambertMaterial({ color: 0xf4e7cf }),
          mx, 0.5 + hEmb + hPar * 0.86, frente + 0.06, larg * 0.24, hPar * 0.16, 0.02);
      const matLant = new THREE.MeshLambertMaterial({ color: 0xffd06a });
      for (const sx of [-1, 1]) {
        cai(CIL, matLant, mx + sx * (larg / 2 - 0.18), yBeiral - 0.24, frente + 0.22, 0.28, 0.34, 0.28);
        cai(CX, matMad, mx + sx * (larg / 2 - 0.18), yBeiral - 0.05, frente + 0.22, 0.05, 0.22, 0.05);
      }
      // nobori: bandeira alta na frente da loja, o marco mais visível de cima
      for (const sx of [-1, 1]) {
        const bx = mx + sx * (larg / 2 + 0.35);
        cai(CX, matMad, bx, 0.5 + 1.15, frente + 0.5, 0.07, 2.3, 0.07);
        cai(CX, matMad, bx + sx * 0.16, 0.5 + 2.24, frente + 0.5, 0.32, 0.07, 0.07);
        cai(CX, matNoren, bx + sx * 0.2, 0.5 + 1.62, frente + 0.5, 0.04, 1.2, 0.34);
        cai(CX, matPapel, bx + sx * 0.23, 0.5 + 1.62, frente + 0.5, 0.02, 0.86, 0.16);
      }
    } else {
      // janela de papel na fachada
      cai(CX, matMad, mx - larg * 0.28, 0.5 + hEmb + hPar * 0.66, frente + 0.02, larg * 0.3, hPar * 0.42, 0.05);
      cai(CX, matPapel, mx - larg * 0.28, 0.5 + hEmb + hPar * 0.66, frente + 0.04, larg * 0.26, hPar * 0.36, 0.02);
    }
    return g;
  },
  // desenha um tile num contexto qualquer, reaproveitando a arte 2D do jogo
  pinta(g2, t, tx, ty, map, dx, dy, ss) {
    const k = ss || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, TILE, TILE);
    try { drawTile(t, 0, 0, tx, ty, map); } catch (e) {}
    ctx.restore();
    g2.drawImage(buf, 0, 0, TILE, TILE, dx, dy, TILE * k, TILE * k);
    if (k > 1) this.detalhe(g2, t, tx, ty, dx, dy, TILE * k);
  },
  // Grão fino por cima da arte: em resolução cheia o chão em pixel puro vira
  // um xadrez de quadrados chapados. Este ruído sutil devolve textura sem
  // apagar o desenho original.
  detalhe(g2, t, tx, ty, dx, dy, lado) {
    const grao = GRAO3[t];
    if (!grao) return;
    const rnd = seeded(((tx * 73856093) ^ (ty * 19349663)) >>> 0);
    const n = grao.n;
    g2.globalAlpha = grao.a;
    for (let i = 0; i < n; i++) {
      const px2 = Math.floor(rnd() * lado), py2 = Math.floor(rnd() * lado);
      const c = grao.cores[Math.floor(rnd() * grao.cores.length)];
      const w2 = grao.alto ? 1 : 1 + Math.floor(rnd() * 2);
      const h2 = grao.alto ? 2 + Math.floor(rnd() * 2) : 1;
      g2.fillStyle = c;
      g2.fillRect(dx + px2, dy + py2, w2, h2);
    }
    g2.globalAlpha = 1;
  },
  // só os chunks por perto ficam na cena
  culling(wx, wz) {
    if (!this.chunks) return;
    this.garanteChunksPerto(wx, wz, 3, 2);
    for (const p of this.chunks) {
      const d = Math.hypot(p.userData.centro.x - wx, p.userData.centro.y - wz);
      p.visible = d < 30;
    }
    this.atualizaLuzesLanterna(wx, wz);
  },
  // reatribui o pool fixo de PointLight às lanternas mais perto do jogador
  // (dentro de LUZ_LANTERNA_RAIO), reposicionando em vez de criar/destruir
  atualizaLuzesLanterna(wx, wz) {
    const pontos = this._lanternas;
    if (!pontos || !pontos.length || !this._poolLuzes) return;
    const perto = [];
    for (const p of pontos) {
      const d = Math.hypot(p.x - wx, p.z - wz);
      if (d < LUZ_LANTERNA_RAIO) perto.push([d, p]);
    }
    perto.sort((a, b) => a[0] - b[0]);
    const pool = this._poolLuzes;
    // nunca alterna `visible`: o three.js compila um shader por
    // combinação exata de quantas luzes estão ativas na cena, então
    // ligar/desligar luz do pool forçava recompilação toda hora que o
    // jogador cruzava a borda do raio — travamento real, medido via
    // rend.info.programs.length crescendo sem parar ao andar perto de
    // vilas. As 10 permanecem `visible:true` pra sempre (shader compila
    // uma vez só); só a intensidade muda por quadro, que é gratuito.
    for (let i = 0; i < pool.length; i++) {
      const l = pool[i];
      if (i < perto.length) {
        const [d, p] = perto[i];
        l.position.copy(p);
        // esmaece perto da borda do raio, em vez de acender/apagar de
        // repente quando o jogador cruza o limite
        l.intensity = 0.85 * Math.min(1, (LUZ_LANTERNA_RAIO - d) / 5);
      } else {
        l.intensity = 0;
      }
    }
  },

  // céu, névoa e luz mudam conforme a região
  ambiente(map) {
    let ceu = '#2a3a56', luz = '#ffe6c0', forca = 1.85, hemiC = '#bcd0ff', hemiF = 1.35, perto = 34, longe = 82;
    if (map.name === 'cave') { ceu = '#120e1e'; luz = '#8a6ad0'; forca = 0.95; hemiC = '#6a5a9a'; hemiF = 0.75; perto = 12; longe = 38; }
    else if (G.region === 'Templo Abandonado') { ceu = '#2a2440'; luz = '#c8b0ff'; forca = 1.1; hemiC = '#9a8ad0'; hemiF = 1.0; perto = 24; longe = 62; }
    else if (G.region === 'Bosque de Bambu' || G.region === 'Floresta de Aokigahara') { ceu = '#1e3a2a'; luz = '#d8f0b0'; forca = 1.4; hemiC = '#9ad0a0'; hemiF = 1.15; perto = 22; longe = 58; }
    this.ceu.set(ceu);
    this.cena.fog.color.set(ceu);
    this.cena.fog.near = perto; this.cena.fog.far = longe;
    this.sol.color.set(luz); this.sol.intensity = forca;
    this.hemi.color.set(hemiC); this.hemi.intensity = hemiF;
  },

  // billboard: o canvas do sprite 2D vira textura, sem alterar o paper doll
  sprite(canvasSpr, chave) {
    let sp = this.bill.get(chave);
    if (!sp) {
      const tex = new THREE.CanvasTexture(canvasSpr);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.35, fog: true }));
      sp.userData.src = canvasSpr;
      this.cena.add(sp);
      // manchinha de sombra: Sprite não projeta sombra própria
      const som = new THREE.Mesh(
        new THREE.CircleGeometry(0.34, 10),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })
      );
      som.rotation.x = -Math.PI / 2;
      this.cena.add(som);
      sp.userData.sombra = som;
      this.bill.set(chave, sp);
    } else if (sp.userData.src !== canvasSpr) {
      sp.material.map.dispose();
      const tex = new THREE.CanvasTexture(canvasSpr);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      sp.material.map = tex;
      sp.material.needsUpdate = true;
      sp.userData.src = canvasSpr;
    }
    sp.material.map.needsUpdate = true;
    this.usados.add(chave);
    return sp;
  },
  por(chave, spr0, wx, wz, alturaTiles, sub, sempreVisivel) {
    const canvasSpr = escala2x(spr0);
    const sp = this.sprite(canvasSpr, chave);
    const larg = canvasSpr.width / (TILE * 2), altu = canvasSpr.height / (TILE * 2);
    sp.scale.set(larg, altu, 1);
    sp.position.set(wx, 0.5 + altu / 2 - (sub || 0), wz);
    sp.visible = true;
    // NPCs de missão nunca podem sumir atrás de uma casa ou muro: desenha
    // por cima de tudo, ignorando o teste de profundidade da cena.
    sp.material.depthTest = !sempreVisivel;
    sp.renderOrder = sempreVisivel ? 10 : 0;
    sp.userData.sombra.position.set(wx, 0.505, wz);
    sp.userData.sombra.scale.setScalar(Math.max(0.6, larg));
    sp.userData.sombra.visible = true;
    return sp;
  },
  escondeNaoUsados() {
    for (const [k, sp] of this.bill) {
      if (!this.usados.has(k)) { sp.visible = false; sp.userData.sombra.visible = false; }
    }
    this.usados.clear();
  },

  camPara(wx, wz) {
    this.alvo.set(wx, 0.5, wz);
    const h = Math.sin(this.inc) * this.dist, d = Math.cos(this.inc) * this.dist;
    this.cam.position.set(wx, 0.5 + h, wz + d);
    this.cam.lookAt(this.alvo);
    this.sol.position.set(wx + 13, 15, wz + 9);
    this.sol.target.position.copy(this.alvo);
    this.sol.target.updateMatrixWorld();
  },
  aplicaZoom(f) { this.dist = f; },
  mostra(v) {
    if (this.forcado2D) v = false;
    const cvGl = document.getElementById('gl');
    if (cvGl) cvGl.style.visibility = v ? 'visible' : 'hidden';
    this.ligado = v;
  },
  desenha() { if (this.ok) this.rend.render(this.cena, this.cam); },
  // acompanha o tamanho da janela: a cena 3D roda na resolução real da tela
  redimensiona() {
    GL3.W = cv.width; GL3.H = cv.height;
    this.rend.setSize(GL3.W, GL3.H, false);
    const asp = GL3.W / GL3.H;
    if (this.cam) { this.cam.aspect = asp; this.cam.updateProjectionMatrix(); }
    if (this.camBat) { this.camBat.aspect = asp; this.camBat.updateProjectionMatrix(); }
  },
  // leva um ponto do mundo para a tela 2D, para partículas e rótulos
  // continuarem alinhados com a cena 3D
  projeta(wx, wy, wz) {
    _v3.set(wx, wy, wz).project(this.cam);
    return { x: (_v3.x * 0.5 + 0.5) * VW, y: (-_v3.y * 0.5 + 0.5) * VH, atras: _v3.z > 1 };
  }
};
const _v3 = new THREE.Vector3();

// ---------- Arena de batalha em 3D ----------
// Os combatentes continuam sendo os mesmos sprites 2D, agora billboards numa
// arena com volume. As posições 3D são obtidas desprojetando as coordenadas de
// tela que o layout 2D sempre usou, então HUD, barras, números de dano e os
// efeitos das técnicas continuam encaixando pixel a pixel.
Object.assign(R3, {
  cenaBat: null, camBat: null, arenaRegiao: null, billBat: new Map(),

  // ponto do mundo que cai numa coordenada de tela, sobre o chão da arena
  pontoNoChao(sx, sy, cam) {
    _v3.set((sx / VW) * 2 - 1, -((sy / VH) * 2 - 1), 0.5).unproject(cam);
    const dir = _v3.sub(cam.position).normalize();
    const t = (0.5 - cam.position.y) / dir.y;
    return cam.position.clone().add(dir.multiplyScalar(t));
  },
  // quantas unidades de mundo valem N pixels de altura naquele ponto
  unidadesPorPixel(pos, cam) {
    const a = pos.clone().project(cam), b2 = pos.clone().setY(pos.y + 1).project(cam);
    const dPix = Math.abs(b2.y - a.y) * 0.5 * VH;
    return dPix > 0.0001 ? 1 / dPix : 0.02;
  },

  montarArena(regiao, cave) {
    if (this.arenaRegiao === regiao) return;
    this.arenaRegiao = regiao;
    if (this.cenaBat) {
      this.cenaBat.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      this.billBat.clear();
    }
    const dusk = !cave && regiao === 'Templo Abandonado';
    const mata = !cave && (regiao === 'Bosque de Bambu' || regiao === 'Floresta de Aokigahara');
    const cena = new THREE.Scene();
    const ceu = cave ? '#1c1626' : dusk ? '#3a2848' : mata ? '#2e4a34' : '#5a92cc';
    cena.background = new THREE.Color(ceu);
    cena.fog = new THREE.Fog(ceu, 16, 44);
    const luz = new THREE.DirectionalLight(cave ? '#a488e8' : dusk ? '#e0b0d0' : '#fff0d0', cave ? 1.0 : 2.0);
    luz.position.set(7, 11, 9);
    luz.castShadow = true;
    luz.shadow.mapSize.set(2048, 2048);
    const sc = luz.shadow.camera;
    sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 40;
    sc.updateProjectionMatrix();
    luz.shadow.bias = -0.0015; luz.shadow.normalBias = 0.05;
    cena.add(luz, luz.target);
    cena.add(new THREE.HemisphereLight(cave ? '#7a6ab0' : '#cfe0ff', '#3a4a2a', cave ? 0.6 : 1.25));

    // chão da arena: um plano só, com a arte do bioma assada de uma vez.
    // Blocos lado a lado deixavam uma grade de emendas bem visível.
    const mapaFake = { name: cave ? 'cave' : 'overworld' };
    const tChao = cave ? 9 : 0;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const nx = 30, nz = 22, SSA = 2;
    const cvA = document.createElement('canvas');
    cvA.width = nx * TILE * SSA; cvA.height = nz * TILE * SSA;
    const gA = cvA.getContext('2d');
    gA.imageSmoothingEnabled = false;
    for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++)
      this.pinta(gA, tChao, x, z, mapaFake, x * TILE * SSA, z * TILE * SSA, SSA);
    const texA = new THREE.CanvasTexture(cvA);
    texA.magFilter = THREE.NearestFilter; texA.minFilter = THREE.LinearFilter;
    const chao = new THREE.Mesh(
      new THREE.PlaneGeometry(nx, nz),
      new THREE.MeshLambertMaterial({ map: texA })
    );
    chao.rotation.x = -Math.PI / 2;
    chao.position.set(-0.5, 0.5, -0.5);
    chao.receiveShadow = true;
    cena.add(chao);
    const m4 = new THREE.Matrix4();

    // cenário ao fundo com os MESMOS modelos do mundo: mata de matsu ou bambu,
    // lápides no templo, rocha bruta na caverna. Nada de bloco com PNG colado.
    const tDeco = cave ? 10 : dusk ? 20 : (regiao === 'Bosque de Bambu' ? 1 : 1);
    const vDeco = cave ? 1 : dusk ? 0 : (regiao === 'Bosque de Bambu' ? 1 : 2);
    const partes = MODELOS3[tDeco] ? MODELOS3[tDeco](vDeco) : null;
    const N = 110;
    const rr = (a2, b3) => { const h = Math.sin(a2 * 127.1 + b3 * 311.7) * 43758.5; return h - Math.floor(h); };
    // posições sorteadas nas laterais e ao fundo, longe da faixa de combate
    const pontos = [];
    for (let k = 0; k < N; k++) {
      const lado = k % 2 ? 1 : -1;
      const fundo = k % 5 === 0;
      const zz = fundo ? -nz / 2 + 1 + rr(k, 11) * 4 : -nz / 2 + 2 + rr(k, 3) * (nz - 4);
      const xx = fundo ? (rr(k, 7) - 0.5) * nx * 0.9 : lado * (7.2 + rr(k, 9) * (nx / 2 - 8));
      pontos.push([xx, zz - 4.5, 0.8 + rr(k, 5) * 0.7, rr(k, 13) * Math.PI * 2]);
    }
    if (partes) {
      const _q2 = new THREE.Quaternion(), _e2 = new THREE.Euler();
      const _p2 = new THREE.Vector3(), _s2 = new THREE.Vector3();
      for (const parte of partes) {
        const mesh = new THREE.InstancedMesh(geo3(parte.k),
          new THREE.MeshLambertMaterial({ color: parte.c, flatShading: parte.k === 'pedra' || parte.k === 'lasca' }),
          pontos.length);
        mesh.castShadow = true; mesh.receiveShadow = true;
        pontos.forEach(([px2, pz2, esc, giro], k) => {
          _e2.set(parte.r ? parte.r[0] : 0, (parte.r ? parte.r[1] : 0) + giro, parte.r ? parte.r[2] : 0);
          _q2.setFromEuler(_e2);
          _p2.set(px2 + parte.p[0] * esc, 0.5 + parte.p[1] * esc, pz2 + parte.p[2] * esc);
          _s2.set(parte.s[0] * esc, parte.s[1] * esc, parte.s[2] * esc);
          m4.compose(_p2, _q2, _s2);
          mesh.setMatrixAt(k, m4);
        });
        mesh.instanceMatrix.needsUpdate = true;
        cena.add(mesh);
      }
    }
    // pedras soltas espalhando o chão da arena
    const pedras = MODELOS3[23](1);
    for (const parte of pedras) {
      const mesh = new THREE.InstancedMesh(geo3(parte.k),
        new THREE.MeshLambertMaterial({ color: parte.c, flatShading: true }), 26);
      mesh.castShadow = true; mesh.receiveShadow = true;
      for (let k = 0; k < 26; k++) {
        const px2 = (rr(k, 21) - 0.5) * nx * 0.85;
        const pz2 = -nz / 2 + 3 + rr(k, 23) * (nz - 6) - 4.5;
        const esc = 0.6 + rr(k, 27) * 0.7;
        m4.makeScale(parte.s[0] * esc, parte.s[1] * esc, parte.s[2] * esc);
        m4.setPosition(px2 + parte.p[0] * esc, 0.5 + parte.p[1] * esc, pz2 + parte.p[2] * esc);
        mesh.setMatrixAt(k, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
      cena.add(mesh);
    }

    this.cenaBat = cena;
    // câmera baixa, quase à altura dos lutadores, para a arena ter profundidade
    this.camBat = new THREE.PerspectiveCamera(34, GL3.W / GL3.H, 0.5, 120);
    this.camBat.position.set(0, 4.4, 12.5);
    this.camBat.lookAt(0, 1.5, 0);
    this.camBat.updateMatrixWorld();
  },

  // um billboard da arena, com sombra no chão
  billB(chave, canvasSpr) {
    let sp = this.billBat.get(chave);
    if (!sp || sp.userData.src !== canvasSpr) {
      if (sp) { sp.material.map.dispose(); this.cenaBat.remove(sp); this.cenaBat.remove(sp.userData.sombra); }
      const tex = new THREE.CanvasTexture(canvasSpr);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.3, fog: true }));
      sp.userData.src = canvasSpr;
      const som = new THREE.Mesh(new THREE.CircleGeometry(1, 14),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
      som.rotation.x = -Math.PI / 2;
      sp.userData.sombra = som;
      this.cenaBat.add(sp, som);
      this.billBat.set(chave, sp);
    }
    sp.material.map.needsUpdate = true;
    return sp;
  },

  // posiciona um combatente pela coordenada de tela que o layout 2D usa
  poeCombatente(chave, spr0, telaX, telaBaseY, alturaPx, opacidade) {
    const canvasSpr = escala4x(spr0);   // o sprite ocupa muita tela na batalha
    const cam = this.camBat;
    const chao = this.pontoNoChao(telaX, telaBaseY, cam);
    const upp = this.unidadesPorPixel(chao, cam);
    const altW = alturaPx * upp;
    const largW = altW * (canvasSpr.width / canvasSpr.height);
    const sp = this.billB(chave, canvasSpr);
    sp.scale.set(largW, altW, 1);
    sp.position.set(chao.x, chao.y + altW / 2, chao.z);
    sp.material.opacity = opacidade === undefined ? 1 : opacidade;
    sp.visible = true;
    sp.userData.sombra.position.set(chao.x, chao.y + 0.012, chao.z);
    sp.userData.sombra.scale.setScalar(Math.max(0.5, largW * 0.42));
    sp.userData.sombra.visible = true;
    return sp;
  },
  desenhaBat() { if (this.ok && this.cenaBat) this.rend.render(this.cenaBat, this.camBat); }
});

let _bidSeq = 0;
// Desenha o mundo pela cena 3D. A camada 2D fica transparente e só recebe
// HUD, rótulos e partículas — que são projetados pela câmera 3D.
function desenhaMundo3D(m) {
  ctx.clearRect(0, 0, VW, VH);
  if (R3.mapaNome !== m.name) { R3.montarMapa(m); R3.regiaoAtual = null; }
  if (R3.regiaoAtual !== G.region) { R3.regiaoAtual = G.region; R3.ambiente(m); }

  const hx = P.x / TILE, hz = P.y / TILE;
  const respira = P.moving ? 0 : Math.sin(G.time * 2.2) * 0.03;
  R3.por('P', heroSprite(curClass(), P.dir, P.frame), hx, hz + 0.2, 0, -respira);

  if (P.activePet && G.petX !== undefined) {
    R3.por('pet', petSprite(P.activePet), G.petX / TILE, G.petY / TILE + 0.2, 0,
      -Math.abs(Math.sin(G.time * 4)) * 0.06);
  }
  for (const n of (G.npcs || [])) {
    if (Math.hypot(n.x - P.x, n.y - P.y) > TILE * 24) continue;
    R3.por('n_' + n.id, npcSprite(n, n.dir, n.frame), n.x / TILE, n.y / TILE + 0.2, 0, 0, n.tipo === 'quest');
  }
  for (const e of G.entities) {
    if (e._bid === undefined) e._bid = 'e' + (++_bidSeq);
    if (Math.hypot(e.x - P.x, e.y - P.y) > TILE * 24) continue;
    const flut = e.type === 'morcego' ? Math.sin(e.animT * 6) * 0.12
      : e.isBoss ? 0.2 + Math.sin(e.animT * 2) * 0.08 : 0;
    R3.por(e._bid, enemySprite(e.type), e.x / TILE, e.y / TILE + 0.2, 0, -flut);
  }
  R3.escondeNaoUsados();
  R3.culling(hx, hz);
  // câmera segue o jogador, mas não passa da borda do mapa: sem isso, perto
  // da borda a câmera mostrava o vazio além do terreno gerado. A margem
  // nunca passa de metade do mapa, senão mapas pequenos (a caverna) travariam
  // a câmera num ponto fixo.
  const camMX = Math.min(20, m.w / 2 - 1), camMZ = Math.min(20, m.h / 2 - 1);
  const camHx = clamp(hx, camMX, m.w - camMX), camHz = clamp(hz, camMZ, m.h - camMZ);
  R3.camPara(camHx, camHz + 0.2);
  R3.desenha();

  // marcador acima dos NPCs: missão nova, missão pronta, mascate
  for (const n of (G.npcs || [])) {
    const d = Math.hypot(n.x - P.x, n.y - P.y);
    if (d > TILE * 7) continue;
    const q = R3.projeta(n.x / TILE, 1.95, n.y / TILE + 0.2);
    if (q.atras) continue;
    desenhaMarcaNPC(n, q.x, q.y, d);
  }
  // rótulos de nível e alerta, projetados por cima dos youkai — e, se o
  // mouse estiver em cima de um deles, o nome (qual youkai é qual não era
  // óbvio só pelo nível/cor)
  let hoverE = null, hoverQ = null, hoverD = 12;
  for (const e of G.entities) {
    const dist = Math.hypot(e.x - P.x, e.y - P.y);
    if (dist >= TILE * 5.5) continue;
    const q = R3.projeta(e.x / TILE, 1.9, e.y / TILE + 0.2);
    if (q.atras) continue;
    const alerta = dist < TILE * 4.5;
    ctx.globalAlpha = alerta ? 1 : 0.65;
    ctx.fillStyle = e.lvl > P.lvl + 1 ? '#ff6a5a' : (e.lvl < P.lvl ? '#8a8a9a' : '#e8e060');
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Nv' + e.lvl, Math.round(q.x), Math.round(q.y));
    if (alerta) {
      ctx.fillStyle = '#ff5a5a';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('!', Math.round(q.x) + 12, Math.round(q.y) + Math.round(Math.sin(G.time * 8)));
    }
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
    if (G.mouse) {
      const dm = Math.hypot(G.mouse.x - q.x, G.mouse.y - (q.y + 8));
      if (dm < hoverD) { hoverD = dm; hoverE = e; hoverQ = q; }
    }
  }
  if (hoverE) {
    const nome = ENEMIES[hoverE.type].name;
    ctx.font = '7px monospace';
    const w = ctx.measureText(nome).width + 8;
    const tx = clamp(hoverQ.x - w / 2, 2, VW - w - 2), ty = clamp(hoverQ.y - 20, 2, VH - 12);
    ctx.fillStyle = 'rgba(12,10,20,0.9)';
    ctx.fillRect(tx, ty, w, 10);
    ctx.strokeStyle = hoverE.isBoss ? '#ffa726' : '#5a4a8a';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx + 0.5, ty + 0.5, w - 1, 9);
    ctx.fillStyle = hoverE.isBoss ? '#ffa726' : '#f0e8f8';
    ctx.fillText(nome, tx + 4, ty + 7);
  }
}
