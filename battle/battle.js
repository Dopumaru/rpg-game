'use strict';
/* ============================================================
   battle/battle.js — motor de batalha e HUD (técnicas, turnos, dano,
   animações, desenho da tela de combate)
   Extraído de index.html (sexta extração estrutural planejada com o
   Graphify, após render/tiles.js, economy/shop.js, quests/quests.js,
   craft/altar.js e sprites/sprites.js). Engine e HUD ficam no MESMO
   arquivo (ao contrário dos módulos anteriores) porque a análise de
   dependências do Graphify encontrou uma dependência circular real
   entre eles (drawBattle/drawActionFX leem estado calculado pelo
   motor; o motor dispara efeitos visuais) — não dá para separar sem
   quebrar a direção de uma das duas dependências.
   Script clássico (não é módulo ES) — compartilha o mesmo escopo
   léxico global de index.html via <script src>. Depende por nome (sem
   import) de: ENEMIES, EQUIP, PETS, PET_ABILITY, PET_DROPS, BOSS_PETS,
   RARITY, G, P, AU, ctx, VW, VH, TILE, gainXP(), checaMarcosPets(),
   spawnParticle(), barRect(), toast(), saveGame(), showMsg(),
   matsText(), burst(), burstScreen(), addFloater(), clamp(), lerp(),
   pick(), rnd(), irnd(), tap(), drawWorld(), eff(), matQty(),
   addMats(), heroSprite(), battleSprite(), enemySprite(), petSprite(),
   rollLoot(), rollFrags(), rollMats(), addEquipToInv(), questMatou(),
   questColetou() — todos
   continuam definidos em index.html ou nos módulos já extraídos
   (economy/shop.js, quests/quests.js, sprites/sprites.js) e
   acessíveis por nome sem export.
   ============================================================ */

// ---------- Técnicas (waza) ----------
// Cada arma tem um repertório grande; o herói equipa no máximo 4 por vez
// e escolhe o que esquecer ao aprender algo novo (estilo Pokémon).
const SKILLS = {
  // --- Katana (Samurai) ---
  golpe:    { name: 'Kesagiri',        mp: 5,  anim: 'slash',  desc: 'Corte diagonal · 1.8x' },
  kiai:     { name: 'Kiai',            mp: 8,  anim: 'buff',   desc: 'Grito · +ATQ por 3 turnos' },
  tsubame:  { name: 'Tsubame Gaeshi',  mp: 10, anim: 'slash2', desc: 'Corte da andorinha · 2x de 1.1x' },
  iai:      { name: 'Iai-nuki',        mp: 14, anim: 'iai',    desc: 'Saque relâmpago · 3x' },
  zanshin:  { name: 'Zanshin',         mp: 9,  anim: 'guard',  desc: 'Postura firme · +DEF e cura 15%' },
  hyakuretsu:{name: 'Hyakuretsu',      mp: 20, anim: 'flurry', desc: 'Cem cortes · 4x de 0.85x' },
  // --- Shakujo (Onmyoji) ---
  fogo:     { name: 'Katon',           mp: 6,  anim: 'fire',   desc: 'Chama espiritual · 2.2x MAG' },
  gelo:     { name: 'Hyoton',          mp: 10, anim: 'ice',    desc: 'Gelo · 1.8x, pode congelar' },
  kekkai:   { name: 'Kekkai',          mp: 9,  anim: 'guard',  desc: 'Barreira · +DEF por 3 turnos' },
  meteoro:  { name: 'Raijin no Ikari', mp: 18, anim: 'thunder',desc: 'Ira do trovão · 3.5x MAG' },
  kyuketsu: { name: 'Kyuketsu',        mp: 14, anim: 'drain',  desc: 'Dreno · 1.6x e cura o dano' },
  amaterasu:{ name: 'Amaterasu',       mp: 24, anim: 'holy',   desc: 'Luz solar · 4.5x MAG' },
  // --- Tanto (Shinobi) ---
  duplo:    { name: 'Nitoryu',         mp: 5,  anim: 'slash2', desc: 'Duas lâminas · 2x de 0.9x' },
  veneno:   { name: 'Dokuba',          mp: 8,  anim: 'poison', desc: 'Presa venenosa · veneno 3 turnos' },
  kagebunshin:{name: 'Kagebunshin',    mp: 11, anim: 'flurry', desc: 'Clones · 3x de 0.8x' },
  exec:     { name: 'Kagegoroshi',     mp: 15, anim: 'iai',    desc: 'Morte na sombra · 2x crítico certo' },
  mikiri:   { name: 'Mikiri',          mp: 10, anim: 'buff',   desc: 'Leitura · +VEL e +crítico' },
  zetsumei: { name: 'Zetsumei',        mp: 22, anim: 'iai',    desc: 'Golpe fatal · 2.5x, +50% se HP baixo' },
  // --- Yumi (Kyudoka) ---
  precisa:  { name: 'Isshin Ichii',    mp: 5,  anim: 'arrow',  desc: 'Tiro focado · 1.7x, +25% crítico' },
  chuva:    { name: 'Yasogame',        mp: 10, anim: 'arrows', desc: 'Chuva de flechas · 3x de 0.7x' },
  hibashira:{ name: 'Hibashira',       mp: 12, anim: 'fire',   desc: 'Flecha incendiária · 2.2x MAG' },
  fantasma: { name: 'Kamiya',          mp: 15, anim: 'arrow',  desc: 'Flecha divina · 2.2x, ignora DEF' },
  fuujin:   { name: 'Fuujin no Ya',    mp: 14, anim: 'arrows', desc: 'Flecha do vento · 2x e +VEL' },
  tenchuu:  { name: 'Tenchuu',         mp: 22, anim: 'arrows', desc: 'Punição celeste · 4x de 0.9x' }
};
// repertório por arma: [id, nível em que se aprende]
const WEAPON_SKILLS = {
  katana:  [['golpe', 1], ['kiai', 3], ['tsubame', 6], ['iai', 9], ['zanshin', 12], ['hyakuretsu', 15]],
  shakujo: [['fogo', 1], ['gelo', 4], ['kekkai', 7], ['meteoro', 10], ['kyuketsu', 13], ['amaterasu', 16]],
  tanto:   [['duplo', 1], ['veneno', 4], ['kagebunshin', 7], ['exec', 10], ['mikiri', 13], ['zetsumei', 16]],
  yumi:    [['precisa', 1], ['chuva', 4], ['hibashira', 7], ['fantasma', 10], ['fuujin', 13], ['tenchuu', 16]]
};
const MAX_SKILLS = 4;   // técnicas equipadas ao mesmo tempo
// Ataque básico: sempre disponível, sem custo de MP
const BASIC_ATTACK = { id: 'basic', name: 'Atacar', mp: 0, anim: 'slash', desc: 'Ataque com a arma · sem custo' };

// conjunto de técnicas do caminho atual (cria vazio se ainda não existir)
function curSkills() {
  const t = weaponType();
  if (!t) return [];
  if (!P.skillSets) P.skillSets = {};
  if (!P.skillSets[t]) {
    // primeira vez com esta arma: aprende o que o nível permitir (até 4)
    P.skillSets[t] = WEAPON_SKILLS[t].filter(([, lvl]) => P.lvl >= lvl)
      .slice(0, MAX_SKILLS).map(([id]) => id);
  }
  return P.skillSets[t];
}
// técnicas equipadas que a arma atual consegue usar
function playerSkills() {
  const t = weaponType();
  if (!t) return [];
  return curSkills().filter(id => SKILLS[id]).map(id => ({ id, ...SKILLS[id] }));
}
// o que a arma atual ainda pode aprender neste nível
function learnableNow(lvl) {
  const t = weaponType();
  if (!t) return [];
  const atuais = curSkills();
  return WEAPON_SKILLS[t].filter(([id, l]) => l === lvl && !atuais.includes(id)).map(([id]) => id);
}
function knowsSkill(id) { return curSkills().includes(id); }
function equipSkill(id, replaceIdx) {
  const s = curSkills();
  if (replaceIdx !== undefined && replaceIdx !== null && s[replaceIdx]) s[replaceIdx] = id;
  else if (s.length < MAX_SKILLS) s.push(id);
  else return false;
  return true;
}
// ações disponíveis em batalha: ataque básico + técnicas equipadas
function battleActions() {
  return [BASIC_ATTACK].concat(playerSkills());
}

// ---------- Batalha ----------
function enemyStats(type, lvl) {
  const d = ENEMIES[type];
  // chefes e mini-chefes já têm stats fixos definidos; mobs comuns escalam com o nível
  const f = (d.boss || d.mini) ? 1 : 1 + (lvl - 1) * 0.22;
  return {
    type, lvl, name: d.name,
    hp: Math.round(d.hp * f), maxHp: Math.round(d.hp * f),
    atk: Math.round(d.atk * f), def: Math.round(d.def * f), spd: d.spd,
    xp: Math.round(d.xp * f), gold: irnd(Math.round(d.gold[0] * f), Math.round(d.gold[1] * f)),
    drop: d.drop, skill: d.skill, boss: !!d.boss, mini: !!d.mini
  };
}
function startBattle(ent) {
  G.stats.battles++;
  const e = enemyStats(ent.type, ent.lvl);
  G.battle = {
    enemy: e, ent,
    phase: 'entrada', t: 0,
    menuIdx: 0, sub: null, subIdx: 0,
    log: e.boss ? e.name + ' bloqueia seu caminho!' : e.name + ' (Nv.' + e.lvl + ') apareceu!',
    pAnim: 0, eAnim: 0, eFlash: 0, pFlash: 0,
    atkBuff: 0, defBuff: 0, spdBuff: 0, critBuff: 0, poison: 0, frozen: false, scrollBuff: false, pPoison: 0,
    act: null,
    hpShown: e.hp, pHpShown: P.hp, slash: null,
    petStruck: true, petAnim: 0,
    dmgPops: [], rewards: null, swirl: 0
  };
  G.state = 'battle';
  G.battleFlash = 1;
  G.shake = e.boss ? 8 : 5;
  AU.sfx(e.boss ? 'boss' : 'battle');
  AU.setTrack(AU.BATTLE);
  // entrada: faíscas convergindo para o centro
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, r0 = 150;
    spawnParticle({
      screen: true, x: VW / 2 + Math.cos(a) * r0, y: VH / 2 + Math.sin(a) * r0,
      vx: -Math.cos(a) * 240, vy: -Math.sin(a) * 240,
      life: 0.55, size: 2, color: e.boss ? '#e05050' : '#ffd94e', shrink: true
    });
  }
}
function calcDamage(atk, def, mult, isMag) {
  const raw = atk * mult * rnd(0.9, 1.1) - def * (isMag ? 0.3 : 0.5);
  return Math.max(1, Math.round(raw));
}
function battleLog(b, txt) { b.log = txt; }
function addDmgPop(b, who, val, color) {
  b.dmgPops.push({ who, val, t: 0, color: color || '#fff' });
}

function playerAttack(b, opts) {
  const o = opts || {};
  const mult = o.mult || 1;
  const E = eff();
  let dmg;
  let crit = o.forceCrit || Math.random() < E.crit + (o.critBonus || 0);
  const atkNow = E.atk + (b.atkBuff > 0 ? Math.round(E.atk * (b.scrollBuff ? 1.0 : 0.5)) : 0);
  if (b.critBuff > 0) crit = crit || Math.random() < 0.25;
  const defNow = o.ignoreDef ? 0 : b.enemy.def;
  if (o.magic) {
    dmg = calcDamage(E.mag, defNow, mult, true);
    crit = false;
  } else {
    dmg = calcDamage(atkNow, defNow, mult);
    if (crit) dmg = Math.round(dmg * (1.8 + (P.activePet === 'byakko' ? 0.2 : 0)));    // Fúria do Tigre Branco
  }
  if (P.activePet === 'dragaozinho') dmg = Math.round(dmg * 1.12);   // Fúria do Dragão Selado
  b.enemy.hp = Math.max(0, b.enemy.hp - dmg);
  b.eFlash = 0.25;
  G.shake = crit ? 6 : 3.5;
  addDmgPop(b, 'enemy', dmg, crit ? '#ffd94e' : '#fff');
  AU.sfx(o.magic ? 'magic' : (crit ? 'crit' : 'hit'));
  // impacto visual: faíscas mágicas ou respingo de golpe
  const ix = 76, iy = 74;
  if (o.magic) {
    burstScreen(ix, iy, crit ? 22 : 16, {
      color: ['#8ac0ff', '#b06ae8', '#dce8ff'], spdMax: 95, lifeMax: 0.6, size: 2, drag: 3
    });
  } else {
    burstScreen(ix, iy, crit ? 20 : 12, {
      color: crit ? ['#ffd94e', '#fff0a0', '#ff8a4e'] : ['#e8e8f0', '#c8c8d8'],
      spdMax: crit ? 120 : 80, lifeMax: 0.5, size: crit ? 2 : 1, g: 120
    });
    // rastro do corte
    b.slash = { t: 0, crit };
  }
  return { dmg, crit };
}

function enemyTurn(b) {
  b.phase = 'enemyAct'; b.t = 0;
  // veneno no jogador
  if (b.pPoison > 0) {
    const E = eff();
    const pd = Math.max(1, Math.round(E.maxHp * 0.05));
    P.hp = Math.max(0, P.hp - pd);
    addDmgPop(b, 'player', pd, '#a0e84e');
    b.pPoison--;
    if (P.hp <= 0) { b.phase = 'lose'; b.t = 0; AU.sfx('die'); return; }
  }
  // veneno no inimigo
  if (b.poison > 0) {
    const pd = Math.max(1, Math.round(b.enemy.maxHp * 0.06));
    b.enemy.hp = Math.max(0, b.enemy.hp - pd);
    addDmgPop(b, 'enemy', pd, '#a0e84e');
    b.poison--;
    if (b.enemy.hp <= 0) return;
  }
  if (b.frozen) {
    b.frozen = false;
    b.enemySkipped = true;
    return;
  }
  b.enemySkipped = false;
  const e = b.enemy;
  let mult = 1, skillName = null, venom = false;
  if (e.skill && Math.random() < e.skill.chance) {
    mult = e.skill.mult; skillName = e.skill.name; venom = !!e.skill.poison;
  }
  b.pendingEnemy = { mult, skillName, venom };
}
function applyEnemyHit(b) {
  const pe = b.pendingEnemy || { mult: 1 };
  const defNow = eff().def + (b.defBuff > 0 ? Math.round(eff().def * 0.6) : 0);
  let dmg = calcDamage(b.enemy.atk, defNow, pe.mult);
  if (P.activePet === 'genbu') dmg = Math.round(dmg * 0.88);    // Casco de Jade
  P.hp = Math.max(0, P.hp - dmg);
  b.pFlash = 0.25;
  G.shake = pe.skillName ? 6 : 4;
  addDmgPop(b, 'player', dmg, pe.skillName ? '#ff8a4e' : '#ff5a5a');
  burstScreen(268, 76, pe.skillName ? 16 : 10, {
    color: ['#e05050', '#ff8a4e', '#c03030'], spdMax: 90, lifeMax: 0.5, size: 2, g: 110
  });
  AU.sfx('hurt');
  if (pe.venom && b.pPoison <= 0) {
    b.pPoison = 3;
    addDmgPop(b, 'player', 'VENENO', '#a0e84e');
  }
  battleLog(b, pe.skillName ? b.enemy.name + ' usou ' + pe.skillName + '!' : b.enemy.name + ' atacou!');
  b.pendingEnemy = null;
}

// Bênção da Fênix: cura 10% do HP máx. no início de cada turno do jogador
function startTurnHeal(b) {
  if (P.activePet !== 'suzaku') return;
  const E = eff();
  if (P.hp >= E.maxHp) return;
  const heal = Math.max(1, Math.round(E.maxHp * 0.1));
  P.hp = Math.min(E.maxHp, P.hp + heal);
  addDmgPop(b, 'player', '+' + heal, '#ff8ac0');
}
function endBattleWin(b) {
  G.stats.kills++;
  const e = b.enemy;
  const xpGain = Math.round(e.xp * (P.activePet === 'kotodama' ? 1.2 : 1));   // Palavra de Poder
  const ups = gainXP(xpGain);
  let goldGain = Math.round(e.gold * (P.activePet === 'nekomata' ? 1.1 : 1));   // Sorte do Gato de Duas Caudas
  // mini-chefes não têm item-assinatura garantido, mas pagam um bônus de
  // ouro e material fixo — uma recompensa notável sem ser tão forte quanto
  // a garantia de item dos chefes de verdade
  if (e.mini) goldGain += Math.round(e.gold * 0.5);
  P.gold += goldGain;
  if (P.activePet === 'baku') {   // Devorador de Pesadelos
    const Emp = eff();
    P.mp = Math.min(Emp.maxMp, P.mp + Math.round(Emp.maxMp * 0.2));
  }
  // loot por raridade
  let dropTxt = null, dropColor = null;
  const loot = rollLoot(e.type);
  if (loot) {
    if (loot.startsWith('c:')) {
      const it = loot.slice(2);
      if (P.items[it] >= ITEM_CAP) {
        dropTxt = 'Mochila cheia — ' + ITEMS[it].name + ' perdido';
        dropColor = '#e07070';
      } else {
        P.items[it]++;
        dropTxt = ITEMS[it].name;
        dropColor = '#c8c8d0';
      }
    } else {
      const r = addEquipToInv(loot);
      const eq = EQUIP[loot];
      dropTxt = eq.name + ' [' + RARITY[eq.rar].name + ']' + (r.full ? ' → +' + r.gold + ' ouro' : '');
      dropColor = RARITY[eq.rar].color;
    }
  }
  const frags = rollFrags(e.type, e.lvl);
  if (frags) P.frags += frags;
  const mats = rollMats(e.type, e.lvl);
  if (e.mini) { const m = ENEMIES[e.type].mat; mats[m] = (mats[m] || 0) + 2; }
  addMats(mats);
  questMatou(e.type);
  questColetou();
  const matTxt = matsText(mats) || null;
  // pets: chefes sempre dão o seu; mobs têm chance pequena e independente
  // de deixar cada um dos filhotes ligados a eles
  let petTxt = null, petColor = null;
  let newPet = null, petCapado = false;
  const bp = BOSS_PETS[e.type];
  if (bp && !P.pets.includes(bp)) newPet = bp;   // chefe sempre garante, ignora o teto
  else for (const [id, chance] of (PET_DROPS[e.type] || [])) {
    if (!P.pets.includes(id) && Math.random() < chance) {
      if (P.pets.length < PET_CAP) newPet = id; else petCapado = true;
      break;
    }
  }
  if (newPet) {
    P.pets.push(newPet);
    if (!P.activePet) P.activePet = newPet;
    petTxt = PETS[newPet].name;
    petColor = RARITY[PETS[newPet].rar].color;
  }
  b.rewards = { xp: xpGain, gold: goldGain, ups, dropTxt, dropColor, frags, matTxt, petTxt, petColor, petCapado, newSkill: ups.newSkill };
  b.phase = 'result'; b.t = 0;
  if (ups.length) {
    AU.sfx('level');
    for (let i = 0; i < 26; i++) spawnParticle({
      screen: true, x: 268 + rnd(-18, 18), y: 118, vx: rnd(-8, 8), vy: rnd(-70, -35),
      life: rnd(0.7, 1.3), color: pick(['#ffd94e', '#fff0a0', '#6ee86e']), size: 2, shrink: true
    });
  } else AU.sfx('victory');
  // inimigo se desfaz em partículas
  burstScreen(76, 74, 24, { color: ['#e8e8f0', '#a89ac0', '#6a5a9a'], spdMax: 80, lifeMax: 0.8, size: 2, g: 60 });
  // remove do mapa
  const i = G.entities.indexOf(b.ent);
  if (i >= 0) G.entities.splice(i, 1);
  if (e.boss || e.mini) G.flags[e.type] = true;
  checaMarcosPets();
  saveGame();
}

function fleeBattle(b) {
  if (b.enemy.boss) { battleLog(b, 'Não dá para fugir de um chefe!'); b.phase = 'menu'; return; }
  const spdNow = eff().spd + (b.spdBuff > 0 ? 6 : 0);
  const chance = P.activePet === 'kitsune' ? 1 : clamp(0.5 + (spdNow - b.enemy.spd) * 0.06, 0.25, 0.95);    // Ilusão da Raposa
  if (Math.random() < chance) {
    AU.sfx('flee');
    battleLog(b, 'Você fugiu!');
    b.phase = 'fled'; b.t = 0;
  } else {
    battleLog(b, 'Não conseguiu fugir!');
    b.phase = 'playerActDone'; b.t = 0.3;
  }
}

function useItemBattle(b, id) {
  if (P.items[id] <= 0) return false;
  P.items[id]--;
  const E = eff();
  const heal = pct => {
    const h = Math.round(E.maxHp * pct);
    P.hp = Math.min(E.maxHp, P.hp + h);
    addDmgPop(b, 'player', '+' + h, '#6ee86e');
    return h;
  };
  switch (id) {
    case 'pocao':  battleLog(b, 'Poção! Recuperou ' + heal(0.45) + ' HP.'); AU.sfx('heal'); break;
    case 'pocaoG': battleLog(b, 'Poção Grande! Recuperou ' + heal(0.80) + ' HP.'); AU.sfx('heal'); break;
    case 'pao': {
      const h = heal(0.20);
      const m = Math.round(E.maxMp * 0.2);
      P.mp = Math.min(E.maxMp, P.mp + m);
      battleLog(b, 'Pão! +' + h + ' HP e +' + m + ' MP.');
      AU.sfx('heal');
      break;
    }
    case 'eter': {
      const m = Math.round(E.maxMp * 0.4);
      P.mp = Math.min(E.maxMp, P.mp + m);
      addDmgPop(b, 'player', '+' + m + 'MP', '#6ea8ff');
      battleLog(b, 'Éter! Recuperou ' + m + ' MP.');
      AU.sfx('heal');
      break;
    }
    case 'elixir':
      P.hp = E.maxHp; P.mp = E.maxMp;
      addDmgPop(b, 'player', 'MAX', '#ffd94e');
      battleLog(b, 'Elixir! HP e MP restaurados!');
      AU.sfx('heal');
      break;
    case 'antidoto':
      b.pPoison = 0;
      addDmgPop(b, 'player', 'CURA', '#a0e84e');
      battleLog(b, 'Antídoto! Status negativos curados.');
      AU.sfx('heal');
      break;
    case 'bomba': {
      const dmg = 35;
      b.enemy.hp = Math.max(0, b.enemy.hp - dmg);
      b.eFlash = 0.3;
      G.shake = 7;
      addDmgPop(b, 'enemy', dmg, '#ff8a4e');
      burstScreen(76, 70, 20, { color: ['#ffd94e', '#ff8a4e', '#e05050'], spdMax: 110, lifeMax: 0.6, g: 90, size: 2 });
      battleLog(b, 'Bomba! ' + dmg + ' de dano direto!');
      AU.sfx('crit');
      break;
    }
    case 'pergaminho':
      b.atkBuff = 3; b.scrollBuff = true;
      addDmgPop(b, 'player', 'ATQ x2', '#ffd94e');
      battleLog(b, 'Pergaminho! ATQ dobrado por 3 turnos!');
      AU.sfx('magic');
      break;
    default: AU.sfx('heal');
  }
  return true;
}

// ---------- Ações do jogador com animação ----------
// Fluxo: escolha → animação (dash + efeito) → impacto → resultado
function startPlayerAction(b, skill) {
  const anim = skill ? (SKILLS[skill.id].anim || 'slash') : 'slash';
  if (skill) P.mp -= skill.mp;
  b.act = { skill, anim, t: 0, hit: false, hits: 0, dur: ANIM_DUR[anim] || 0.7 };
  b.phase = 'playerAnim';
  b.t = 0;
  b.petStruck = false;
  battleLog(b, skill ? skill.name + '!' : 'Ataque!');
  // som de conjuração para técnicas mágicas
  if (['fire', 'ice', 'thunder', 'holy', 'drain'].includes(anim)) AU.tone(300, 0.18, 'sine', 0.05, 400);
}
// duração de cada animação (segundos)
const ANIM_DUR = {
  slash: 0.55, slash2: 0.75, iai: 0.85, flurry: 0.95, guard: 0.6, buff: 0.6,
  fire: 0.85, ice: 0.85, thunder: 0.95, holy: 1.05, drain: 0.9, poison: 0.7,
  arrow: 0.75, arrows: 0.95
};
// momentos de impacto (fração da duração) por animação
const ANIM_HITS = {
  slash: [0.45], slash2: [0.4, 0.68], iai: [0.62], flurry: [0.35, 0.5, 0.65, 0.8],
  guard: [0.4], buff: [0.4], fire: [0.6], ice: [0.6], thunder: [0.62], holy: [0.7],
  drain: [0.55], poison: [0.5], arrow: [0.55], arrows: [0.4, 0.58, 0.76]
};

// aplica o efeito de um golpe (chamado nos instantes de impacto)
function applySkillHit(b, hitIndex) {
  const sk = b.act.skill;
  const E = eff();
  if (!sk) { // ataque básico
    const r = playerAttack(b, {});
    battleLog(b, r.crit ? 'Golpe CRÍTICO!' : 'Você atacou!');
    return;
  }
  switch (sk.id) {
    // --- katana ---
    case 'golpe': playerAttack(b, { mult: 1.8 }); break;
    case 'kiai': b.atkBuff = 3; addDmgPop(b, 'player', 'ATQ+', '#ffd94e'); battleLog(b, 'Kiai! ATQ elevado!'); AU.sfx('magic'); break;
    case 'tsubame': playerAttack(b, { mult: 1.1 }); break;
    case 'iai': playerAttack(b, { mult: 3 }); G.shake = 8; break;
    case 'zanshin': {
      b.defBuff = 3;
      const h = Math.round(E.maxHp * 0.15);
      P.hp = Math.min(E.maxHp, P.hp + h);
      addDmgPop(b, 'player', '+' + h, '#6ee86e');
      battleLog(b, 'Zanshin! DEF elevada e ' + h + ' HP.');
      AU.sfx('heal');
      break;
    }
    case 'hyakuretsu': playerAttack(b, { mult: 0.85 }); break;
    // --- shakujo ---
    case 'fogo': playerAttack(b, { mult: 2.2, magic: true }); break;
    case 'gelo':
      playerAttack(b, { mult: 1.8, magic: true });
      if (Math.random() < 0.45 && !b.enemy.boss) { b.frozen = true; battleLog(b, 'Hyoton! O youkai congelou!'); }
      break;
    case 'kekkai': b.defBuff = 3; addDmgPop(b, 'player', 'DEF+', '#8ac0ff'); battleLog(b, 'Kekkai! Barreira erguida!'); AU.sfx('magic'); break;
    case 'meteoro': playerAttack(b, { mult: 3.5, magic: true }); G.shake = 10; break;
    case 'kyuketsu': {
      const r = playerAttack(b, { mult: 1.6, magic: true });
      const cura = Math.round(r.dmg * 0.8);
      P.hp = Math.min(E.maxHp, P.hp + cura);
      addDmgPop(b, 'player', '+' + cura, '#6ee86e');
      battleLog(b, 'Kyuketsu! Drenou ' + cura + ' de vida.');
      break;
    }
    case 'amaterasu': playerAttack(b, { mult: 4.5, magic: true }); G.shake = 12; break;
    // --- tanto ---
    case 'duplo': playerAttack(b, { mult: 0.9 }); break;
    case 'veneno':
      playerAttack(b, { mult: 1.2 });
      b.poison = 3;
      battleLog(b, 'Dokuba! Youkai envenenado!');
      break;
    case 'kagebunshin': playerAttack(b, { mult: 0.8 }); break;
    case 'exec': playerAttack(b, { mult: 2, forceCrit: true }); break;
    case 'mikiri':
      b.spdBuff = 3; b.critBuff = 3;
      addDmgPop(b, 'player', 'VEL+', '#a0e84e');
      battleLog(b, 'Mikiri! Reflexos aguçados!');
      AU.sfx('magic');
      break;
    case 'zetsumei': {
      const baixo = P.hp / E.maxHp < 0.35;
      playerAttack(b, { mult: baixo ? 3.75 : 2.5, forceCrit: baixo });
      if (baixo) battleLog(b, 'ZETSUMEI! Golpe desesperado!');
      G.shake = 9;
      break;
    }
    // --- yumi ---
    case 'precisa': playerAttack(b, { mult: 1.7, critBonus: 0.25 }); break;
    case 'chuva': playerAttack(b, { mult: 0.7 }); break;
    case 'hibashira': playerAttack(b, { mult: 2.2, magic: true }); break;
    case 'fantasma': playerAttack(b, { mult: 2.2, ignoreDef: true }); break;
    case 'fuujin':
      playerAttack(b, { mult: 2 });
      if (hitIndex === 0) { b.spdBuff = 3; addDmgPop(b, 'player', 'VEL+', '#a0e84e'); }
      break;
    case 'tenchuu': playerAttack(b, { mult: 0.9 }); G.shake = 7; break;
  }
}

function updateBattle(dt) {
  const b = G.battle;
  b.t += dt;
  if (b.eFlash > 0) b.eFlash -= dt;
  if (b.pFlash > 0) b.pFlash -= dt;
  // barras drenam suavemente até o valor real (leitura mais clara do dano)
  b.hpShown = Math.abs(b.hpShown - b.enemy.hp) < 0.6 ? b.enemy.hp : lerp(b.hpShown, b.enemy.hp, Math.min(1, dt * 7));
  b.pHpShown = Math.abs(b.pHpShown - P.hp) < 0.6 ? P.hp : lerp(b.pHpShown, P.hp, Math.min(1, dt * 7));
  if (b.slash) { b.slash.t += dt; if (b.slash.t > 0.28) b.slash = null; }
  for (const p of b.dmgPops) p.t += dt;
  b.dmgPops = b.dmgPops.filter(p => p.t < 1);

  switch (b.phase) {
    case 'entrada':
      // cinemática: linhas de velocidade, personagens deslizam para a arena
      if (b.t > 1.35 || tap('ok')) { b.phase = 'menu'; b.menuIdx = 0; b.t = 0; startTurnHeal(b); }
      break;
    case 'menu': {
      if (b.sub === null) {
        // lista unificada: ataque básico + técnicas equipadas
        const acts = battleActions();
        const N = acts.length;
        if (tap('up')) { b.menuIdx = (b.menuIdx + N - 1) % N; AU.sfx('menu'); }
        if (tap('down')) { b.menuIdx = (b.menuIdx + 1) % N; AU.sfx('menu'); }
        if (tap('left') || tap('right')) { b.sub = 'extra'; b.subIdx = 0; AU.sfx('menu'); }
        if (tap('ok')) {
          const a = acts[b.menuIdx];
          if (a.id === 'basic') {
            AU.sfx('ok');
            startPlayerAction(b, null);
          } else if (P.mp >= a.mp) {
            AU.sfx('ok');
            startPlayerAction(b, a);
          } else { battleLog(b, 'MP insuficiente!'); AU.sfx('back'); }
        }
      } else if (b.sub === 'extra') {
        // segunda coluna: Item / Fugir
        const N = 2;
        if (tap('up')) { b.subIdx = (b.subIdx + N - 1) % N; AU.sfx('menu'); }
        if (tap('down')) { b.subIdx = (b.subIdx + 1) % N; AU.sfx('menu'); }
        if (tap('left') || tap('right') || tap('back')) { b.sub = null; AU.sfx('back'); }
        else if (tap('ok')) {
          AU.sfx('ok');
          if (b.subIdx === 0) { b.sub = 'item'; b.subIdx = 0; }
          else { b.sub = null; fleeBattle(b); }
        }
      } else if (b.sub === 'item') {
        const its = Object.keys(ITEMS).filter(k => P.items[k] > 0);
        if (!its.length) { b.sub = null; battleLog(b, 'Sem itens!'); break; }
        if (tap('up')) { b.subIdx = (b.subIdx + its.length - 1) % its.length; AU.sfx('menu'); }
        if (tap('down')) { b.subIdx = (b.subIdx + 1) % its.length; AU.sfx('menu'); }
        b.subIdx = Math.min(b.subIdx, its.length - 1);
        if (tap('back')) { b.sub = null; AU.sfx('back'); }
        else if (tap('ok')) {
          if (useItemBattle(b, its[b.subIdx])) { b.sub = null; b.phase = 'playerActDone'; b.t = 0; b.petStruck = false; }
        }
      }
      break;
    }
    case 'playerAnim': {
      const a = b.act;
      a.t += dt;
      const k = a.t / a.dur;
      const marcos = ANIM_HITS[a.anim] || [0.5];
      // dispara os impactos nos instantes certos
      while (a.hits < marcos.length && k >= marcos[a.hits]) {
        if (b.enemy.hp > 0 || a.hits === 0) applySkillHit(b, a.hits);
        a.hits++;
      }
      if (a.t >= a.dur) { b.phase = 'playerActDone'; b.t = 0; }
      break;
    }
    case 'playerActDone':
      // o pet comemora ao lado do herói — puramente visual, pets não
      // atacam mais em batalha (só concedem status/habilidade passiva)
      if (!b.petStruck && b.t > 0.3 && P.activePet) {
        b.petStruck = true;
        b.petAnim = 0.3;
      }
      if (b.petAnim > 0) b.petAnim -= dt;
      if (b.t > (P.activePet ? 0.62 : 0.5)) {
        if (b.enemy.hp <= 0) endBattleWin(b);
        else {
          if (b.atkBuff > 0) b.atkBuff--;
          if (b.defBuff > 0) b.defBuff--;
          if (b.spdBuff > 0) b.spdBuff--;
          if (b.critBuff > 0) b.critBuff--;
          enemyTurn(b);
        }
      }
      break;
    case 'enemyAct':
      if (b.enemy.hp <= 0) { endBattleWin(b); break; }
      if (b.enemySkipped) {
        if (b.t > 0.5) { battleLog(b, b.enemy.name + ' está congelado!'); b.phase = 'menu'; startTurnHeal(b); }
        break;
      }
      if (b.pendingEnemy && b.t > 0.38) applyEnemyHit(b);
      if (!b.pendingEnemy && b.t > 0.82) {
        if (P.hp <= 0) { b.phase = 'lose'; b.t = 0; AU.sfx('die'); }
        else { b.phase = 'menu'; startTurnHeal(b); }
      }
      break;
    case 'result':
      if (b.t > 0.35 && tap('ok')) {
        if (b.enemy.type === 'dragao' && !G.victoryShown) {
          G.victoryShown = true;
          G.state = 'victory'; G.battle = null;
          saveGame();
        } else {
          const wasBoss = b.enemy.boss, bossName = b.enemy.name;
          fadeTo(() => {
            G.battle = null;
            AU.setTrack(G.map.name === 'cave' ? AU.CAVE : AU.WORLD);
            if (G.learnQueue.length) { G.state = 'learn'; G.learnIdx = 0; }
            else {
              G.state = 'world';
              if (wasBoss) showMsg(bossName + ' foi derrotado!\nA região está mais segura.');
            }
          });
        }
      }
      break;
    case 'fled':
      if (b.t > 0.8) {
        // afasta o inimigo
        if (b.ent) { b.ent.x += (b.ent.x > P.x ? 40 : -40); b.ent.moveT = 3; }
        fadeTo(() => { G.state = 'world'; G.battle = null; AU.setTrack(G.map.name === 'cave' ? AU.CAVE : AU.WORLD); });
      }
      break;
    case 'lose':
      if (b.t > 1.6) {
        G.state = 'gameover'; G.battle = null;
      }
      break;
  }
}

// ---------- Animações de combate ----------
// Desenha o efeito da técnica em curso. ex/ey = centro do inimigo,
// px/py = posição do herói. Tudo em coordenadas de tela (320x180).
const ENEMY_CX = 76, ENEMY_CY = 74, HERO_CX = 274, HERO_CY = 70;
function drawActionFX(b) {
  const a = b.act;
  if (!a) return;
  const k = clamp(a.t / a.dur, 0, 1);
  const marcos = ANIM_HITS[a.anim] || [0.5];

  switch (a.anim) {
    case 'slash': case 'slash2': case 'flurry': {
      // arcos de corte no inimigo, sincronizados com os impactos
      marcos.forEach((m, i) => {
        const dt2 = k - m;
        if (dt2 < 0 || dt2 > 0.22) return;
        const f = 1 - dt2 / 0.22;
        ctx.globalAlpha = f;
        ctx.strokeStyle = i % 2 ? '#ffd0d0' : '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const r = 30 + (1 - f) * 14, ang = -0.9 + i * 1.1;
        ctx.arc(ENEMY_CX, ENEMY_CY, r, ang, ang + 1.9);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
      });
      break;
    }
    case 'iai': {
      // saque relâmpago: carrega e corta a tela na horizontal
      if (k < 0.55) {
        ctx.globalAlpha = k * 1.2;
        ctx.fillStyle = '#ffd94e';
        ctx.fillRect(HERO_CX - 8, HERO_CY - 2, 16, 3);
      } else if (k < 0.8) {
        const f = (k - 0.55) / 0.25;
        ctx.globalAlpha = 1 - f * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, ENEMY_CY - 2, VW * (1 - f * 0.2), 4);
        ctx.fillStyle = '#ffd94e';
        ctx.fillRect(0, ENEMY_CY - 1, VW * (1 - f * 0.2), 2);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'fire': {
      // bola de fogo viajando e explodindo
      if (k < 0.6) {
        const f = k / 0.6;
        const fx = lerp(HERO_CX - 20, ENEMY_CX, f), fy = lerp(HERO_CY, ENEMY_CY, f);
        const r = 5 + Math.sin(G.time * 30) * 1.5;
        ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.arc(fx, fy, r + 2, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(fx, fy, r, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#fff8c0'; ctx.beginPath(); ctx.arc(fx, fy, r * 0.5, 0, 6.3); ctx.fill();
        if (Math.random() < 0.6) spawnParticle({ screen: true, x: fx, y: fy, vx: rnd(-20, 20), vy: rnd(-10, 25), life: 0.35, size: 2, color: pick(['#ff8a3a', '#ffd040']), shrink: true });
      } else {
        const f = (k - 0.6) / 0.4;
        ctx.globalAlpha = 1 - f;
        ctx.fillStyle = '#ffd040';
        ctx.beginPath(); ctx.arc(ENEMY_CX, ENEMY_CY, 12 + f * 30, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#ff8a3a';
        ctx.beginPath(); ctx.arc(ENEMY_CX, ENEMY_CY, 8 + f * 22, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'ice': {
      // cristais caindo sobre o inimigo
      for (let i = 0; i < 5; i++) {
        const off = i * 0.08;
        const f = clamp((k - off) / 0.6, 0, 1);
        if (f <= 0) continue;
        const ix = ENEMY_CX - 24 + i * 12;
        const iy = lerp(-10, ENEMY_CY + 4, f);
        ctx.globalAlpha = f < 0.9 ? 1 : (1 - f) * 10;
        ctx.fillStyle = '#8ac0ff';
        ctx.beginPath();
        ctx.moveTo(ix, iy - 7); ctx.lineTo(ix + 4, iy); ctx.lineTo(ix, iy + 7); ctx.lineTo(ix - 4, iy);
        ctx.fill();
        ctx.fillStyle = '#dcf0ff';
        ctx.fillRect(ix - 1, iy - 4, 2, 8);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'thunder': {
      // raio descendo em ziguezague
      if (k > 0.4 && k < 0.85) {
        const f = (k - 0.4) / 0.45;
        ctx.globalAlpha = f < 0.7 ? 1 : (1 - f) / 0.3;
        ctx.strokeStyle = '#fff8c0'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ENEMY_CX, 0);
        for (let y = 0; y < ENEMY_CY; y += 12) {
          ctx.lineTo(ENEMY_CX + Math.sin(y * 0.7 + a.t * 40) * 9, y);
        }
        ctx.lineTo(ENEMY_CX, ENEMY_CY);
        ctx.stroke();
        ctx.strokeStyle = '#8ac0ff'; ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        // clarão
        if (f < 0.25) { ctx.fillStyle = 'rgba(255,255,220,' + (0.4 * (1 - f * 4)) + ')'; ctx.fillRect(0, 0, VW, VH); }
      }
      break;
    }
    case 'holy': {
      // coluna de luz solar
      if (k > 0.35) {
        const f = clamp((k - 0.35) / 0.6, 0, 1);
        const w = 44 * Math.sin(f * Math.PI);
        const grd = ctx.createLinearGradient(0, 0, 0, VH);
        grd.addColorStop(0, 'rgba(255,248,200,0.9)');
        grd.addColorStop(1, 'rgba(255,200,80,0.15)');
        ctx.fillStyle = grd;
        ctx.fillRect(ENEMY_CX - w / 2, 0, w, 130);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * Math.sin(f * Math.PI)) + ')';
        ctx.fillRect(ENEMY_CX - w / 4, 0, w / 2, 130);
      }
      break;
    }
    case 'drain': {
      // partículas de vida indo do inimigo ao herói
      if (k > 0.5 && Math.random() < 0.8) {
        spawnParticle({
          screen: true, x: ENEMY_CX + rnd(-14, 14), y: ENEMY_CY + rnd(-14, 14),
          vx: (HERO_CX - ENEMY_CX) * 0.9, vy: (HERO_CY - ENEMY_CY) * 0.9 + rnd(-20, 20),
          life: 0.4, size: 2, color: pick(['#b06ae8', '#6ee86e', '#d8a0ff'])
        });
      }
      if (k > 0.3 && k < 0.7) {
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#b06ae8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ENEMY_CX, ENEMY_CY); ctx.lineTo(HERO_CX - 16, HERO_CY); ctx.stroke();
        ctx.lineWidth = 1; ctx.globalAlpha = 1;
      }
      break;
    }
    case 'poison': {
      if (k > 0.35) {
        const f = (k - 0.35) / 0.65;
        ctx.globalAlpha = (1 - f) * 0.7;
        ctx.fillStyle = '#7ac04a';
        ctx.beginPath(); ctx.ellipse(ENEMY_CX, ENEMY_CY + 6, 24 + f * 10, 16 + f * 6, 0, 0, 6.3); ctx.fill();
        ctx.globalAlpha = 1;
        if (Math.random() < 0.5) spawnParticle({ screen: true, x: ENEMY_CX + rnd(-20, 20), y: ENEMY_CY + rnd(-8, 12), vx: rnd(-8, 8), vy: rnd(-24, -8), life: 0.6, size: 2, color: '#a0e84e' });
      }
      break;
    }
    case 'arrow': case 'arrows': {
      // flechas voando do herói ao inimigo
      marcos.forEach((m, i) => {
        const inicio = m - 0.3;
        const f = (k - inicio) / 0.3;
        if (f < 0 || f > 1) return;
        const ax = lerp(HERO_CX - 18, ENEMY_CX + 6, f);
        const ay = lerp(HERO_CY - 4 + i * 5, ENEMY_CY + (i - 1) * 6, f) - Math.sin(f * Math.PI) * 10;
        ctx.fillStyle = '#c9a86a';
        ctx.fillRect(ax, ay, 12, 2);
        ctx.fillStyle = '#e8e4d0';
        ctx.fillRect(ax - 2, ay - 1, 4, 4);   // ponta
        ctx.fillStyle = '#e05548';
        ctx.fillRect(ax + 10, ay - 1, 3, 4);  // penas
      });
      break;
    }
    case 'guard': case 'buff': {
      // aura ao redor do herói
      const f = Math.sin(k * Math.PI);
      ctx.globalAlpha = f * 0.8;
      ctx.strokeStyle = a.anim === 'guard' ? '#8ac0ff' : '#ffd94e';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const r = 14 + i * 9 + f * 8;
        ctx.beginPath(); ctx.ellipse(HERO_CX, HERO_CY, r, r * 1.25, 0, 0, 6.3); ctx.stroke();
      }
      ctx.lineWidth = 1; ctx.globalAlpha = 1;
      if (Math.random() < 0.7) spawnParticle({
        screen: true, x: HERO_CX + rnd(-20, 20), y: HERO_CY + 24, vx: rnd(-6, 6), vy: rnd(-60, -30),
        life: 0.5, size: 2, color: a.anim === 'guard' ? '#8ac0ff' : '#ffd94e', shrink: true
      });
      break;
    }
  }
}
// deslocamento do herói durante a animação (dash de investida)
function heroLunge(b) {
  if (!b.act) return 0;
  const a = b.act, k = clamp(a.t / a.dur, 0, 1);
  const corpoACorpo = ['slash', 'slash2', 'flurry', 'iai'].includes(a.anim);
  if (!corpoACorpo) return k < 0.3 ? -Math.sin(k / 0.3 * Math.PI) * 5 : 0;
  // avança rápido, segura, volta
  if (k < 0.35) return -Math.pow(k / 0.35, 0.6) * 98;
  if (k < 0.75) return -98;
  return -98 * (1 - (k - 0.75) / 0.25);
}

// ---------- Desenho: batalha ----------
function drawBattle() {
  const b = G.battle;
  const cave = G.map.name === 'cave';
  const dusk = !cave && G.region === 'Templo Abandonado';
  if (R3.ligado) {
    ctx.clearRect(0, 0, VW, VH);
    R3.montarArena(cave ? 'cave' : G.region, cave);
  } else {
  // fundo
  const grd = ctx.createLinearGradient(0, 0, 0, VH);
  if (cave) { grd.addColorStop(0, '#1c1626'); grd.addColorStop(1, '#2e2440'); }
  else if (dusk) { grd.addColorStop(0, '#2a2040'); grd.addColorStop(1, '#6a4058'); }
  else { grd.addColorStop(0, '#4a86c6'); grd.addColorStop(1, '#8ab6e0'); }
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VW, VH);
  // chão
  ctx.fillStyle = cave ? '#3a3446' : (dusk ? '#38583a' : '#3f7a3a');
  ctx.fillRect(0, 118, VW, 62);
  ctx.fillStyle = cave ? '#443e52' : (dusk ? '#446444' : '#4c8a44');
  for (let i = 0; i < 20; i++) {
    const vx = (i * 53) % VW, vy = 122 + (i * 31) % 50;
    ctx.fillRect(vx, vy, 4, 2);
  }
  if (dusk) {
    // lua e lápides ao fundo
    ctx.fillStyle = '#d8d4c0'; ctx.beginPath(); ctx.arc(260, 30, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a4456';
    ctx.fillRect(40, 104, 10, 14); ctx.fillRect(42, 101, 6, 4);
    ctx.fillRect(240, 106, 9, 12); ctx.fillRect(242, 103, 5, 4);
  } else if (!cave) {
    // nuvens
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const cx1 = (G.time * 6) % (VW + 60) - 30;
    ctx.fillRect(cx1, 22, 34, 7); ctx.fillRect(cx1 + 6, 17, 20, 6);
    const cx2 = (G.time * 4 + 150) % (VW + 60) - 30;
    ctx.fillRect(cx2, 40, 28, 6); ctx.fillRect(cx2 + 5, 36, 16, 5);
  } else {
    // cristais
    ctx.fillStyle = '#6a5a9a';
    ctx.fillRect(30, 90, 5, 14); ctx.fillRect(270, 84, 6, 18); ctx.fillRect(282, 94, 4, 10);
    ctx.fillStyle = '#8a7ac0';
    ctx.fillRect(31, 92, 2, 10); ctx.fillRect(272, 87, 2, 13);
  }
  }

  // inimigo (esquerda-centro)
  const e = b.enemy;
  const es = enemySprite(e.type);
  const escale = e.boss ? 4.4 : 4.2;
  const ew = es.width * escale, eh = es.height * escale;
  const entrada = b.phase === 'entrada' ? clamp(b.t / 0.55, 0, 1) : 1;
  const slideE = Math.round((1 - easeOut(entrada)) * -140);
  const ex = 76 - ew / 2 + slideE + (b.phase === 'enemyAct' && b.t < 0.45 ? Math.round(b.t * 40) : 0);
  const bob = Math.sin(G.time * 2.5) * 2;
  const ey = 118 - eh + (e.boss ? 8 : 4) + bob;
  if (e.hp > 0 || b.phase !== 'result') {
    const piscaE = b.eFlash > 0 && Math.floor(b.eFlash * 20) % 2 === 0 ? 0.4 : 1;
    if (R3.ligado) {
      R3.poeCombatente('inimigo', es, ex + ew / 2, 118 + (e.boss ? 6 : 2), eh, piscaE);
    } else {
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(76, 118 + (e.boss ? 6 : 2), ew * 0.35, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = piscaE;
    ctx.drawImage(es, Math.round(ex), Math.round(ey), ew, eh);
    ctx.globalAlpha = 1;
    }
    if (b.frozen) { ctx.fillStyle = 'rgba(120,190,255,0.35)'; ctx.fillRect(ex, ey, ew, eh); }
    if (b.poison > 0) { ctx.fillStyle = '#a0e84e'; ctx.font = '8px monospace'; ctx.fillText('☠', ex + ew - 6, ey + 8); }
  }
  // jogador (direita)
  // sprite de batalha em alta resolução; troca para a pose de ataque na hora certa
  const cls = curClass();
  let pose = 'idle';
  if (b.act && b.phase === 'playerAnim') {
    const k = b.act.t / b.act.dur;
    pose = (k > 0.18 && k < 0.85) ? 'atk' : 'idle';
  }
  const bs = battleSprite(cls, pose);
  const ps = bs || heroSprite(cls, 'left', Math.floor(G.time * 3) % 2);
  const pscale = bs ? 2.1 : 4;
  const sw = bs ? 32 : 16, sh = bs ? 48 : 20;
  const slideH = Math.round((1 - easeOut(clamp((b.phase === 'entrada' ? b.t : 99) / 0.55, 0, 1))) * 150);
  // respiração sutil na pose parada
  const breath = pose === 'idle' && b.phase !== 'playerAnim' ? Math.round(Math.sin(G.time * 2.4) * 1) : 0;
  const px = 238 + Math.round(heroLunge(b)) + slideH;
  const py = 122 - sh * pscale + breath;
  const piscaP = b.pFlash > 0 && Math.floor(b.pFlash * 20) % 2 === 0 ? 0.4 : 1;
  if (R3.ligado) {
    R3.poeCombatente('heroi', ps, px + sw * pscale / 2, 122, sh * pscale, piscaP);
    R3.desenhaBat();
  } else {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(px + sw * pscale / 2, 122, 24, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = piscaP;
  ctx.drawImage(ps, px, py, sw * pscale, sh * pscale);
  ctx.globalAlpha = 1;
  }
  ctx.font = '7px monospace';
  let byo = py - 3;
  if (b.atkBuff > 0) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▲ATQ', px + 20, byo); byo -= 8; }
  if (b.defBuff > 0) { ctx.fillStyle = '#8ac0ff'; ctx.fillText('▲DEF', px + 20, byo); byo -= 8; }
  if (b.spdBuff > 0) { ctx.fillStyle = '#a0e84e'; ctx.fillText('▲VEL', px + 20, byo); byo -= 8; }
  if (b.pPoison > 0) { ctx.fillStyle = '#a0e84e'; ctx.fillText('☠', px + 4, py - 3); }
  // pet ao lado do herói
  if (P.activePet) {
    const pspr = petSprite(P.activePet);
    const lunge = b.petAnim > 0 ? -Math.round(b.petAnim * 60) : 0;
    const pbob = Math.round(Math.sin(G.time * 3.5) * 2);
    const petX = 198 + lunge, petY = 118 - 22 + pbob;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(petX + 12, 119, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(pspr, petX, petY, pspr.width * 2, pspr.height * 2);
  }

  // barra HP inimigo (some durante a cinemática de entrada)
  ctx.globalAlpha = b.phase === 'entrada' ? clamp((b.t - 0.9) / 0.35, 0, 1) : 1;
  ctx.fillStyle = 'rgba(12,10,20,0.85)';
  ctx.fillRect(8, 6, 130, 26);
  ctx.strokeStyle = e.boss ? '#c04040' : '#5a4a8a';
  ctx.strokeRect(8.5, 6.5, 129, 25);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#f0e8f8';
  ctx.fillText(e.name + '  Nv.' + e.lvl, 13, 15);
  // fantasma (dano recente) atrás da barra real
  barRect(13, 19, 110, 5, b.hpShown / e.maxHp, '#8a2a2a');
  ctx.fillStyle = e.boss ? '#e05050' : '#e08040';
  ctx.fillRect(13, 19, Math.round(110 * clamp(e.hp / e.maxHp, 0, 1)), 5);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(13, 19, Math.round(110 * clamp(e.hp / e.maxHp, 0, 1)), 1);
  ctx.fillStyle = '#cfc8e0'; ctx.fillText(e.hp + '/' + e.maxHp, 13, 31);
  ctx.globalAlpha = 1;

  // efeitos da técnica em curso
  if (b.phase === 'playerAnim') drawActionFX(b);

  // rastro do golpe sobre o inimigo
  if (b.slash) {
    const k = 1 - b.slash.t / 0.28;
    ctx.globalAlpha = k;
    ctx.strokeStyle = b.slash.crit ? '#ffd94e' : '#ffffff';
    ctx.lineWidth = b.slash.crit ? 3 : 2;
    ctx.beginPath();
    const sw = 46 * (1.15 - k * 0.35);
    ctx.moveTo(76 - sw / 2, 74 - sw / 2 + (1 - k) * 12);
    ctx.lineTo(76 + sw / 2, 74 + sw / 2 - (1 - k) * 12);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
  }
  // partículas da batalha (camada de tela)
  drawParticles(true);

  // popups de dano
  for (const p of b.dmgPops) {
    const t = p.t;
    const bx = p.who === 'enemy' ? 76 : 268;
    const by = (p.who === 'enemy' ? 60 : 62) - t * 26;
    ctx.font = 'bold 10px monospace';
    ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
    ctx.fillStyle = '#0e0c16';
    ctx.fillText('' + p.val, bx + 1, by + 1);
    ctx.fillStyle = p.color;
    ctx.fillText('' + p.val, bx, by);
    ctx.globalAlpha = 1;
  }

  // cinemática de entrada: speed lines e cartão com o nome
  if (b.phase === 'entrada') {
    const k = b.t;
    // linhas de velocidade radiais (estilo anime)
    if (k < 0.75) {
      const f = 1 - k / 0.75;
      ctx.globalAlpha = f * 0.85;
      ctx.strokeStyle = b.enemy.boss ? '#ffb0b0' : '#ffffff';
      ctx.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        const ang = (i / 26) * Math.PI * 2 + k * 0.6;
        const r0 = 40 + f * 90, r1 = r0 + 40 + f * 70;
        ctx.beginPath();
        ctx.moveTo(VW / 2 + Math.cos(ang) * r0, VH / 2 + Math.sin(ang) * r0 * 0.7);
        ctx.lineTo(VW / 2 + Math.cos(ang) * r1, VH / 2 + Math.sin(ang) * r1 * 0.7);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // cartão com o nome do youkai deslizando
    if (k > 0.45) {
      const f = clamp((k - 0.45) / 0.3, 0, 1);
      const cw = 150, cx0 = lerp(-cw, VW / 2 - cw / 2, easeOut(f));
      const sair = k > 1.1 ? (k - 1.1) / 0.25 : 0;
      ctx.globalAlpha = 1 - sair;
      ctx.fillStyle = b.enemy.boss ? 'rgba(90,10,20,0.95)' : 'rgba(20,14,34,0.95)';
      ctx.fillRect(cx0, 52, cw, 22);
      ctx.strokeStyle = b.enemy.boss ? '#e05050' : '#ffd94e';
      ctx.strokeRect(cx0 + 0.5, 52.5, cw - 1, 21);
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = b.enemy.boss ? '#ff8a8a' : '#ffd94e';
      ctx.textAlign = 'center';
      ctx.fillText(b.enemy.name, cx0 + cw / 2, 63);
      ctx.font = '7px monospace';
      ctx.fillStyle = '#c8b8e0';
      ctx.fillText(b.enemy.boss ? '— chefe youkai —' : 'Nível ' + b.enemy.lvl, cx0 + cw / 2, 71);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }
  // clarão de entrada
  if (G.battleFlash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (G.battleFlash * 0.55) + ')';
    ctx.fillRect(0, 0, VW, VH);
  }
  // painel inferior
  ctx.fillStyle = 'rgba(10,8,18,0.94)';
  ctx.fillRect(0, 126, VW, 54);
  ctx.strokeStyle = '#5a4a8a';
  ctx.strokeRect(0.5, 126.5, VW - 1, 53);

  // status do jogador (direita)
  const PE = eff();
  ctx.font = '7px monospace';
  ctx.fillStyle = '#e8e0f0';
  ctx.fillText(className() + ' Nv.' + P.lvl, 216, 138);
  barRect(216, 142, 72, 5, b.pHpShown / PE.maxHp, '#8a2a2a');
  ctx.fillStyle = P.hp / PE.maxHp < 0.3 ? '#e05050' : '#50c060';
  ctx.fillRect(216, 142, Math.round(72 * clamp(P.hp / PE.maxHp, 0, 1)), 5);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(216, 142, Math.round(72 * clamp(P.hp / PE.maxHp, 0, 1)), 1);
  ctx.fillStyle = '#cfc8e0'; ctx.fillText('HP ' + P.hp + '/' + PE.maxHp, 216, 155);
  barRect(216, 159, 72, 4, P.mp / PE.maxMp, '#5080e0');
  ctx.fillStyle = '#cfc8e0'; ctx.fillText('MP ' + P.mp + '/' + PE.maxMp, 216, 172);

  // faixa de mensagem: mostra a descrição da ação em foco durante o menu
  ctx.fillStyle = 'rgba(10,8,18,0.8)';
  ctx.fillRect(0, 112, VW, 14);
  ctx.font = '8px monospace';
  if (b.phase === 'menu' && b.sub === null) {
    const foco = battleActions()[b.menuIdx];
    ctx.fillStyle = '#b8a8d8';
    if (foco) ctx.fillText(foco.desc, 10, 122);
  } else if (b.phase === 'menu' && b.sub === 'extra') {
    ctx.fillStyle = '#b8a8d8';
    ctx.fillText(b.subIdx === 0 ? 'Usar um item da bolsa' : 'Tentar escapar da batalha', 10, 122);
  } else {
    ctx.fillStyle = '#f0e8c8';
    ctx.fillText(b.log, 10, 122);
  }

  if (b.phase === 'menu') {
    if (b.sub === null || b.sub === 'extra') {
      // coluna 1: ataque + técnicas equipadas
      const acts = battleActions();
      acts.forEach((a, i) => {
        const oy = 137 + i * 9;
        const sel = b.sub === null && i === b.menuIdx;
        const podeMp = a.mp === 0 || P.mp >= a.mp;
        if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', 8, oy); }
        ctx.fillStyle = sel ? (podeMp ? '#fff' : '#e07070') : (podeMp ? '#a89ac0' : '#6a5a70');
        ctx.fillText(a.name, 17, oy);
        if (a.mp > 0) {
          ctx.fillStyle = podeMp ? '#6ea8ff' : '#5a5070';
          ctx.fillText(a.mp + 'MP', 122, oy);
        }
      });
      // coluna 2: Item / Fugir
      ['Item', 'Fugir'].forEach((t, i) => {
        const oy = 137 + i * 9;
        const sel = b.sub === 'extra' && i === b.subIdx;
        if (sel) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', 152, oy); }
        ctx.fillStyle = sel ? '#fff' : '#8a7ab0';
        ctx.fillText(t, 161, oy);
      });
      if (b.sub === null) { ctx.fillStyle = '#5a4a70'; ctx.fillText('◀▶', 152, 137 + 2 * 9); }
    } else if (b.sub === 'item') {
      const its = Object.keys(ITEMS).filter(k => P.items[k] > 0);
      const show = 4;
      const first = clamp(b.subIdx - 2, 0, Math.max(0, its.length - show));
      its.slice(first, first + show).forEach((id, j) => {
        const i = first + j;
        const oy = 138 + j * 9;
        if (i === b.subIdx) { ctx.fillStyle = '#ffd94e'; ctx.fillText('▶', 10, oy); }
        ctx.fillStyle = i === b.subIdx ? '#fff' : '#a89ac0';
        ctx.fillText(ITEMS[id].name + ' x' + P.items[id], 20, oy);
      });
      if (first > 0) { ctx.fillStyle = '#8a7ab0'; ctx.fillText('▲', 100, 138); }
      if (first + show < its.length) { ctx.fillStyle = '#8a7ab0'; ctx.fillText('▼', 100, 165); }
      if (its[b.subIdx]) { ctx.fillStyle = '#8a7ab0'; ctx.fillText(ITEMS[its[b.subIdx]].desc, 114, 138); }
    }
  } else if (b.phase === 'result' && b.rewards) {
    const r = b.rewards;
    ctx.fillStyle = '#ffd94e';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('VITÓRIA!', 10, 140);
    ctx.font = '7px monospace';
    ctx.fillStyle = '#e8e0f0';
    ctx.fillText('+' + r.xp + ' XP   +' + r.gold + ' ouro' + (r.frags ? '   +' + r.frags + '◆' : ''), 10, 151);
    if (r.dropTxt) {
      ctx.fillStyle = r.dropColor || '#c8c8d0';
      ctx.fillText('Loot: ' + r.dropTxt, 118, 151);
    }
    if (r.matTxt) {
      ctx.fillStyle = '#9aa0b0';
      ctx.fillText(r.matTxt, 118, 161);
    }
    if (r.ups.length) {
      ctx.fillStyle = '#6ee86e';
      ctx.fillText('NÍVEL ' + r.ups[r.ups.length - 1] + '!  +' + (r.ups.length * PTS_PER_LEVEL) + ' pontos (C)', 10, 161);
      if (r.newSkill) { ctx.fillStyle = '#6ea8ff'; ctx.fillText('Nova técnica: ' + r.newSkill, 130, 171); }
    }
    if (r.petTxt) {
      ctx.fillStyle = r.petColor;
      ctx.fillText('♥ Novo espírito: ' + r.petTxt + '!', 10, 171);
    } else if (r.petCapado) {
      ctx.fillStyle = '#e07070';
      ctx.fillText('Mochila de pets cheia — um filhote fugiu', 10, 171);
    }
    if (b.t > 0.6 && Math.floor(G.time * 2) % 2) {
      ctx.fillStyle = '#a89ac0';
      ctx.fillText('Z para continuar', 220, 174);
    }
  } else if (b.phase === 'entrada') {
    ctx.fillStyle = '#a89ac0';
    ctx.font = '7px monospace';
    if (b.t > 0.9) ctx.fillText('Prepare-se...', 10, 140);
  }
}
