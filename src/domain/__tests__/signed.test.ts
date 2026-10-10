import { describe, expect, it } from '@jest/globals';

import { rescale } from '../decimal';
import { changeDirection, spokenChange } from '../signed';

describe('changeDirection', () => {
  it('reads the sign of the rounded value', () => {
    expect(changeDirection(176324n)).toBe('gain');
    expect(changeDirection(-1n)).toBe('loss');
    expect(changeDirection(0n)).toBe('none');
  });

  it('treats a sub-paisa amount as no change once rounded', () => {
    // 0.004 rupees at scale 3 rounds to 0 paise.
    expect(changeDirection(rescale(4n, 3, 2))).toBe('none');
    expect(changeDirection(rescale(-4n, 3, 2))).toBe('none');
  });
});

describe('spokenChange', () => {
  it('names the direction and magnitude', () => {
    expect(spokenChange(176324n, '₹1,763.24')).toBe('gain of ₹1,763.24');
    expect(spokenChange(-10000n, '₹100.00')).toBe('loss of ₹100.00');
    expect(spokenChange(0n, '₹0.00')).toBe('no change');
  });
});
