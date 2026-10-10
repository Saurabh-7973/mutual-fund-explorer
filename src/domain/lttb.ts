/**
 * Largest-Triangle-Three-Buckets downsampling (Steinarsson, 2013).
 *
 * Keeps the first and last points, splits the rest into equal buckets, and from
 * each bucket keeps the point that forms the largest triangle with the previous
 * kept point and the next bucket's average. Peaks and crashes survive; plain
 * "every nth point" sampling can drop them.
 *
 * Returns indices into the input so callers keep their own point objects.
 */
export function lttbIndices(xs: readonly number[], ys: readonly number[], threshold: number): number[] {
  const n = Math.min(xs.length, ys.length);
  if (threshold >= n || threshold < 3) {
    return Array.from({ length: n }, (_, i) => i);
  }

  const kept: number[] = [0];
  const bucketSize = (n - 2) / (threshold - 2);
  let anchor = 0;

  for (let bucket = 0; bucket < threshold - 2; bucket++) {
    // Average of the next bucket (the last bucket's "next" is the final point).
    const nextStart = Math.floor((bucket + 1) * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((bucket + 2) * bucketSize) + 1, n);
    let avgX = 0;
    let avgY = 0;
    let count = 0;
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += xs[j] ?? 0;
      avgY += ys[j] ?? 0;
      count++;
    }
    if (count > 0) {
      avgX /= count;
      avgY /= count;
    }

    const start = Math.floor(bucket * bucketSize) + 1;
    const end = Math.floor((bucket + 1) * bucketSize) + 1;
    const ax = xs[anchor] ?? 0;
    const ay = ys[anchor] ?? 0;
    let maxArea = -1;
    let chosen = start;
    for (let j = start; j < end; j++) {
      const area = Math.abs((ax - avgX) * ((ys[j] ?? 0) - ay) - (ax - (xs[j] ?? 0)) * (avgY - ay));
      if (area > maxArea) {
        maxArea = area;
        chosen = j;
      }
    }
    kept.push(chosen);
    anchor = chosen;
  }

  kept.push(n - 1);
  return kept;
}
