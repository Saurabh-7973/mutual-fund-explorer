import { describe, expect, it } from '@jest/globals';

import { lttbIndices } from '../lttb';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('lttbIndices', () => {
  it('returns every index when the series already fits', () => {
    expect(lttbIndices([0, 1, 2], [5, 6, 7], 10)).toEqual([0, 1, 2]);
    expect(lttbIndices(range(50), range(50), 2)).toEqual(range(50));
  });

  it('keeps the first and last points and hits the threshold', () => {
    const xs = range(5_000);
    const ys = xs.map((x) => Math.sin(x / 50));
    const kept = lttbIndices(xs, ys, 150);
    expect(kept).toHaveLength(150);
    expect(kept[0]).toBe(0);
    expect(kept.at(-1)).toBe(4_999);
  });

  it('keeps indices strictly increasing', () => {
    const xs = range(1_000);
    const kept = lttbIndices(xs, xs.map((x) => (x * 37) % 101), 120);
    expect(kept.every((value, i) => i === 0 || value > (kept[i - 1] ?? -1))).toBe(true);
  });

  it('keeps a one-day crash that every-nth sampling would drop', () => {
    const xs = range(1_000);
    const ys = xs.map((x) => (x === 503 ? 40 : 100));
    expect(lttbIndices(xs, ys, 100)).toContain(503);
  });
});
