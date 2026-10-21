# Simulation

Monte Carlo of the committed weights. RTP is total return divided by stake. The stake is 1× in the base game, 1.25× on Ante, 100× on Bonus Buy, and 500× on Super Buy. Wins are multiples of the base bet and are capped at 15,000× inside the round.

The target is **96.30%** on every mode. `npm run sim` exits non-zero if any mode is more than 0.2 percentage points from that target, or if the four modes differ by more than 0.5 percentage points. This run passed both checks. The game is a demo, not a certified par sheet.

```bash
npm run sim -- --spins 100000000 --antes 40000000 --buys 1000000 --supers 500000 --seed 20261021
```

Wall time 443s on this machine (about 345k base rounds/s).

## Result

| Mode | Rounds | RTP | Stderr | 95% CI | Hit rate | Feature | Max win |
| --- | ---: | ---: | ---: | --- | --- | --- | ---: |
| Base | 100,000,000 | 96.188% | 0.115 pp | 95.962% – 96.413% | 1 in 3.51 | 1 in 3,393 | 12,650× |
| Ante | 40,000,000 | 96.292% | 0.189 pp | 95.921% – 96.663% | 1 in 3.64 | 1 in 282 | 15,000× |
| Bonus Buy | 1,000,000 | 96.214% | 0.144 pp | 95.931% – 96.497% | 1 in 1.02 | bought | 15,000× |
| Super Buy | 500,000 | 96.319% | 0.101 pp | 96.120% – 96.518% | 1 in 1.02 | bought | 15,000× |

Every mode sits inside ±0.2pp of 96.30%. The spread from base (96.188%) to super (96.319%) is 0.131pp. Base hit rate is 1 in 3.51, against a target of about 1 in 3.5. The base-game standard deviation of 11.51× stake is the very-high-volatility shape: most spins miss, and a thin tail carries the RTP (about 0.9% of RTP sits in wins of 2,000×–15,000×).

The 15,000× cap was reached on Ante, Bonus Buy, and Super Buy. Base did not print a capped round in 100 million spins; the largest there was 12,650×. The cap is enforced in the engine and covered by a unit test.

## Weights

Base strip (relative, sums to 10,000): five gems at 1,450 each, highs 676 / 483 / 386 / 338 / 531, Vault Seal 95, jellyfish 241. Jellyfish values use `jellyTail` 1.25, which fattens the 100×–1,000× end of the ladder.

Ante has its own strip. It keeps the same gem and high weights, sets jellyfish to 240, and raises the Vault Seal weight to 190.8. That is a tuned strip, not a per-cell doubling of the base seal rate. The feature triggers about twelve times as often (1 in 282 versus 1 in 3,393) because four seals is a thin tail and tumbles keep adding seals.

Free-spin strip, used by natural features and Bonus Buy: gems 520 each, highs 160 / 240 / 340 / 480 / 862 (the mask is the common relic), seal 90, jellyfish 28, `jellyTail` 0.83.

Super Buy uses a separate free-spin strip with the same gems, highs, and seal, jellyfish 27.4, and `jellyTail` 0.82. The thinner tail keeps the ×10 Tide Meter head start from pulling Super Buy away from the other modes. Average tide at the end of a buy was 2.31×, and 12.24× on a super (the extra 10× is the starting meter).

## Split and shape

Base RTP is 93.373% from the entering spin and 2.815% from free spins. Ante flips that: 68.902% from the entering spin and 27.390% from the feature, which is why Ante's standard deviation stays high even though the hit rate dips slightly (seals replace paying symbols).

Bonus Buy return by size, share of rounds: about 12% win 5–20× the base bet, 30% win 20–50×, 25% win 50–100×, 26% win 100–500×, 2% win 500–2,000×. Super Buy piles up higher: 53% of rounds land 100–500× and 39% land 500–2,000×, because the meter starts at 10×. About 1.8% of buys and supers still miss entirely (no symbol win across the feature).

## Full report

Seed 20261021. Stake is the amount the player pays; RTP is total return ÷ total stake.
Wins are capped at 15,000× the base bet inside the round.

### base
- Rounds: 100,000,000
- RTP: 96.188% (stderr 0.115 pp, 95% CI 95.962% – 96.413%)
- Stdev of return / stake: 11.51
- Hit rate: 28.481% (1 in 3.51)
- Natural feature: 1 in 3393.05
- RTP split: entering spin 93.373%, free spins 2.815%
- Max win observed: 12650.00× base bet
- Cap rate: 0.000%
- Avg free spins played / round: 0.005
- Avg tide at end: 0.001×
- Throughput: 344,997 rounds/s in 289.9s
- Return by win size (share of rounds · share of RTP):
  - 0×: 71.52% of rounds, 0.00% RTP
  - 0–1×: 15.08% of rounds, 7.77% RTP
  - 1–5×: 9.85% of rounds, 24.55% RTP
  - 5–20×: 3.04% of rounds, 28.19% RTP
  - 20–50×: 0.35% of rounds, 10.25% RTP
  - 50–100×: 0.08% of rounds, 5.54% RTP
  - 100–500×: 0.07% of rounds, 12.98% RTP
  - 500–2,000×: 0.01% of rounds, 6.00% RTP
  - 2,000–15,000×: 0.00% of rounds, 0.90% RTP

### ante
- Rounds: 40,000,000
- RTP: 96.292% (stderr 0.189 pp, 95% CI 95.921% – 96.663%)
- Stdev of return / stake: 11.96
- Hit rate: 27.435% (1 in 3.64)
- Natural feature: 1 in 281.66
- RTP split: entering spin 68.902%, free spins 27.390%
- Max win observed: 15000.00× base bet
- Cap rate: 0.000%
- Avg free spins played / round: 0.060
- Avg tide at end: 0.008×
- Throughput: 326,357 rounds/s in 122.6s
- Return by win size (share of rounds · share of RTP):
  - 0×: 72.56% of rounds, 0.00% RTP
  - 0–1×: 14.73% of rounds, 6.01% RTP
  - 1–5×: 9.24% of rounds, 18.35% RTP
  - 5–20×: 2.73% of rounds, 20.25% RTP
  - 20–50×: 0.41% of rounds, 9.90% RTP
  - 50–100×: 0.16% of rounds, 8.88% RTP
  - 100–500×: 0.15% of rounds, 23.99% RTP
  - 500–2,000×: 0.01% of rounds, 8.15% RTP
  - 2,000–15,000×: 0.00% of rounds, 0.76% RTP

### buy
- Rounds: 1,000,000
- RTP: 96.214% (stderr 0.144 pp, 95% CI 95.931% – 96.497%)
- Stdev of return / stake: 1.44
- Hit rate: 98.227% (1 in 1.02)
- Natural feature: 1 in —
- RTP split: entering spin 0.000%, free spins 96.214%
- Max win observed: 15000.00× base bet
- Cap rate: 0.001%
- Avg free spins played / round: 16.893
- Avg tide at end: 2.309×
- Throughput: 48,440 rounds/s in 20.6s
- Return by win size (share of rounds · share of RTP):
  - 0×: 1.77% of rounds, 0.00% RTP
  - 0–1×: 2.17% of rounds, 0.01% RTP
  - 1–5×: 0.41% of rounds, 0.01% RTP
  - 5–20×: 12.49% of rounds, 1.64% RTP
  - 20–50×: 30.37% of rounds, 10.13% RTP
  - 50–100×: 24.86% of rounds, 17.48% RTP
  - 100–500×: 25.92% of rounds, 52.00% RTP
  - 500–2,000×: 1.99% of rounds, 14.34% RTP
  - 2,000–15,000×: 0.02% of rounds, 0.61% RTP

### super
- Rounds: 500,000
- RTP: 96.319% (stderr 0.101 pp, 95% CI 96.120% – 96.518%)
- Stdev of return / stake: 0.72
- Hit rate: 98.219% (1 in 1.02)
- Natural feature: 1 in —
- RTP split: entering spin 0.000%, free spins 96.319%
- Max win observed: 15000.00× base bet
- Cap rate: 0.001%
- Avg free spins played / round: 16.894
- Avg tide at end: 12.242×
- Throughput: 50,289 rounds/s in 9.9s
- Return by win size (share of rounds · share of RTP):
  - 0×: 1.78% of rounds, 0.00% RTP
  - 1–5×: 1.85% of rounds, 0.01% RTP
  - 5–20×: 0.75% of rounds, 0.01% RTP
  - 20–50×: 0.02% of rounds, 0.00% RTP
  - 50–100×: 3.49% of rounds, 0.68% RTP
  - 100–500×: 53.15% of rounds, 31.36% RTP
  - 500–2,000×: 38.60% of rounds, 62.50% RTP
  - 2,000–15,000×: 0.36% of rounds, 1.75% RTP
