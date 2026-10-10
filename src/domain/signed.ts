/**
 * Direction of a signed change, judged on the value as rounded for display, so
 * "+₹0.00" is never shown in the gain colour or read out as a gain.
 */

export type ChangeDirection = 'gain' | 'loss' | 'none';

export function changeDirection(rounded: bigint): ChangeDirection {
  return rounded > 0n ? 'gain' : rounded < 0n ? 'loss' : 'none';
}

/** What a screen reader says: "gain of ₹1,763.24", "loss of 2.10%", "no change". `magnitude` is unsigned. */
export function spokenChange(rounded: bigint, magnitude: string): string {
  const direction = changeDirection(rounded);
  return direction === 'none' ? 'no change' : `${direction} of ${magnitude}`;
}
