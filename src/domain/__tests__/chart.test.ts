import { describe, expect, it } from '@jest/globals';

import { MINUS } from '../format';
import { buildChartGeometry, chartSummary, nearestIndex, scrubTickKey } from '../chart';
import { addDays } from '../dates';
import type { IsoDate, NavPoint } from '../types';

const d = (value: string) => value as IsoDate;
const p = (date: string, nav: string): NavPoint => ({ date: d(date), nav, value: Number(nav) });
const box = { width: 320, height: 160, padTop: 10, padBottom: 10, padX: 0 };

function daily(count: number, valueAt: (i: number) => number): NavPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const value = valueAt(i);
    return { date: addDays(d('2012-01-01'), i), nav: value.toFixed(4), value };
  });
}

describe('buildChartGeometry', () => {
  it('needs at least two points and a usable box', () => {
    expect(buildChartGeometry([p('2026-10-08', '10')], box)).toBeNull();
    expect(buildChartGeometry([p('2026-10-07', '10'), p('2026-10-08', '11')], { ...box, width: 0 })).toBeNull();
  });

  it('spans the box: oldest at the left edge, newest at the right, max at the top', () => {
    const geometry = buildChartGeometry([p('2026-10-01', '10'), p('2026-10-05', '12'), p('2026-10-09', '11')], box);
    expect(geometry?.xs).toEqual([0, 160, 320]);
    expect(geometry?.ys).toEqual([150, 10, 80]);
    expect(geometry?.line).toBe('M0 150 L160 10 L320 80');
    expect(geometry?.area).toBe('M0 150 L160 10 L320 80 L320 150 L0 150 Z');
    expect(geometry?.minValue).toBe(10);
    expect(geometry?.maxValue).toBe(12);
  });

  it('spaces points by calendar days, so a gap in the data stays visible', () => {
    const geometry = buildChartGeometry([p('2026-01-01', '10'), p('2026-01-02', '10.5'), p('2026-01-11', '11')], box);
    expect(geometry?.xs).toEqual([0, 32, 320]);
  });

  it('draws a flat series as a level line through the middle', () => {
    const geometry = buildChartGeometry([p('2026-10-01', '10'), p('2026-10-02', '10'), p('2026-10-05', '10')], box);
    expect(geometry?.ys).toEqual([80, 80, 80]);
  });

  it('downsamples a long history without losing the ends', () => {
    const series = daily(5_000, (i) => 10 + Math.sin(i / 90) + i / 1_000);
    const geometry = buildChartGeometry(series, box);
    expect(geometry?.points.length).toBe(150);
    expect(geometry?.points[0]).toBe(series[0]);
    expect(geometry?.points.at(-1)).toBe(series.at(-1));
    expect(geometry?.xs.every((x, i, all) => i === 0 || x >= (all[i - 1] ?? 0))).toBe(true);
    expect(geometry?.line.includes('NaN')).toBe(false);
  });
});

describe('nearestIndex', () => {
  const xs = [0, 10, 30, 60];

  it('finds the closest drawn point to a touch', () => {
    expect(nearestIndex(xs, -5)).toBe(0);
    expect(nearestIndex(xs, 4)).toBe(0);
    expect(nearestIndex(xs, 6)).toBe(1);
    expect(nearestIndex(xs, 21)).toBe(2);
    expect(nearestIndex(xs, 100)).toBe(3);
  });

  it('prefers the earlier point on an exact tie, and handles empty input', () => {
    expect(nearestIndex(xs, 5)).toBe(0);
    expect(nearestIndex([], 5)).toBe(-1);
  });
});

describe('chartSummary', () => {
  it('describes the range in words for screen readers', () => {
    expect(chartSummary([p('2025-10-09', '75.66720'), p('2026-10-09', '88.92580')])).toBe(
      'NAV up 17.52% from ₹75.6672 on 09 Oct 2025 to ₹88.9258 on 09 Oct 2026',
    );
    expect(chartSummary([p('2026-10-07', '88.83890'), p('2026-10-08', '87.65550')])).toBe(
      'NAV down 1.33% from ₹88.8389 on 07 Oct 2026 to ₹87.6555 on 08 Oct 2026',
    );
    expect(chartSummary([p('2026-10-07', '10'), p('2026-10-08', '10')])).toBe(
      'NAV unchanged from ₹10.0000 on 07 Oct 2026 to ₹10.0000 on 08 Oct 2026',
    );
  });

  it('says nothing for a single point and never uses a minus sign in words', () => {
    expect(chartSummary([p('2026-10-08', '10')])).toBeNull();
    expect(chartSummary([p('2026-10-07', '20'), p('2026-10-08', '10')])).not.toContain(MINUS);
  });
});

describe('scrubTickKey', () => {
  const d = (value: string) => value as IsoDate;
  it('ticks on every point over three months or less', () => {
    expect(scrubTickKey(d('2026-09-14'), d('2026-07-09'), d('2026-10-09'))).toBe('2026-09-14');
  });
  it('ticks once a month over longer spans', () => {
    const first = d('2025-10-09');
    const last = d('2026-10-09');
    expect(scrubTickKey(d('2026-03-02'), first, last)).toBe('2026-03');
    expect(scrubTickKey(d('2026-03-31'), first, last)).toBe(scrubTickKey(d('2026-03-02'), first, last));
    expect(scrubTickKey(d('2026-04-01'), first, last)).not.toBe(scrubTickKey(d('2026-03-31'), first, last));
  });
});
