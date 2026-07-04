import { describe, expect, it } from 'vitest';

import { shiftDate } from './dateNav';

describe('date navigation', () => {
  it('moves a yyyy-mm-dd date by day offsets', () => {
    expect(shiftDate('2026-07-04', -1)).toBe('2026-07-03');
    expect(shiftDate('2026-07-04', 1)).toBe('2026-07-05');
  });

  it('handles month boundaries', () => {
    expect(shiftDate('2026-08-01', -1)).toBe('2026-07-31');
  });
});
