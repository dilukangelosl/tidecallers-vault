import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playRound, playRoundFromSources, createSession } from './play';
import { PAY, payOf } from './paytable';
import { makeRng } from './rng';
import {
  MAX_WIN_X,
  SUPER_START_METER,
  SYM,
  type Mode,
  type Sampler,
} from './types';
import { symbolProbability } from './weights';

function scripted(symbols: number[], jellies: number[]): Sampler {
  let si = 0;
  let ji = 0;
  return {
    symbol() {
      if (si >= symbols.length) throw new Error(`symbol underflow at ${si}`);
      return symbols[si++];
    },
    jelly() {
      if (ji >= jellies.length) throw new Error(`jelly underflow at ${ji}`);
      return jellies[ji++];
    },
  };
}

/** After `prefix`, deal a repeating 0–9 pattern so no symbol can reach 8. */
function withFiller(prefix: number[], jellies: number[]): Sampler {
  const head = scripted(prefix, jellies);
  let n = 0;
  let j = 0;
  return {
    symbol() {
      if (n < prefix.length) {
        n++;
        return head.symbol();
      }
      return (n++ - prefix.length) % 10;
    },
    jelly() {
      if (j < jellies.length) {
        j++;
        return head.jelly();
      }
      return 2;
    },
  };
}

function sources(sampler: Sampler) {
  return { base: sampler, fs: sampler };
}

test('high pays interpolate from chalice to the mask', () => {
  assert.deepEqual(PAY[SYM.GEM_CYAN], [0.25, 0.75, 2]);
  assert.deepEqual(PAY[SYM.GEM_RED], [0.25, 0.75, 2]);
  assert.deepEqual(PAY[SYM.CHALICE], [1.5, 2, 12]);
  assert.deepEqual(PAY[SYM.CROWN], [3.625, 7.75, 21.5]);
  assert.deepEqual(PAY[SYM.TRIDENT], [5.75, 13.5, 31]);
  assert.deepEqual(PAY[SYM.RING], [7.875, 19.25, 40.5]);
  assert.deepEqual(PAY[SYM.MASK], [10, 25, 50]);
  assert.equal(payOf(SYM.GEM_CYAN, 7), 0);
  assert.equal(payOf(SYM.GEM_CYAN, 8), 0.25);
  assert.equal(payOf(SYM.GEM_CYAN, 9), 0.25);
  assert.equal(payOf(SYM.GEM_CYAN, 10), 0.75);
  assert.equal(payOf(SYM.GEM_CYAN, 11), 0.75);
  assert.equal(payOf(SYM.GEM_CYAN, 12), 2);
  assert.equal(payOf(SYM.MASK, 30), 50);
  assert.equal(payOf(SYM.SCATTER, 12), 0);
});

test('eight gems pay, then only the removed cells refill', () => {
  const symbols = new Array(30).fill(1).map((_, i) => (i % 9) + 1);
  const cyanAt = [0, 1, 2, 3, 5, 6, 7, 8];
  for (const index of cyanAt) symbols[index] = SYM.GEM_CYAN;
  const refill = [9, 8, 7, 6, 5, 4, 3, 2];
  const round = playRoundFromSources('base', sources(scripted([...symbols, ...refill], [])), true);
  assert.equal(round.base?.rawWin, 0.25);
  assert.equal(round.base?.appliedMult, 1);
  assert.equal(round.totalWinX, 0.25);
  assert.equal(round.naturalTrigger, false);
  const frames = round.base?.frames ?? [];
  assert.equal(frames.length, 2);
  assert.equal(frames[0].win, 0.25);
  assert.equal(frames[1].win, 0);
  // Column 0 lost its top four; the original bottom cell stays at the bottom.
  assert.equal(frames[1].symbols[4], frames[0].symbols[4]);
  assert.equal(frames[1].symbols[0], 9);
  assert.equal(frames[1].symbols[1], 8);
  assert.equal(frames[1].symbols[3], 6);
  // Column 1's new top cell is the fifth refill.
  assert.equal(frames[1].symbols[5], 5);
  assert.equal(frames[1].symbols[9], frames[0].symbols[9]);
});

test('a full-board win refills every cell from the top', () => {
  const symbols = new Array(30).fill(SYM.GEM_CYAN);
  const filler = Array.from({ length: 30 }, (_, i) => i % 10);
  const round = playRoundFromSources('base', sources(scripted([...symbols, ...filler], [])), true);
  assert.equal(round.base?.rawWin, 2);
  const frames = round.base?.frames ?? [];
  assert.equal(frames.length, 2);
  assert.equal(frames[0].removeMask, 2 ** 30 - 1);
  assert.deepEqual(frames[1].symbols, filler);
});

test('jellyfish add together and multiply only a winning sequence', () => {
  const symbols = [
    ...Array(8).fill(SYM.GEM_CYAN),
    ...Array(2).fill(SYM.JELLY),
    ...Array(4).fill(SYM.GEM_GREEN),
    ...Array(4).fill(SYM.GEM_VIOLET),
    ...Array(4).fill(SYM.GEM_AMBER),
    ...Array(4).fill(SYM.GEM_RED),
    ...Array(4).fill(SYM.CHALICE),
  ];
  const refill = [6, 6, 7, 7, 8, 8, 9, 9];
  const round = playRoundFromSources('base', sources(scripted([...symbols, ...refill], [2, 3])), true);
  assert.equal(round.base?.rawWin, 0.25);
  assert.equal(round.base?.jellySum, 5);
  assert.equal(round.base?.appliedMult, 5);
  assert.equal(round.totalWinX, 1.25);
  assert.equal(round.base?.jellyCells.length, 2);
});

test('jellyfish on a dead spin do not pay and do not multiply a scatter', () => {
  const symbols = [
    ...Array(4).fill(SYM.SCATTER),
    ...Array(2).fill(SYM.JELLY),
    ...Array(6).fill(SYM.GEM_CYAN),
    ...Array(4).fill(SYM.GEM_GREEN),
    ...Array(4).fill(SYM.GEM_VIOLET),
    ...Array(4).fill(SYM.GEM_AMBER),
    ...Array(4).fill(SYM.GEM_RED),
    ...Array(2).fill(SYM.CHALICE),
  ];
  assert.equal(symbols.length, 30);
  const round = playRoundFromSources('base', sources(withFiller(symbols, [100, 100])), true);
  assert.equal(round.base?.rawWin, 0);
  assert.equal(round.base?.jellySum, 200);
  assert.equal(round.base?.appliedMult, 1);
  assert.equal(round.base?.scatterWin, 3);
  assert.equal(round.base?.spinWin, 3);
  assert.equal(round.naturalTrigger, true);
  assert.equal(round.fsPlayed > 0, true);
});

test('scatter ladder and free-spin awards', () => {
  const dead = (seals: number) => {
    const cells = new Array(30).fill(SYM.TRIDENT);
    for (let i = 0; i < seals; i++) cells[i] = SYM.SCATTER;
    const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = seals; i < 30; i++) cells[i] = pool[(i - seals) % pool.length];
    const counts = new Array(12).fill(0);
    for (const c of cells) counts[c]++;
    assert.ok(counts.slice(0, 10).every((n: number) => n < 8), `unexpected win ${counts}`);
    return cells;
  };

  const four = playRoundFromSources('base', sources(withFiller(dead(4), [])), false);
  assert.equal(four.baseWinX, 3);
  assert.equal(four.naturalTrigger, true);

  const five = playRoundFromSources('base', sources(withFiller(dead(5), [])), false);
  assert.equal(five.baseWinX, 5);

  const six = playRoundFromSources('base', sources(withFiller(dead(6), [])), false);
  assert.equal(six.baseWinX, 100);

  const seven = playRoundFromSources('base', sources(withFiller(dead(7), [])), false);
  assert.equal(seven.baseWinX, 100);

  const three = playRoundFromSources('base', sources(withFiller(dead(3), [])), false);
  assert.equal(three.baseWinX, 0);
  assert.equal(three.naturalTrigger, false);
  assert.equal(three.fsPlayed, 0);
});

test('free spins add jellyfish to the tide and retrigger on 3 seals', () => {
  const winning = [
    ...Array(8).fill(SYM.GEM_CYAN),
    ...Array(4).fill(SYM.GEM_GREEN),
    ...Array(4).fill(SYM.GEM_VIOLET),
    ...Array(4).fill(SYM.GEM_AMBER),
    ...Array(4).fill(SYM.GEM_RED),
    ...Array(4).fill(SYM.CHALICE),
    ...Array(2).fill(SYM.CROWN),
  ];
  const withJelly = [
    ...Array(8).fill(SYM.GEM_GREEN),
    SYM.JELLY,
    ...Array(4).fill(SYM.GEM_CYAN),
    ...Array(4).fill(SYM.GEM_VIOLET),
    ...Array(4).fill(SYM.GEM_AMBER),
    ...Array(4).fill(SYM.GEM_RED),
    ...Array(5).fill(SYM.CHALICE),
  ];
  const seals = new Array(30).fill(0).map((_, i) => (i < 3 ? SYM.SCATTER : (i % 9) + 1));
  // 15 spins would be a lot. Use buy, but stop by capping? We want an exact script of 3 spins.
  // Play a custom-length by using a sampler that errors if we go too far — instead assert first spins.
  // Refill buffers sit between scripted grids so a tumble cannot eat the next spin.
  const refillA = [6, 6, 7, 7, 8, 8, 9, 9];
  const refillB = [7, 7, 7, 8, 8, 8, 9, 9];
  const queue = [...withJelly, ...refillA, ...winning, ...refillB, ...seals];
  const round = playRoundFromSources('buy', sources(withFiller(queue, [4])), true);
  const spins = round.freeSpins;
  assert.equal(spins[0].rawWin, 0.25);
  assert.equal(spins[0].jellySum, 4);
  assert.equal(spins[0].tideBefore, 0);
  assert.equal(spins[0].tideAfter, 4);
  assert.equal(spins[0].appliedMult, 4);
  assert.equal(spins[0].spinWin, 1);
  // Second scripted grid has no jelly. Tide stays 4 and multiplies 0.25.
  assert.equal(spins[1].rawWin, 0.25);
  assert.equal(spins[1].jellySum, 0);
  assert.equal(spins[1].appliedMult, 4);
  assert.equal(spins[1].spinWin, 1);
  assert.equal(spins[1].tideAfter, 4);
  assert.equal(spins[2].scatters, 3);
  assert.equal(spins[2].extraSpins, 5);
  assert.equal(spins[2].scatterWin, 0);
  assert.ok(round.fsPlayed >= 20);
});

test('super buy starts the tide at 10× and a dead jellyfish does not raise it', () => {
  const win = [
    ...Array(8).fill(SYM.GEM_CYAN),
    ...Array(4).fill(SYM.GEM_GREEN),
    ...Array(4).fill(SYM.GEM_VIOLET),
    ...Array(4).fill(SYM.GEM_AMBER),
    ...Array(4).fill(SYM.GEM_RED),
    ...Array(4).fill(SYM.CHALICE),
    ...Array(2).fill(SYM.CROWN),
  ];
  const sleepy = [
    ...Array(2).fill(SYM.JELLY),
    ...Array(4).fill(SYM.GEM_CYAN),
    ...Array(4).fill(SYM.GEM_GREEN),
    ...Array(4).fill(SYM.GEM_VIOLET),
    ...Array(4).fill(SYM.GEM_AMBER),
    ...Array(4).fill(SYM.GEM_RED),
    ...Array(4).fill(SYM.CHALICE),
    ...Array(4).fill(SYM.CROWN),
  ];
  assert.equal(sleepy.length, 30);
  const refill = [7, 7, 7, 8, 8, 8, 9, 9];
  const round = playRoundFromSources('super', sources(withFiller([...win, ...refill, ...sleepy], [50, 50])), true);
  assert.equal(round.tideStart, SUPER_START_METER);
  assert.equal(round.freeSpins[0].appliedMult, 10);
  assert.equal(round.freeSpins[0].spinWin, 2.5);
  assert.equal(round.freeSpins[0].tideAfter, 10);
  assert.equal(round.freeSpins[1].rawWin, 0);
  assert.equal(round.freeSpins[1].tideAfter, 10);
  assert.equal(round.freeSpins[1].spinWin, 0);
});

test('the round caps at 15000× and stops dealing', () => {
  const symbols = [...Array(12).fill(SYM.MASK), ...Array(18).fill(SYM.JELLY)];
  const refill = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7];
  const jellies = Array(18).fill(1000);
  let draws = 0;
  const sampler: Sampler = {
    symbol() {
      if (draws >= symbols.length + refill.length) throw new Error('dealt past the capping spin');
      const value = draws < symbols.length ? symbols[draws] : refill[draws - symbols.length];
      draws++;
      return value;
    },
    jelly() {
      const value = jellies.pop();
      if (value === undefined) throw new Error('jelly underflow');
      return value;
    },
  };
  const round = playRoundFromSources('buy', sources(sampler), false);
  assert.equal(round.capped, true);
  assert.equal(round.totalWinX, MAX_WIN_X);
  assert.equal(round.fsPlayed, 1);
  assert.equal(draws, 42);
});

test('the same seed replays exactly, traced or not', () => {
  const modes: Mode[] = ['base', 'ante', 'buy', 'super'];
  const session = createSession();
  for (const mode of modes) {
    for (let seed = 1; seed <= 12; seed++) {
      const fast = playRound(makeRng(seed), mode, false, session);
      const full = playRound(makeRng(seed), mode, true, session);
      assert.equal(fast.totalWinX, full.totalWinX, `${mode} ${seed} win`);
      assert.equal(fast.fsPlayed, full.fsPlayed, `${mode} ${seed} spins`);
      assert.equal(fast.capped, full.capped);
      assert.equal(fast.tideEnd, full.tideEnd);
      assert.equal(fast.naturalTrigger, full.naturalTrigger);
      if (full.base) {
        const raw = full.base.frames.reduce((sum, frame) => sum + frame.win, 0);
        assert.equal(raw, full.base.rawWin);
      }
    }
  }
});

test('ante uses its own strip and lands more seals than the base game', () => {
  const base = symbolProbability('base', SYM.SCATTER);
  const ante = symbolProbability('ante', SYM.SCATTER);
  assert.ok(base > 0 && base < 0.05);
  assert.ok(ante > base * 1.2);
  assert.ok(ante < base * 2.2);
  const baseGem = symbolProbability('base', SYM.GEM_CYAN);
  const anteGem = symbolProbability('ante', SYM.GEM_CYAN);
  assert.ok(anteGem > 0 && anteGem < baseGem);
});
