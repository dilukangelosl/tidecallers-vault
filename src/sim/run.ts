import { getProfiles } from '../engine/weights';
import { formatReport, simulateMode, type ModeReport } from './stats';

function arg(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

const seed = arg('--seed', 20261021);
const baseN = arg('--spins', 100_000_000);
const anteN = arg('--antes', 40_000_000);
const buyN = arg('--buys', 1_000_000);
const superN = arg('--supers', 500_000);

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

const TARGET = 0.963;
const TOL = 0.002;
const rtps = reports.map((report) => report.rtp);
const spread = Math.max(...rtps) - Math.min(...rtps);
let failed = spread > 0.005;
for (const mode of ['base', 'ante', 'buy', 'super'] as const) {
  const report = reports.find((item) => item.mode === mode);
  const off = !report || Math.abs(report.rtp - TARGET) > TOL;
  if (off) failed = true;
}
if (failed) {
  const detail = reports.map((report) => `${report.mode} ${(report.rtp * 100).toFixed(3)}%`).join(', ');
  process.stderr.write(
    `\nRTP is outside ±0.2pp of 96.30% or the modes differ by more than 0.5pp (${detail}, spread ${(spread * 100).toFixed(3)}pp).\n`,
  );
  process.exit(1);
}
