import { formatDate } from '../formatDate';

describe('formatDate', () => {
  it('formats a valid ISO date string to "18 Feb 2026" format', () => {
    const result = formatDate('2026-02-18T08:00:00');
    expect(result).toBe('18 Feb 2026');
  });

  it('returns the raw string as fallback for an invalid date input', () => {
    const result = formatDate('not-a-date');
    expect(result).toBe('not-a-date');
  });
});
