import { describe, expect, it } from '@jest/globals';

import { addDays } from '../dates';
import { VALUE_SCALE } from '../decimal';
import { formatInr } from '../format';
import { MAX_SIP_INSTALMENTS, planSip } from '../sip';
import type { IsoDate, NavPoint } from '../types';

const d = (value: string) => value as IsoDate;

function daily(start: string, days: number, nav = '10.0000', skip: (date: IsoDate) => boolean = () => false) {
  const points: NavPoint[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(d(start), i);
    if (!skip(date)) points.push({ date, nav, value: Number(nav) });
  }
  return points;
}

describe('planSip', () => {
  it('makes one instalment a month up to today, each amount ÷ NAV in units', () => {
    const points = daily('2025-01-01', 300);
    const plan = planSip(points, null, 5000, d('2025-01-05'), d('2025-10-20'));
    expect(plan.instalments).toHaveLength(10); // 5 Jan … 5 Oct
    expect(plan.instalments[0]?.units).toBe('500');
    expect(plan.instalments[9]?.purchaseDate).toBe('2025-10-05');
    expect(plan.problem).toBeNull();
    expect(formatInr(plan.paid, VALUE_SCALE)).toBe('₹50,000.00');
  });

  it('prices a holiday instalment at the next NAV and keeps later dates on the same day of month', () => {
    const points = daily('2025-01-01', 200, '10.0000', (date) => date === '2025-02-05' || date === '2025-02-06');
    const plan = planSip(points, null, 1000, d('2025-01-05'), d('2025-04-10'));
    expect(plan.instalments.map((i) => [i.purchaseDate, i.applied.navDate])).toEqual([
      ['2025-01-05', '2025-01-05'],
      ['2025-02-05', '2025-02-07'],
      ['2025-03-05', '2025-03-05'],
      ['2025-04-05', '2025-04-05'],
    ]);
  });

  it('falls back to the last day for the 31st', () => {
    const plan = planSip(daily('2025-01-01', 120), null, 1000, d('2025-01-31'), d('2025-04-01'));
    expect(plan.instalments.map((i) => i.purchaseDate)).toEqual(['2025-01-31', '2025-02-28', '2025-03-31']);
  });

  it('leaves out instalments whose NAV is not out yet, and says why nothing fits', () => {
    const points = daily('2025-01-01', 40); // NAVs to 9 Feb
    const plan = planSip(points, null, 1000, d('2025-01-10'), d('2025-02-12'));
    expect(plan.instalments).toHaveLength(1);
    expect(plan.awaiting).toEqual(['2025-02-10']);
    expect(planSip(points, null, 1000, d('2024-06-01'), d('2025-02-12')).problem).toBe('before-first');
    expect(planSip(points, null, 0, d('2025-01-10'), d('2025-02-12')).instalments).toEqual([]);
  });

  it('caps a SIP at 40 years', () => {
    expect(MAX_SIP_INSTALMENTS).toBe(480);
  });
});
