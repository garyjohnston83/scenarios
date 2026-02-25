import { formatDate } from '../formatDate';

describe('formatDate', () => {
  it('formats a valid ISO date string to "dd/MM/yyyy HH:mm:ss" format', () => {
    const result = formatDate('2026-02-18T08:00:00');
    expect(result).toBe('18/02/2026 08:00:00');
  });

  it('returns the raw string as fallback for an invalid date input', () => {
    const result = formatDate('not-a-date');
    expect(result).toBe('not-a-date');
  });
});
