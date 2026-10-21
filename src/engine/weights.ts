import { JELLY_VALUES } from './paytable';
import { buildAlias, sampleAlias, type AliasTable, type Rng } from './rng';
import type { Sampler, WeightKind } from './types';

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
 * Tuned for 96.30% on every mode. Base gem share stays near 14.5% so the
 * hit rate holds around 1 in 3.5. Ante is its own strip: more Vault Seals
 * than the base game, not a mechanical doubling, so the 1.25× stake still
 * prices near the same RTP. Free spins lean on the mask. Super Buy uses the
 * same symbols with a thinner jellyfish tail so the ×10 head start stays near the buy.
 */
const INITIAL_BASE: Profile = {
  gems: [1450, 1450, 1450, 1450, 1450],
  highs: [676, 483, 386, 338, 531],
  scatter: 95,
  jelly: 241,
  jellyTail: 1.25,
};

const INITIAL_ANTE: Profile = {
  gems: [1450, 1450, 1450, 1450, 1450],
  highs: [676, 483, 386, 338, 531],
  scatter: 190.8,
  jelly: 240,
  jellyTail: 1.25,
};

const INITIAL_FS: Profile = {
  gems: [520, 520, 520, 520, 520],
  highs: [160, 240, 340, 480, 862],
  scatter: 90,
  jelly: 28,
  jellyTail: 0.83,
};

/** Same free-spin symbols as the buy, with a thinner jellyfish tail so the ×10 head start stays near 96.3%. */
const INITIAL_SUPER: Profile = {
  gems: [520, 520, 520, 520, 520],
  highs: [160, 240, 340, 480, 862],
  scatter: 90,
  jelly: 27.4,
  jellyTail: 0.82,
};

let baseProfile: Profile = clone(INITIAL_BASE);
let anteProfile: Profile = clone(INITIAL_ANTE);
let fsProfile: Profile = clone(INITIAL_FS);
let superProfile: Profile = clone(INITIAL_SUPER);

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

export function expandWeights(profile: Profile): number[] {
  return [...profile.gems, ...profile.highs, profile.scatter, profile.jelly];
}

function rebuild(): void {
  tables = {
    base: {
      symbol: buildAlias(expandWeights(baseProfile)),
      jelly: buildAlias(jellyValueWeights(baseProfile.jellyTail)),
    },
    ante: {
      symbol: buildAlias(expandWeights(anteProfile)),
      jelly: buildAlias(jellyValueWeights(anteProfile.jellyTail)),
    },
    fs: {
      symbol: buildAlias(expandWeights(fsProfile)),
      jelly: buildAlias(jellyValueWeights(fsProfile.jellyTail)),
    },
    super: {
      symbol: buildAlias(expandWeights(superProfile)),
      jelly: buildAlias(jellyValueWeights(superProfile.jellyTail)),
    },
  };
}

rebuild();

export function setProfiles(base: Profile, ante: Profile, fs: Profile, superFs?: Profile): void {
  baseProfile = clone(base);
  anteProfile = clone(ante);
  fsProfile = clone(fs);
  if (superFs) superProfile = clone(superFs);
  rebuild();
}

export function getProfiles(): { base: Profile; ante: Profile; fs: Profile; super: Profile } {
  return { base: clone(baseProfile), ante: clone(anteProfile), fs: clone(fsProfile), super: clone(superProfile) };
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
