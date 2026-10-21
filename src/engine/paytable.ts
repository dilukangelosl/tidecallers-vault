import { PAYING_COUNT, SYM, type SymbolMeta } from './types';

/**
 * High-symbol pays are linear from the lowest high (Seahorse Chalice)
 * to the top (Tidecaller's Mask), across the five highs.
 * Tiers are 8–9 / 10–11 / 12+.
 * Gems share one ladder.
 */
function lerpHigh(low: number, high: number, index: number): number {
  return low + ((high - low) * index) / 4;
}

const GEM_PAY = [0.25, 0.75, 2] as const;

function highPay(index: number): readonly [number, number, number] {
  return [lerpHigh(1.5, 10, index), lerpHigh(2, 25, index), lerpHigh(12, 50, index)];
}

/** pay[symbol][tier] with tier 0 = 8–9, 1 = 10–11, 2 = 12+. */
export const PAY: readonly (readonly [number, number, number])[] = [
  GEM_PAY,
  GEM_PAY,
  GEM_PAY,
  GEM_PAY,
  GEM_PAY,
  highPay(0),
  highPay(1),
  highPay(2),
  highPay(3),
  highPay(4),
];

export const JELLY_VALUES = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 250, 500, 1000] as const;

export const SYMBOLS: readonly SymbolMeta[] = [
  { id: SYM.GEM_CYAN, key: 'gem_cyan', name: 'Cyan Sea-Glass', tier: 'low', blurb: 'Common glass. Pays anywhere.' },
  { id: SYM.GEM_GREEN, key: 'gem_green', name: 'Green Sea-Glass', tier: 'low', blurb: 'Common glass. Pays anywhere.' },
  { id: SYM.GEM_VIOLET, key: 'gem_violet', name: 'Violet Sea-Glass', tier: 'low', blurb: 'Common glass. Pays anywhere.' },
  { id: SYM.GEM_AMBER, key: 'gem_amber', name: 'Amber Sea-Glass', tier: 'low', blurb: 'Common glass. Pays anywhere.' },
  { id: SYM.GEM_RED, key: 'gem_red', name: 'Red Sea-Glass', tier: 'low', blurb: 'Common glass. Pays anywhere.' },
  { id: SYM.CHALICE, key: 'chalice', name: 'Seahorse Chalice', tier: 'high', blurb: 'Lowest relic.' },
  { id: SYM.CROWN, key: 'crown', name: 'Nautilus Crown', tier: 'high', blurb: 'Spiral relic.' },
  { id: SYM.TRIDENT, key: 'trident', name: 'Pearl Trident', tier: 'high', blurb: 'Tide weapon.' },
  { id: SYM.RING, key: 'ring', name: 'Kraken Ring', tier: 'high', blurb: 'A ring that still moves.' },
  { id: SYM.MASK, key: 'mask', name: "Tidecaller's Mask", tier: 'high', blurb: 'Top relic.' },
  { id: SYM.SCATTER, key: 'scatter', name: 'Vault Seal', tier: 'scatter', blurb: '4 / 5 / 6+ pay 3× / 5× / 100× and open the vault.' },
  { id: SYM.JELLY, key: 'jelly', name: 'Jellyfish', tier: 'multiplier', blurb: '2× to 1,000×. Values add together.' },
];

export function payOf(symbol: number, count: number): number {
  if (symbol < 0 || symbol >= PAYING_COUNT || count < 8) return 0;
  const tier = count >= 12 ? 2 : count >= 10 ? 1 : 0;
  return PAY[symbol][tier];
}

/** Scatter credit in bet-multiples. 7+ seals pay the 6-seal prize. */
export function scatterPay(count: number): number {
  if (count >= 6) return 100;
  if (count === 5) return 5;
  if (count === 4) return 3;
  return 0;
}

export function tierLabel(tier: 0 | 1 | 2): string {
  return tier === 0 ? '8–9' : tier === 1 ? '10–11' : '12+';
}
