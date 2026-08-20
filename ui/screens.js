'use strict';
/* ============================================================
   ui/screens.js — telas de menu (título, pausa/equipamento, criação
   de personagem, aprender técnica, game over, vitória, diálogo,
   confirmação genérica) e sistema de pesca completo
   Extraído de index.html (nona e provavelmente última extração
   estrutural planejada com o Graphify, após render/tiles.js,
   economy/shop.js, quests/quests.js, craft/altar.js,
   sprites/sprites.js, battle/battle.js, render3d/render3d.js e
   world/world.js). Script clássico (não é módulo ES) — compartilha o
   mesmo escopo léxico global de index.html via <script src>. Depende
   por nome (sem import) de: G, P, EQUIP, ENEMIES, ITEMS, MATS, RARITY,
   ctx, VW, VH, TILE, AU, saveGame(), loadGame(), toast(), showMsg(),
   fadeTo(), gainXP(), eff(), drawWorld(), regionAt(), heroSprite(),
   composeSprite(), petSprite() — todos continuam definidos em
   index.html ou nos módulos já extraídos e acessíveis por nome sem
   export. desenhaPersonagens2D()/drawWorld()/drawWorldHUD() (desenho
   direto do mundo, chamados por frame()) ficaram em index.html por
   não serem telas de menu.
   ============================================================ */

// ---------- Pesca ----------
const VARAS = {
  junco:    { nome: 'Vara de Junco',    preco: 0,   tier: 0, janela: 0.85, desc: 'Simples, pega o comum' },
  bambu:    { nome: 'Vara de Bambu',    preco: 60,  tier: 2, janela: 0.95, desc: 'Alcança peixe incomum e raro' },
  laqueada: { nome: 'Vara Laqueada',    preco: 220, tier: 3, janela: 1.1,  desc: 'Aguenta até o épico' },
  espirito: { nome: 'Vara do Espírito', preco: 650, tier: 4, janela: 1.3,  desc: 'A única que fisga o lendário' }
};
const VARA_ORDEM = ['junco', 'bambu', 'laqueada', 'espirito'];
// pesos por raridade, no mesmo espírito da tabela RARITY de equipamentos
const PEIXES = {
  tanago:  { nome: 'Tanago-de-lago',      rar: 'comum',    kg: [0.05, 0.2], preco: 4 },
  funa:    { nome: 'Funa Prateada',       rar: 'comum',    kg: [0.3, 1.2],  preco: 6 },
  ayu:     { nome: 'Ayu-doce',            rar: 'incomum',  kg: [0.2, 0.5],  preco: 14 },
  namazu:  { nome: 'Namazu Jovem',        rar: 'incomum',  kg: [1.0, 3.0],  preco: 18 },
  koi:     { nome: 'Carpa Koi Sagrada',   rar: 'raro',     kg: [1.5, 4.0],  preco: 55 },
  unagi:   { nome: 'Enguia Real',         rar: 'raro',     kg: [1.0, 3.0],  preco: 60 },
  kappaio: { nome: 'Peixe-Kappa',         rar: 'epico',    kg: [2.0, 5.0],  preco: 160 },
  iwana:   { nome: 'Iwana-das-Cavernas',  rar: 'epico',    kg: [1.5, 3.5],  preco: 150 },
  ryugoi:  { nome: 'Carpa-Dragão',        rar: 'lendario', kg: [4.0, 9.0],  preco: 520 }
};
function pesoMedio(sp) { const p = PEIXES[sp]; return (p.kg[0] + p.kg[1]) / 2; }
function precoPeixe(peixe) {
  const p = PEIXES[peixe.sp];
  return Math.max(1, Math.round(p.preco * (peixe.kg / pesoMedio(peixe.sp))));
}
function varaAtual() { return VARAS[P.vara || 'junco']; }

// ---------- Ação de pescar ----------
// Z de frente pra água lança a linha. Depois de uma espera aleatória, o peixe
// belisca (fase 'fisgada') e um segundo Z dentro da janela da vara fisga.
function iniciaPesca() {
  if (G.pesca && G.pesca.fase) return;
  G.pesca = { fase: 'espera', t: 0, espera: rnd(0.8, 2.2) };
  G.state = 'pescando';
  AU.sfx('menu');
}
function updatePesca(dt) {
  const p = G.pesca;
  if (!p) return;
  p.t += dt;
  if (p.fase === 'espera') {
    if (tap('back')) { G.pesca = null; G.state = 'world'; AU.sfx('back'); return; }
    if (p.t >= p.espera) { p.fase = 'fisgada'; p.t = 0; AU.sfx('level'); }
    return;
  }
  if (p.fase === 'fisgada') {
    if (tap('ok')) {
      const peixe = rollPeixe(varaAtual().tier);
      if (P.peixes.length >= 30) { P.gold += Math.round(precoPeixe(peixe) * 0.5); toast('Cesto cheio: +' + Math.round(precoPeixe(peixe) * 0.5) + ' ouro'); }
      else P.peixes.push(peixe);
      AU.sfx('victory');
      addFloater(P.x + 8, P.y - 4, '+' + PEIXES[peixe.sp].nome, RARITY[PEIXES[peixe.sp].rar].color);
      burst(P.x + 8, P.y + 4, 20, { color: ['#8ec6f0', '#c6e2f8', RARITY[PEIXES[peixe.sp].rar].color], spdMax: 60, lifeMax: 0.9, size: 2, lift: 40, g: 60 });
      G.pesca = null; G.state = 'world';
      saveGame();
      return;
    }
    if (p.t >= varaAtual().janela) {
      toast('O peixe fugiu...');
      AU.sfx('back');
      G.pesca = null; G.state = 'world';
    }
  }
}
function drawPesca() {
  drawWorld(true);
  const p = G.pesca;
  if (!p) return;
  const cx = VW / 2, cy = VH / 2 - 26;
  if (p.fase === 'espera') {
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a89ac0';
    ctx.fillText('aguardando...', cx, cy);
    ctx.textAlign = 'left';
  } else {
    ctx.textAlign = 'center';
    const pulso = 1 + Math.sin(G.time * 16) * 0.15;
    ctx.font = 'bold ' + Math.round(14 * pulso) + 'px monospace';
    ctx.fillStyle = '#ffd94e';
    ctx.fillText('!', cx, cy);
    const jan = varaAtual().janela;
    const bw = 60;
    ctx.fillStyle = '#0e0c16';
    ctx.fillRect(cx - bw / 2 - 1, cy + 6, bw + 2, 5);
    ctx.fillStyle = '#6ee8c0';
    ctx.fillRect(cx - bw / 2, cy + 7, Math.max(0, bw * (1 - p.t / jan)), 3);
    ctx.font = '7px monospace';
    ctx.fillStyle = '#e8e0f0';
    ctx.fillText('Z para fisgar!', cx, cy + 20);
    ctx.textAlign = 'left';
  }
}

// ---------- Peixaria: comprar vara, vender a pesca ----------
function drawPeixaria() {
  drawWorld(true);
  ctx.fillStyle = 'rgba(8,6,16,0.82)';
  ctx.fillRect(0, 0, VW, VH);
  const x = 34, y = 14, w = VW - 68, h = VH - 30;
  ctx.fillStyle = 'rgba(18,26,34,0.97)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#4a8aa0';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#6ee8c0';
  ctx.fillText('PEIXARIA DE ' + (G.pescaNPC ? G.pescaNPC.nome.toUpperCase() : ''), x + 10, y + 13);
  ['Varas', 'Vender'].forEach((t, i) => {
    ctx.font = '7px monospace';
    ctx.fillStyle = G.pescaTab === i ? '#ffd94e' : '#705a80';
    ctx.fillText(G.pescaTab === i ? '[' + t + ']' : ' ' + t, x + 120 + i * 40, y + 13);
  });
  ctx.font = '7px monospace';
  ctx.fillStyle = '#e8e0f0';
  ctx.fillText('Seu ouro: $' + P.gold, x + 10, y + 24);

  if (G.pescaTab === 0) {
    VARA_ORDEM.forEach((id, i) => {
      const v = VARAS[id], oy = y + 40 + i * 16;
      const sel = i === G.pescaIdx;
      const tem = P.varas.includes(id);
      const equipada = P.vara === id;
      if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 6, oy); }
      ctx.fillStyle = sel ? '#fff' : (tem ? '#a89ac0' : (P.gold >= v.preco ? '#e8e0f0' : '#705a70'));
      ctx.fillText(v.nome, x + 14, oy);
      ctx.fillStyle = tem ? '#6ee86e' : (P.gold >= v.preco ? '#ffd94e' : '#705a70');
      ctx.fillText(tem ? (equipada ? 'equipada' : 'obtida') : '$' + v.preco, x + 120, oy);
      ctx.fillStyle = '#705a90';
      ctx.fillText(v.desc, x + 14, oy + 8);
    });
    ctx.fillStyle = '#6a5a8a';
    ctx.fillText('Z compra/equipa · ◀▶ aba · X sair', x + 10, y + h - 7);
  } else {
    if (!P.peixes.length) {
      ctx.fillStyle = '#705a80';
      ctx.fillText('Cesto vazio. Volte com a pesca do dia.', x + 10, y + 40);
    }
    const maxShow = 6;
    const first = clamp(G.pescaIdx - 3, 0, Math.max(0, P.peixes.length - maxShow));
    P.peixes.slice(first, first + maxShow).forEach((pz, j) => {
      const i = first + j, oy = y + 38 + j * 11;
      const sel = i === G.pescaIdx;
      const sp = PEIXES[pz.sp];
      if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 6, oy); }
      ctx.fillStyle = sel ? '#fff' : RARITY[sp.rar].color;
      ctx.fillText(sp.nome + ' (' + pz.kg + 'kg)', x + 14, oy);
      ctx.fillStyle = '#ffd94e';
      ctx.fillText('$' + precoPeixe(pz), x + 158, oy);
    });
    if (P.peixes.length) {
      const total = P.peixes.reduce((a, pz) => a + precoPeixe(pz), 0);
      ctx.fillStyle = '#6ee8c0';
      ctx.fillText('T vende tudo por $' + total, x + 10, y + h - 16);
    }
    ctx.fillStyle = '#6a5a8a';
    ctx.fillText('Z vende um · ◀▶ aba · X sair', x + 10, y + h - 7);
  }
}
function updatePeixaria() {
  if (tap('left') || tap('right')) { G.pescaTab = G.pescaTab ? 0 : 1; G.pescaIdx = 0; AU.sfx('menu'); }
  const n = G.pescaTab === 0 ? VARA_ORDEM.length : Math.max(1, P.peixes.length);
  if (tap('up')) { G.pescaIdx = (G.pescaIdx + n - 1) % n; AU.sfx('menu'); }
  if (tap('down')) { G.pescaIdx = (G.pescaIdx + 1) % n; AU.sfx('menu'); }
  if (tap('ok')) {
    if (G.pescaTab === 0) {
      const id = VARA_ORDEM[G.pescaIdx];
      if (P.varas.includes(id)) { P.vara = id; AU.sfx('ok'); toast(VARAS[id].nome + ' equipada'); saveGame(); }
      else if (comprarVara(id)) toast('Comprou ' + VARAS[id].nome);
      else AU.sfx('back');
    } else if (P.peixes[G.pescaIdx]) {
      P.gold += precoPeixe(P.peixes[G.pescaIdx]);
      P.peixes.splice(G.pescaIdx, 1);
      G.pescaIdx = Math.max(0, Math.min(G.pescaIdx, P.peixes.length - 1));
      AU.sfx('coin');
      saveGame();
    } else AU.sfx('back');
  }
  // T vende toda a pesca de uma vez
  if (tap('vendertudo')) {
    if (G.pescaTab === 1 && P.peixes.length) {
      const total = P.peixes.reduce((a, pz) => a + precoPeixe(pz), 0);
      P.gold += total; P.peixes.length = 0; G.pescaIdx = 0;
      AU.sfx('coin'); toast('+' + total + ' ouro'); saveGame();
    }
  }
  if (tap('back')) { G.state = 'world'; G.pescaIdx = 0; AU.sfx('back'); }
}

// ---------- Mapa interativo ----------
// Painel fixo em coordenadas lógicas (VW×VH) — o mesmo em qualquer resolução
// de tela, já que todo o jogo desenha nesse espaço lógico via transform.
const MAPA_X = 10, MAPA_Y = 20, MAPA_W = 190, MAPA_H = 127;
const MAPA_S = MAPA_W / 192;
const LAGOS = [
  { nome: 'Lagoa Central', x: 69, y: 76, r: 8 },
  { nome: 'Lago do Planalto', x: 32, y: 36, r: 7 },
  { nome: 'Lago dos Arrozais', x: 90, y: 112, r: 7 }
];
// nível recomendado, mobs e chefe de cada região — a mesma curva de
// dificuldade documentada no jogo, só que consultável no mapa
const REGIAO_INFO = {
  'Vila Sakuramura':       { seguro: true },
  'Vila Iwamura':          { seguro: true },
  'Campos de Arroz':       { nivel: [1, 2], mobs: ['slime', 'morcego', 'goblin'] },
  'Bosque de Bambu':       { nivel: [3, 5], mobs: ['lobo', 'aranha', 'goblin'], boss: 'reislime' },
  'Planalto do Norte':     { nivel: [4, 6], mobs: ['lobo', 'esqueleto', 'harpia'] },
  'Floresta de Aokigahara':{ nivel: [5, 7], mobs: ['esqueleto', 'aranha', 'harpia'] },
  'Templo Abandonado':     { nivel: [6, 8], mobs: ['zumbi', 'fantasma', 'esqueleto'], boss: 'necromante' },
  'Caverna de Orochi':     { nivel: [7, 9], mobs: ['orc', 'golem', 'elemental', 'fantasma'], boss: 'dragao' }
};
const REGIAO_COR = {
  'Vila Sakuramura': '#c98a5a', 'Vila Iwamura': '#a89a6a',
  'Campos de Arroz': '#7aa050', 'Bosque de Bambu': '#4a8a4e',
  'Planalto do Norte': '#7a8aa0', 'Floresta de Aokigahara': '#2e6a38',
  'Templo Abandonado': '#6a5a8a', 'Caverna de Orochi': '#4a4458'
};
// ícone especial no mapa: entrada da caverna, perto do torii norte
const CAVERNA_PONTO = { x: 96, y: 19 };
const BOSS_PONTO = { reislime: [28, 74], necromante: [164, 110], dragao: [48, 10] };

// itensRarosDaRegiao/infoDaRegiao extraídos para economy/shop.js.

// converte um ponto do MAPA (coordenadas lógicas VW×VH) em que está por cima:
// nome de região, lago ou marco especial. Usado tanto pelo mouse real quanto
// pelos testes, que passam a coordenada diretamente.
function regiaoNoMapa(lx, ly) {
  const tx = (lx - MAPA_X) / MAPA_S, ty = (ly - MAPA_Y) / MAPA_S;
  if (tx < 0 || ty < 0 || tx >= 192 || ty >= 128) return null;
  for (const lago of LAGOS) if (Math.hypot(tx - lago.x, ty - lago.y) < lago.r + 1.2) return { tipo: 'lago', nome: lago.nome };
  if (Math.hypot(tx - CAVERNA_PONTO.x, ty - CAVERNA_PONTO.y) < 4.8) return { tipo: 'regiao', nome: 'Caverna de Orochi' };
  const r = regionAt(Math.floor(tx), Math.floor(ty));
  return r ? { tipo: 'regiao', nome: r } : null;
}

function drawMapa() {
  ctx.fillStyle = 'rgba(6,4,12,0.92)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = 'rgba(18,14,28,0.98)';
  ctx.fillRect(4, 4, VW - 8, VH - 8);
  ctx.strokeStyle = '#5a4a8a';
  ctx.lineWidth = 1;
  ctx.strokeRect(4.5, 4.5, VW - 9, VH - 9);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#ffd94e';
  ctx.fillText('MAPA DE FORGED LEGEND', 10, 14);

  // regiões
  for (const r of REGIONS) {
    const px = MAPA_X + r.x1 * MAPA_S, py = MAPA_Y + r.y1 * MAPA_S;
    const pw = (r.x2 - r.x1 + 1) * MAPA_S, ph = (r.y2 - r.y1 + 1) * MAPA_S;
    const hover = G.mapaHover && G.mapaHover.tipo === 'regiao' && G.mapaHover.nome === r.name;
    ctx.globalAlpha = hover ? 0.55 : 0.32;
    ctx.fillStyle = REGIAO_COR[r.name] || '#5a5a6a';
    ctx.fillRect(px, py, pw, ph);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hover ? '#ffd94e' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = hover ? 1.4 : 0.6;
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
  }
  ctx.lineWidth = 1;
  // lagos
  for (const lago of LAGOS) {
    const hover = G.mapaHover && G.mapaHover.tipo === 'lago' && G.mapaHover.nome === lago.nome;
    ctx.fillStyle = hover ? '#8ec6f0' : '#3a6a9a';
    ctx.beginPath();
    ctx.arc(MAPA_X + lago.x * MAPA_S, MAPA_Y + lago.y * MAPA_S, Math.max(2.5, lago.r * MAPA_S * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  // entrada da caverna e chefes
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c8c8d8';
  ctx.fillText('⛰', MAPA_X + CAVERNA_PONTO.x * MAPA_S, MAPA_Y + CAVERNA_PONTO.y * MAPA_S + 3);
  for (const [id, [bx, by]] of Object.entries(BOSS_PONTO)) {
    ctx.fillStyle = G.flags[id] ? '#4a4458' : '#e05050';
    ctx.fillText('☠', MAPA_X + bx * MAPA_S, MAPA_Y + by * MAPA_S + 3);
  }
  // jogador
  if (G.map && G.map.name === 'overworld') {
    ctx.fillStyle = '#ffd94e';
    ctx.beginPath();
    ctx.arc(MAPA_X + (P.x / TILE) * MAPA_S, MAPA_Y + (P.y / TILE) * MAPA_S, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#5a4a8a';
  ctx.strokeRect(MAPA_X + 0.5, MAPA_Y + 0.5, MAPA_W - 1, MAPA_H - 1);

  // painel de informação à direita
  const ix = MAPA_X + MAPA_W + 8, iw = VW - ix - 8;
  ctx.fillStyle = 'rgba(10,8,18,0.7)';
  ctx.fillRect(ix, MAPA_Y, iw, MAPA_H);
  ctx.strokeStyle = '#3a2f52';
  ctx.strokeRect(ix + 0.5, MAPA_Y + 0.5, iw - 1, MAPA_H - 1);
  const hov = G.mapaHover;
  ctx.font = '7px monospace';
  if (!hov) {
    ctx.fillStyle = '#705a80';
    ctx.fillText('Passe o mouse pelo mapa', ix + 6, MAPA_Y + 18);
    ctx.fillText('para ver cada região.', ix + 6, MAPA_Y + 28);
  } else if (hov.tipo === 'lago') {
    ctx.fillStyle = '#8ec6f0';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(hov.nome, ix + 6, MAPA_Y + 16);
    ctx.font = '7px monospace';
    ctx.fillStyle = '#a89ac0';
    ctx.fillText('Dá para pescar aqui.', ix + 6, MAPA_Y + 28);
    ctx.fillText('Encare a água e Z.', ix + 6, MAPA_Y + 37);
  } else {
    const info = infoDaRegiao(hov.nome);
    ctx.fillStyle = '#ffd94e';
    ctx.font = 'bold 8px monospace';
    let dy = MAPA_Y + 16;
    (info.nome.length > 20 ? [info.nome.slice(0, 18) + '-', info.nome.slice(18)] : [info.nome]).forEach(l => {
      ctx.fillText(l, ix + 6, dy); dy += 9;
    });
    ctx.font = '7px monospace';
    if (info.seguro) {
      ctx.fillStyle = '#6ee86e';
      ctx.fillText('Zona segura', ix + 6, dy + 2);
    } else {
      dy += 2;
      ctx.fillStyle = '#a89ac0';
      ctx.fillText('Nível recomendado: ' + info.nivel[0] + '–' + info.nivel[1], ix + 6, dy); dy += 10;
      ctx.fillStyle = '#8a7ab0';
      ctx.fillText('Youkai:', ix + 6, dy); dy += 9;
      ctx.fillStyle = '#c8c0dc';
      info.mobs.forEach(m => { ctx.fillText('· ' + m, ix + 10, dy); dy += 8; });
      if (info.boss) {
        dy += 2;
        ctx.fillStyle = '#e05050';
        ctx.fillText('☠ Chefe: ' + info.boss, ix + 6, dy); dy += 10;
      } else dy += 4;
      ctx.fillStyle = '#8a7ab0';
      ctx.fillText('Itens raros aqui:', ix + 6, dy); dy += 9;
      info.raros.forEach(it => {
        ctx.fillStyle = RARITY[it.rar].color;
        const nome = it.name.length > 20 ? it.name.slice(0, 19) + '…' : it.name;
        ctx.fillText('· ' + nome, ix + 10, dy); dy += 8;
      });
    }
  }
  ctx.fillStyle = '#6a5a8a';
  ctx.fillText('M ou X fecha o mapa', 10, VH - 8);
}
function updateMapa() {
  if (G.mouse) G.mapaHover = regiaoNoMapa(G.mouse.x, G.mouse.y);
  if (tap('back') || tap('mapa')) { G.state = 'world'; AU.sfx('back'); }
}
// mouse: só importa fora do jogo em si, então o listener fica global e barato
let _cvRect = null;
window.addEventListener('mousemove', e => {
  if (!cv) return;
  if (!_cvRect || G.time % 1 < 0.02) _cvRect = cv.getBoundingClientRect();
  const rx = (e.clientX - _cvRect.left) / _cvRect.width * VW;
  const ry = (e.clientY - _cvRect.top) / _cvRect.height * VH;
  G.mouse = { x: rx, y: ry };
});

// ---------- Telas: título, classes, menus ----------
// ---------- Tela inicial ----------
// Desenhada ao vivo em resolução cheia: as curvas das serras, o disco solar e
// as flores saem suaves, e não ampliados a partir de um buffer pequeno.
const HORIZ = 138;                     // linha do horizonte
function serra(g, base, alt, xc, cor, comNeve) {
  g.fillStyle = cor;
  g.beginPath();
  g.moveTo(xc - alt * 2.0, base);
  g.bezierCurveTo(xc - alt * 0.9, base - alt * 0.5, xc - alt * 0.34, base - alt * 0.92, xc, base - alt);
  g.bezierCurveTo(xc + alt * 0.34, base - alt * 0.92, xc + alt * 0.9, base - alt * 0.5, xc + alt * 2.0, base);
  g.closePath();
  g.fill();
  if (!comNeve) return;
  // a neve é recortada DENTRO do contorno da montanha, então nunca descola
  g.save();
  g.clip();
  g.fillStyle = comNeve;
  g.beginPath();
  g.moveTo(xc - alt, base - alt * 0.83);
  const dentes = [[-.42, .855], [-.33, .825], [-.24, .875], [-.15, .84], [-.05, .885],
                  [.05, .845], [.15, .88], [.25, .835], [.34, .87], [.43, .84]];
  for (const [dx, dy] of dentes) g.lineTo(xc + alt * dx, base - alt * dy);
  g.lineTo(xc + alt, base - alt * 0.83);
  g.lineTo(xc + alt, base - alt * 1.2);
  g.lineTo(xc - alt, base - alt * 1.2);
  g.closePath();
  g.fill();
  g.restore();
}
function flor(g, x, y, r, cor, miolo) {
  g.fillStyle = cor;
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 0.4 - 0.4;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.52, r * 0.46, a, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = miolo;
  g.beginPath(); g.arc(x, y, r * 0.28, 0, Math.PI * 2); g.fill();
}
// posições das flores do ramo, sorteadas uma vez só
let ramoFlores = null;
function montaRamo() {
  if (ramoFlores) return ramoFlores;
  const r = seeded(20240815);
  const out = [];
  const cachos = [[6, 8], [22, 13], [38, 16], [54, 17], [70, 15], [86, 12], [102, 9], [26, 27], [58, 31], [72, 25], [104, 24]];
  for (const [cx, cy] of cachos) {
    const n = 5 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      out.push({
        x: cx + (r() - 0.5) * 13, y: cy + (r() - 0.5) * 11,
        r: 1.5 + r() * 1.4, t: r() * 6.28,
        c: ['#f7b3c6', '#ffd6e2', '#e88fa8', '#ffc2d4'][Math.floor(r() * 4)]
      });
    }
  }
  ramoFlores = out;
  return out;
}
function drawTitle() {
  const g = ctx;
  // ---- céu
  const sky = g.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, '#0b0a1c');
  sky.addColorStop(0.34, '#241a44');
  sky.addColorStop(0.62, '#5a3358');
  sky.addColorStop(0.80, '#a85a52');
  sky.addColorStop(1, '#e09a5a');
  g.fillStyle = sky;
  g.fillRect(0, 0, VW, VH);

  // ---- estrelas: só no céu, sumindo perto do horizonte
  for (let i = 0; i < 70; i++) {
    const sx = (i * 71.3) % VW, sy = (i * 37.7) % (HORIZ - 26);
    const cintila = Math.sin(G.time * 1.7 + i * 1.3) * 0.5 + 0.5;
    const perto = 1 - sy / (HORIZ - 20);
    g.globalAlpha = (0.14 + cintila * 0.5) * perto;
    g.fillStyle = i % 7 === 0 ? '#ffe8c0' : '#fffaf0';
    const t2 = 0.5 + (i % 3) * 0.25;
    g.fillRect(sx, sy, t2, t2);
  }
  g.globalAlpha = 1;

  // ---- disco solar com halo
  const cx = 246, cy = 118;
  const halo = g.createRadialGradient(cx, cy, 6, cx, cy, 66);
  halo.addColorStop(0, 'rgba(255,190,120,0.5)');
  halo.addColorStop(0.5, 'rgba(255,160,100,0.18)');
  halo.addColorStop(1, 'rgba(255,150,90,0)');
  g.fillStyle = halo;
  g.fillRect(cx - 66, cy - 66, 132, 132);
  const disco = g.createRadialGradient(cx, cy - 6, 2, cx, cy, 24);
  disco.addColorStop(0, '#fff2d8');
  disco.addColorStop(0.7, '#ffd8a0');
  disco.addColorStop(1, '#ffbe80');
  g.fillStyle = disco;
  g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.fill();

  // ---- faixas de nuvem: bordas suaves, deslizando devagar
  for (let i = 0; i < 3; i++) {
    const fy = 100 + i * 13 + Math.sin(G.time * 0.2 + i) * 1.5;
    const desl = ((G.time * (2.5 + i)) % (VW * 2)) - VW * 0.5;
    const gr = g.createLinearGradient(desl - 90, 0, desl + 90, 0);
    gr.addColorStop(0, 'rgba(58,28,54,0)');
    gr.addColorStop(0.5, 'rgba(58,28,54,' + (0.34 - i * 0.07) + ')');
    gr.addColorStop(1, 'rgba(58,28,54,0)');
    g.fillStyle = gr;
    g.fillRect(desl - 90, fy, 180, 2.5 + i * 0.6);
  }

  // ---- serras: três planos, mais claros ao fundo
  serra(g, 136, 15, 16, '#6a4468');
  serra(g, 136, 19, 172, '#6a4468');
  serra(g, 138, 43, 88, '#4a2e56', '#cdbcd6');     // Fuji
  serra(g, 146, 21, 216, '#38224a');
  serra(g, 148, 16, 292, '#38224a');

  // colina do meio
  g.fillStyle = '#2a1838';
  g.beginPath();
  g.moveTo(0, 152);
  for (let x = 0; x <= VW; x += 4) g.lineTo(x, 150 - Math.sin(x * 0.031) * 7 - Math.sin(x * 0.11) * 2);
  g.lineTo(VW, VH); g.lineTo(0, VH); g.closePath(); g.fill();

  // pagode
  g.fillStyle = '#160c22';
  for (let i = 0; i < 5; i++) {
    const w2 = 16 - i * 2, y2 = 150 - i * 7;
    g.fillRect(272 - w2 / 2 + 1.5, y2 - 5, w2 - 3, 5);
    g.beginPath();
    g.moveTo(272 - w2 / 2 - 2, y2);
    g.quadraticCurveTo(272 - w2 / 2 + 1, y2 - 3.4, 272 - w2 / 2 + 2, y2 - 3);
    g.lineTo(272 + w2 / 2 - 2, y2 - 3);
    g.quadraticCurveTo(272 + w2 / 2 - 1, y2 - 3.4, 272 + w2 / 2 + 2, y2);
    g.closePath(); g.fill();
  }
  g.fillRect(271.5, 110, 1, 7);

  // colina da frente
  g.fillStyle = '#100a1c';
  g.beginPath();
  g.moveTo(0, 166);
  for (let x = 0; x <= VW; x += 4) g.lineTo(x, 164 - Math.sin(x * 0.045 + 2) * 6);
  g.lineTo(VW, VH); g.lineTo(0, VH); g.closePath(); g.fill();

  // torii
  g.fillStyle = '#1c0a16';
  g.fillRect(37, 122, 5, 46);
  g.fillRect(70, 122, 5, 46);
  g.fillRect(41, 132, 30, 3);
  g.fillRect(56, 122, 4, 12);
  g.beginPath();
  g.moveTo(32, 122); g.quadraticCurveTo(56, 116, 80, 122);
  g.lineTo(80, 126); g.quadraticCurveTo(56, 120.5, 32, 126);
  g.closePath(); g.fill();
  g.fillRect(35, 126, 42, 3.4);

  // lanternas de pedra
  for (const [lx, ly] of [[104, 172], [126, 170], [146, 169]]) {
    g.fillStyle = '#140c1e';
    g.fillRect(lx - 1, ly - 6, 3, 6);
    g.fillRect(lx - 3.5, ly - 10.5, 8, 4.5);
    g.beginPath();
    g.moveTo(lx - 5, ly - 10.5); g.lineTo(lx - 1, ly - 13.5);
    g.lineTo(lx + 2.5, ly - 13.5); g.lineTo(lx + 6, ly - 10.5);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,220,140,' + (0.5 + Math.sin(G.time * 2 + lx) * 0.18) + ')';
    g.fillRect(lx - 2.5, ly - 10, 6, 3.4);
  }

  // ---- névoa rasteira sobre as serras
  for (let i = 0; i < 4; i++) {
    const my = 130 + i * 8;
    const mx = ((G.time * (4 + i * 2)) % (VW + 160)) - 160;
    const gr = g.createLinearGradient(mx, 0, mx + 150, 0);
    gr.addColorStop(0, 'rgba(226,190,200,0)');
    gr.addColorStop(0.5, 'rgba(226,190,200,' + (0.11 - i * 0.02) + ')');
    gr.addColorStop(1, 'rgba(226,190,200,0)');
    g.fillStyle = gr;
    g.fillRect(mx, my, 150, 3.5);
  }

  // ---- vaga-lumes rasteiros
  for (let i = 0; i < 10; i++) {
    const fx = 16 + ((i * 53 + G.time * (6 + i)) % 292);
    const fy = 152 + Math.sin(G.time * 1.4 + i * 2) * 8 + (i % 3) * 5;
    const br = (Math.sin(G.time * 3 + i * 1.7) * 0.5 + 0.5) ** 2;
    g.fillStyle = 'rgba(255,240,150,' + (0.2 + br * 0.7) + ')';
    g.beginPath(); g.arc(fx, fy, 0.5 + br * 0.5, 0, Math.PI * 2); g.fill();
  }

  // ---- ramo de sakura emoldurando o topo
  g.strokeStyle = '#2e1622';
  g.lineCap = 'round';
  g.lineWidth = 3.4;
  g.beginPath(); g.moveTo(-4, 4); g.quadraticCurveTo(50, 17, 118, 6); g.stroke();
  g.lineWidth = 1.8;
  for (const [x0, y0, x1, y1] of [[20, 11, 26, 27], [48, 15, 58, 32], [76, 13, 70, 26], [96, 10, 104, 25]]) {
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, y0 + 5, x1, y1); g.stroke();
  }
  for (const f of montaRamo()) {
    const balanca = Math.sin(G.time * 1.1 + f.t) * 0.5;
    flor(g, f.x + balanca, f.y, f.r, f.c, '#fff4dc');
  }

  // ---- pétalas caindo: somem ao chegar no chão
  for (let i = 0; i < 34; i++) {
    const sp = 10 + (i % 6) * 4;
    const px2 = (i * 61 + G.time * sp * 0.5) % (VW + 20) - 10;
    const py2 = (i * 43 + G.time * sp) % (HORIZ + 30) - 10;
    if (py2 > HORIZ + 8) continue;
    const gira = Math.sin(G.time * 2.4 + i);
    const some = py2 > HORIZ - 14 ? Math.max(0, 1 - (py2 - (HORIZ - 14)) / 22) : 1;
    g.globalAlpha = (0.45 + (i % 4) * 0.14) * some;
    g.fillStyle = ['#f7b3c6', '#ffd6e2', '#e88fa8'][i % 3];
    g.save();
    g.translate(px2 + gira * 3, py2);
    g.rotate(gira * 1.4);
    g.beginPath();
    g.ellipse(0, 0, 1.5, 0.8, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.globalAlpha = 1;

  // ---- título
  g.textAlign = 'center';
  const flut = Math.sin(G.time * 1.2) * 0.8;
  g.font = 'bold 24px monospace';
  g.fillStyle = '#12081c';
  for (const [dx, dy] of [[-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6], [1.6, 2.4], [-1.6, 1.6], [1.6, -1.6], [-1.6, -1.6]])
    g.fillText('FORGED LEGEND', VW / 2 + dx, 54 + flut + dy);
  const ouro = g.createLinearGradient(0, 40 + flut, 0, 60 + flut);
  ouro.addColorStop(0, '#fff0b0');
  ouro.addColorStop(0.5, '#ffd94e');
  ouro.addColorStop(1, '#e0a028');
  g.fillStyle = ouro;
  g.fillText('FORGED LEGEND', VW / 2, 54 + flut);

  const ciclo = G.time % 7;
  if (ciclo < 1.1) {
    const av = Math.min(1, ciclo / 0.32);
    const some = Math.max(0, 1 - Math.max(0, ciclo - 0.42) / 0.68);
    g.fillStyle = 'rgba(255,244,214,' + (0.95 * some) + ')';
    g.fillRect(VW / 2 - 82, 47 + flut, 164 * av, 0.8);
    if (av < 1) {
      g.fillStyle = 'rgba(255,255,255,' + some + ')';
      g.fillRect(VW / 2 - 82 + 164 * av, 45 + flut, 1.6, 4);
    }
  }
  g.font = '9px monospace';
  g.fillStyle = '#0e0818';
  g.fillText('鍛 え ら れ た 伝 説', VW / 2 + 0.8, 71 + flut + 0.8);
  g.fillStyle = '#f7b3c6';
  g.fillText('鍛 え ら れ た 伝 説', VW / 2, 71 + flut);

  // selo hanko
  g.fillStyle = '#8a1e22';
  g.fillRect(VW - 22, 9, 14, 14);
  g.fillStyle = '#c2352e';
  g.fillRect(VW - 21, 10, 12, 12);
  g.fillStyle = '#fff0e8';
  g.font = 'bold 9px monospace';
  g.fillText('伝', VW - 15, 20);

  g.font = '7px monospace';
  g.fillStyle = '#d8b8e0';
  g.fillText('o caminho é a arma que você empunha', VW / 2, 84);

  // ---- menu num painel laqueado
  const opts = hasSave() ? ['Continuar', 'Novo Jogo'] : ['Novo Jogo'];
  const ph = opts.length * 13 + 9, py3 = 122 - (opts.length - 1) * 6, pw = 112, px3 = (VW - pw) / 2;
  const lac = g.createLinearGradient(0, py3, 0, py3 + ph);
  lac.addColorStop(0, 'rgba(30,16,38,0.9)');
  lac.addColorStop(1, 'rgba(14,8,20,0.9)');
  g.fillStyle = lac;
  g.fillRect(px3, py3, pw, ph);
  g.strokeStyle = '#8a6a4a';
  g.lineWidth = 0.8;
  g.strokeRect(px3 + 0.4, py3 + 0.4, pw - 0.8, ph - 0.8);
  g.fillStyle = '#c89a5a';
  for (const [ox, oy] of [[2, 2], [pw - 4, 2], [2, ph - 4], [pw - 4, ph - 4]]) g.fillRect(px3 + ox, py3 + oy, 2, 2);
  opts.forEach((o, i) => {
    const oy = py3 + 15 + i * 13;
    g.font = '9px monospace';
    if (i === G.titleIdx) {
      const pulso = 0.75 + Math.sin(G.time * 5) * 0.25;
      g.fillStyle = 'rgba(255,217,78,' + pulso + ')';
      g.fillText('❖ ' + o + ' ❖', VW / 2, oy);
    } else {
      g.fillStyle = '#9a8ab8';
      g.fillText(o, VW / 2, oy);
    }
  });

  g.font = '7px monospace';
  g.fillStyle = '#8a7aa8';
  g.fillText('↑↓ escolher  ·  Z/Enter confirmar  ·  M som', VW / 2, 176);
  g.textAlign = 'left';
  g.lineWidth = 1;
}

function updateTitle() {
  const n = hasSave() ? 2 : 1;
  if (tap('up')) { G.titleIdx = (G.titleIdx + n - 1) % n; AU.sfx('menu'); }
  if (tap('down')) { G.titleIdx = (G.titleIdx + 1) % n; AU.sfx('menu'); }
  if (tap('ok')) {
    AU.sfx('ok');
    const isContinue = hasSave() && G.titleIdx === 0;
    if (isContinue && loadGame()) return;
    startNewGame();
  }
}
function startNewGame() {
  P = newPlayer();
  G.flags = { reislime: false, necromante: false, dragao: false };
  G.chests = {}; G.victoryShown = false;
  G.stats = { kills: 0, battles: 0 };
  G.learnQueue = []; G.criaIdx = 0;
  MAPS.overworld = genOverworld(); MAPS.cave = genCave();
  spriteCache.clear();
  G.state = 'create';   // primeiro a criação do personagem
}

function drawPauseMenu() {
  drawWorld(true);
  ctx.fillStyle = 'rgba(8,6,16,0.85)';
  ctx.fillRect(0, 0, VW, VH);
  const x = 26, y = 10, w = VW - 52, h = VH - 20;
  ctx.fillStyle = 'rgba(24,18,44,0.97)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#5a4a8a';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const E = eff();
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = '#ffd94e';
  ctx.fillText(className() + ' Nv.' + P.lvl, x + 8, y + 12);
  // abas
  const tabs = ['Status', 'Técnicas', 'Equipar', 'Itens', 'Pets'];
  ctx.font = '7px monospace';
  tabs.forEach((t, i) => {
    const tx = x + w - 172 + i * 35;
    ctx.fillStyle = i === G.menuTab ? '#ffd94e' : '#705a80';
    ctx.fillText((i === G.menuTab ? '[' + t + ']' : ' ' + t), tx, y + 12);
  });

  if (G.menuTab === 0) {
    // ---- STATUS: distribuir pontos ----
    ctx.fillStyle = P.pts > 0 ? '#6ee86e' : '#8a7ab0';
    ctx.fillText('Pontos: ' + P.pts + (P.pts > 0 ? ' (Z aplica)' : ''), x + 8, y + 26);
    ALLOC.forEach((a, i) => {
      const oy = y + 38 + i * 11;
      const sel = G.menuIdx === i;
      if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 8, oy); }
      ctx.fillStyle = sel ? '#fff' : '#a89ac0';
      const baseV = a.key === 'maxHp' || a.key === 'maxMp' ? P[a.key] : P[a.key];
      const effV = E[a.key];
      const bonus = effV - baseV;
      ctx.fillText(a.name + '  ' + baseV + (bonus ? ' +' + bonus : ''), x + 16, oy);
      ctx.fillStyle = '#705a80';
      ctx.fillText(a.desc, x + 76, oy);
    });
    // resumo à direita
    const st = [
      ['HP', P.hp + '/' + E.maxHp], ['MP', P.mp + '/' + E.maxMp],
      ['ATQ', E.atk], ['DEF', E.def], ['MAG', E.mag], ['VEL', E.spd],
      ['Crítico', Math.round(E.crit * 100) + '%'],
      ['XP', P.xp + '/' + XP_NEXT(P.lvl)],
      ['Ouro', P.gold], ['Vitórias', G.stats.kills]
    ];
    st.forEach(([nm, v], i) => {
      ctx.fillStyle = '#8a7ab0'; ctx.fillText(nm, x + 158, y + 26 + i * 10);
      ctx.fillStyle = '#e8e0f0'; ctx.fillText('' + v, x + 206, y + 26 + i * 10);
    });
    // técnicas equipadas (resumo; a aba Técnicas gerencia)
    ctx.fillStyle = '#ffd94e'; ctx.fillText('Técnicas equipadas:', x + 8, y + 114);
    const sks = playerSkills();
    if (!sks.length) { ctx.fillStyle = '#705a80'; ctx.fillText('(nenhuma para esta arma)', x + 8, y + 124); }
    sks.forEach((s, i) => {
      ctx.fillStyle = '#a89ac0';
      ctx.fillText(s.name + ' (' + s.mp + 'MP)', x + 8, y + 124 + i * 9);
    });
    const t = weaponType();
    if (t) {
      const nx = WEAPON_SKILLS[t].find(([id, lvl]) => lvl > P.lvl);
      if (nx) { ctx.fillStyle = '#705a80'; ctx.fillText('Nv.' + nx[1] + ': ' + SKILLS[nx[0]].name, x + 8, y + 124 + Math.max(sks.length, 1) * 9); }
    }
  } else if (G.menuTab === 1) {
    // ---- TÉCNICAS (estilo Pokémon: 4 equipadas, troca livre) ----
    const t = weaponType();
    const eq = curSkills();
    ctx.fillStyle = '#ffd94e';
    ctx.fillText('Equipadas (' + eq.length + '/' + MAX_SKILLS + ')', x + 8, y + 26);
    if (!eq.length) { ctx.fillStyle = '#705a80'; ctx.fillText('(nenhuma)', x + 16, y + 38); }
    eq.forEach((id, i) => {
      const s = SKILLS[id];
      const oy = y + 38 + i * 10;
      const sel = G.menuIdx === i;
      if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 8, oy); }
      ctx.fillStyle = sel ? '#fff' : '#a89ac0';
      ctx.fillText(s.name, x + 16, oy);
      ctx.fillStyle = '#6ea8ff';
      ctx.fillText(s.mp + 'MP', x + 92, oy);
    });
    // repertório da arma equipada
    ctx.fillStyle = '#ffd94e';
    ctx.fillText('Repertório do caminho ' + className(), x + 8, y + 82);
    if (!t) { ctx.fillStyle = '#705a80'; ctx.fillText('(sem arma equipada)', x + 8, y + 93); }
    else {
      const rep = WEAPON_SKILLS[t];
      const base = eq.length;
      rep.forEach(([id, lvl], j) => {
        const oy = y + 93 + j * 9;
        const s = SKILLS[id];
        const idx = base + j;
        const sel = G.menuIdx === idx;
        const temNivel = P.lvl >= lvl;
        const equipada = eq.includes(id);
        if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 8, oy); }
        ctx.fillStyle = equipada ? '#4a7a5a' : (temNivel ? (sel ? '#fff' : '#a89ac0') : '#5a4a70');
        ctx.fillText(s.name, x + 16, oy);
        ctx.fillStyle = temNivel ? '#705a80' : '#4a3a5a';
        ctx.fillText(equipada ? 'equipada' : (temNivel ? 'Z equipar' : 'Nv.' + lvl), x + 104, oy);
      });
    }
    // detalhe da técnica em foco
    const todas = eq.concat(t ? WEAPON_SKILLS[t].map(([id]) => id) : []);
    const foco = todas[G.menuIdx];
    if (foco) {
      ctx.fillStyle = '#8a7ab0';
      ctx.fillText(SKILLS[foco].desc, x + 8, y + 148);
    }
  } else if (G.menuTab === 2) {
    // ---- EQUIPAR ----
    // equipados (6 slots, coluna esquerda)
    SLOTS.forEach((s, i) => {
      const oy = y + 24 + i * 9;
      ctx.fillStyle = '#8a7ab0'; ctx.fillText(SLOT_NAMES[s] + ':', x + 8, oy);
      const id = P.equip[s];
      if (id) { ctx.fillStyle = RARITY[EQUIP[id].rar].color; ctx.fillText(eqName(id), x + 52, oy); }
      else { ctx.fillStyle = '#4a3a5a'; ctx.fillText('—', x + 52, oy); }
    });
    // bônus de conjunto + fragmentos e materiais
    if (setActive()) { ctx.fillStyle = '#6ee86e'; ctx.fillText('Conjunto ' + className() + ' ativo!', x + 8, y + 80); }
    else { ctx.fillStyle = '#705a80'; ctx.fillText('Sem bônus de conjunto', x + 8, y + 80); }
    drawMatBar(x + 8, y + 90);
    // inventário de equipamentos
    ctx.fillStyle = '#ffd94e'; ctx.fillText('Mochila  ' + P.equipInv.length + '/18', x + 8, y + 101);
    if (!P.equipInv.length) { ctx.fillStyle = '#705a80'; ctx.fillText('(vazia)', x + 8, y + 112); }
    const maxShow = 5;
    const start = clamp(G.menuIdx - 2, 0, Math.max(0, P.equipInv.length - maxShow));
    P.equipInv.slice(start, start + maxShow).forEach((id, j) => {
      const i = start + j;
      const oy = y + 112 + j * 9;
      const sel = G.menuIdx === i;
      if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 8, oy); }
      ctx.fillStyle = sel ? '#fff' : RARITY[EQUIP[id].rar].color;
      ctx.fillText(eqName(id) + ' [' + SLOT_NAMES[EQUIP[id].slot] + ']', x + 16, oy);
    });
    if (start > 0) { ctx.fillStyle = '#8a7ab0'; ctx.fillText('▲', x + 166, y + 112); }
    if (start + maxShow < P.equipInv.length) { ctx.fillStyle = '#8a7ab0'; ctx.fillText('▼', x + 166, y + 148); }
    // detalhes do item selecionado (coluna direita)
    const selId = P.equipInv[G.menuIdx];
    if (selId) {
      const eq = EQUIP[selId];
      ctx.fillStyle = RARITY[eq.rar].color;
      ctx.fillText(RARITY[eq.rar].name, x + 178, y + 101);
      let dy = y + 112;
      for (const [k, v] of Object.entries(enchBonus(selId))) {
        ctx.fillStyle = '#a89ac0';
        ctx.fillText(k === 'crit' ? '+' + Math.round(v * 100) + '% crit'
          : '+' + v + ' ' + k.toUpperCase().replace('MAXHP', 'HP'), x + 178, dy);
        dy += 9;
      }
      ctx.fillStyle = '#8a7ab0';
      if (eq.wtype) ctx.fillText('Estilo: ' + CLASS_NAMES[CLASS_BY_WEAPON[eq.wtype]], x + 178, dy);
      else if (eq.atype) ctx.fillText('Conjunto: ' + eq.atype, x + 178, dy);
    }
  } else if (G.menuTab === 4) {
    // ---- PETS ----
    ctx.fillStyle = '#ffd94e'; ctx.fillText('Pets (Z ativa/guarda)', x + 8, y + 26);
    if (!P.pets.length) {
      ctx.fillStyle = '#705a80';
      ctx.fillText('Nenhum espírito ainda.', x + 8, y + 40);
      ctx.fillText('Youkai raramente deixam crias', x + 8, y + 50);
      ctx.fillText('ao serem derrotados. Chefes', x + 8, y + 60);
      ctx.fillText('sempre dão um companheiro!', x + 8, y + 70);
    }
    P.pets.forEach((id, i) => {
      const pet = PETS[id];
      const oy = y + 40 + i * 14;
      const sel = G.menuIdx === i;
      if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 8, oy); }
      const spr = petSprite(id);
      ctx.drawImage(spr, x + 16, oy - 8);
      ctx.fillStyle = sel ? '#fff' : RARITY[pet.rar].color;
      ctx.fillText(pet.name, x + 32, oy);
      if (P.activePet === id) { ctx.fillStyle = '#6ee86e'; ctx.fillText('★ ativo', x + 96, oy); }
    });
    // detalhes do pet selecionado
    const selPet = P.pets[G.menuIdx];
    if (selPet) {
      const pet = PETS[selPet];
      const spr = petSprite(selPet);
      ctx.drawImage(spr, x + 176, y + 26, spr.width * 2, spr.height * 2);
      ctx.fillStyle = RARITY[pet.rar].color;
      ctx.fillText(RARITY[pet.rar].name, x + 176, y + 56);
      ctx.fillStyle = '#a89ac0';
      ctx.fillText('Passivo: ' + pet.desc, x + 176, y + 66);
      ctx.fillText('Ataque: ' + petDmg(selPet) + ' por turno', x + 176, y + 76);
      ctx.fillStyle = '#705a80';
      ctx.fillText('Ataca junto com você', x + 176, y + 86);
    }
  } else {
    // ---- ITENS ----
    ctx.fillStyle = '#ffd94e'; ctx.fillText('Consumíveis (Z usa)', x + 8, y + 26);
    const keys = Object.keys(ITEMS);
    const showI = 8;
    const firstI = clamp(G.menuIdx - 4, 0, Math.max(0, keys.length - showI));
    keys.slice(firstI, firstI + showI).forEach((k, j) => {
      const i = firstI + j;
      const oy = y + 38 + j * 11;
      const sel = G.menuIdx === i;
      const it = ITEMS[k];
      if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 8, oy); }
      ctx.fillStyle = sel ? '#fff' : (P.items[k] > 0 ? '#a89ac0' : '#5a4a70');
      ctx.fillText(it.name + ' x' + P.items[k], x + 16, oy);
      ctx.fillStyle = it.battleOnly ? '#6a5a80' : '#705a80';
      ctx.fillText(it.battleOnly ? '(só em batalha)' : it.desc, x + 110, oy);
    });
    // materiais de forja (desmontando peças ou caçando youkai)
    ctx.fillStyle = '#ffd94e'; ctx.fillText('Materiais de forja', x + 8, y + 128);
    MAT_KEYS.forEach((k, i) => {
      const oy = y + 138 + Math.floor(i / 3) * 9;
      const ox = x + 8 + (i % 3) * 78;
      ctx.fillStyle = matQty(k) > 0 ? MATS[k].color : '#5a4a70';
      ctx.fillText(MATS[k].name + ' x' + matQty(k), ox, oy);
    });
  }
  ctx.fillStyle = '#6a5a8a';
  ctx.fillText(G.menuTab === 1 ? 'Z equipar/trocar · ◀▶ aba · X fechar'
    : G.menuTab === 2 ? 'Z equipar · Q desmontar · ◀ ▶ aba · X fechar'
    : '◀ ▶ aba · X fechar', x + 8, y + h - 6);
}
function updatePauseMenu() {
  const wt = weaponType();
  const repLen = wt ? WEAPON_SKILLS[wt].length : 0;
  const listLen = G.menuTab === 0 ? ALLOC.length
    : G.menuTab === 1 ? Math.max(1, (wt ? curSkills().length : 0) + repLen)
    : G.menuTab === 2 ? Math.max(1, P.equipInv.length)
    : G.menuTab === 4 ? Math.max(1, P.pets.length)
    : Object.keys(ITEMS).length;
  if (tap('left')) { G.menuTab = (G.menuTab + 4) % 5; G.menuIdx = 0; AU.sfx('menu'); }
  if (tap('right')) { G.menuTab = (G.menuTab + 1) % 5; G.menuIdx = 0; AU.sfx('menu'); }
  // Q desmonta a peça em foco na mochila
  if (tap('alt')) {
    if (G.menuTab === 2 && P.equipInv[G.menuIdx]) {
      const idx = G.menuIdx;
      askConfirm('Desmontar ' + eqName(P.equipInv[idx]) + '?', dismantleYield(P.equipInv[idx]), () => {
        desmontar(idx);
        G.menuIdx = Math.max(0, Math.min(G.menuIdx, P.equipInv.length - 1));
      });
    } else AU.sfx('back');
  }
  if (tap('up')) { G.menuIdx = (G.menuIdx + listLen - 1) % listLen; AU.sfx('menu'); }
  if (tap('down')) { G.menuIdx = (G.menuIdx + 1) % listLen; AU.sfx('menu'); }
  if (tap('ok')) {
    if (G.menuTab === 0) {
      // aplicar ponto de status
      if (P.pts > 0) {
        const a = ALLOC[G.menuIdx];
        P.pts--;
        P[a.key] += a.gain || 1;
        if (a.key === 'maxHp') P.hp += a.gain;
        if (a.key === 'maxMp') P.mp += a.gain;
        AU.sfx('ok');
      } else AU.sfx('back');
    } else if (G.menuTab === 1) {
      // equipar/trocar técnica
      const t2 = weaponType();
      const rep = t2 ? WEAPON_SKILLS[t2] : [];
      const eqs = t2 ? curSkills() : [];
      if (G.menuIdx >= eqs.length && rep.length) {
        const [id, lvl] = rep[G.menuIdx - eqs.length];
        if (P.lvl < lvl) { toast('Requer nível ' + lvl); AU.sfx('back'); }
        else if (eqs.includes(id)) { toast('Já equipada'); AU.sfx('back'); }
        else if (eqs.length < MAX_SKILLS) { equipSkill(id); AU.sfx('ok'); toast(SKILLS[id].name + ' equipada!'); saveGame(); }
        else { G.learnQueue.push(id); G.state = 'learn'; G.learnIdx = 0; AU.sfx('ok'); }
      } else AU.sfx('back');
    } else if (G.menuTab === 2) {
      if (P.equipInv[G.menuIdx]) {
        equipFromInv(G.menuIdx);
        G.menuIdx = Math.min(G.menuIdx, Math.max(0, P.equipInv.length - 1));
        AU.sfx('ok');
      } else AU.sfx('back');
    } else if (G.menuTab === 4) {
      const id = P.pets[G.menuIdx];
      if (id) {
        P.activePet = P.activePet === id ? null : id;
        clampVitals();
        AU.sfx('ok');
      } else AU.sfx('back');
    } else {
      const its = Object.keys(ITEMS);
      const id = its[G.menuIdx];
      const it = ITEMS[id];
      const E = eff();
      const hurt = P.hp < E.maxHp, drained = P.mp < E.maxMp;
      if (P.items[id] > 0 && !it.battleOnly) {
        let used = true;
        if (id === 'pocao' && hurt) { P.hp = Math.min(E.maxHp, P.hp + Math.round(E.maxHp * 0.45)); addFloater(P.x + 8, P.y - 4, '+HP', '#6ee86e'); }
        else if (id === 'pocaoG' && hurt) { P.hp = Math.min(E.maxHp, P.hp + Math.round(E.maxHp * 0.8)); addFloater(P.x + 8, P.y - 4, '+HP', '#6ee86e'); }
        else if (id === 'pao' && (hurt || drained)) {
          P.hp = Math.min(E.maxHp, P.hp + Math.round(E.maxHp * 0.2));
          P.mp = Math.min(E.maxMp, P.mp + Math.round(E.maxMp * 0.2));
          addFloater(P.x + 8, P.y - 4, '+HP/MP', '#6ee86e');
        }
        else if (id === 'eter' && drained) { P.mp = Math.min(E.maxMp, P.mp + Math.round(E.maxMp * 0.4)); addFloater(P.x + 8, P.y - 4, '+MP', '#6ea8ff'); }
        else if (id === 'elixir' && (hurt || drained)) { P.hp = E.maxHp; P.mp = E.maxMp; addFloater(P.x + 8, P.y - 4, 'MAX!', '#ffd94e'); }
        else used = false;
        if (used) {
          P.items[id]--;
          AU.sfx('heal');
          burst(P.x + 8, P.y + 8, 10, { color: ['#6ee86e', '#a0f0a0', '#dcffdc'], spdMax: 40, lifeMax: 0.6, size: 1, lift: 20 });
        } else AU.sfx('back');
      } else AU.sfx('back');
    }
  }
  if (tap('back') || tap('menu')) { G.state = 'world'; AU.sfx('back'); saveGame(); }
}
// ---------- Criação do personagem ----------
// Escolhas puramente físicas: a classe continua vindo da arma equipada.
const CRIA_OPCOES = [
  { key: 'corpo',     label: 'Porte',         lista: () => CORPO },
  { key: 'pele',      label: 'Pele',          lista: () => PELE },
  { key: 'cabelo',    label: 'Cabelo',        lista: () => ESTILO_CABELO },
  { key: 'corCabelo', label: 'Cor do cabelo', lista: () => COR_CABELO },
  { key: 'olhos',     label: 'Olhos',         lista: () => COR_OLHOS }
];
function drawCreate() {
  const grd = ctx.createLinearGradient(0, 0, 0, VH);
  grd.addColorStop(0, '#141024'); grd.addColorStop(1, '#2a1c46');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 16; i++) {
    const sx = (i * 71 + G.time * (10 + i % 4 * 4)) % (VW + 16) - 8;
    const sy = (i * 47 + G.time * 16) % (VH + 16) - 8;
    ctx.fillStyle = ['#f7b3c6', '#ffd6e2', '#e88fa8'][i % 3];
    ctx.globalAlpha = 0.5;
    ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ffd94e';
  ctx.fillText('CRIE SEU GUERREIRO', VW / 2, 18);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#b8a8d8';
  ctx.fillText('a arma que empunhar definirá seu caminho', VW / 2, 28);
  ctx.textAlign = 'left';

  const x = 14, y = 38, w = 168;
  ctx.fillStyle = 'rgba(20,14,38,0.9)';
  ctx.fillRect(x, y, w, 118);
  ctx.strokeStyle = '#5a4a8a';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 117);
  CRIA_OPCOES.forEach((op, i) => {
    const oy = y + 16 + i * 17;
    const sel = G.criaIdx === i;
    const lista = op.lista();
    const val = lista[P.look[op.key] % lista.length];
    if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 6, oy); }
    ctx.fillStyle = sel ? '#fff' : '#a89ac0';
    ctx.fillText(op.label, x + 15, oy);
    ctx.fillStyle = sel ? '#ffd94e' : '#6a5a8a';
    ctx.fillText('◀', x + 80, oy);
    ctx.fillText('▶', x + w - 12, oy);
    ctx.fillStyle = sel ? '#fff' : '#8a7ab0';
    ctx.fillText(val.name, x + 90, oy);
    if (op.key === 'pele') { ctx.fillStyle = val.S; ctx.fillRect(x + w - 32, oy - 6, 9, 7); }
    if (op.key === 'corCabelo') { ctx.fillStyle = val.H; ctx.fillRect(x + w - 32, oy - 6, 9, 7); ctx.fillStyle = val.h; ctx.fillRect(x + w - 32, oy - 6, 9, 3); }
    if (op.key === 'olhos') { ctx.fillStyle = val.I; ctx.fillRect(x + w - 32, oy - 6, 9, 7); }
  });
  ctx.fillStyle = '#6a5a8a';
  ctx.fillText('◀▶ trocar · ▲▼ opção · Z começar', x + 6, y + 110);

  // preview ao vivo usando o mesmo sprite da batalha
  const bx = 196, by = 34;
  ctx.fillStyle = 'rgba(20,14,38,0.9)';
  ctx.fillRect(bx, by, 108, 124);
  ctx.strokeStyle = '#5a4a8a';
  ctx.strokeRect(bx + 0.5, by + 0.5, 107, 123);
  const atacando = Math.floor(G.time * 1.2) % 5 === 4;
  const spr = composeSprite(atacando ? 'atk' : 'idle');
  if (spr) {
    const esc = 2.2;
    const bob = atacando ? 0 : Math.round(Math.sin(G.time * 2.4));
    ctx.drawImage(spr, Math.round(bx + 54 - 32 * esc / 2), Math.round(by + 6 + bob), 32 * esc, 48 * esc);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a7ab0';
  ctx.fillText('começa com a katana', bx + 54, by + 118);
  ctx.textAlign = 'left';
}
function updateCreate() {
  const op = CRIA_OPCOES[G.criaIdx];
  const n = CRIA_OPCOES.length;
  if (tap('up')) { G.criaIdx = (G.criaIdx + n - 1) % n; AU.sfx('menu'); }
  if (tap('down')) { G.criaIdx = (G.criaIdx + 1) % n; AU.sfx('menu'); }
  const foiEsq = proxToque() === 'left';
  if (tap('left') || tap('right')) {
    const lista = op.lista();
    P.look[op.key] = (P.look[op.key] + (foiEsq ? -1 : 1) + lista.length) % lista.length;
    spriteCache.clear();      // aparência mudou: refaz os sprites
    AU.sfx('menu');
  }
  if (tap('back')) { G.state = 'title'; AU.sfx('back'); }
  if (tap('ok')) {
    AU.sfx('ok');
    fadeTo(() => {
      enterMap('overworld', START.x, START.y);
      G.state = 'world';
      showMsg('Bem-vindo a Sakuramura!\nSeu caminho vem da arma que\nempunha: katana, shakujo,\ntanto ou yumi.');
      showMsg('Abra o menu (C) para equipar,\ndistribuir pontos de status e\nver suas técnicas.');
      showMsg('O que você veste aparece no\nseu personagem: peitorais,\nelmos e armas mudam o visual!');
      showMsg('Youkai deixam Fragmentos ◆.\nLeve-os ao altar da vila para\nencantar seu equipamento!');
      showMsg('Três grandes youkai ameaçam\nestas terras. Derrote\nYamata-no-Orochi e traga a paz!');
      saveGame();
    });
  }
}

// ---------- Loja ----------
// Extraído para economy/shop.js (SHOP_STOCK, estoqueLoja, shopEntry,
// shopEntryBase, drawShop, updateShop).
// ---------- Aprender técnica (estilo Pokémon) ----------
function drawLearn() {
  drawWorld(true);
  ctx.fillStyle = 'rgba(8,6,16,0.88)';
  ctx.fillRect(0, 0, VW, VH);
  const novaId = G.learnQueue[0];
  if (!novaId) return;
  const nova = SKILLS[novaId];
  const x = 26, y = 14, w = VW - 52, h = VH - 28;
  ctx.fillStyle = 'rgba(24,18,44,0.97)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd94e';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#ffd94e';
  ctx.fillText('NOVA TÉCNICA!', x + 8, y + 14);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#e8e0f0';
  ctx.fillText('Você pode aprender ' + nova.name + '.', x + 8, y + 27);
  ctx.fillStyle = '#8a7ab0';
  ctx.fillText(nova.desc + '  ·  ' + nova.mp + ' MP', x + 8, y + 37);
  ctx.fillStyle = '#a89ac0';
  ctx.fillText('Já conhece 4 técnicas. Esquecer qual?', x + 8, y + 52);
  // lista das 4 atuais + opção de não aprender
  const atuais = curSkills();
  atuais.forEach((id, i) => {
    const s = SKILLS[id];
    const oy = y + 68 + i * 11;
    const sel = G.learnIdx === i;
    if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 10, oy); }
    ctx.fillStyle = sel ? '#fff' : '#a89ac0';
    ctx.fillText(s.name, x + 20, oy);
    ctx.fillStyle = '#705a80';
    ctx.fillText(s.mp + 'MP  ' + s.desc, x + 96, oy);
  });
  const oy = y + 68 + atuais.length * 11 + 4;
  const selN = G.learnIdx === atuais.length;
  if (selN) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 10, oy); }
  ctx.fillStyle = selN ? '#fff' : '#8a7ab0';
  ctx.fillText('Não aprender ' + nova.name, x + 20, oy);
  ctx.fillStyle = '#6a5a8a';
  ctx.fillText('▲▼ escolher · Z confirmar', x + 8, y + h - 8);
}
function updateLearn() {
  const atuais = curSkills();
  const n = atuais.length + 1;
  if (tap('up')) { G.learnIdx = (G.learnIdx + n - 1) % n; AU.sfx('menu'); }
  if (tap('down')) { G.learnIdx = (G.learnIdx + 1) % n; AU.sfx('menu'); }
  if (tap('ok')) {
    const novaId = G.learnQueue.shift();
    if (G.learnIdx < atuais.length) {
      const esquecida = SKILLS[atuais[G.learnIdx]].name;
      equipSkill(novaId, G.learnIdx);
      AU.sfx('level');
      toast(esquecida + ' → ' + SKILLS[novaId].name);
      burstScreen(VW / 2, VH / 2, 24, { color: ['#ffd94e', '#fff0a0', '#6ee86e'], spdMax: 90, lifeMax: 0.8, size: 2 });
    } else {
      AU.sfx('back');   // recusou; pode reequipar depois pelo menu
    }
    G.learnIdx = 0;
    if (!G.learnQueue.length) { G.state = 'world'; saveGame(); }
  }
}

// ---------- Altar: encantar e desmontar ----------
// Extraído para craft/altar.js (altarList, drawEnchant, encantar,
// updateEnchant, canEnchant).
function drawMatBar(x, y) {
  ctx.fillStyle = '#b06ae8';
  ctx.fillText('◆' + P.frags, x, y);
  let mx = x + 34;
  for (const k of MAT_KEYS) {
    ctx.fillStyle = matQty(k) > 0 ? MATS[k].color : '#4a3a5a';
    const t = MATS[k].short + matQty(k);
    ctx.fillText(t, mx, y);
    mx += t.length * 4.4 + 6;
  }
}

// ---------- Confirmação (ações que destroem a peça) ----------
function askConfirm(txt, yield_, onYes) {
  G.confirm = { txt, y: yield_, onYes, from: G.state, sim: false };
  G.state = 'confirm';
  AU.sfx('menu');
}
function drawConfirm() {
  if (G.confirm.from === 'menu') drawPauseMenu(); else drawEnchant();
  coverRect(0, 0, VW, VH, 'rgba(8,6,16,0.72)');
  const w = 212, h = 74, x = Math.round((VW - w) / 2), y = Math.round((VH - h) / 2);
  coverRect(x, y, w, h, '#241420');
  ctx.strokeStyle = '#e07070';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(G.confirm.txt, x + 8, y + 15);
  const yl = G.confirm.y;
  ctx.fillStyle = '#9aa0b0';
  ctx.fillText('Rende ◆' + yl.frags + ' · ' + matsText(yl.mats), x + 8, y + 28);
  ctx.fillStyle = '#e07070';
  ctx.fillText('A peça é destruída para sempre.', x + 8, y + 39);
  ['Sim', 'Não'].forEach((t, i) => {
    const sel = G.confirm.sim === (i === 0);
    ctx.fillStyle = sel ? '#ffd94e' : '#705a80';
    ctx.fillText((sel ? '▶ ' : '  ') + t, x + 12 + i * 46, y + 54);
  });
  ctx.fillStyle = '#6a5a8a';
  ctx.fillText('◀ ▶ escolher · Z confirmar · X sair', x + 8, y + 67);
}
function updateConfirm() {
  if (tap('left') || tap('right')) { G.confirm.sim = !G.confirm.sim; AU.sfx('menu'); }
  if (tap('back')) { G.state = G.confirm.from; AU.sfx('back'); return; }
  if (tap('ok')) {
    const c = G.confirm;
    G.state = c.from;
    if (c.sim) c.onYes(); else AU.sfx('back');
  }
}

// ---------- Game over / vitória ----------
function drawGameOver() {
  ctx.fillStyle = '#0c0a14';
  ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#c04040';
  ctx.fillText('VOCÊ DESMAIOU...', VW / 2, 70);
  ctx.font = '8px monospace';
  ctx.fillStyle = '#a89ac0';
  ctx.fillText('Aldeões te resgataram e', VW / 2, 95);
  ctx.fillText('te levaram de volta ao templo.', VW / 2, 105);
  ctx.fillStyle = '#e07070';
  ctx.fillText('(metade do ouro foi perdida)', VW / 2, 120);
  if (Math.floor(G.time * 2) % 2) {
    ctx.fillStyle = '#ffd94e';
    ctx.fillText('Z para continuar', VW / 2, 150);
  }
  ctx.textAlign = 'left';
}
function updateGameOver() {
  if (tap('ok')) {
    P.gold = Math.floor(P.gold / 2);
    const E = eff();
    P.hp = E.maxHp; P.mp = E.maxMp;
    fadeTo(() => {
      enterMap('overworld', START.x, START.y);
      P.dir = 'down';
      G.state = 'world';
      saveGame();
    });
  }
}

function drawVictory() {
  const grd = ctx.createLinearGradient(0, 0, 0, VH);
  grd.addColorStop(0, '#2a1c46'); grd.addColorStop(1, '#6a3c28');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VW, VH);
  // confete
  for (let i = 0; i < 30; i++) {
    const cx = (i * 71 + G.time * 20 * ((i % 3) + 1)) % VW;
    const cy = (i * 37 + G.time * 30) % VH;
    ctx.fillStyle = ['#ffd94e', '#e05050', '#50c060', '#6ea8ff'][i % 4];
    ctx.fillRect(cx, cy, 2, 2);
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#1a1230';
  ctx.fillText('VITÓRIA!', VW / 2 + 2, 52 + 2);
  ctx.fillStyle = '#ffd94e';
  ctx.fillText('VITÓRIA!', VW / 2, 52);
  ctx.font = '8px monospace';
  ctx.fillStyle = '#f0e8d8';
  ctx.fillText('Yamata-no-Orochi foi derrotado!', VW / 2, 74);
  ctx.fillText('A paz retorna a Sakuramura.', VW / 2, 86);
  ctx.fillStyle = '#c8b8e0';
  ctx.fillText(className() + ' · Nível ' + P.lvl + ' · ' + G.stats.kills + ' youkai derrotados', VW / 2, 106);
  const t = Math.floor(G.time * 2) % 2;
  ctx.drawImage(heroSprite(curClass(), 'down', t), VW / 2 - 16, 112, 32, 40);
  if (t) {
    ctx.fillStyle = '#ffd94e';
    ctx.fillText('Z para continuar explorando', VW / 2, 166);
  }
  ctx.textAlign = 'left';
}
function updateVictory() {
  if (tap('ok')) {
    fadeTo(() => {
      G.state = 'world';
      AU.setTrack(G.map.name === 'cave' ? AU.CAVE : AU.WORLD);
      showMsg('Você pode continuar explorando\no mundo. Obrigado por jogar!');
    });
  }
}

// ---------- Diálogo ----------
function drawDialog() {
  const txt = G.msgQueue[0];
  const lines = txt.split('\n');
  const h = 16 + lines.length * 10;
  const y = VH - h - 6;
  ctx.fillStyle = 'rgba(12,10,22,0.94)';
  ctx.fillRect(8, y, VW - 16, h);
  ctx.strokeStyle = '#7a6aa8';
  ctx.strokeRect(8.5, y + 0.5, VW - 17, h - 1);
  ctx.font = '8px monospace';
  G.msgChar += 1.6;
  let shown = 0;
  for (let i = 0; i < lines.length; i++) {
    const avail = Math.max(0, Math.floor(G.msgChar) - shown);
    ctx.fillStyle = '#f0e8f8';
    ctx.fillText(lines[i].slice(0, avail), 16, y + 13 + i * 10);
    shown += lines[i].length;
  }
  if (G.msgChar >= shown && Math.floor(G.time * 3) % 2) {
    ctx.fillStyle = '#ffd94e';
    ctx.fillText('▼', VW - 24, y + h - 5);
  }
}
function updateDialog() {
  const txt = G.msgQueue[0];
  const total = txt.replace(/\n/g, '').length;
  if (tap('ok') || tap('back')) {
    if (G.msgChar < total) G.msgChar = total;
    else { G.msgQueue.shift(); G.msgChar = 0; AU.sfx('menu'); }
  }
}
