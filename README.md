# ⚔️ Forged Legend — 鍛えられた伝説

Um RPG completo em pixel art ambientado no **Japão feudal**, com arte em estilo anime. Roda direto no navegador — um único arquivo HTML, sem dependências.

## 🎮 Como jogar

**Opção 1 — abrir direto:** dê um duplo clique em `index.html` (funciona em qualquer navegador moderno).

**Opção 2 — servidor local:**

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

A tela escala automaticamente para o tamanho da janela mantendo pixels perfeitos (escala inteira de 320×180).

## ⌨️ Controles

| Tecla | Ação |
|---|---|
| Setas / WASD | Mover |
| Shift | Correr |
| Z / Enter / Espaço | Confirmar · Interagir · Atacar |
| X / Esc | Voltar / Cancelar |
| C | Menu do personagem (status, técnicas, equipamento, itens, pets) |
| ◀ ▶ no menu | Trocar de aba |
| M | Ligar/desligar som |

## 🧙 O caminho é a arma que você empunha

Não existe seleção de classe: **seu caminho é definido pela arma equipada**.

- **Katana** → Samurai (Kesagiri, Kiai, Tsubame Gaeshi, Iai-nuki, Zanshin, Hyakuretsu)
- **Shakujo** → Onmyoji (Katon, Hyoton, Kekkai, Raijin no Ikari, Kyuketsu, Amaterasu)
- **Tanto** → Shinobi (Nitoryu, Dokuba, Kagebunshin, Kagegoroshi, Mikiri, Zetsumei)
- **Yumi** → Kyudoka (Isshin Ichii, Yasogame, Hibashira, Kamiya, Fuujin no Ya, Tenchuu)

Você começa com as quatro armas básicas e pode trocar de caminho a qualquer momento no menu (C → Equipar). Vestir um peitoral do tipo correspondente à arma (o-yoroi / kariginu / shinobi shozoku / karuta) ativa o **bônus de conjunto**.

## 🥋 Técnicas: 4 slots, como em Pokémon

Cada caminho tem **6 técnicas** no repertório, aprendidas em níveis diferentes — mas só **4 podem ficar equipadas** ao mesmo tempo. Quando você sobe de nível e desbloqueia uma técnica nova com os slots cheios, o jogo pergunta **qual esquecer** (ou recusar a nova). Nada se perde para sempre: a aba **Técnicas** do menu (C) deixa reequipar qualquer coisa do repertório a qualquer momento, e **cada caminho guarda seu próprio conjunto de 4** — trocar da katana para o yumi não bagunça o que você montou.

Em batalha, ataque e técnicas ficam **na mesma lista**: o ataque básico (sem custo) vem primeiro, seguido das técnicas equipadas com seu custo de MP. Item e Fugir ficam numa segunda coluna (◀ ▶).

## 📈 Progressão por pontos

Cada nível dá **+3 pontos de status** para distribuir livremente em FOR, VIT, DEF, INT, ESP e VEL (menu C → Status). Monte um tanque, um cânone de vidro ou um híbrido — a build é sua.

## 💎 Loot por raridade

Monstros podem dropar equipamentos em 5 raridades, com chance pesada pela raridade:

| Raridade | Cor | Peso |
|---|---|---|
| Comum | cinza | 58 |
| Incomum | verde | 26 |
| Raro | azul | 11 |
| Épico | roxo | 4 |
| Lendário | laranja | 1 |

Youkai mais fortes destravam raridades maiores. **Chefes têm drop assinatura garantido** — Orochi dropa a arma lendária do seu caminho atual. Há **64 equipamentos em 6 slots**: katanas e naginatas, shakujo e gohei, tanto e shuriken, yumi e daikyu, além de o-yoroi, kabuto, kote, waraji e omamori — mais os baús escondidos pelo mundo.

## 🎒 Consumíveis

Oito itens com papéis distintos: **Onigiri** e **Bento** (cura), **Chá Verde** (MP), **Mochi** (HP + MP), **Sake Divino** (restauração total), **Ervas Kanpo** (cura veneno), **Bomba Ninja** (35 de dano direto) e **Ofuda** (dobra o ATQ por 3 turnos).

## 🐾 Pets

**12 espíritos companheiros** que seguem você pelo mundo, **atacam junto em batalha** (dano escala com seu nível) e dão bônus passivos enquanto ativos. Youkai raramente deixam crias ao serem derrotados — e **cada chefe sempre dá um companheiro**: Tama-hime 👑, Karasu-tengu e o lendário Ryu-ko. Gerencie na aba Pets do menu (C).

## 🔮 Encantamento

Youkai dropam **Fragmentos Arcanos ◆** (chefes dão grandes quantidades). Leve-os ao **Altar de Encantamento** (o cristal em cada vila) para encantar os itens equipados até **+5** — cada nível dá +15% nos bônus do item, e o custo cresce com a raridade e o nível atual.

## 🗺️ O mundo (96×64)

- **Vila Sakuramura** ⛩️ — vila inicial sob as cerejeiras: chozuya (cura e salva o jogo), mercado, torii e lanternas de pedra.
- **Vila Iwamura** — vila ao nordeste com a Forja (equipamentos raros).
- **Campos de Arroz** — Konpaku, Kawahori e Kappa (nv 1–2).
- **Bosque de Bambu** (oeste) — Okuri-inu e Jorogumo (nv 3–5) e o chefe **Nurarihyon** 👺.
- **Planalto do Norte** — Okuri-inu, Gashadokuro e Tengu (nv 4–6).
- **Floresta de Aokigahara** (leste) — Gashadokuro, Jorogumo e Tengu (nv 5–7).
- **Templo Abandonado** — Jikininki e Yurei (nv 6–8) e o chefe **Kagemaru, o Onmyoji Negro** ☠.
- **Caverna de Orochi** — Oni, Doro-ningyo e Onibi (nv 7–9) e o chefe final **Yamata-no-Orochi** 🐉.

## ✨ Recursos

- Combate por turnos com técnicas animadas, itens, buffs (ATQ/DEF/VEL/crítico), veneno, congelamento, dreno de vida e críticos
- **Cinemática de entrada de batalha**: linhas de velocidade radiais, personagens deslizando para a arena e cartão com o nome do youkai
- **Ataques animados** com efeito próprio por técnica: dash com arco de corte, saque relâmpago que fatia a tela, bola de fogo viajando, cristais de gelo caindo, raio em ziguezague, coluna de luz solar, dreno de vida e flechas em voo
- Batalhas ambientadas por região (céu, caverna, cemitério ao crepúsculo)
- **13 youkai do folclore japonês** (Kappa, Oni, Tengu, Yurei, Jorogumo, Gashadokuro, Onibi…) com nível visível, que patrulham e perseguem; alerta "!" ao serem detectados; fuga bloqueada contra chefes
- Movimento com aceleração e **corrida (Shift)** que levanta poeira
- Partículas ambientais por região: **pétalas de sakura** nas vilas e campos, vagalumes e folhas no bambuzal, névoa no templo, faíscas na caverna
- Combate com impacto: rastro de golpe, faíscas, tremor de tela, barras de vida que drenam suavemente e clarão na entrada da batalha
- Save automático em `localStorage` (continue de onde parou)
- Derrota amigável: você acorda na vila perdendo metade do ouro
- Trilha chiptune em **escalas pentatônicas japonesas** (hirajoshi no mundo, in-sen no combate, kumoi na caverna)
- Personagens em **pixel art estilo anime**: no mapa (16×20) e em **sprites de batalha 32×48** com proporção heroica (~4 cabeças), pose de combate com pernas afastadas, arma em punho, cabelo espetado em mechas e rosto com olhos de íris colorida — com troca de pose durante os ataques
- Cenários do Japão feudal: sakuras em flor, bambuzais, telhados kawara, paredes de taipa, portas shoji, torii vermelhos, lanternas toro, estátuas jizo e pontes laqueadas — com espécie de árvore predominante por região
- 60 FPS estáveis no mundo e em batalha; texto nítido em resolução cheia sobre a arte em pixels

## 🧪 Testes

Validado com suíte automatizada (Playwright + Chromium): 85 verificações cobrindo resolução responsiva, as quatro classes por equipamento, bônus de conjunto, pontos de status, loot por raridade em todos os slots, encantamento com fragmentos, espíritos companheiros (passivo, ataque em batalha, drops de chefes), drops assinatura, lojas das duas vilas, os três chefes youkai, fuga bloqueada, game over, save/load, corrida vs. caminhada, geração de partículas, os inimigos novos em batalha, slot de luvas, dano da bomba, veneno inimigo, menu de batalha unificado, fase de animação das técnicas, limite de 4 técnicas com fila de aprendizado, tela de esquecer/aprender, aba Técnicas, sprites de batalha das 4 classes e cinemática de entrada — tudo sem erros de JavaScript.
