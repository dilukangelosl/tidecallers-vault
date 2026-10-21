/** 6 columns × 5 rows. Index = column * ROWS + row, row 0 is the top. */
export const COLS = 6;
export const ROWS = 5;
export const CELLS = COLS * ROWS;

export const SYM = {
  GEM_CYAN: 0,
  GEM_GREEN: 1,
  GEM_VIOLET: 2,
  GEM_AMBER: 3,
  GEM_RED: 4,
  CHALICE: 5,
  CROWN: 6,
  TRIDENT: 7,
  RING: 8,
  MASK: 9,
  SCATTER: 10,
  JELLY: 11,
} as const;

export const SYMBOL_COUNT = 12;
export const PAYING_COUNT = 10;

export type Mode = 'base' | 'ante' | 'buy' | 'super';
export type WeightKind = 'base' | 'ante' | 'fs';

export interface SymbolMeta {
  id: number;
  key: string;
  name: string;
  tier: 'low' | 'high' | 'scatter' | 'multiplier';
  blurb: string;
}

export interface WinLine {
  symbol: number;
  count: number;
  pay: number;
}

export interface GridFrame {
  symbols: number[];
  mults: number[];
  /** Raw pay of this grid, in bet-multiples, before jellyfish / tide. */
  win: number;
  wins: WinLine[];
  /** Bit i set → cell i is removed before the next frame. */
  removeMask: number;
}

export interface SpinView {
  frames: GridFrame[];
  rawWin: number;
  jellySum: number;
  jellyCells: { index: number; value: number }[];
  scatters: number;
  scatterWin: number;
  /** Multiplier applied to rawWin. 1 when nothing multiplies it. */
  appliedMult: number;
  symbolWin: number;
  /** Amount actually credited after the round cap (may be clipped). */
  spinWin: number;
  tideBefore: number;
  tideAfter: number;
  extraSpins: number;
}

export interface RoundResult {
  mode: Mode;
  costX: number;
  totalWinX: number;
  capped: boolean;
  /** Feature was entered, including bonus buys. */
  triggered: boolean;
  /** Base / ante scatter trigger. Always false for buys. */
  naturalTrigger: boolean;
  fsPlayed: number;
  tideStart: number;
  tideEnd: number;
  /** Entering-spin credit (0 on buys), after the cap. */
  baseWinX: number;
  /** Free-spin credit, after the cap. */
  fsWinX: number;
  base: SpinView | null;
  freeSpins: SpinView[];
}

export interface Sampler {
  symbol(): number;
  jelly(): number;
}

export interface Session {
  grid: Uint8Array;
  mult: Uint16Array;
  counts: Int16Array;
  stepWin: number;
  stepMask: number;
}

export const MAX_WIN_X = 15_000;
export const FS_SPINS = 15;
export const FS_EXTRA = 5;
export const SUPER_START_METER = 10;
export const ANTE_COST_X = 1.25;
export const BUY_COST_X = 100;
export const SUPER_COST_X = 500;
export const MAX_TUMBLES = 64;
/** Safety stop so a retrigger loop cannot run away. The win cap binds first in practice. */
export const MAX_FREE_SPINS = 400;

/** Tide Meter thresholds for the cathedral → abyss → throne shift. */
export const TIDE_ABYSS = 15;
export const TIDE_THRONE = 50;

export function tideStage(meter: number): 0 | 1 | 2 {
  if (meter >= TIDE_THRONE) return 2;
  if (meter >= TIDE_ABYSS) return 1;
  return 0;
}

export function stakeX(mode: Mode): number {
  if (mode === 'ante') return ANTE_COST_X;
  if (mode === 'buy') return BUY_COST_X;
  if (mode === 'super') return SUPER_COST_X;
  return 1;
}
