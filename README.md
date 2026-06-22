# LIFEFORGE — AI-Powered Life Simulator

```
██╗     ██╗███████╗███████╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
██║     ██║██╔════╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
██║     ██║█████╗  █████╗  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗
██║     ██║██╔══╝  ██╔══╝  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
███████╗██║██║     ███████╗██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
╚══════╝╚═╝╚═╝     ╚══════╝╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

A BitLife-inspired terminal life simulator where **the AI model trains locally on your machine** — no API keys, no cloud, no internet required. Pure Python + NumPy + Node.js.

---

## Quick Start

**Requirements:** Node.js 16+, Python 3.8+, NumPy

```bash
unzip lifeforge.zip
cd lifeforge
npm install
npm start
```

**First run:** trains the neural model (~10 minutes, then saves permanently).  
**Every run after:** loads instantly from `model/weights.json`.

```bash
npm start             # instant load (model already trained)
npm run retrain       # force fresh training from scratch
```

---

## The AI Model

A **Word-Level Neural Language Model** (Bengio et al. 2003) built from scratch in pure NumPy.

| Property | Value |
|---|---|
| Architecture | `embed(2957×48) → FC(512,ReLU) → FC(256,ReLU) → softmax(2957)` |
| Parameters | ~1.3 million |
| Training data | **1,815 hand-authored sentences** across 23 life categories |
| Training | 100 epochs, cosine LR decay (5e-3 → 5e-5) |
| Context window | W=2 (bigram → next word) |
| Generation | Temperature 1.05–1.15 for creative variety |
| Storage | `model/weights.json` (~22 MB) |

### How it works in-game

Every year you age, the game:
1. Reads your current stats (happiness, health, wealth, karma, etc.)
2. Picks a relevant corpus category (`CAREER_RISE`, `HEALTH_DECAY`, `GROWTH`, etc.)
3. Generates a unique sentence from the neural model
4. Shows it in-game marked with `✦`
5. Applies category-appropriate stat effects

### Why the model generates varied text

With W=2 context and early-stop at loss ~1.35, the model has learned **word association patterns** but retains genuine uncertainty at each step. It recombines learned phrases creatively rather than reproducing memorized sentences.

---

## Gameplay

### Life Stats
| Stat | Effect |
|---|---|
| 😊 Happiness | Relationship events, mental health |
| ❤️ Health | Lifespan, illness events |
| 🧠 Smarts | Job access, college, career success |
| ✨ Looks | Relationship success, job interviews |
| ⚡ Karma | Reduces bad events, boosts good ones |
| 🎲 Recklessness | Crime outcomes, accident risk |

### Actions
| Key | Action |
|---|---|
| `A` | **Age Up** — let a year pass (AI generates events) |
| `B` | **Activities** — meditate, exercise, study, party, casino, crime, travel |
| `C` | **Career** — apply for 15 jobs from fast food → CEO |
| `D` | **Love** — date, propose, have children |
| `E` | **Assets** — buy house, car |
| `F` | **Education** — enroll in college |
| `G` | **Life Log** — review your full history |
| `H` | **AI Info** — model stats and architecture |

### Casino
Three fully playable mini-games accessible from Activities:
- 🎡 **Roulette** — animated spinning wheel, bet on numbers/colors/ranges (35× on single number)
- 🃏 **Blackjack** — full dealer AI, hit/stand/double-down, 1.5× on blackjack
- ♠ **Video Poker** — 5-card draw, full paytable from High Card to Royal Flush (800×)

### Life Balance
Realistic human lifespan distribution:
- ~8% die before 20
- ~64% survive past 70  
- ~12% survive past 85
- Max age ~95

---

## File Structure

```
lifeforge/
├── index.js              Game loop + smart training skip logic
├── package.json
├── model/
│   ├── corpus.py         1,815 hand-authored sentences (23 categories)
│   ├── lstm_model.py     Neural LM in pure NumPy
│   ├── train.py          100-epoch trainer with cosine LR decay
│   ├── generate.py       Generation server (called per in-game event)
│   ├── weights.json      Saved model weights (22 MB, generated on first run)
│   └── vocab.json        Word vocabulary (136 KB)
└── src/
    ├── ai-bridge.js      Node↔Python bridge + sentence pool cache
    ├── ascii-art.js      ASCII art for all life stages
    ├── engine.js         Life state machine + balanced death system
    ├── events.js         78 scripted events + CHOICES system
    ├── gambling.js       Casino mini-games (Roulette/Blackjack/Poker)
    └── ui.js             Terminal UI renderer
```

---

## Corpus Categories

1,815 sentences spanning 23 life domains:

`CAREER_RISE` `CAREER_FALL` `CAREER_GRIND` `HEALTH_BLOOM` `HEALTH_DECAY` `HEALTH_CRISIS` `LOVE_FOUND` `LOVE_LOST` `LOVE_WAR` `WEALTH_SURGE` `WEALTH_CRASH` `WEALTH_GRIND` `FAMILY_JOY` `FAMILY_STORM` `GROWTH` `SETBACK` `YOUTH` `OLD_AGE` `CRISIS` `FRIENDSHIP` `ADVENTURE` `REGRET` `LUCK`
