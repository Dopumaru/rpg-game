'use strict';
/* ============================================================
   quests/quests.js — cadeia de missões, HUD, seta guia e conversa
   com NPCs
   Extraído de index.html (terceira extração estrutural planejada com
   o Graphify, após render/tiles.js e economy/shop.js). Script
   clássico (não é módulo ES) — compartilha o mesmo escopo léxico
   global de index.html via <script src>. Depende por nome (sem
   import) de: FALAS, ITEMS, MATS, ENEMIES, G, P, AU, ctx, VW, VH,
   TILE, toast(), saveGame(), gainXP(), burstScreen(), showMsg(),
   matQty(), clamp(), tap(), drawWorld(), abreMascate() — todos
   continuam definidos em index.html (ou em economy/shop.js, no caso
   de abreMascate()) e acessíveis por nome sem export. TILES_INTERATIVOS
   e desenhaMarcaNPC() ficaram em index.html: o primeiro é usado pela
   interação genérica do mundo (tecla Z), não só por missões; o segundo
   é desenho de NPC no mundo que consulta o estado de missão, mas não é
   lógica de missão em si.
   ============================================================ */

function falaAleatoria(n) {
  const pool = FALAS[n.tema] || FALAS.vila;
  const t = pool[n.falaIdx % pool.length];
  n.falaIdx++;
  return n.nome + ':\n' + t;
}

// ---------- Missões ----------
// Cadeias curtas por mestre de missão: cada uma empurra o jogador para a
// próxima região e paga em ouro e XP o suficiente para justificar o desvio.
const QUESTS = {
  q_konpaku: {
    nome: 'Konpaku no arrozal', npc: 'anciao', nivel: 1,
    tipo: 'matar', alvo: 'slime', qtd: 6,
    local: [60, 104], dica: 'Campos de Arroz, a leste da vila',
    ouro: 70, xp: 60,
    oferta: 'Ancião Genzo:\nOs Konpaku tomaram o arrozal a leste.\nDerrube seis deles e a vila come.',
    fim: 'Ancião Genzo:\nO arrozal respira de novo.\nTome, é pouco, mas é de coração.',
    proxima: 'q_kappa'
  },
  q_kappa: {
    nome: 'Kappa na margem', npc: 'anciao', nivel: 2,
    tipo: 'matar', alvo: 'goblin', qtd: 5,
    local: [88, 92], dica: 'a margem do rio, a leste',
    ouro: 120, xp: 110,
    oferta: 'Ancião Genzo:\nOs Kappa arrastam quem chega perto\nda água. Cinco a menos já ajuda.',
    fim: 'Ancião Genzo:\nAs crianças podem voltar ao rio.\nVocê tem o agradecimento da vila.',
    proxima: 'q_lobos'
  },
  q_lobos: {
    nome: 'Lobos do planalto', npc: 'anciao', nivel: 3,
    tipo: 'matar', alvo: 'lobo', qtd: 5,
    local: [90, 35], dica: 'Planalto do Norte, na trilha alta',
    ouro: 95, xp: 85,
    oferta: 'Ancião Genzo:\nOs Okuri-inu cercam quem sobe\nsozinho a trilha do norte. Ajude\nquem ainda precisa subir.',
    fim: 'Ancião Genzo:\nA trilha está mais segura agora.\nBoa caçada, jovem guerreiro.',
    proxima: 'q_nurarihyon'
  },
  q_nurarihyon: {
    nome: 'O velho do bambuzal', npc: 'anciao', nivel: 4,
    tipo: 'matar', alvo: 'reislime', qtd: 1,
    local: [28, 74], dica: 'Bosque de Bambu, a oeste',
    ouro: 300, xp: 260, item: 'elixir',
    oferta: 'Ancião Genzo:\nNurarihyon entra nas casas e bebe\nnosso chá como se fosse dono.\nExpulse-o do bambuzal.',
    fim: 'Ancião Genzo:\nEntão o velho atrevido se foi.\nBeba você o chá desta vez.',
    proxima: 'q_aranharainha'
  },
  q_aranharainha: {
    nome: 'A rainha do bambuzal', npc: 'anciao', nivel: 5,
    tipo: 'matar', alvo: 'aranharainha', qtd: 1,
    local: [42, 78], dica: 'Bosque de Bambu, no fundo da teia',
    ouro: 200, xp: 170,
    oferta: 'Ancião Genzo:\nUma rainha teceu sua teia no\nfundo do bambuzal. Ninguém que\nentra lá volta com a roupa limpa.',
    fim: 'Ancião Genzo:\nA teia caiu com ela. O bambuzal\nrespira sem fios agora.',
    proxima: 'q_amanojaku'
  },
  q_amanojaku: {
    nome: 'O espírito da contrariedade', npc: 'anciao', nivel: 6,
    tipo: 'matar', alvo: 'amanojaku', qtd: 1,
    local: [100, 108], dica: 'Campos de Arroz, onde a colheita desandou',
    ouro: 340, xp: 300, item: 'pocaoG',
    oferta: 'Ancião Genzo:\nAmanojaku virou nossa colheita\nde cabeça para baixo só por\nteimosia. Ensine-o o contrário.',
    fim: 'Ancião Genzo:\nO arroz volta a crescer para cima.\nVocê fez o impossível parecer fácil.',
    proxima: 'q_bounty_arrozal'
  },
  q_bounty_arrozal: {
    nome: 'Caça-recompensa: Arrozal', npc: 'anciao', nivel: 4, repetivel: true,
    tipo: 'matar', alvo: 'goblin', qtd: 8,
    local: [72, 90], dica: 'Campos de Arroz — sempre há mais um Kappa',
    ouro: 90, xp: 70,
    oferta: 'Ancião Genzo:\nOs Kappa voltam sempre. Enquanto\nhouver rio, haverá trabalho pra\nquem tem coragem.',
    fim: 'Ancião Genzo:\nMais alguns dias de paz. Volte\nquando quiser — o rio não seca.'
  },
  q_ferro: {
    nome: 'Ferro para a forja', npc: 'ferreira', nivel: 3,
    tipo: 'coletar', alvo: 'ferro', qtd: 5,
    local: [116, 80], dica: 'Oni e Doro-ningyo deixam ferro',
    ouro: 150, xp: 130,
    oferta: 'Ferreira Sae:\nMinha bigorna está ociosa.\nTraga cinco Ferro Velho e eu\ntransformo em algo que corta.',
    fim: 'Ferreira Sae:\nIsso serve. O fole já está quente.\nPegue sua parte.',
    proxima: 'q_tengu'
  },
  q_tengu: {
    nome: 'Asas sobre o planalto', npc: 'ferreira', nivel: 5,
    tipo: 'matar', alvo: 'harpia', qtd: 5,
    local: [116, 36], dica: 'Planalto do Norte',
    ouro: 240, xp: 220, item: 'pocaoG',
    oferta: 'Ferreira Sae:\nOs Tengu levam o minério que\nsobe pela trilha. Cinco penas\nmenos no céu resolvem.',
    fim: 'Ferreira Sae:\nA trilha está livre. O minério chega.\nBoa caçada, essa.',
    proxima: 'q_tenguveterano'
  },
  q_tenguveterano: {
    nome: 'O senhor do ninho alto', npc: 'ferreira', nivel: 6,
    tipo: 'matar', alvo: 'tenguveterano', qtd: 1,
    local: [120, 34], dica: 'Planalto do Norte, no ninho alto',
    ouro: 260, xp: 230,
    oferta: 'Ferreira Sae:\nUm Tengu veterano lidera os que\nroubam minério do meu ninho. Corte\na cabeça e o resto se dispersa.',
    fim: 'Ferreira Sae:\nO ninho está quieto. O minério\nvolta a descer a trilha em paz.',
    proxima: 'q_yamauba'
  },
  q_yamauba: {
    nome: 'A bruxa da montanha', npc: 'ferreira', nivel: 9,
    tipo: 'matar', alvo: 'yamauba', qtd: 1,
    local: [150, 80], dica: 'Floresta de Aokigahara, na cabana torta',
    ouro: 420, xp: 380, item: 'elixir',
    oferta: 'Ferreira Sae:\nUma bruxa da montanha amaldiçoa\nquem sobe até a Aokigahara.\nMinhas peças mais finas esperam\nquem quebrar essa maldição.',
    fim: 'Ferreira Sae:\nA maldição se foi com ela.\nEssa forja te deve muito.',
    proxima: 'q_bounty_minerio'
  },
  q_bounty_minerio: {
    nome: 'Encomenda: Ferro Extra', npc: 'ferreira', nivel: 5, repetivel: true,
    tipo: 'coletar', alvo: 'ferro', qtd: 6,
    local: [140, 60], dica: 'Oni e Doro-ningyo sempre soltam mais',
    ouro: 110, xp: 90,
    oferta: 'Ferreira Sae:\nA forja nunca para. Sempre que\ntrouxer ferro, eu compenso.',
    fim: 'Ferreira Sae:\nBoa remessa. Volte quando quiser\n— o fole segue aceso.'
  },
  q_yurei: {
    nome: 'O choro do templo', npc: 'monge', nivel: 6,
    tipo: 'matar', alvo: 'fantasma', qtd: 6,
    local: [128, 124], dica: 'Templo Abandonado, ao sul',
    ouro: 280, xp: 250,
    oferta: 'Monge Eikan:\nOs Yurei não descansam porque\nninguém rezou por eles. Se a reza\nnão serve, sirva a lâmina.',
    fim: 'Monge Eikan:\nO templo silenciou.\nQue eles encontrem o caminho.',
    proxima: 'q_onigeneral'
  },
  q_onigeneral: {
    nome: 'O portão de ossos', npc: 'monge', nivel: 7,
    tipo: 'matar', alvo: 'onigeneral', qtd: 1,
    local: [160, 102], dica: 'Templo Abandonado, no portão quebrado',
    ouro: 300, xp: 260,
    oferta: 'Monge Eikan:\nUm general Oni ergueu um portão\nde ossos no templo. Enquanto ele\nrespirar, os Yurei não descansam.',
    fim: 'Monge Eikan:\nO portão caiu em pó.\nOs mortos agradecem, em silêncio.',
    proxima: 'q_kagemaru'
  },
  q_kagemaru: {
    nome: 'O onmyoji negro', npc: 'monge', nivel: 8,
    tipo: 'matar', alvo: 'necromante', qtd: 1,
    local: [164, 110], dica: 'Templo Abandonado, a leste',
    ouro: 460, xp: 420, item: 'elixir',
    oferta: 'Monge Eikan:\nKagemaru foi meu irmão de ordem.\nO que ele virou já não é irmão\nde ninguém. Termine isso.',
    fim: 'Monge Eikan:\nEntão acabou. Rezarei por ele\nagora que pode ouvir.',
    proxima: 'q_orochi'
  },
  q_orochi: {
    nome: 'A serpente das oito cabeças', npc: 'monge', nivel: 9,
    tipo: 'matar', alvo: 'dragao', qtd: 1,
    local: [96, 19], dica: 'Caverna de Orochi, no covil final',
    ouro: 700, xp: 650, item: 'elixir',
    oferta: 'Monge Eikan:\nKagemaru só invocou a sombra.\nA fonte dorme na caverna do norte.\nSele-a, ou tudo isso se repete.',
    fim: 'Monge Eikan:\nYamata-no-Orochi caiu. Que este\nvale durma em paz, enfim.',
    proxima: 'q_tsuchigumo'
  },
  q_tsuchigumo: {
    nome: 'A última teia', npc: 'monge', nivel: 10,
    tipo: 'matar', alvo: 'tsuchigumo', qtd: 1,
    local: [10, 15], dica: 'Caverna de Orochi, na teia mais profunda',
    ouro: 550, xp: 500, item: 'elixir',
    oferta: 'Monge Eikan:\nOrochi caiu, mas algo maior ainda\ntece na escuridão da caverna.\nTsuchigumo. Termine o que\ncomeçamos.',
    fim: 'Monge Eikan:\nA última teia se rompeu.\nEste vale finalmente descansa.',
    proxima: 'q_bounty_exorcismo'
  },
  q_bounty_exorcismo: {
    nome: 'Rito contínuo: Exorcismo', npc: 'monge', nivel: 8, repetivel: true,
    tipo: 'matar', alvo: 'fantasma', qtd: 8,
    local: [160, 105], dica: 'Templo Abandonado — os Yurei sempre voltam',
    ouro: 160, xp: 140,
    oferta: 'Monge Eikan:\nAs almas inquietas não têm fim.\nCada exorcismo é um alívio, ainda\nque temporário.',
    fim: 'Monge Eikan:\nMais uma alma em paz. Sempre\nhaverá outra, infelizmente.'
  }
};
function questsDoNPC(npcId) { return Object.keys(QUESTS).filter(q => QUESTS[q].npc === npcId); }
function questAtivas() { return P.quests ? Object.keys(P.quests.ativas) : []; }
function questFeita(id) { return !!(P.quests && P.quests.feitas.includes(id)); }
// próxima missão que este NPC tem a oferecer, respeitando cadeia e nível
function questOferecida(npcId) {
  for (const id of questsDoNPC(npcId)) {
    const q = QUESTS[id];
    if (questFeita(id) || P.quests.ativas[id]) continue;
    // só oferece se a anterior da cadeia já foi entregue
    const anterior = Object.keys(QUESTS).find(k => QUESTS[k].proxima === id);
    if (anterior && !questFeita(anterior)) continue;
    return id;
  }
  return null;
}
function aceitaQuest(id) {
  P.quests.ativas[id] = { prog: 0 };
  AU.sfx('level');
  toast('Missão aceita: ' + QUESTS[id].nome);
  saveGame();
}
function questCompleta(id) {
  const q = QUESTS[id], a = P.quests.ativas[id];
  return a && a.prog >= q.qtd;
}
// pets concedidos ao entregar uma missão específica: um por fim de ramo
// (o mestre não tem mais nada pra pedir) + o prêmio por fechar as 7
const QUEST_PET_REWARD = { q_ferro: 'yamawaro', q_nurarihyon: 'nekomata', q_tengu: 'tanuki', q_kagemaru: 'kitsune' };
function entregaQuest(id) {
  const q = QUESTS[id];
  delete P.quests.ativas[id];
  // repetível nunca entra em "feitas" — assim volta a ser oferecida
  // sempre que o jogador quiser (farm), sem se contar como concluída
  if (!q.repetivel) P.quests.feitas.push(id);
  P.gold += q.ouro;
  const itemCheio = q.item && (P.items[q.item] || 0) >= ITEM_CAP;
  if (q.item && !itemCheio) P.items[q.item] = (P.items[q.item] || 0) + 1;
  const ups = gainXP(q.xp);
  AU.sfx('victory');
  burstScreen(VW / 2, VH / 2, 34, { color: ['#ffd94e', '#fff0a0', '#6ee86e'], spdMax: 110, lifeMax: 1.1, size: 2, drag: 2.4 });
  let txt = q.fim + '\n\n+' + q.ouro + ' ouro   +' + q.xp + ' XP';
  if (q.item) txt += itemCheio ? '\n(mochila cheia — ' + ITEMS[q.item].name + ' perdido)' : '\n+ ' + ITEMS[q.item].name;
  if (ups.length) txt += '\nNÍVEL ' + ups[ups.length - 1] + '!';
  showMsg(txt);
  if (QUEST_PET_REWARD[id]) awardPet(QUEST_PET_REWARD[id]);
  const principais = Object.keys(QUESTS).filter(k => !QUESTS[k].repetivel);
  if (principais.every(k => P.quests.feitas.includes(k))) awardPet('byakko');
  saveGame();
}
// avanço por tipo de objetivo
function questMatou(tipo) {
  if (!P.quests) return;
  for (const id of questAtivas()) {
    const q = QUESTS[id];
    if (q.tipo !== 'matar' || q.alvo !== tipo) continue;
    const a = P.quests.ativas[id];
    if (a.prog >= q.qtd) continue;
    a.prog++;
    if (a.prog >= q.qtd) { toast('Missão pronta: ' + q.nome); AU.sfx('level'); }
  }
}
function questColetou() {
  if (!P.quests) return;
  for (const id of questAtivas()) {
    const q = QUESTS[id];
    if (q.tipo !== 'coletar') continue;
    const a = P.quests.ativas[id];
    const tinha = a.prog;
    a.prog = Math.min(q.qtd, matQty(q.alvo));
    if (a.prog > tinha && a.prog >= q.qtd) { toast('Missão pronta: ' + q.nome); AU.sfx('level'); }
  }
}
// missão em foco no HUD: a que está pronta primeiro, senão a mais antiga
function questFoco() {
  const ids = questAtivas();
  if (!ids.length) return null;
  const pronta = ids.find(id => questCompleta(id));
  return pronta || ids[0];
}
// youkai vivo mais próximo do jogador entre os tipos dados (mapa atual);
// null se nenhum estiver de pé agora — usado pra apontar a seta pro alvo
// individual mais perto, não pra um ponto fixo do mapa
function mobVivoMaisPerto(tipos) {
  let melhor = null, melhorD2 = Infinity;
  for (const e of G.entities || []) {
    if (!tipos.includes(e.type)) continue;
    const d2 = (e.x - P.x) ** 2 + (e.y - P.y) ** 2;
    if (d2 < melhorD2) { melhorD2 = d2; melhor = e; }
  }
  return melhor;
}
// quais youkai soltam este material — usado pra guiar missões de coleta
function mobsQueDropam(mat) { return Object.keys(ENEMIES).filter(k => ENEMIES[k].mat === mat && !ENEMIES[k].boss); }
// para onde a seta aponta: o youkai vivo mais próximo (missão de matar/
// coletar), o NPC quando já está pronta pra entregar, ou o ponto fixo da
// região como último recurso (nenhum alvo vivo por perto agora)
function alvoDaQuest(id) {
  const q = QUESTS[id];
  if (questCompleta(id)) {
    const n = (G.npcs || []).find(v => v.id === q.npc);
    return n ? [n.x / TILE, n.y / TILE] : q.local;
  }
  if (q.tipo === 'matar') {
    const alvo = mobVivoMaisPerto([q.alvo]);
    if (alvo) return [alvo.x / TILE, alvo.y / TILE];
  } else if (q.tipo === 'coletar') {
    const alvo = mobVivoMaisPerto(mobsQueDropam(q.alvo));
    if (alvo) return [alvo.x / TILE, alvo.y / TILE];
  }
  return q.local;
}

// ---------- HUD das missões ----------
function drawQuestHUD() {
  const id = questFoco();
  if (!id) return;
  const q = QUESTS[id], a = P.quests.ativas[id];
  const pronta = a.prog >= q.qtd;
  const w = 104, x = VW - w - 4, y = 4;
  ctx.fillStyle = 'rgba(12,10,20,0.82)';
  ctx.fillRect(x, y, w, 30);
  ctx.strokeStyle = pronta ? '#ffd94e' : '#5a4a8a';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 29);
  ctx.font = '7px monospace';
  ctx.fillStyle = pronta ? '#ffd94e' : '#a89ac0';
  ctx.fillText('◈ ' + q.nome, x + 5, y + 10);
  ctx.fillStyle = '#8a7ab0';
  const alvoNome = q.tipo === 'coletar' ? MATS[q.alvo].name : (ENEMIES[q.alvo] ? ENEMIES[q.alvo].name : q.alvo);
  ctx.fillText(pronta ? 'Volte ao ' + (QUESTS[id].npc === 'anciao' ? 'ancião' : QUESTS[id].npc === 'ferreira' ? 'ferreira' : 'monge')
    : alvoNome + '  ' + a.prog + '/' + q.qtd, x + 5, y + 20);
  // barra de progresso
  const bw = w - 10;
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(x + 5, y + 23, bw, 3);
  ctx.fillStyle = pronta ? '#ffd94e' : '#6ee86e';
  ctx.fillRect(x + 5, y + 23, Math.round(bw * clamp(a.prog / q.qtd, 0, 1)), 3);
  if (questAtivas().length > 1) {
    ctx.fillStyle = '#6a5a8a';
    ctx.fillText('+' + (questAtivas().length - 1), x + w - 12, y + 10);
  }
}
// seta apontando para o objetivo, girando em volta do jogador
function drawSetaGuia() {
  const id = questFoco();
  if (!id || G.state !== 'world') return;
  const alvo = alvoDaQuest(id);
  if (!alvo) return;
  const px = P.x / TILE, pz = P.y / TILE;
  const dx = alvo[0] - px, dz = alvo[1] - pz;
  const dist = Math.hypot(dx, dz);
  if (dist < 2.5) return;                 // já chegou: some
  const ang = Math.atan2(dz, dx);
  // o jogador fica no centro da tela nos dois renderizadores
  const cx = VW / 2 + 8, cy = VH / 2 + 4;
  const raio = 30 + Math.sin(G.time * 3) * 2;
  const ax = cx + Math.cos(ang) * raio, ay = cy + Math.sin(ang) * raio * 0.82;
  const pronta = questCompleta(id);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ang);
  ctx.fillStyle = pronta ? '#ffd94e' : '#6ee8c0';
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-4, -4.5); ctx.lineTo(-1.5, 0); ctx.lineTo(-4, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,8,18,0.85)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = pronta ? '#ffd94e' : '#6ee8c0';
  ctx.fillText(Math.round(dist) + 'm', ax, ay + (Math.sin(ang) > 0 ? 12 : -7));
  ctx.textAlign = 'left';
  ctx.lineWidth = 1;
}

// ---------- Conversa com NPC ----------
// Mestre de missão: oferece, cobra progresso ou entrega. Mascate: abre a loja
// dele. Morador: solta uma fala da região, diferente a cada vez.
function conversaNPC(n) {
  P.dir = n.y < P.y - 4 ? 'up' : n.y > P.y + 4 ? 'down' : (n.x < P.x ? 'left' : 'right');
  AU.sfx('menu');
  if (n.tipo === 'quest') {
    // 1) alguma missão dele já está pronta para entregar?
    const pronta = questAtivas().find(id => QUESTS[id].npc === n.id && questCompleta(id));
    if (pronta) { entregaQuest(pronta); return; }
    // 2) alguma em andamento?
    const andando = questAtivas().find(id => QUESTS[id].npc === n.id);
    if (andando) {
      const q = QUESTS[andando], a = P.quests.ativas[andando];
      const alvoNome = q.tipo === 'coletar' ? MATS[q.alvo].name : ENEMIES[q.alvo].name;
      showMsg(n.nome + ':\n' + q.nome + ' — ' + a.prog + '/' + q.qtd + ' ' + alvoNome + '.\n' + q.dica + '.');
      return;
    }
    // 3) tem missão nova para oferecer?
    const nova = questOferecida(n.id);
    if (nova) {
      const q = QUESTS[nova];
      if (P.lvl < q.nivel) {
        showMsg(n.nome + ':\nVocê ainda é verde para o que preciso.\nVolte com nível ' + q.nivel + '.');
        return;
      }
      G.questOferta = nova;
      G.state = 'quest';
      return;
    }
    showMsg((n.linha ? n.linha : n.nome + ':\nNada por ora.') + '\n\n(Nenhuma missão no momento.)');
    return;
  }
  if (n.tipo === 'viajante') { abreMascate(n); return; }
  if (n.tipo === 'pesca') {
    G.pescaNPC = n; G.pescaTab = 0; G.pescaIdx = 0; G.state = 'peixaria'; AU.sfx('ok');
    return;
  }
  showMsg(falaAleatoria(n));
}

// ---------- Tela de oferta de missão ----------
function drawQuestOferta() {
  drawWorld(true);
  ctx.fillStyle = 'rgba(8,6,16,0.86)';
  ctx.fillRect(0, 0, VW, VH);
  const q = QUESTS[G.questOferta];
  const x = 30, y = 26, w = VW - 60, h = VH - 60;
  ctx.fillStyle = 'rgba(26,20,42,0.98)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd94e';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#ffd94e';
  ctx.fillText('◈ ' + q.nome, x + 10, y + 14);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#d8cce8';
  q.oferta.split('\n').forEach((l, i) => ctx.fillText(l, x + 10, y + 28 + i * 9));
  const base = y + 28 + q.oferta.split('\n').length * 9 + 6;
  ctx.fillStyle = '#8a7ab0';
  const alvoNome = q.tipo === 'coletar' ? MATS[q.alvo].name : ENEMIES[q.alvo].name;
  ctx.fillText('Objetivo: ' + (q.tipo === 'coletar' ? 'reunir ' : 'derrotar ') + q.qtd + ' ' + alvoNome, x + 10, base);
  ctx.fillText('Onde: ' + q.dica, x + 10, base + 9);
  ctx.fillStyle = '#ffd94e';
  ctx.fillText('Paga: ' + q.ouro + ' ouro · ' + q.xp + ' XP' + (q.item ? ' · ' + ITEMS[q.item].name : ''), x + 10, base + 21);
  ['Aceitar', 'Agora não'].forEach((t, i) => {
    const sel = G.questIdx === i;
    ctx.fillStyle = sel ? '#ffd94e' : '#705a80';
    ctx.fillText((sel ? '▶ ' : '  ') + t, x + 10 + i * 66, y + h - 10);
  });
}
function updateQuestOferta() {
  if (tap('left') || tap('right')) { G.questIdx = G.questIdx ? 0 : 1; AU.sfx('menu'); }
  if (tap('ok')) {
    if (G.questIdx === 0) aceitaQuest(G.questOferta);
    else AU.sfx('back');
    G.state = 'world'; G.questIdx = 0;
  }
  if (tap('back')) { G.state = 'world'; G.questIdx = 0; AU.sfx('back'); }
}
