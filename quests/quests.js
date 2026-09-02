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
    oferta: 'Reiko:\nOs Konpaku tomaram o arrozal a leste.\nMeu avô resolveria isso sem pensar\nduas vezes. Eu... só tenho você.',
    fim: 'Reiko:\nO arrozal respira de novo.\nTalvez eu não precise ser ele pra\nfazer alguma diferença. Passe pela\nestátua dele na praça — acho que ele gostaria de saber.',
    proxima: 'q_kappa'
  },
  q_kappa: {
    nome: 'Kappa na margem', npc: 'anciao', nivel: 2,
    tipo: 'matar', alvo: 'goblin', qtd: 5,
    local: [88, 92], dica: 'a margem do rio, a leste',
    ouro: 120, xp: 110,
    oferta: 'Reiko:\nOs Kappa arrastam quem chega perto\nda água. Cinco a menos já ajuda —\ne já é mais do que eu conseguiria sozinha.',
    fim: 'Reiko:\nAs crianças podem voltar ao rio.\nA vila agradece a você.\nEu só assino o nome dela nisso.',
    proxima: 'q_lobos'
  },
  q_lobos: {
    nome: 'Lobos do planalto', npc: 'anciao', nivel: 3,
    tipo: 'matar', alvo: 'lobo', qtd: 5,
    local: [90, 35], dica: 'Planalto do Norte, na trilha alta',
    ouro: 95, xp: 85,
    oferta: 'Reiko:\nOs Okuri-inu cercam quem sobe\nsozinho a trilha do norte. Meu avô\nsubiu aquela trilha cem vezes. Eu nunca subi.',
    fim: 'Reiko:\nA trilha está mais segura agora.\nEle ficaria orgulhoso — acho que é\na primeira vez que penso isso sem doer.',
    proxima: 'q_nurarihyon'
  },
  q_nurarihyon: {
    nome: 'O velho do bambuzal', npc: 'anciao', nivel: 4,
    tipo: 'matar', alvo: 'reislime', qtd: 1,
    local: [28, 74], dica: 'Bosque de Bambu, a oeste',
    ouro: 300, xp: 260, item: 'elixir',
    oferta: 'Reiko:\nNurarihyon entra nas casas e bebe\nnosso chá como se fosse dono — porque\nna vida do meu avô, nunca ousou. Expulse-o.',
    fim: 'Reiko:\nEntão o velho atrevido se foi.\nBeba você o chá desta vez — você\nganhou isso mais do que eu jamais ganharia.',
    proxima: 'q_aranharainha'
  },
  q_aranharainha: {
    nome: 'A rainha do bambuzal', npc: 'anciao', nivel: 5,
    tipo: 'matar', alvo: 'aranharainha', qtd: 1,
    local: [42, 78], dica: 'Bosque de Bambu, no fundo da teia',
    ouro: 200, xp: 170,
    oferta: 'Reiko:\nUma rainha teceu sua teia no\nfundo do bambuzal, animada com a\nidade do meu avô. Ela não sabe da sua.',
    fim: 'Reiko:\nA teia caiu com ela. O bambuzal\nrespira sem fios agora. Estou começando\na acreditar que isso vai dar certo.',
    proxima: 'q_amanojaku'
  },
  q_amanojaku: {
    nome: 'O espírito da contrariedade', npc: 'anciao', nivel: 6,
    tipo: 'matar', alvo: 'amanojaku', qtd: 1,
    local: [100, 108], dica: 'Campos de Arroz, onde a colheita desandou',
    ouro: 340, xp: 300, item: 'pocaoG',
    oferta: 'Reiko:\nAmanojaku virou nossa colheita\nde cabeça para baixo só por teimosia.\nMeu avô riria disso. Eu só quero resolver.',
    fim: 'Reiko:\nO arroz volta a crescer para cima.\nVocê fez o impossível parecer fácil —\ntalvez seja hora de eu parar de me comparar a ele.',
    proxima: 'q_bounty_arrozal'
  },
  q_bounty_arrozal: {
    nome: 'Caça-recompensa: Arrozal', npc: 'anciao', nivel: 4, repetivel: true,
    tipo: 'matar', alvo: 'goblin', qtd: 8,
    local: [72, 90], dica: 'Campos de Arroz — sempre há mais um Kappa',
    ouro: 68, xp: 53,
    oferta: 'Reiko:\nOs Kappa voltam sempre. Enquanto\nhouver rio, haverá trabalho — e\nagora eu sei a quem pedir.',
    fim: 'Reiko:\nMais alguns dias de paz. Volte\nquando quiser — o rio não seca,\ne nem a minha gratidão.'
  },
  q_ferro: {
    nome: 'Ferro para a forja', npc: 'ferreira', nivel: 3,
    tipo: 'coletar', alvo: 'ferro', qtd: 5,
    local: [116, 80], dica: 'Oni e Doro-ningyo deixam ferro',
    ouro: 150, xp: 130,
    oferta: 'Homura:\nMinha bigorna está ociosa. Traga\ncinco Ferro Velho e eu transformo\nem algo que corta — já fiz pior com corrente.',
    fim: 'Homura:\nIsso serve. O fole já está quente.\nPegue sua parte — e lembre: toda\nlâmina boa já foi outra coisa antes.\nA minha primeira foi uma corrente,\nantes de Kuniyasu nos libertar.',
    proxima: 'q_tengu'
  },
  q_tengu: {
    nome: 'Asas sobre o planalto', npc: 'ferreira', nivel: 5,
    tipo: 'matar', alvo: 'harpia', qtd: 5,
    local: [116, 36], dica: 'Planalto do Norte',
    ouro: 240, xp: 220, item: 'pocaoG',
    oferta: 'Homura:\nOs Tengu levam o minério que sobe\npela trilha. Cinco penas a menos\nno céu, e eu paro de perder tempo esperando.',
    fim: 'Homura:\nA trilha está livre. O minério chega.\nBoa caçada, essa — quase tão\nsatisfatória quanto forjar pra um\nreino que não precisa mais implorar por ferro.',
    proxima: 'q_tenguveterano'
  },
  q_tenguveterano: {
    nome: 'O senhor do ninho alto', npc: 'ferreira', nivel: 6,
    tipo: 'matar', alvo: 'tenguveterano', qtd: 1,
    local: [120, 34], dica: 'Planalto do Norte, no ninho alto',
    ouro: 260, xp: 230,
    oferta: 'Homura:\nUm Tengu veterano lidera os que\nroubam minério do meu ninho. Corte\na cabeça — os Onis não são os únicos que sabem tomar o que não é deles.',
    fim: 'Homura:\nO ninho está quieto. O minério\nvolta a descer a trilha em paz.\nGuarde essa sensação — não dura.',
    proxima: 'q_yamauba'
  },
  q_yamauba: {
    nome: 'A bruxa da montanha', npc: 'ferreira', nivel: 9,
    tipo: 'matar', alvo: 'yamauba', qtd: 1,
    local: [150, 80], dica: 'Floresta de Aokigahara, na cabana torta',
    ouro: 420, xp: 380, item: 'elixir',
    oferta: 'Homura:\nUma bruxa da montanha amaldiçoa\nquem sobe até a Aokigahara. Minhas\npeças mais finas esperam quem quebrar essa maldição.',
    fim: 'Homura:\nA maldição se foi com ela.\nEssa forja te deve muito —\ne eu não digo isso fácil. Kuniyasu\nlibertou meu corpo; parece que você anda libertando o resto de nós.',
    proxima: 'q_bounty_minerio'
  },
  q_bounty_minerio: {
    nome: 'Encomenda: Ferro Extra', npc: 'ferreira', nivel: 5, repetivel: true,
    tipo: 'coletar', alvo: 'ferro', qtd: 6,
    local: [140, 60], dica: 'Oni e Doro-ningyo sempre soltam mais',
    ouro: 83, xp: 68,
    oferta: 'Homura:\nA forja nunca para. Sempre que\ntrouxer ferro, eu compenso — não\ntenho tempo pra fingir educação sobre isso.',
    fim: 'Homura:\nBoa remessa. Volte quando quiser\n— o fole segue aceso, e o front\nOni não vai esperar a gente descansar.'
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
    local: [164, 106], dica: 'Templo Abandonado, a leste',
    ouro: 460, xp: 420, item: 'elixir',
    oferta: 'Monge Eikan:\nKagemaru foi meu irmão de ordem.\nTemeu que a paz de Kuniyasu não\ndurasse, e foi buscar poder onde não devia. Termine isso.',
    fim: 'Monge Eikan:\nEntão acabou. Rezarei por ele\nagora que pode ouvir — e pelo\nmedo que o perdeu, que também é nosso.',
    proxima: 'q_orochi'
  },
  q_orochi: {
    nome: 'A serpente das oito cabeças', npc: 'monge', nivel: 9,
    tipo: 'matar', alvo: 'dragao', qtd: 1,
    local: [96, 19], dica: 'Caverna de Orochi, no covil final',
    ouro: 700, xp: 650, item: 'elixir',
    oferta: 'Monge Eikan:\nKagemaru só invocou a sombra.\nA fonte dorme na caverna do norte,\nguardada por algo que nem os Deuses tocam à toa. Sele-a.',
    fim: 'Monge Eikan:\nYamata-no-Orochi caiu. Que este\nvale durma em paz — e que os\nDeuses tenham visto o que eu vi.',
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
    ouro: 120, xp: 105,
    oferta: 'Monge Eikan:\nAs almas inquietas não têm fim.\nCada exorcismo é um alívio, ainda\nque temporário.',
    fim: 'Monge Eikan:\nMais uma alma em paz. Sempre\nhaverá outra, infelizmente.'
  },
  // --- Vila Takara (Fase 2): 'coletar' em vez de 'matar' de propósito —
  // a expansão ainda não tem youkai próprios (fase 3), então uma cadeia de
  // caça na região nova não seria cumprível ainda; material se obtém
  // desmontando equipamento em qualquer lugar do jogo já hoje
  q_jade_takara: {
    nome: 'Jade da veia funda', npc: 'gemologa', nivel: 4,
    tipo: 'coletar', alvo: 'jade', qtd: 4,
    local: [160, 45], dica: 'amuletos desmontados devolvem Jade Bruta',
    ouro: 140, xp: 120,
    oferta: 'Aiko:\nA veia de jade ficou funda demais\npara os meus joelhos. Traga 4 Jade\nBruta e eu conto o resto.',
    fim: 'Aiko:\nA montanha ainda guarda mais do\nque nós merecemos. Obrigada.',
    proxima: 'q_jade_takara2'
  },
  q_jade_takara2: {
    nome: 'O peso da montanha', npc: 'gemologa', nivel: 6,
    tipo: 'coletar', alvo: 'jade', qtd: 6,
    local: [160, 45], dica: 'amuletos desmontados devolvem Jade Bruta',
    ouro: 260, xp: 230,
    oferta: 'Aiko:\nSeis Jade Bruta desta vez — não é\nganância, é o preço de manter\nTakara de pé sem depender de ninguém.',
    fim: 'Aiko:\nCom isso sustentamos o inverno.\nKuniyasu unificou os quatro povos,\nmas foi a pedra que sempre nos\nmanteve vivos aqui em cima.',
    proxima: 'q_boss_takara'
  },
  q_osso_kurogane: {
    nome: 'Osso do pântano', npc: 'ferreiro_negro', nivel: 4,
    tipo: 'coletar', alvo: 'osso', qtd: 4,
    local: [160, 104], dica: 'elmos e armas desmontados devolvem Osso Antigo',
    ouro: 140, xp: 120,
    oferta: 'Sumi:\nO pântano cospe osso velho toda\nlua cheia. Traga 4 Osso Antigo —\neu sei o que fazer com eles.',
    fim: 'Sumi:\nBom aço precisa de cal de osso.\nNão pergunte de onde vem o resto\nda receita.',
    proxima: 'q_osso_kurogane2'
  },
  q_osso_kurogane2: {
    nome: 'Ferro negro de verdade', npc: 'ferreiro_negro', nivel: 6,
    tipo: 'coletar', alvo: 'osso', qtd: 6,
    local: [160, 104], dica: 'elmos e armas desmontados devolvem Osso Antigo',
    ouro: 260, xp: 230,
    oferta: 'Sumi:\nMais 6 Osso Antigo, e eu forjo algo\nque nenhuma vila de cima jamais vai\nter — porque nenhuma delas ousaria.',
    fim: 'Sumi:\nAs outras vilas nos expulsaram por\nfumaça e cheiro. Kuniyasu nunca nos\nexpulsou. Isso eu não esqueço.',
    proxima: 'q_boss_kurogane'
  },
  q_seda_minato: {
    nome: 'Seda para o comércio', npc: 'porteiro_minato', nivel: 4,
    tipo: 'coletar', alvo: 'seda', qtd: 4,
    local: [42, 78], dica: 'corpo, luvas e botas desmontados devolvem Seda Youkai',
    ouro: 140, xp: 120,
    oferta: 'Tsukasa:\nUm mercador promete um bom preço\npor Seda Youkai — mas primeiro\nprecisamos de 4 pra fechar o lote.',
    fim: 'Tsukasa:\nNegócio fechado. O porto de Minato\nvive disso: do que sobra de youkai\nvira sustento de gente.',
    proxima: 'q_seda_minato2'
  },
  q_seda_minato2: {
    nome: 'Rota comercial', npc: 'porteiro_minato', nivel: 6,
    tipo: 'coletar', alvo: 'seda', qtd: 6,
    local: [42, 78], dica: 'corpo, luvas e botas desmontados devolvem Seda Youkai',
    ouro: 260, xp: 230,
    oferta: 'Tsukasa:\nSeis Seda Youkai abrem uma rota\nnova rio acima — direto até Iwamura,\nse tudo correr bem.',
    fim: 'Tsukasa:\nRota aberta. Antes de Kuniyasu, cada\nvila comerciava sozinha e desconfiada.\nAgora um barco meu pode atracar em\nqualquer doca do vale.',
    proxima: 'q_boss_minato'
  },
  // chefes das 3 vilas da expansão (Fase 4) — fecham cada cadeia, no mesmo
  // pé que q_nurarihyon/q_kagemaru fecham as cadeias originais
  q_boss_takara: {
    nome: 'O guardião da montanha', npc: 'gemologa', nivel: 12,
    tipo: 'matar', alvo: 'yamanushi', qtd: 1,
    local: [320, 90], dica: 'nas profundezas dos Picos de Takara',
    ouro: 380, xp: 420, item: 'elixir',
    oferta: 'Aiko:\nA veia mais funda de jade fica sob os pés\nde Yama-nushi. Ninguém que desceu até lá\nvoltou pra contar o que viu — só o eco de quem gritou.',
    fim: 'Aiko:\nO guardião caiu. A montanha finalmente\nnos deixa cavar fundo sem pedir licença\na mais ninguém — nem a ele, nem a Iwamura.'
  },
  q_boss_kurogane: {
    nome: 'O uivo nas cinzas', npc: 'ferreiro_negro', nivel: 9,
    tipo: 'matar', alvo: 'inugami', qtd: 1,
    local: [150, 200], dica: 'no fundo do Pântano Negro',
    ouro: 320, xp: 350, item: 'elixir',
    oferta: 'Sumi:\nAntes de nós, outro ferreiro forjou aqui — e\nmorreu maldizendo o próprio cão. O bicho\nainda ronda as cinzas da forja dele.',
    fim: 'Sumi:\nSilêncio, finalmente. Vou forjar sobre as\ncinzas dele agora — parece justo.'
  },
  q_boss_minato: {
    nome: 'A fera do estreito', npc: 'porteiro_minato', nivel: 8,
    tipo: 'matar', alvo: 'wani', qtd: 1,
    local: [340, 200], dica: 'nas águas fundas da Baía de Minato',
    ouro: 280, xp: 300, item: 'elixir',
    oferta: 'Tsukasa:\nNenhum barco atravessa o estreito leste.\nUm wani enorme afunda tudo que tenta.\nSem isso resolvido, a rota nova não serve de nada.',
    fim: 'Tsukasa:\nO estreito está livre. Agora sim — Minato\npode comerciar com o mundo inteiro, não só\ncom quem já confiava na gente.'
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
  // deixa claro onde pegar a próxima missão: é sempre o mesmo mestre —
  // só falta indicar se já dá pra falar de novo ou se falta nível
  const nextId = questOferecida(q.npc);
  if (nextId) {
    const npcNome = q.fim.split(':')[0];
    const nq = QUESTS[nextId];
    txt += P.lvl >= nq.nivel
      ? '\n\n▶ Fale de novo com ' + npcNome + ' — há mais trabalho.'
      : '\n\n▶ Volte com nível ' + nq.nivel + ' para a próxima missão de ' + npcNome + '.';
  }
  showMsg(txt);
  if (QUEST_PET_REWARD[id]) awardPet(QUEST_PET_REWARD[id]);
  const principais = Object.keys(QUESTS).filter(k => !QUESTS[k].repetivel);
  if (principais.every(k => P.quests.feitas.includes(k))) awardPet('byakko');
  saveGame();
}
// desiste de uma missão secundária ativa (não conta como feita — pode ser
// oferecida de novo depois). A missão principal (tutorial) nunca aparece
// aqui: ela não ocupa a única vaga de missão secundária.
function desistirQuest(id) {
  if (!P.quests.ativas[id]) return;
  delete P.quests.ativas[id];
  toast('Missão abandonada: ' + QUESTS[id].nome);
  AU.sfx('back');
  saveGame();
}

// ---------- Missão principal (tutorial) ----------
// Um guia opcional, sempre ativo desde o início, cobrindo todos os sistemas
// do jogo. Paga pouco de propósito — é ensino, não é a missão de verdade.
// Ao contrário das missões normais, não ocupa a vaga de missão secundária
// (P.quests.ativas) nem tem NPC dono: fica sempre visível no diário (J).
const MAIN_QUEST_STEPS = [
  { id: 'mover',    nome: 'Primeiros passos',     desc: 'Mova-se e corra (Shift) pelo mundo.',        ouro: 15, xp: 15 },
  { id: 'falar',    nome: 'Um rosto amigo',       desc: 'Converse com alguém (Z).',                   ouro: 15, xp: 15 },
  { id: 'aceitar',  nome: 'Trabalho a fazer',     desc: 'Aceite uma missão de um mestre de missão.',  ouro: 20, xp: 20 },
  { id: 'menu',     nome: 'O que você carrega',   desc: 'Abra o menu de status (C).',                 ouro: 15, xp: 15, item: 'bot1' },
  { id: 'equipar',  nome: 'Vestindo a armadura',  desc: 'Equipe um item na aba de Equipamento.',      ouro: 20, xp: 20 },
  { id: 'mapa',     nome: 'Conhecendo o terreno', desc: 'Abra o mapa interativo (M).',                ouro: 15, xp: 15 },
  { id: 'pescar',   nome: 'Paciência de pescador',desc: 'Pesque em qualquer água.',                   ouro: 20, xp: 20 },
  { id: 'encantar', nome: 'Poder oculto',         desc: 'Encante um equipamento no altar.',           ouro: 25, xp: 25 },
  { id: 'pet',      nome: 'Um companheiro',       desc: 'Consiga um pet.',                            ouro: 25, xp: 25 },
  { id: 'tecnica',  nome: 'Novos golpes',         desc: 'Aprenda ou troque uma técnica equipada.',    ouro: 20, xp: 20 },
  { id: 'loja',     nome: 'Moedas em movimento',  desc: 'Compre algo numa loja.',                     ouro: 15, xp: 15 },
  { id: 'batalha',  nome: 'Primeira vitória',     desc: 'Vença uma batalha.',                         ouro: 20, xp: 20 }
];
// alguns passos são detectáveis por estado já existente (sem precisar de um
// gancho novo espalhado pelo código); os demais dependem de marcaTutorial()
// chamada no ponto exato da ação (ver world.js, battle.js, shop.js, index.html)
function mainStepDone(id) {
  switch (id) {
    case 'pescar':   return P.peixes.length > 0;
    case 'encantar': return Object.keys(P.ench).length > 0;
    case 'pet':      return P.pets.length > 0;
    case 'aceitar':  return Object.keys(P.quests.ativas).length > 0 || P.quests.feitas.length > 0;
    // 'batalha' não usa G.stats.kills como os outros derivados: G.stats
    // não é reiniciado por newPlayer()/DBG.start() (só por loadGame()), então
    // sobrevive entre partidas na mesma aba/sessão — marcado por gancho
    // explícito em endBattleWin() em vez de depender dele.
    default:         return !!P.quests.mainFlags[id];
  }
}
function marcaTutorial(id) {
  if (!P || !P.quests) return;
  P.quests.mainFlags[id] = true;
}
// roda a cada quadro: paga a recompensa (uma única vez por passo) assim que
// ele é detectado como concluído, seja por gancho explícito ou por estado
function updateMainQuest() {
  if (!P || !P.quests) return;
  for (const s of MAIN_QUEST_STEPS) {
    if (P.quests.mainPaid[s.id]) continue;
    if (!mainStepDone(s.id)) continue;
    P.quests.mainPaid[s.id] = true;
    P.gold += s.ouro;
    gainXP(s.xp);
    // alguns passos vêm com um item simples de brinde — o próximo passo
    // "equipar" só faz sentido se o jogador já tiver algo pra equipar
    if (s.item && P.equipInv.length < 18) P.equipInv.push(s.item);
    // último passo: fanfarra de conquista em vez do coin comum de cada etapa
    if (MAIN_QUEST_STEPS.every(x => P.quests.mainPaid[x.id])) {
      AU.sfx('conquista');
      toast('Tutorial completo! Você já viu tudo que o jogo oferece.');
    } else {
      AU.sfx('coin');
      toast('Tutorial: ' + s.nome + ' (+' + s.ouro + ' ouro' + (s.item ? ', ' + eqName(s.item) : '') + ')');
    }
    saveGame();
  }
}
function mainQuestProgress() { return MAIN_QUEST_STEPS.filter(s => mainStepDone(s.id)).length; }
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
  ctx.fillText(pronta ? 'Volte ' + (QUESTS[id].npc === 'anciao' ? 'à Reiko' : QUESTS[id].npc === 'ferreira' ? 'à Homura' : 'ao monge')
    : alvoNome + '  ' + a.prog + '/' + q.qtd, x + 5, y + 20);
  // barra de progresso
  const bw = w - 10;
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(x + 5, y + 23, bw, 3);
  ctx.fillStyle = pronta ? '#ffd94e' : '#6ee86e';
  ctx.fillRect(x + 5, y + 23, Math.round(bw * clamp(a.prog / q.qtd, 0, 1)), 3);
}
// missão principal (tutorial): sempre visível num canto, com o passo atual
// e a descrição de como completá-lo — some sozinha quando os 12 passos
// terminam, pra não ficar clutter depois que já cumpriu o papel de ensinar
function drawMainQuestHUD() {
  const prox = MAIN_QUEST_STEPS.find(s => !mainStepDone(s.id));
  if (!prox) return;
  const w = 192, x = 4, y = VH - 30;
  ctx.fillStyle = 'rgba(12,10,20,0.82)';
  ctx.fillRect(x, y, w, 26);
  ctx.strokeStyle = '#5a4a8a';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 25);
  ctx.font = '7px monospace';
  ctx.fillStyle = '#ffd94e';
  ctx.fillText('◈ Missão: ' + prox.nome, x + 5, y + 10);
  ctx.fillStyle = '#a89ac0';
  ctx.fillText(prox.desc, x + 5, y + 20);
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
  marcaTutorial('falar');
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
      // só uma missão secundária por vez — termine ou desista pelo diário (J)
      if (questAtivas().length > 0) {
        showMsg(n.nome + ':\nVocê já tem uma missão em andamento.\nTermine-a ou desista dela no diário (J).');
        return;
      }
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

// ---------- Diário de missões (tecla J) ----------
// Mostra a missão principal (tutorial, sempre visível, cobre todos os
// sistemas do jogo) e a missão secundária ativa, se houver — só uma pode
// estar ativa por vez, então não há mais que isso pra mostrar aqui.
function drawQuestLog() {
  drawWorld(true);
  ctx.fillStyle = 'rgba(8,6,16,0.86)';
  ctx.fillRect(0, 0, VW, VH);
  const x = 8, y = 8, w = VW - 16, h = VH - 16;
  ctx.fillStyle = 'rgba(26,20,42,0.98)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffd94e';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#ffd94e';
  ctx.fillText('◈ DIÁRIO DO AVENTUREIRO', x + 8, y + 12);
  ctx.font = '7px monospace';
  const feitos = mainQuestProgress();
  ctx.fillStyle = '#8a7ab0';
  ctx.fillText('Missão principal — ' + feitos + '/' + MAIN_QUEST_STEPS.length, x + 8, y + 24);
  // checklist em 2 colunas de 6
  const colW = (w - 16) / 2;
  MAIN_QUEST_STEPS.forEach((s, i) => {
    const col = Math.floor(i / 6), row = i % 6;
    const done = mainStepDone(s.id);
    const sx = x + 8 + col * colW, sy = y + 36 + row * 10;
    ctx.fillStyle = done ? '#6ee86e' : '#5a4a70';
    ctx.fillText(done ? '✓' : '·', sx, sy);
    ctx.fillStyle = done ? '#c8e8c8' : '#a89ac0';
    ctx.fillText(s.nome, sx + 9, sy);
  });
  // dica do próximo passo pendente
  const proximo = MAIN_QUEST_STEPS.find(s => !mainStepDone(s.id));
  ctx.fillStyle = '#ffd94e';
  ctx.fillText(proximo ? 'Próximo: ' + proximo.desc : 'Tutorial completo — você já viu tudo!', x + 8, y + 36 + 60 + 8);
  // missão secundária
  const sy2 = y + 36 + 60 + 20;
  ctx.strokeStyle = '#3a2e52';
  ctx.beginPath(); ctx.moveTo(x + 8, sy2 - 6); ctx.lineTo(x + w - 8, sy2 - 6); ctx.stroke();
  const id = questAtivas()[0];
  if (id) {
    const q = QUESTS[id], a = P.quests.ativas[id];
    const alvoNome = q.tipo === 'coletar' ? MATS[q.alvo].name : ENEMIES[q.alvo].name;
    ctx.fillStyle = '#ffd94e';
    ctx.fillText('◈ ' + q.nome + (questCompleta(id) ? ' (pronta!)' : ''), x + 8, sy2 + 8);
    ctx.fillStyle = '#a89ac0';
    ctx.fillText(alvoNome + '  ' + a.prog + '/' + q.qtd + '  ·  ' + q.dica, x + 8, sy2 + 18);
    ctx.fillStyle = '#6a5a8a';
    ctx.fillText('Q desistir', x + 8, y + h - 8);
  } else {
    ctx.fillStyle = '#8a7ab0';
    ctx.fillText('Nenhuma missão secundária ativa.', x + 8, sy2 + 8);
    ctx.fillText('Fale com um mestre de missão pra pegar uma.', x + 8, sy2 + 18);
  }
  ctx.fillStyle = '#6a5a8a';
  ctx.fillText('X fechar', x + w - 46, y + h - 8);
}
function updateQuestLog() {
  if (tap('back') || tap('log')) { G.state = 'world'; AU.sfx('back'); }
  if (tap('alt')) {
    const id = questAtivas()[0];
    if (id) desistirQuest(id);
  }
}
