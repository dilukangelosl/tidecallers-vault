import { playRound, createSession } from '../engine/play';
import { makeRng } from '../engine/rng';
import type { Mode } from '../engine/types';

export interface ModeReport {
  mode: Mode;
  rounds: number;
  rtp: number;
  stdev: number;
  se: number;
  hitRate: number;
  hitOneIn: number;
  triggerOneIn: number;
  maxWinX: number;
  capRate: number;
  avgFs: number;
  avgTide: number;
  elapsedSec: number;
  spinsPerSec: number;
  /** Share of RTP coming from free spins (0 on pure buys, where the whole return is the feature). */
  fsRtp: number;
  baseRtp: number;
  buckets: { label: string; share: number; rtpShare: number }[];
}

export function simulateMode(mode: Mode, rounds: number, seed: number): ModeReport {
  const session = createSession();
  let wagered = 0;
  let returned = 0;
  let fsReturned = 0;
  let baseReturned = 0;
  let hits = 0;
  let triggers = 0;
  let capped = 0;
  let fsSum = 0;
  let tideSum = 0;
  let maxWin = 0;
  let n = 0;
  let mean = 0;
  let m2 = 0;
  const labels = ['0×', '0–1×', '1–5×', '5–20×', '20–50×', '50–100×', '100–500×', '500–2,000×', '2,000–15,000×'];
  const counts = new Array(labels.length).fill(0);
  const bucketReturn = new Array(labels.length).fill(0);
  const started = performance.now();
  for (let i = 0; i < rounds; i++) {
    const round = playRound(makeRng(seed + i * 9973 + (mode.charCodeAt(0) << 16)), mode, false, session);
    const unit = round.totalWinX / round.costX;
    wagered += round.costX;
    returned += round.totalWinX;
    fsReturned += round.fsWinX;
    baseReturned += round.baseWinX;
    if (round.totalWinX > 0) hits++;
    if (round.naturalTrigger) triggers++;
    if (round.capped) capped++;
    fsSum += round.fsPlayed;
    tideSum += round.tideEnd;
    if (round.totalWinX > maxWin) maxWin = round.totalWinX;
    let bucket = 0;
    if (round.totalWinX <= 0) bucket = 0;
    else if (round.totalWinX <= 1) bucket = 1;
    else if (round.totalWinX <= 5) bucket = 2;
    else if (round.totalWinX <= 20) bucket = 3;
    else if (round.totalWinX <= 50) bucket = 4;
    else if (round.totalWinX <= 100) bucket = 5;
    else if (round.totalWinX <= 500) bucket = 6;
    else if (round.totalWinX <= 2000) bucket = 7;
    else bucket = 8;
    counts[bucket]++;
    bucketReturn[bucket] += round.totalWinX;
    n++;
    const d = unit - mean;
    mean += d / n;
    m2 += d * (unit - mean);
  }
  const elapsed = (performance.now() - started) / 1000;
  const variance = n > 1 ? m2 / (n - 1) : 0;
  const stdev = Math.sqrt(variance);
  return {
    mode,
    rounds,
    rtp: returned / wagered,
    stdev,
    se: stdev / Math.sqrt(rounds),
    hitRate: hits / rounds,
    hitOneIn: hits ? rounds / hits : Infinity,
    triggerOneIn: triggers ? rounds / triggers : Infinity,
    maxWinX: maxWin,
    capRate: capped / rounds,
    avgFs: fsSum / rounds,
    avgTide: tideSum / rounds,
    elapsedSec: elapsed,
    spinsPerSec: rounds / elapsed,
    fsRtp: fsReturned / wagered,
    baseRtp: baseReturned / wagered,
    buckets: labels.map((label, index) => ({
      label,
      share: counts[index] / rounds,
      rtpShare: bucketReturn[index] / wagered,
    })),
  };
}

export function formatReport(report: ModeReport): string {
  const pct = (n: number) => `${(n * 100).toFixed(3)}%`;
  const num = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '—');
  return [
    `### ${report.mode}`,
    `- Rounds: ${report.rounds.toLocaleString('en-US')}`,
    `- RTP: ${pct(report.rtp)} (stderr ${(report.se * 100).toFixed(3)} pp, 95% CI ${pct(report.rtp - 1.96 * report.se)} – ${pct(report.rtp + 1.96 * report.se)})`,
    `- Stdev of return / stake: ${report.stdev.toFixed(2)}`,
    `- Hit rate: ${pct(report.hitRate)} (1 in ${num(report.hitOneIn)})`,
    `- Natural feature: 1 in ${num(report.triggerOneIn)}`,
    `- RTP split: entering spin ${pct(report.baseRtp)}, free spins ${pct(report.fsRtp)}`,
    `- Max win observed: ${report.maxWinX.toFixed(2)}× base bet`,
    `- Cap rate: ${pct(report.capRate)}`,
    `- Avg free spins played / round: ${report.avgFs.toFixed(3)}`,
    `- Avg tide at end: ${report.avgTide.toFixed(3)}×`,
    `- Throughput: ${Math.round(report.spinsPerSec).toLocaleString('en-US')} rounds/s in ${report.elapsedSec.toFixed(1)}s`,
    '- Return by win size (share of rounds · share of RTP):',
    ...report.buckets
      .filter((bucket) => bucket.share > 0 || bucket.rtpShare > 0)
      .map((bucket) => `  - ${bucket.label}: ${(bucket.share * 100).toFixed(2)}% of rounds, ${(bucket.rtpShare * 100).toFixed(2)}% RTP`),
  ].join('\n');
}
