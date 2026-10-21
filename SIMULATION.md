# Simulation

Monte Carlo of the committed weights. RTP is total return divided by stake. The stake is 1× in the base game, 1.25× on Ante, 100× on Bonus Buy, and 500× on Super Buy. Wins are multiples of the base bet and are capped at 15,000× inside the round.

```bash
npm run sim -- --spins 8000000 --antes 3000000 --buys 250000 --supers 150000 --seed 20261021
```

Wall time 38.3s on this machine (about 360k base rounds/s).

## Result

| Mode | Rounds | RTP | 95% CI | Stdev (return / stake) | Hit rate | Feature | Max win |
| --- | ---: | ---: | --- | ---: | --- | --- | ---: |
| Base | 8,000,000 | 96.854% | 95.967% – 97.741% | 12.80 | 28.460% (1 in 3.51) | 1 in 3,256 | 11,500× |
| Ante | 3,000,000 | 97.149% | 95.872% – 98.426% | 11.29 | 27.443% (1 in 3.64) | 1 in 274 | 5,599× |
| Bonus Buy | 250,000 | 96.864% | 96.274% – 97.454% | 1.50 | 98.201% (1 in 1.02) | bought | 15,000× |
| Super Buy | 150,000 | 96.430% | 96.067% – 96.793% | 0.72 | 98.208% (1 in 1.02) | bought | 10,505× |

Every mode's interval covers the 96.50% target. Base hit rate is 1 in 3.51, against a target of about 1 in 3.5. The base-game standard deviation of 12.8× stake is the very-high-volatility shape: most spins miss, and a thin tail carries the RTP (about 1.3% of RTP sits in wins of 2,000×–15,000×).

The 15,000× cap was reached on Bonus Buy (cap rate 0.001%, max win exactly 15,000×). Base did not print a capped round in 8 million spins; the largest there was 11,500×. The cap is enforced in the engine and covered by a unit test.

## Weights

Base strip (relative): five gems at 1,450 each, highs 676 / 483 / 386 / 338 / 531, Vault Seal 95, jellyfish 242. Jellyfish values use `jellyTail` 1.25, which fattens the 100×–1,000× end of the ladder.

Free-spin strip: gems 520 each, highs 160 / 240 / 340 / 480 / 862 (the mask is the common relic), seal 90, jellyfish 28, `jellyTail` 0.84. The thin jellyfish rate keeps a Super Buy, which starts the Tide Meter at 10×, from running away from the plain buy. Average tide at the end of a buy was 2.33×, and 12.33× on a super (the extra 10× is the starting meter).

Ante does not have its own strip. It rebuilds the base strip so the per-cell Vault Seal probability is exactly double. That identity is unit-tested. The feature itself triggers about twelve times as often (1 in 274 versus 1 in 3,256) because four seals is a thin tail and tumbles keep adding seals. Both RTPs were tuned with that ratio left intact.

## Split and shape

Base RTP is 94.012% from the entering spin and 2.842% from free spins. Ante flips that: 69.527% from the entering spin and 27.622% from the feature, which is why Ante's standard deviation stays high even though the hit rate dips slightly (seals replace paying symbols).

Bonus Buy return by size, share of rounds: about 12% win 5–20× the base bet, 30% win 20–50×, 25% win 50–100×, 26% win 100–500×, 2% win 500–2,000×. Super Buy piles up higher: 53% of rounds land 100–500× and 39% land 500–2,000×, because the meter starts at 10×. About 1.8% of buys and supers still miss entirely (no symbol win across the feature).

## Full report

Seed 20261021. Stake is the amount the player pays; RTP is total return ÷ total stake.
Wins are capped at 15,000× the base bet inside the round.

### base
- Rounds: 8,000,000
- RTP: 96.854% (stderr 0.452 pp, 95% CI 95.967% – 97.741%)
- Stdev of return / stake: 12.80
- Hit rate: 28.460% (1 in 3.51)
- Natural feature: 1 in 3256.00
- RTP split: entering spin 94.012%, free spins 2.842%
- Max win observed: 11500.00× base bet
- Cap rate: 0.000%
- Avg free spins played / round: 0.005
- Avg tide at end: 0.001×
- Throughput: 362,807 rounds/s in 22.1s
- Return by win size (share of rounds · share of RTP):
  - 0×: 71.54% of rounds, 0.00% RTP
  - 0–1×: 15.04% of rounds, 7.75% RTP
  - 1–5×: 9.85% of rounds, 24.54% RTP
  - 5–20×: 3.05% of rounds, 28.29% RTP
  - 20–50×: 0.36% of rounds, 10.33% RTP
  - 50–100×: 0.08% of rounds, 5.49% RTP
  - 100–500×: 0.07% of rounds, 13.03% RTP
  - 500–2,000×: 0.01% of rounds, 6.16% RTP
  - 2,000–15,000×: 0.00% of rounds, 1.26% RTP

### ante
- Rounds: 3,000,000
- RTP: 97.149% (stderr 0.652 pp, 95% CI 95.872% – 98.426%)
- Stdev of return / stake: 11.29
- Hit rate: 27.443% (1 in 3.64)
- Natural feature: 1 in 274.15
- RTP split: entering spin 69.527%, free spins 27.622%
- Max win observed: 5599.00× base bet
- Cap rate: 0.000%
- Avg free spins played / round: 0.062
- Avg tide at end: 0.008×
- Throughput: 357,649 rounds/s in 8.4s
- Return by win size (share of rounds · share of RTP):
  - 0×: 72.56% of rounds, 0.00% RTP
  - 0–1×: 14.64% of rounds, 5.98% RTP
  - 1–5×: 9.29% of rounds, 18.44% RTP
  - 5–20×: 2.76% of rounds, 20.44% RTP
  - 20–50×: 0.41% of rounds, 10.14% RTP
  - 50–100×: 0.16% of rounds, 9.04% RTP
  - 100–500×: 0.15% of rounds, 23.92% RTP
  - 500–2,000×: 0.01% of rounds, 8.64% RTP
  - 2,000–15,000×: 0.00% of rounds, 0.54% RTP

### buy
- Rounds: 250,000
- RTP: 96.864% (stderr 0.301 pp, 95% CI 96.274% – 97.454%)
- Stdev of return / stake: 1.50
- Hit rate: 98.201% (1 in 1.02)
- Natural feature: 1 in —
- RTP split: entering spin 0.000%, free spins 96.864%
- Max win observed: 15000.00× base bet
- Cap rate: 0.001%
- Avg free spins played / round: 16.897
- Avg tide at end: 2.326×
- Throughput: 51,194 rounds/s in 4.9s
- Return by win size (share of rounds · share of RTP):
  - 0×: 1.80% of rounds, 0.00% RTP
  - 0–1×: 2.19% of rounds, 0.01% RTP
  - 1–5×: 0.42% of rounds, 0.01% RTP
  - 5–20×: 12.47% of rounds, 1.64% RTP
  - 20–50×: 30.25% of rounds, 10.08% RTP
  - 50–100×: 24.91% of rounds, 17.51% RTP
  - 100–500×: 25.96% of rounds, 52.34% RTP
  - 500–2,000×: 2.00% of rounds, 14.48% RTP
  - 2,000–15,000×: 0.02% of rounds, 0.79% RTP

### super
- Rounds: 150,000
- RTP: 96.430% (stderr 0.185 pp, 95% CI 96.067% – 96.793%)
- Stdev of return / stake: 0.72
- Hit rate: 98.208% (1 in 1.02)
- Natural feature: 1 in —
- RTP split: entering spin 0.000%, free spins 96.430%
- Max win observed: 10505.00× base bet
- Cap rate: 0.000%
- Avg free spins played / round: 16.881
- Avg tide at end: 12.331×
- Throughput: 50,759 rounds/s in 3.0s
- Return by win size (share of rounds · share of RTP):
  - 0×: 1.79% of rounds, 0.00% RTP
  - 1–5×: 1.87% of rounds, 0.01% RTP
  - 5–20×: 0.77% of rounds, 0.01% RTP
  - 20–50×: 0.02% of rounds, 0.00% RTP
  - 50–100×: 3.45% of rounds, 0.67% RTP
  - 100–500×: 53.02% of rounds, 31.28% RTP
  - 500–2,000×: 38.71% of rounds, 62.64% RTP
  - 2,000–15,000×: 0.37% of rounds, 1.81% RTP
