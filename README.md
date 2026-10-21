# Tidecaller's Vault

A 6×5 tumble slot in the browser. Scatter pays, jellyfish multipliers, and a free-spin Tide Meter, themed as a drowned bioluminescent cathedral. The math is a seedable TypeScript module. PixiJS v8 draws it. The Tidecaller, jellyfish, vault seal, kraken, bubble, and tide clips in `public/opal` play on the reels and beside them.

Demo credits only. The model targets **96.30% RTP** on every mode, very high volatility, a **15,000×** cap, and a base-game hit about **1 in 3.5**. It is not a certified par sheet. Seed `20261021` measured base **96.19%**, ante **96.29%**, bonus buy **96.21%**, and super buy **96.32%** (spread 0.13pp). The full table is in [SIMULATION.md](SIMULATION.md). Hero slots are listed in [ASSETS.md](ASSETS.md).

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (port 5173). `npm run build` typechecks and writes a static site to `dist/`. `npm run preview` serves that build.

## Simulate

```bash
npm test
npm run sim
```

`npm test` is the engine suite (tumbles, multipliers, tide, cap, seed replay, ante odds).

`npm run sim` runs the Monte Carlo and exits non-zero if any mode is more than 0.2 percentage points from 96.30%, or if the modes differ by more than 0.5 percentage points. Defaults: 100,000,000 base spins, 40,000,000 ante, 1,000,000 bonus buys, 500,000 super buys, seed `20261021`.

```bash
npm run sim -- --spins 1000000 --antes 400000 --buys 50000 --supers 30000 --seed 7
```

## Play

- **Spin** drops a new grid. Eight or more of a kind anywhere pay, then tumble until they don't.
- **Stop** (the spin button during a round) snaps the current spin and turns turbo on. Free spins keep going.
- **Ante 1.25×** uses its own strip with more Vault Seals than the base game, shows that stake on the bet, and hides Bonus.
- **Bonus** opens Bonus Buy (100×, 15 free spins) and Super Buy (500×, Tide Meter starts at ×10).
- **Auto**, next to Spin, runs 10, 25, 50, or 100 spins, with optional loss limit, single-win stop, and stop-on-feature. **Turbo** shortens the drops. **Sound** is generated in the browser and stays silent until the first tap. Music and effects have separate volumes.
- The balance is demo credits, saved in this browser. **Refill** appears if it drops under the minimum bet.

Screenshot and replay hooks, all optional query params:

| Param | Effect |
| --- | --- |
| `seed` | Root seed for the session. Development builds only |
| `bet` | Bet in cents |
| `credits` | Starting balance in cents. Development builds only |
| `turbo=1` `mute=1` | Start fast or silent |
| `mode` | `base`, `ante`, `buy`, or `super` when `hold` is set |
| `hold` | `win`, `big`, `fs`, `abyss`, or `throne` — jump to a settled frame |
| `instant=1` | Used with `hold` so the frame is already on screen |

`window.__TIDECALLER__` exposes `{ ready, spin, state }` after boot.

## Deploy

The site is a static Vite build. [vercel.json](vercel.json) sets the framework, `npm run build`, and `dist` as the output. `base` is `./`, so the build also works from a subpath or from `npx serve dist`.

## Layout

```
src/engine/     seedable math: RNG, weights, paytable, tumbles, features
src/sim/        Monte Carlo CLI
src/game/       wallet, pacing, round presentation
src/render/     Pixi scene, board, procedural art, water shader, audio, Opal loader
src/ui/         DOM HUD, paytable, buy dialog
public/opal/    index.json manifest and the Tidecaller, jellyfish, seal, kraken, bubble, and tide clips
```

Wins in the engine are multiples of the **base bet**. Ante, Bonus Buy, and Super Buy change the stake (`1.25×`, `100×`, `500×`), not the paytable unit. Scatter pays are not multiplied. In free spins the Tide Meter is the multiplier, including the spin that raised it.
