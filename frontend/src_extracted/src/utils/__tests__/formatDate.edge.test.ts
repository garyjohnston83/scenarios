import { formatDate } from '../formatDate';

describe('formatDate edge cases', () => {
  it('formats various valid ISO date strings correctly in dd/MM/yyyy HH:mm:ss format', () => {
    // Midnight
    expect(formatDate('2026-01-01T00:00:00')).toBe('01/01/2026 00:00:00');
    // End of year
    expect(formatDate('2026-12-31T23:59:59')).toBe('31/12/2026 23:59:59');
    // UTC suffix -- note: local timezone conversion may vary
    const result = formatDate('2026-06-15T12:00:00Z');
    // Just verify it matches dd/MM/yyyy HH:mm:ss pattern
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
  });

  it('returns the raw string for an empty string input', () => {
    expect(formatDate('')).toBe('');
  });
});
