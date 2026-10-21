import { payOf, scatterPay } from './paytable';
import { makeRng, type Rng } from './rng';
import {
  CELLS,
  FS_EXTRA,
  FS_SPINS,
  MAX_FREE_SPINS,
  MAX_TUMBLES,
  MAX_WIN_X,
  PAYING_COUNT,
  SUPER_START_METER,
  SYM,
  stakeX,
  type GridFrame,
  type Mode,
  type RoundResult,
  type Sampler,
  type Session,
  type SpinView,
  type WinLine,
} from './types';
import { samplerFromRng } from './weights';

export function createSession(): Session {
  return {
    grid: new Uint8Array(CELLS),
    mult: new Uint16Array(CELLS),
    counts: new Int16Array(12),
    stepWin: 0,
    stepMask: 0,
  };
}

function draw(session: Session, index: number, sampler: Sampler): void {
  const symbol = sampler.symbol();
  session.grid[index] = symbol;
  session.mult[index] = symbol === SYM.JELLY ? sampler.jelly() : 0;
}

function evaluate(session: Session): void {
  const counts = session.counts;
  counts.fill(0);
  const grid = session.grid;
  for (let i = 0; i < CELLS; i++) counts[grid[i]]++;
  let win = 0;
  let types = 0;
  for (let s = 0; s < PAYING_COUNT; s++) {
    const count = counts[s];
    if (count >= 8) {
      win += payOf(s, count);
      types |= 1 << s;
    }
  }
  let mask = 0;
  if (types) {
    for (let i = 0; i < CELLS; i++) {
      const symbol = grid[i];
      if (symbol < PAYING_COUNT && (types & (1 << symbol)) !== 0) mask |= 1 << i;
    }
  }
  session.stepWin = win;
  session.stepMask = mask;
}

/**
 * Pack survivors to the bottom of each column, preserving their order.
 * New symbols fill the vacated top cells, first draw at the top.
 */
function collapse(session: Session, sampler: Sampler): void {
  const mask = session.stepMask;
  const grid = session.grid;
  const mult = session.mult;
  for (let c = 0; c < 6; c++) {
    let write = 4;
    for (let r = 4; r >= 0; r--) {
      const i = c * 5 + r;
      if ((mask & (1 << i)) === 0) {
        const dst = c * 5 + write;
        if (dst !== i) {
          grid[dst] = grid[i];
          mult[dst] = mult[i];
        }
        write--;
      }
    }
    for (let r = 0; r <= write; r++) draw(session, c * 5 + r, sampler);
  }
}

function capture(session: Session): GridFrame {
  const wins: WinLine[] = [];
  for (let s = 0; s < PAYING_COUNT; s++) {
    const count = session.counts[s];
    if (count >= 8) wins.push({ symbol: s, count, pay: payOf(s, count) });
  }
  return {
    symbols: Array.from(session.grid),
    mults: Array.from(session.mult),
    win: session.stepWin,
    wins,
    removeMask: session.stepMask,
  };
}

interface SeqCore {
  raw: number;
  jelly: number;
  scatters: number;
  frames: GridFrame[] | null;
  cells: { index: number; value: number }[];
}

function resolveSequence(session: Session, sampler: Sampler, trace: boolean): SeqCore {
  for (let i = 0; i < CELLS; i++) draw(session, i, sampler);
  const frames: GridFrame[] | null = trace ? [] : null;
  let raw = 0;
  let guard = 0;
  for (;;) {
    evaluate(session);
    if (frames) frames.push(capture(session));
    if (session.stepWin <= 0) break;
    raw += session.stepWin;
    if (++guard >= MAX_TUMBLES) break;
    collapse(session, sampler);
  }
  let jelly = 0;
  const cells: { index: number; value: number }[] = [];
  if (session.counts[SYM.JELLY]) {
    for (let i = 0; i < CELLS; i++) {
      if (session.grid[i] === SYM.JELLY) {
        const value = session.mult[i];
        jelly += value;
        if (trace) cells.push({ index: i, value });
      }
    }
  }
  return { raw, jelly, scatters: session.counts[SYM.SCATTER], frames, cells };
}

function viewFrom(
  seq: SeqCore,
  appliedMult: number,
  spinWin: number,
  tideBefore: number,
  tideAfter: number,
  extraSpins: number,
): SpinView {
  const scatterWin = scatterPay(seq.scatters);
  return {
    frames: seq.frames ?? [],
    rawWin: seq.raw,
    jellySum: seq.jelly,
    jellyCells: seq.cells,
    scatters: seq.scatters,
    scatterWin,
    appliedMult,
    symbolWin: seq.raw * appliedMult,
    spinWin,
    tideBefore,
    tideAfter,
    extraSpins,
  };
}

function clip(total: number, spin: number): { total: number; paid: number; capped: boolean } {
  if (total >= MAX_WIN_X) return { total: MAX_WIN_X, paid: 0, capped: true };
  if (total + spin >= MAX_WIN_X) return { total: MAX_WIN_X, paid: MAX_WIN_X - total, capped: true };
  return { total: total + spin, paid: spin, capped: false };
}

export interface Sources {
  base: Sampler;
  fs: Sampler;
}

/**
 * One paid round. Wins are bet-multiples of the base bet (ante / buy price is `costX`).
 * Scatter credit is not multiplied. In free spins the Tide Meter is the sum of jellyfish
 * that landed on winning sequences; it multiplies the current win and every later one.
 */
export function playRoundFromSources(mode: Mode, sources: Sources, trace: boolean, session?: Session): RoundResult {
  const ctx = session ?? createSession();
  const inBuy = mode === 'buy' || mode === 'super';
  let total = 0;
  let capped = false;
  let tide = mode === 'super' ? SUPER_START_METER : 0;
  const tideStart = tide;
  let naturalTrigger = false;
  let baseWinX = 0;
  let fsWinX = 0;
  let baseView: SpinView | null = null;
  const freeSpins: SpinView[] = [];

  if (!inBuy) {
    const seq = resolveSequence(ctx, sources.base, trace);
    const applied = seq.raw > 0 && seq.jelly > 0 ? seq.jelly : 1;
    const gross = seq.raw * applied + scatterPay(seq.scatters);
    const clipped = clip(total, gross);
    total = clipped.total;
    capped = clipped.capped;
    baseWinX = clipped.paid;
    if (seq.scatters >= 4) naturalTrigger = true;
    if (trace) baseView = viewFrom(seq, applied, clipped.paid, 0, 0, naturalTrigger ? FS_SPINS : 0);
  }

  let left = inBuy || naturalTrigger ? FS_SPINS : 0;
  if (capped) left = 0;
  let played = 0;
  while (left > 0 && played < MAX_FREE_SPINS) {
    left--;
    played++;
    const before = tide;
    const seq = resolveSequence(ctx, sources.fs, trace);
    if (seq.raw > 0 && seq.jelly > 0) tide += seq.jelly;
    const applied = tide > 0 ? tide : 1;
    const gross = seq.raw * applied + scatterPay(seq.scatters);
    const clipped = clip(total, gross);
    total = clipped.total;
    fsWinX += clipped.paid;
    const extra = !clipped.capped && seq.scatters >= 3 ? FS_EXTRA : 0;
    if (extra) left += extra;
    if (trace) freeSpins.push(viewFrom(seq, applied, clipped.paid, before, tide, extra));
    if (clipped.capped) {
      capped = true;
      break;
    }
  }

  return {
    mode,
    costX: stakeX(mode),
    totalWinX: total,
    capped,
    triggered: inBuy || naturalTrigger,
    naturalTrigger,
    fsPlayed: played,
    tideStart,
    tideEnd: tide,
    baseWinX,
    fsWinX,
    base: baseView,
    freeSpins,
  };
}

export function playRound(rng: Rng, mode: Mode, trace = false, session?: Session): RoundResult {
  const baseKind = mode === 'ante' ? 'ante' : 'base';
  const fsKind = mode === 'super' ? 'super' : 'fs';
  return playRoundFromSources(
    mode,
    { base: samplerFromRng(rng, baseKind), fs: samplerFromRng(rng, fsKind) },
    trace,
    session,
  );
}

export { makeRng };
