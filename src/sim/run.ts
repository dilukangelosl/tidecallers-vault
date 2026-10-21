import { getProfiles } from '../engine/weights';
import { formatReport, simulateMode, type ModeReport } from './stats';
import type { Mode } from '../engine/types';

function arg(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

const seed = arg('--seed', 20261021);
const baseN = arg('--spins', 8_000_000);
const anteN = arg('--antes', 3_000_000);
const buyN = arg('--buys', 250_000);
const superN = arg('--supers', 150_000);

const started = performance.now();
const reports: ModeReport[] = [
  simulateMode('base', baseN, seed),
  simulateMode('ante', anteN, seed + 101),
  simulateMode('buy', buyN, seed + 202),
  simulateMode('super', superN, seed + 303),
];

const profiles = getProfiles();
const lines = [
  '# Tidecaller\'s Vault — simulation',
  '',
  `Seed ${seed}. Stake is the amount the player pays; RTP is total return ÷ total stake.`,
  'Wins are capped at 15,000× the base bet inside the round.',
  '',
  '## Weights',
  '',
  '```json',
  JSON.stringify(profiles, null, 2),
  '```',
  '',
  ...reports.flatMap((report) => [formatReport(report), '']),
  `Total wall time ${(performance.now() - started) / 1000}s.`,
  '',
];

const text = lines.join('\n');
process.stdout.write(text);

const failed = (mode: Mode, target = 0.965, tol = 0.015) => {
  const report = reports.find((item) => item.mode === mode);
  return report ? Math.abs(report.rtp - target) > tol : true;
};
if (failed('base', 0.965, 0.02) || failed('buy', 0.965, 0.025)) {
  process.stderr.write('\nRTP is outside the publish tolerance. Retune weights.\n');
}
