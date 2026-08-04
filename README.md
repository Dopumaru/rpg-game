# ⚔️ Crônicas de Pixel

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

Você começa com as três armas básicas e pode trocar de estilo a qualquer momento no menu (C → Equipar). Vestir uma armadura do tipo correspondente à arma (pesada/robe/couro) ativa o **bônus de conjunto**. Habilidades novas desbloqueiam nos níveis 5 e 9.

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

Mobs mais fortes destravam raridades maiores. **Chefes têm drop assinatura garantido** — o dragão dropa a arma lendária do seu estilo atual. Há 30+ equipamentos (armas, armaduras, elmos e amuletos), além de baús escondidos pelo mundo.

## 🗺️ O mundo (96×64)

- **Aldeia Verde** — cidade inicial: fonte de cura (salva o jogo), loja e placas.
- **Vila Rocha** — cidade ao nordeste com o Empório (equipamentos raros).
- **Campos Verdejantes** — slimes e morcegos (nv 1–2).
- **Floresta Umbria** (oeste) — lobos (nv 3–5) e o chefe **Rei Slime** 👑.
- **Terras do Norte** — lobos e esqueletos (nv 4–6).
- **Bosque Sombrio** (leste) — esqueletos (nv 5–7).
- **Cemitério Antigo** — zumbis (nv 6–8) e o chefe **Malakar, o Necromante** ☠.
- **Caverna de Vorax** — orcs e golens (nv 7–9) e o chefe final **Vorax, o Dragão** 🐉.

## ✨ Recursos

- Combate por turnos com habilidades, itens, buffs, veneno, congelamento e críticos
- Batalhas ambientadas por região (céu, caverna, cemitério ao crepúsculo)
- Inimigos com nível visível que patrulham e perseguem; fuga bloqueada contra chefes
- Save automático em `localStorage` (continue de onde parou)
- Derrota amigável: você acorda na vila perdendo metade do ouro
- Música e efeitos chiptune via WebAudio
- Pixel art 100% desenhada em código, renderização nítida com escala inteira dinâmica

## 🧪 Testes

Validado com suíte automatizada (Playwright + Chromium): 41 verificações cobrindo resolução responsiva, classe por equipamento, bônus de conjunto, pontos de status, distribuição de loot por raridade, drops assinatura, lojas das duas cidades, os três chefes, fuga bloqueada, game over e save/load — tudo sem erros de JavaScript.
