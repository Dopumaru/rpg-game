'use strict';
/* ============================================================
   economy/shop.js — loot, raridade, dismantle, lojas e mascates
   Extraído de index.html (segunda extração estrutural planejada com o
   Graphify, após render/tiles.js). Script clássico (não é módulo ES) —
   compartilha o mesmo escopo léxico global de index.html via
   <script src>. Depende por nome (sem import) de: RARITY, EQUIP,
   ENEMIES, RAR_KEYS, PEIXES, VARAS, ITEMS, REGIAO_INFO, G, P, AU, ctx,
   VW, VH, toast(), saveGame(), pick(), tap(), seeded(), weaponType(),
   drawWorld(), burstScreen(), matsText(), dismantleYield() — todos
   continuam definidos em index.html (ou em render/tiles.js, no caso de
   seeded()) e acessíveis por nome sem export. matQty(), addMats() e
   emptyMats() ficaram em index.html porque são usados também por
   persistência (loadGame) e batalha (endBattleWin), não só por este
   módulo; dismantleYield() ficou por ser usado também pelas telas do
   altar de encantamento; varaAtual() ficou por pertencer ao sistema de
   pesca, não a este módulo, apesar de estar fisicamente perto de
   rollPeixe()/comprarVara() no arquivo original.
   ============================================================ */

function equipPrice(id) { return RARITY[EQUIP[id].rar].price; }

function dismantleFromInv(idx) {
  const id = P.equipInv[idx];
  if (!id) return null;
  const y = dismantleYield(id);
  P.equipInv.splice(idx, 1);
  P.frags += y.frags;
  addMats(y.mats);
  // o encanto só some se não sobrar nenhuma outra cópia da peça
  const resta = P.equipInv.includes(id) || SLOTS.some(s => P.equip[s] === id);
  if (!resta && P.ench) delete P.ench[id];
  return y;
}

function addEquipToInv(id) {
  if (P.equipInv.length >= 18) {
    const g = Math.max(5, Math.round(equipPrice(id) / 2));
    P.gold += g;
    return { full: true, gold: g };
  }
  P.equipInv.push(id);
  return { full: false };
}

// ---------- Loot por raridade ----------
// peças exclusivas de chefe/loja: nunca caem no sorteio comum
const NO_DROP = ['esp5', 'caj5', 'ada5', 'arc5', 'elm5', 'elm8', 'amu4', 'amu5', 'arm8', 'bot5', 'luv6'];
function rollRarity(maxTier) {
  let total = 0;
  for (let i = 0; i <= maxTier; i++) total += RARITY[RAR_KEYS[i]].w;
  let r = Math.random() * total;
  let idx = 0;
  for (let i = 0; i <= maxTier; i++) {
    r -= RARITY[RAR_KEYS[i]].w;
    if (r <= 0) { idx = i; break; }
  }
  // Augúrio Sombrio (Karasu-tengu): 8% de chance de subir um degrau de raridade
  if (P.activePet === 'corvo' && idx < maxTier && Math.random() < 0.08) idx++;
  return RAR_KEYS[idx];
}
function rollLoot(type) {
  const d = ENEMIES[type];
  if (d.boss) {
    // drop assinatura: dragão dá a arma lendária do estilo atual
    if (d.sig === 'weapon') {
      const t = weaponType();
      return { shakujo: 'caj5', tanto: 'ada5', yumi: 'arc5' }[t] || 'esp5';
    }
    return d.sig;
  }
  if (Math.random() > d.drop) return null;
  // 55% consumível, 45% equipamento
  if (Math.random() < 0.55) return 'c:' + pick(['pocao', 'pocao', 'pocao', 'pao', 'pao', 'eter', 'antidoto', 'bomba']);
  const rar = rollRarity(Math.min(d.tier, RAR_KEYS.length - 1));
  // cada youkai tem sua mesa temática; o resto vem da tabela geral
  const tema = (d.loot || []).filter(k => EQUIP[k]);
  const naRar = tema.filter(k => EQUIP[k].rar === rar);
  if (naRar.length && Math.random() < 0.6) return pick(naRar);
  // sem peça temática nessa raridade: tenta uma mais barata da mesma mesa
  const ri = RAR_KEYS.indexOf(rar);
  const abaixo = tema.filter(k => RAR_KEYS.indexOf(EQUIP[k].rar) <= ri);
  if (abaixo.length && Math.random() < 0.35) return pick(abaixo);
  const pool = Object.keys(EQUIP).filter(k => EQUIP[k].rar === rar && !NO_DROP.includes(k));
  return pool.length ? pick(pool) : (tema.length ? pick(tema) : null);
}
// fragmentos arcanos: moeda de encantamento dropada por mobs
function rollFrags(type, lvl) {
  const d = ENEMIES[type];
  if (d.boss) return { reislime: 8, necromante: 12, dragao: 20 }[type] || 8;
  if (Math.random() < 0.4) return 1 + Math.floor(lvl / 3);
  return 0;
}
// materiais de forja: cada youkai deixa o material do seu tipo
function rollMats(type, lvl) {
  const d = ENEMIES[type];
  const m = d.mat || 'ferro';
  if (d.boss) return { [m]: 4, escama: 2 };
  const out = {};
  if (Math.random() < 0.45) out[m] = 1 + (Math.random() < 0.25 ? 1 : 0);
  if (d.tier >= 3 && Math.random() < 0.10) out.jade = (out.jade || 0) + 1;
  return out;
}

// ---------- Mascates ----------
// Estoque sorteado por semente guardada no save: comum sai mais barato que na
// loja fixa, raro sai bem mais caro. A carga troca a cada punhado de batalhas.
function sementeMascate(n) {
  if (!P.mercSeed) P.mercSeed = {};
  const rodada = Math.floor((G.stats.battles || 0) / 12);
  const chave = n.id;
  if (!P.mercSeed[chave] || P.mercSeed[chave].rodada !== rodada) {
    P.mercSeed[chave] = { rodada, s: (Math.random() * 1e9) | 0 };
  }
  return P.mercSeed[chave].s;
}
function estoqueMascate(n) {
  const r = seeded(sementeMascate(n) >>> 0);
  const esc = arr => arr[Math.floor(r() * arr.length)];
  const out = [];
  const nItens = 6 + Math.floor(r() * 4);
  const consumiveis = Object.keys(ITEMS);
  for (let i = 0; i < nItens; i++) {
    if (r() < 0.34) { out.push('i:' + esc(consumiveis)); continue; }
    // quanto maior a margem do mascate, mais ele mexe com coisa rara
    const sorte = r();
    const rar = sorte < 0.3 + n.margem * 0.2 ? esc(['comum', 'incomum'])
      : sorte < 0.85 ? 'raro' : esc(['epico', 'lendario']);
    const pool = Object.keys(EQUIP).filter(k => EQUIP[k].rar === rar && !NO_DROP.includes(k));
    if (pool.length) out.push(esc(pool));
  }
  return [...new Set(out)];
}
// preço do mascate: barganha no comum, ágio no raro
function precoMascate(entrada, margem) {
  const base = entrada.price;
  const raro = entrada.kind === 'equip' && ['raro', 'epico', 'lendario'].includes(EQUIP[entrada.id].rar);
  const f = raro ? 1.45 + (1 - margem) * 0.6 : 0.55 + margem * 0.2;
  return Math.max(2, Math.round(base * f));
}
function abreMascate(n) {
  G.shopId = 'mascate';
  G.shopNPC = n;
  G.shopStock = estoqueMascate(n);
  G.shopIdx = 0;
  G.state = 'shop';
  AU.sfx('ok');
  toast(n.nome);
}

// sorteia a espécie: mesmo mecanismo de rollRarity do loot, limitado pelo
// alcance (tier) da vara equipada
function rollPeixe(tier) {
  const rar = rollRarity(Math.min(tier, RAR_KEYS.length - 1));
  const pool = Object.keys(PEIXES).filter(k => PEIXES[k].rar === rar);
  const sp = pick(pool.length ? pool : Object.keys(PEIXES).filter(k => PEIXES[k].rar === 'comum'));
  const p = PEIXES[sp];
  const kg = +(p.kg[0] + Math.random() * (p.kg[1] - p.kg[0])).toFixed(2);
  return { sp, kg };
}

function comprarVara(id) {
  if (P.varas.includes(id) || P.gold < VARAS[id].preco) return false;
  P.gold -= VARAS[id].preco;
  P.varas.push(id);
  P.vara = id;
  AU.sfx('coin');
  saveGame();
  return true;
}

// os três itens mais raros que os mobs de uma região podem deixar cair,
// com o drop assinatura do chefe sempre em primeiro quando existe
function itensRarosDaRegiao(nome) {
  const info = REGIAO_INFO[nome];
  if (!info || info.seguro) return [];
  const vistos = new Map();
  for (const m of info.mobs || []) {
    for (const id of (ENEMIES[m].loot || [])) {
      if (!EQUIP[id] || vistos.has(id)) continue;
      vistos.set(id, { id, name: EQUIP[id].name, rar: EQUIP[id].rar, price: equipPrice(id) });
    }
  }
  let lista = [...vistos.values()].sort((a, b) =>
    RAR_KEYS.indexOf(b.rar) - RAR_KEYS.indexOf(a.rar) || b.price - a.price);
  if (info.boss) {
    const sig = ENEMIES[info.boss].sig;
    const item = sig === 'weapon'
      ? { id: 'weapon', name: 'Arma lendária do seu caminho', rar: 'lendario', price: 999 }
      : { id: sig, name: EQUIP[sig].name, rar: EQUIP[sig].rar, price: equipPrice(sig) };
    lista = [item, ...lista.filter(v => v.id !== item.id)];
  }
  return lista.slice(0, 3);
}
function infoDaRegiao(nome) {
  const info = REGIAO_INFO[nome];
  if (!info) return null;
  return {
    nome, seguro: !!info.seguro,
    nivel: info.nivel || null,
    mobs: (info.mobs || []).map(m => ENEMIES[m].name),
    boss: info.boss ? ENEMIES[info.boss].name : null,
    raros: itensRarosDaRegiao(nome)
  };
}

// ---------- Loja ----------
// estoque por cidade: 'i:' consumível, senão id de equipamento
const SHOP_STOCK = {
  aldeia: ['i:pocao', 'i:pao', 'i:eter', 'i:antidoto', 'esp2', 'caj2', 'ada2', 'arc2',
           'arm2', 'arm9', 'bot2', 'elm2', 'elm6', 'luv2', 'amu2'],
  rocha:  ['i:pocaoG', 'i:eter', 'i:elixir', 'i:bomba', 'i:pergaminho', 'esp3', 'caj3', 'ada3', 'arc3',
           'arm3', 'arm4', 'arm10', 'elm3', 'elm4', 'bot3', 'luv3', 'luv4', 'amu3', 'amu6', 'amu7']
};
// estoque em exibição: fixo da vila ou a carga do mascate
function estoqueLoja() { return G.shopId === 'mascate' ? G.shopStock : SHOP_STOCK[G.shopId]; }
function shopEntry(s) {
  const e = shopEntryBase(s);
  if (G.shopId === 'mascate' && G.shopNPC) e.price = precoMascate(e, G.shopNPC.margem);
  if (P.activePet === 'tanuki') e.price = Math.max(1, Math.round(e.price * 0.85));   // Bolso Sem Fundo
  return e;
}
function shopEntryBase(s) {
  if (s.startsWith('i:')) {
    const id = s.slice(2);
    return { kind: 'item', id, name: ITEMS[id].name, desc: ITEMS[id].desc, price: ITEMS[id].price, color: '#c8c8d0' };
  }
  const eq = EQUIP[s];
  return { kind: 'equip', id: s, name: eq.name, desc: RARITY[eq.rar].name + ' · ' + SLOT_NAMES[eq.slot], price: equipPrice(s), color: RARITY[eq.rar].color };
}
function drawShop() {
  drawWorld(true);
  ctx.fillStyle = 'rgba(8,6,16,0.8)';
  ctx.fillRect(0, 0, VW, VH);
  const x = 44, y = 16, w = VW - 88, h = VH - 40;
  ctx.fillStyle = 'rgba(24,18,44,0.97)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#5a4a8a';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#ffd94e';
  ctx.fillText(G.shopId === 'mascate' ? G.shopNPC.nome.toUpperCase()
    : G.shopId === 'aldeia' ? 'MERCADO DE SAKURAMURA' : 'FORJA DE IWAMURA', x + 10, y + 13);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#e8e0f0';
  ctx.fillText('Seu ouro: $' + P.gold, x + 10, y + 24);
  const stock = estoqueLoja();
  const maxShow = 9;
  const first = clamp(G.shopIdx - 4, 0, Math.max(0, stock.length - maxShow));
  stock.slice(first, first + maxShow).forEach((s, j) => {
    const i = first + j;
    const e = shopEntry(s);
    const sel = i === G.shopIdx;
    const oy = y + 36 + j * 10;
    const owned = e.kind === 'item' ? P.items[e.id] : (P.equipInv.includes(e.id) ? 1 : 0) + (Object.values(P.equip).includes(e.id) ? 1 : 0);
    const can = P.gold >= e.price;
    if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', x + 6, oy); }
    ctx.fillStyle = sel ? (can ? '#fff' : '#e07070') : (can ? e.color : '#705a70');
    ctx.fillText(e.name, x + 14, oy);
    ctx.fillStyle = can ? '#ffd94e' : '#705a70';
    ctx.fillText('$' + e.price, x + 128, oy);
    ctx.fillStyle = '#705a80';
    ctx.fillText(e.kind === 'item' ? 'tem ' + owned : (owned ? 'obtido' : ''), x + 158, oy);
  });
  if (first > 0) { ctx.fillStyle = '#8a7ab0'; ctx.fillText('▲', x + w - 14, y + 36); }
  if (first + maxShow < stock.length) { ctx.fillStyle = '#8a7ab0'; ctx.fillText('▼', x + w - 14, y + 36 + (maxShow - 1) * 10); }
  const cur = shopEntry(stock[G.shopIdx]);
  ctx.fillStyle = cur.color;
  ctx.fillText(cur.desc, x + 10, y + h - 16);
  ctx.fillStyle = '#6a5a8a';
  ctx.fillText('Z comprar · X sair', x + 10, y + h - 7);
}
function updateShop() {
  const stock = estoqueLoja();
  if (tap('up')) { G.shopIdx = (G.shopIdx + stock.length - 1) % stock.length; AU.sfx('menu'); }
  if (tap('down')) { G.shopIdx = (G.shopIdx + 1) % stock.length; AU.sfx('menu'); }
  if (tap('ok')) {
    const e = shopEntry(stock[G.shopIdx]);
    if (P.gold >= e.price) {
      if (e.kind === 'item') {
        if (P.items[e.id] < ITEM_CAP) { P.gold -= e.price; P.items[e.id]++; AU.sfx('coin'); saveGame(); }
        else { toast('Mochila de itens cheia!'); AU.sfx('back'); }
      } else {
        if (P.equipInv.length < 18) {
          P.gold -= e.price; P.equipInv.push(e.id); AU.sfx('coin'); saveGame();
          if (G.shopId === 'mascate' && G.shopNPC) {
            if (G.shopNPC.id === 'merc_sanzo' && Math.random() < 0.05) awardPetChance('nekomatinha');
            if (EQUIP[e.id].rar === 'raro' && Math.random() < 0.04) awardPetChance('kodama');
          }
        }
        else { toast('Mochila cheia!'); AU.sfx('back'); }
      }
    } else AU.sfx('back');
  }
  if (tap('back')) { G.state = 'world'; AU.sfx('back'); }
}

function desmontar(idx) {
  const id = P.equipInv[idx];
  const yl = dismantleFromInv(idx);
  if (!yl) return;
  AU.sfx('ok');
  toast(EQUIP[id].name + ' → ◆' + yl.frags + ' · ' + matsText(yl.mats));
  burstScreen(VW / 2, VH / 2, 24, { color: ['#9aa0b0', '#d8d0b0', '#e0a0c8'], spdMax: 90, lifeMax: 0.7, size: 2, g: 90 });
  saveGame();
}
