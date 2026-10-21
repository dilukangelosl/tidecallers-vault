import { CELLS } from '../engine/types';

/**
 * Opening grid. Every paying symbol is under the 8-kind threshold,
 * with two Vault Seals and two jellyfish so the cathedral reads at a glance.
 */
const SYMBOLS = [
  9, 5, 0, 10, 1,
  6, 2, 11, 3, 7,
  4, 8, 0, 5, 2,
  1, 9, 3, 6, 4,
  7, 0, 10, 8, 1,
  2, 11, 5, 3, 4,
];

export const SHOWCASE_SYMBOLS = SYMBOLS;
export const SHOWCASE_MULTS = Array.from({ length: CELLS }, (_, index) => {
  if (index === 7) return 25;
  if (index === 26) return 100;
  return 0;
});
