'use strict';
/* ============================================================
   craft/altar.js — altar de encantamento (lista, desenho, ação e
   controle de input)
   Extraído de index.html (quarta extração estrutural planejada com o
   Graphify, após render/tiles.js, economy/shop.js e quests/quests.js).
   Script clássico (não é módulo ES) — compartilha o mesmo escopo
   léxico global de index.html via <script src>. Depende por nome (sem
   import) de: SLOTS, SLOT_NAMES, RARITY, EQUIP, G, P, AU, ctx, VW, VH,
   enchLvl(), enchCost(), enchMatCost(), eqName(), ENCH_MAX, matQty(),
   drawMatBar(), dismantleYield(), matsText(), desmontar(), tap(),
   clamp(), addFloater(), burstScreen(), saveGame(), drawWorld(),
   askConfirm() — todos continuam definidos em index.html (ou em
   economy/shop.js, no caso de dismantleYield/desmontar/matQty não, ver
   nota) e acessíveis por nome sem export. enchLvl/enchCost/
   enchMatCost/eqName/enchBonus/askConfirm/drawConfirm/drawMatBar
   ficaram em index.html porque são usados também pela tela de
   equipamento da pausa (ui/screens, ainda não extraída) — mover
   qualquer um deles criaria acoplamento prematuro entre dois módulos
   ainda não extraídos.
   ============================================================ */

function canEnchant(id) {
  if (!id || enchLvl(id) >= ENCH_MAX || P.frags < enchCost(id)) return false;
  const mc = enchMatCost(id);
  return !mc || matQty(mc.mat) >= mc.n;
}

// ---------- Altar: encantar e desmontar ----------
// modo 0 = encantar (equipados + mochila), modo 1 = desmontar (só mochila)
function altarList() {
  const out = [];
  if (G.altarMode === 0) {
    for (const s of SLOTS) if (P.equip[s]) out.push({ id: P.equip[s], where: SLOT_NAMES[s] });
  }
  P.equipInv.forEach((id, i) => out.push({ id, where: 'mochila', idx: i }));
  return out;
}

function drawEnchant() {
  drawWorld(true);
  ctx.fillStyle = 'rgba(8,6,16,0.85)';
  ctx.fillRect(0, 0, VW, VH);
  const x = 40, y = 16, w = VW - 80, h = VH - 36;
  ctx.fillStyle = 'rgba(28,18,48,0.97)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#b06ae8';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#d8a0ff';
  ctx.fillText('ALTAR DA FORJA', x + 10, y + 13);
  ctx.font = '7px monospace';
  // modos
  ['Encantar', 'Desmontar'].forEach((t, i) => {
    ctx.fillStyle = G.altarMode === i ? '#ffd94e' : '#705a80';
    ctx.fillText(G.altarMode === i ? '[' + t + ']' : ' ' + t, x + 118 + i * 58, y + 13);
  });
  drawMatBar(x + 10, y + 25);
  ctx.fillStyle = '#8a7ab0';
  ctx.fillText(G.altarMode === 0
    ? 'Cada nível: +15% nos bônus do item (máx +' + ENCH_MAX + ')'
    : 'Desmonta peças da mochila em fragmentos e materiais', x + 10, y + 36);

  const lista = altarList();
  const rows = 7;
  const start = clamp(G.menuIdx - 3, 0, Math.max(0, lista.length - rows));
  if (!lista.length) {
    ctx.fillStyle = '#705a80';
    ctx.fillText(G.altarMode === 0 ? 'Nada equipado nem na mochila.' : 'Mochila vazia.', x + 14, y + 56);
  }
  lista.slice(start, start + rows).forEach((it, j) => {
    const i = start + j;
    const oy = y + 50 + j * 11;
    const sel = G.menuIdx === i;
    const l = enchLvl(it.id);
    if (sel) { ctx.fillStyle = '#d8a0ff'; ctx.fillText('▶', x + 6, oy); }
    ctx.fillStyle = '#705a80';
    ctx.fillText(it.where, x + 14, oy);
    ctx.fillStyle = sel ? '#fff' : RARITY[EQUIP[it.id].rar].color;
    ctx.fillText(eqName(it.id), x + 62, oy);
    if (G.altarMode === 0) {
      if (l >= ENCH_MAX) { ctx.fillStyle = '#ffd94e'; ctx.fillText('MÁX', x + 182, oy); }
      else {
        ctx.fillStyle = canEnchant(it.id) ? '#6ee86e' : '#e07070';
        ctx.fillText('◆' + enchCost(it.id), x + 182, oy);
      }
    } else {
      ctx.fillStyle = '#9aa0b0';
      ctx.fillText('◆' + dismantleYield(it.id).frags, x + 182, oy);
    }
  });
  if (start > 0) { ctx.fillStyle = '#8a7ab0'; ctx.fillText('▲', x + 214, y + 50); }
  if (start + rows < lista.length) { ctx.fillStyle = '#8a7ab0'; ctx.fillText('▼', x + 214, y + 116); }
  // detalhe do item em foco
  const foco = lista[G.menuIdx];
  if (foco) {
    if (G.altarMode === 0) {
      const mc = enchMatCost(foco.id);
      if (enchLvl(foco.id) >= ENCH_MAX) { ctx.fillStyle = '#ffd94e'; ctx.fillText('Encanto no máximo', x + 14, y + 128); }
      else if (mc) {
        ctx.fillStyle = matQty(mc.mat) >= mc.n ? '#a89ac0' : '#e07070';
        ctx.fillText('Custa ◆' + enchCost(foco.id) + ' + ' + MATS[mc.mat].name + ' x' + mc.n, x + 14, y + 128);
      } else { ctx.fillStyle = '#a89ac0'; ctx.fillText('Custa ◆' + enchCost(foco.id), x + 14, y + 128); }
    } else {
      const yl = dismantleYield(foco.id);
      ctx.fillStyle = '#a89ac0';
      ctx.fillText('Rende ◆' + yl.frags + ' · ' + matsText(yl.mats), x + 14, y + 128);
    }
  }
  ctx.fillStyle = '#6a5a8a';
  ctx.fillText(G.altarMode === 0 ? 'Z encantar · ◀ ▶ modo · X sair' : 'Z desmontar · ◀ ▶ modo · X sair', x + 10, y + h - 7);
}
function encantar(id) {
  P.frags -= enchCost(id);
  const mc = enchMatCost(id);
  if (mc) P.mats[mc.mat] -= mc.n;
  P.ench[id] = enchLvl(id) + 1;
  AU.sfx('level');
  addFloater(P.x + 8, P.y - 4, '+' + P.ench[id], '#d8a0ff');
  burstScreen(VW / 2, VH / 2, 30, { color: ['#b06ae8', '#d8a0ff', '#e0b8ff'], spdMax: 100, lifeMax: 0.9, size: 2, drag: 2.5 });
  clampVitals();
  if (P.ench[id] === ENCH_MAX) awardPet('baku');   // primeira peça encantada até o máximo
  saveGame();
}
function updateEnchant() {
  const lista = altarList();
  const n = Math.max(1, lista.length);
  if (tap('left') || tap('right')) { G.altarMode = G.altarMode ? 0 : 1; G.menuIdx = 0; AU.sfx('menu'); }
  if (tap('up')) { G.menuIdx = (G.menuIdx + n - 1) % n; AU.sfx('menu'); }
  if (tap('down')) { G.menuIdx = (G.menuIdx + 1) % n; AU.sfx('menu'); }
  if (tap('ok')) {
    const foco = lista[G.menuIdx];
    if (!foco) { AU.sfx('back'); }
    else if (G.altarMode === 0) {
      if (canEnchant(foco.id)) encantar(foco.id);
      else AU.sfx('back');
    } else {
      askConfirm('Desmontar ' + eqName(foco.id) + '?', dismantleYield(foco.id), () => {
        desmontar(foco.idx);
        G.menuIdx = Math.max(0, Math.min(G.menuIdx, altarList().length - 1));
      });
    }
  }
  if (tap('back')) { G.state = 'world'; AU.sfx('back'); saveGame(); }
}
