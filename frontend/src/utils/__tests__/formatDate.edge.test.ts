import { formatDate } from '../formatDate';

describe('formatDate edge cases', () => {
  it('formats various valid ISO date strings correctly', () => {
    // Midnight
    expect(formatDate('2026-01-01T00:00:00')).toBe('1 Jan 2026');
    // End of year
    expect(formatDate('2026-12-31T23:59:59')).toBe('31 Dec 2026');
    // UTC suffix
    expect(formatDate('2026-06-15T12:00:00Z')).toBe('15 Jun 2026');
  });

  it('returns the raw string for an empty string input', () => {
    expect(formatDate('')).toBe('');
  });
});
