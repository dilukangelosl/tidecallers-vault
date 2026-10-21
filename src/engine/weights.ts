import { JELLY_VALUES } from './paytable';
import { buildAlias, sampleAlias, type AliasTable, type Rng } from './rng';
import { SYM, type Sampler, type WeightKind } from './types';

/**
 * Relative weights. The Monte Carlo tuner wrote these; see SIMULATION.md.
 * `jellyTail` bends the value ladder: 1 keeps the authored curve,
 * higher makes the 100×–1000× tail less rare.
 */
export interface Profile {
  gems: [number, number, number, number, number];
  highs: [number, number, number, number, number];
  scatter: number;
  jelly: number;
  jellyTail: number;
}

/**
 * Shape of the jellyfish ladder before `jellyTail` is applied.
 * Index-aligned with JELLY_VALUES. The tail is intentionally thin.
 */
const JELLY_SHAPE = [5200, 2800, 1600, 900, 520, 280, 150, 80, 42, 22, 12, 6, 3, 1.4, 0.55, 0.22];

export function jellyValueWeights(tail: number): number[] {
  return JELLY_SHAPE.map((w, i) => w * Math.pow(tail, i));
}

/**
 * Tuned for a 96.5% target. Base gem share is ~14.5% each so the hit rate
 * lands near 1 in 3.5. Free spins lean on the mask so the feature is worth
 * about 96×, while a thin jellyfish rate keeps the super-buy ratio near 5.
 */
const INITIAL_BASE: Profile = {
  gems: [1450, 1450, 1450, 1450, 1450],
  highs: [676, 483, 386, 338, 531],
  scatter: 95,
  jelly: 242,
  jellyTail: 1.25,
};

const INITIAL_FS: Profile = {
  gems: [520, 520, 520, 520, 520],
  highs: [160, 240, 340, 480, 862],
  scatter: 90,
  jelly: 28,
  jellyTail: 0.84,
};

let baseProfile: Profile = clone(INITIAL_BASE);
let fsProfile: Profile = clone(INITIAL_FS);

interface KindTables {
  symbol: AliasTable;
  jelly: AliasTable;
}

let tables: Record<WeightKind, KindTables>;

function clone(p: Profile): Profile {
  return {
    gems: [...p.gems] as Profile['gems'],
    highs: [...p.highs] as Profile['highs'],
    scatter: p.scatter,
    jelly: p.jelly,
    jellyTail: p.jellyTail,
  };
}

export function expandWeights(profile: Profile, doubleScatter: boolean): number[] {
  const w = [...profile.gems, ...profile.highs, profile.scatter, profile.jelly];
  if (doubleScatter) {
    const sum = w.reduce((a, b) => a + b, 0);
    const p = w[SYM.SCATTER] / sum;
    const p2 = Math.min(0.95, p * 2);
    const other = sum - w[SYM.SCATTER];
    w[SYM.SCATTER] = (p2 * other) / (1 - p2);
  }
  return w;
}

function rebuild(): void {
  tables = {
    base: {
      symbol: buildAlias(expandWeights(baseProfile, false)),
      jelly: buildAlias(jellyValueWeights(baseProfile.jellyTail)),
    },
    ante: {
      symbol: buildAlias(expandWeights(baseProfile, true)),
      jelly: buildAlias(jellyValueWeights(baseProfile.jellyTail)),
    },
    fs: {
      symbol: buildAlias(expandWeights(fsProfile, false)),
      jelly: buildAlias(jellyValueWeights(fsProfile.jellyTail)),
    },
  };
}

rebuild();

export function setProfiles(base: Profile, fs: Profile): void {
  baseProfile = clone(base);
  fsProfile = clone(fs);
  rebuild();
}

export function getProfiles(): { base: Profile; fs: Profile } {
  return { base: clone(baseProfile), fs: clone(fsProfile) };
}

export function symbolProbability(kind: WeightKind, symbol: number): number {
  const table = tables[kind].symbol;
  return table.weights[symbol] / table.sum;
}

export function samplerFromRng(rng: Rng, kind: WeightKind): Sampler {
  const table = tables[kind];
  return {
    symbol: () => sampleAlias(rng, table.symbol),
    jelly: () => JELLY_VALUES[sampleAlias(rng, table.jelly)],
  };
}
