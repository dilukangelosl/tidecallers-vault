# Tidecaller's Vault

A 6×5 tumble slot in the browser. Scatter pays, jellyfish multipliers, and a free-spin Tide Meter, themed as a drowned bioluminescent cathedral. The math is a seedable TypeScript module. PixiJS v8 draws it. Opal video sprites can replace the hero art when you drop `.opal` files in.

Demo credits only. The model targets **96.50% RTP**, very high volatility, a **15,000×** cap, and a base-game hit about **1 in 3.5**. It is not a certified par sheet. Measured numbers are in [SIMULATION.md](SIMULATION.md). Hero slots are listed in [ASSETS.md](ASSETS.md).

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

`npm run sim` runs the Monte Carlo. Defaults: 8,000,000 base spins, 3,000,000 ante, 250,000 bonus buys, 150,000 super buys, seed `20261021`.

```bash
npm run sim -- --spins 1000000 --antes 400000 --buys 50000 --supers 30000 --seed 7
```

## Play

- **Spin** drops a new grid. Eight or more of a kind anywhere pay, then tumble until they don't.
- **Stop** (the spin button during a round) snaps the current spin and turns turbo on. Free spins keep going.
- **Ante 1.25×** doubles the chance each cell is a Vault Seal and closes the buys.
- **Bonus** opens Bonus Buy (100×, 15 free spins) and Super Buy (500×, Tide Meter starts at ×10).
- **Auto** runs 10, 25, 50, or 100 spins. **Turbo** shortens the drops. **Sound** is generated in the browser and stays silent until the first tap.
- The balance is demo credits, saved in this browser. **Refill** appears if it drops under the minimum bet.

Screenshot and replay hooks, all optional query params:

| Param | Effect |
| --- | --- |
| `seed` | Root seed for the session |
| `bet` | Bet in cents |
| `credits` | Starting balance in cents |
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
public/opal/    index.json manifest; .opal files go here when you have them
```

Wins in the engine are multiples of the **base bet**. Ante, Bonus Buy, and Super Buy change the stake (`1.25×`, `100×`, `500×`), not the paytable unit. Scatter pays are not multiplied. In free spins the Tide Meter is the multiplier, including the spin that raised it.
