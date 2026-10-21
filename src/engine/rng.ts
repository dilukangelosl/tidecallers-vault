/** mulberry32. `next()` is a uint32 in [0, 2^32). Deterministic and seedable. */
export interface Rng {
  next(): number;
  float(): number;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
  return {
    next,
    float: () => next() / 4294967296,
  };
}

export interface AliasTable {
  prob: Float64Array;
  alias: Uint16Array;
  n: number;
  weights: number[];
  sum: number;
}

/** Vose alias sampler. Weights must be non-negative and not all zero. */
export function buildAlias(weights: number[]): AliasTable {
  const n = weights.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += weights[i];
  if (!(sum > 0)) throw new Error('alias table needs a positive total weight');
  const prob = new Float64Array(n);
  const alias = new Uint16Array(n);
  const scaled = new Float64Array(n);
  for (let i = 0; i < n; i++) scaled[i] = (weights[i] * n) / sum;
  const small: number[] = [];
  const large: number[] = [];
  for (let i = 0; i < n; i++) (scaled[i] < 1 ? small : large).push(i);
  while (small.length && large.length) {
    const s = small.pop() as number;
    const l = large.pop() as number;
    prob[s] = scaled[s];
    alias[s] = l;
    scaled[l] = scaled[l] + scaled[s] - 1;
    (scaled[l] < 1 ? small : large).push(l);
  }
  while (large.length) prob[large.pop() as number] = 1;
  while (small.length) prob[small.pop() as number] = 1;
  return { prob, alias, n, weights: weights.slice(), sum };
}

export function sampleAlias(rng: Rng, table: AliasTable): number {
  const i = rng.next() % table.n;
  const u = rng.next() / 4294967296;
  return u < table.prob[i] ? i : table.alias[i];
}
