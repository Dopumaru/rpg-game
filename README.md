# ⚔️ Crônicas de Pixel

Um RPG completo em pixel art que roda direto no navegador — um único arquivo HTML, sem dependências.

## 🎮 Como jogar

**Opção 1 — abrir direto:** dê um duplo clique em `index.html` (funciona em qualquer navegador moderno).

**Opção 2 — servidor local:**

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## ⌨️ Controles

| Tecla | Ação |
|---|---|
| Setas / WASD | Mover |
| Z / Enter / Espaço | Confirmar · Interagir · Atacar |
| X / Esc | Voltar / Cancelar |
| C | Menu do personagem (status, itens, habilidades) |
| M | Ligar/desligar som |

## 🧙 Classes

- **Guerreiro** — muito HP e defesa; Golpe Forte, Grito de Guerra e Fúria.
- **Mago** — dano mágico devastador, mas frágil; Bola de Fogo, Raio de Gelo (congela!) e Meteoro.
- **Ladino** — veloz, com 15% de chance de crítico; Golpe Duplo, Lâmina Venenosa e Execução.

Cada classe tem crescimento de status próprio a cada nível e desbloqueia habilidades novas nos níveis 4 e 7/8.

## 🗺️ O mundo

- **Aldeia Verde** — zona segura com fonte de cura (que também salva o jogo), loja de itens e placas com dicas.
- **Campos do sul** — slimes e morcegos (nível 1–2), ideais para começar.
- **Terras do norte** — lobos e esqueletos (nível 3–5), atravesse a ponte com cuidado.
- **Floresta leste** — mais perigosa, esconde um baú de tesouro.
- **Caverna de Vorax** — orcs, golens e esqueletos (nível 6–9)… e o chefe final, **Vorax, o Dragão**.

## ✨ Recursos

- Combate por turnos com habilidades, itens, buffs, veneno, congelamento e críticos
- Progressão de nível com curva de XP, crescimento de status por classe e novas habilidades
- Inimigos com níveis visíveis que patrulham o mapa e perseguem o jogador
- Loja, baús de tesouro, ouro e drops
- Save automático em `localStorage` (continue de onde parou)
- Derrota amigável: você acorda na vila perdendo metade do ouro
- Música e efeitos sonoros chiptune gerados por WebAudio
- Pixel art 100% desenhada em código, renderização nítida em 320×180 escalada 3×

## 🧪 Testes

O jogo foi validado com uma suíte automatizada (Playwright + Chromium) cobrindo 31 verificações: fluxo de título/classes, movimento, colisão, batalhas (vitória, fuga, derrota, itens, habilidades), level up, loja, baús, caverna, chefe final, tela de vitória e save/load — tudo sem erros de JavaScript.
