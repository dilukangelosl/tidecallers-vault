# Hero sprites for Tidecaller's Vault

The game draws every symbol, the Tidecaller, and the cathedral in procedural canvas art. Each hero below can be replaced by an Opal video sprite without changing the layout. Drop the `.opal` file in `public/opal/`, add its filename to `public/opal/index.json`, and reload. Files that are not listed are never requested.

`src/assets/manifest.ts` is the contract. `loadHeroes` uses both Pixi entry points from `opal-sprites`:

- `loadOpal` for the Tidecaller, the jellyfish, and the Vault Seal (clipped `AnimatedSprite`s, feet anchors reapplied per clip).
- `createPixiOpal` for one-shot VFX and the tide overlay (`spawn` / `render`).

Missing clips stay on the procedural art. Encode with flat green `#00FF00`, 12 fps, and `--scale 0.5`. Pin loops so the first frame and the last frame are the same still. One-shots use `--once`.

| Id | File | Role | Canvas | Anchor | Clips |
| --- | --- | --- | --- | --- | --- |
| tidecaller | `tidecaller.opal` | character | 1024×1024, figure ~70% and low | feet `0.50, 0.92` | `idle` 3.0s loop, `cast` 2.0s once |
| jellyfish | `jellyfish.opal` | symbol | 768×768 | center-bell `0.50, 0.42` | `float` 2.0s loop, `pulse` 1.0s loop, `burst` 0.8s once |
| vault-seal | `vault-seal.opal` | symbol | 768×768 | center `0.50, 0.50` | `idle` 2.0s loop, `crack` 1.0s once |
| kraken | `kraken.opal` | vfx | 1024×1024 | enter from the left `0.15, 0.55` | `sweep` 1.5s once |
| bubbles | `bubbles.opal` | vfx | 768×768 | center `0.50, 0.50` | `pop` 0.6s once |
| tide | `tide.opal` | overlay | 1024×512 | top center `0.50, 0.00` | `overlay` 3.0s loop |

Clip frame counts at 12 fps: idle 36, cast 24, float 24, pulse 12, burst 10, seal idle 24, crack 12, sweep 18, pop 7, overlay 36.

## What each clip does

- **Tidecaller idle / cast.** Side-on sea priestess, hair and hem drifting. Idle bobs in place. Cast raises the trident once and returns to the idle pose. The game swaps to cast on a tumble win and on the vault opening, then back to idle. Re-apply `feetAnchor` when the clip changes so both poses share the ground line.
- **Jellyfish float / pulse / burst.** Bell-up multiplier. Float is the symbol on the grid. Pulse is the beat while a value is in play. Burst plays as the value flies to the Tide Meter. Anchor sits in the bell, not the tentacles, so the `×` label stays under the body.
- **Vault Seal idle / crack.** Circular drowned seal. Idle glows. Crack plays when 4+ seals award free spins (or 3+ inside the feature). Center anchor, same box as the other symbols.
- **Kraken sweep.** One tentacle crosses the lower third when the Tide Meter reaches the throne (50×). It enters from the left edge. Spawned once per visit through `createPixiOpal`.
- **Bubble pop.** A short cluster on every winning symbol as it dissolves. Spawned at the cell center. The procedural bubbles play underneath either way.
- **Tide overlay.** A transparent caustic sheet across the top of the waterline, looping. Anchor is the top center so it can sit on the rising water. The live water is a shader; this clip is an optional extra.

## Encode sketch

```bash
opal encode -o public/opal/tidecaller.opal \
  --fps 12 --scale 0.5 --crf 24 --key auto \
  idle=tidecaller-idle.mp4 \
  --once cast=tidecaller-cast.mp4

# then list the file
# public/opal/index.json → { "files": ["tidecaller.opal"] }
```

Repeat per file. Symbol clips share one 768 canvas so a swap does not reflow the grid. Do not encode the five gems or the relic stills unless you want them as clips too: they are ordinary textures and already have ids in `src/render/art.ts`.
