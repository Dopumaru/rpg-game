# ⚔️ Forged Legend

Um RPG completo em pixel art que roda direto no navegador — um único arquivo HTML, sem dependências.

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
| C | Menu do personagem (status, equipamento, itens) |
| ◀ ▶ no menu | Trocar de aba |
| M | Ligar/desligar som |

## 🧙 Classe pelo equipamento

Não existe seleção de classe: **sua classe é definida pela arma equipada**.

- **Espada** → Guerreiro (Golpe Forte, Grito de Guerra, Fúria)
- **Cajado** → Mago (Bola de Fogo, Raio de Gelo, Meteoro)
- **Adaga** → Ladino (Golpe Duplo, Lâmina Venenosa, Execução)
- **Arco** → Arqueiro (Flecha Precisa, Chuva de Flechas, Flecha Fantasma)

Você começa com as quatro armas básicas e pode trocar de estilo a qualquer momento no menu (C → Equipar). Vestir um peitoral do tipo correspondente à arma (pesada/robe/couro/caça) ativa o **bônus de conjunto**. Habilidades novas desbloqueiam nos níveis 5 e 9.

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

Mobs mais fortes destravam raridades maiores. **Chefes têm drop assinatura garantido** — o dragão dropa a arma lendária do seu estilo atual. Há **64 equipamentos em 6 slots** (arma, peitoral, cabeça, luvas, botas e amuleto), incluindo machados, alabardas, bestas e grimórios, além de baús escondidos pelo mundo.

## 🎒 Consumíveis

Oito itens com papéis distintos: **Poção** e **Poção Grande** (cura), **Éter** (MP), **Pão** (HP + MP), **Elixir** (restauração total), **Antídoto** (cura veneno), **Bomba** (35 de dano direto) e **Pergaminho** (dobra o ATQ por 3 turnos).

## 🐾 Pets

**12 companheiros** com status próprios que seguem você pelo mundo, **atacam junto em batalha** (dano escala com seu nível) e dão bônus passivos enquanto ativos. Monstros raramente deixam filhotes ao serem derrotados — e **cada chefe sempre dá um pet**: Slime Real 👑, Corvo Sombrio e o lendário Dragãozinho. Gerencie na aba Pets do menu (C).

## 🔮 Encantamento

Monstros dropam **Fragmentos Arcanos ◆** (chefes dão grandes quantidades). Leve-os ao **Altar de Encantamento** (o cristal roxo em cada cidade) para encantar os itens equipados até **+5** — cada nível dá +15% nos bônus do item, e o custo cresce com a raridade e o nível atual.

## 🗺️ O mundo (96×64)

- **Aldeia Verde** — cidade inicial: fonte de cura (salva o jogo), loja e placas.
- **Vila Rocha** — cidade ao nordeste com o Empório (equipamentos raros).
- **Campos Verdejantes** — slimes, morcegos e goblins (nv 1–2).
- **Floresta Umbria** (oeste) — lobos e aranhas (nv 3–5) e o chefe **Rei Slime** 👑.
- **Terras do Norte** — lobos, esqueletos e harpias (nv 4–6).
- **Bosque Sombrio** (leste) — esqueletos, aranhas e harpias (nv 5–7).
- **Cemitério Antigo** — zumbis (nv 6–8) e o chefe **Malakar, o Necromante** ☠.
- **Caverna de Vorax** — orcs e golens (nv 7–9) e o chefe final **Vorax, o Dragão** 🐉.

## ✨ Recursos

- Combate por turnos com habilidades, itens, buffs, veneno, congelamento e críticos
- Batalhas ambientadas por região (céu, caverna, cemitério ao crepúsculo)
- **13 tipos de inimigo** com nível visível que patrulham e perseguem; alerta "!" ao serem detectados; fuga bloqueada contra chefes
- Movimento com aceleração e **corrida (Shift)** que levanta poeira
- Partículas ambientais por região: vagalumes e folhas na floresta, névoa no cemitério, faíscas na caverna, pólen nos campos
- Combate com impacto: rastro de golpe, faíscas, tremor de tela, barras de vida que drenam suavemente e clarão na entrada da batalha
- Save automático em `localStorage` (continue de onde parou)
- Derrota amigável: você acorda na vila perdendo metade do ouro
- Música e efeitos chiptune via WebAudio
- Pixel art 100% desenhada em código, com variantes de tile pré-renderizadas (grama, árvores, rochas) e atmosfera própria por região
- 60 FPS estáveis no mundo e em batalha; texto nítido em resolução cheia sobre a arte em pixels

## 🧪 Testes

Validado com suíte automatizada (Playwright + Chromium): 74 verificações cobrindo resolução responsiva, as quatro classes por equipamento, bônus de conjunto, pontos de status, loot por raridade em todos os slots, encantamento com fragmentos, pets (passivo, ataque em batalha, drops de chefes), drops assinatura, lojas das duas cidades, os três chefes, fuga bloqueada, game over, save/load, corrida vs. caminhada, geração de partículas, os inimigos novos em batalha, slot de luvas, dano da bomba e veneno inimigo — tudo sem erros de JavaScript.
