import { getFormatTokenClass, FORMAT_TOKEN_CLASS_MAP } from '../formatTokenStyles';

describe('getFormatTokenClass', () => {
  it('returns correct CSS class for known tokens (positive, negative, warning, breach, neutral)', () => {
    // With identity-obj-proxy, CSS module keys return the key name as the class string
    expect(getFormatTokenClass('positive')).toBe('positive');
    expect(getFormatTokenClass('negative')).toBe('negative');
    expect(getFormatTokenClass('warning')).toBe('warning');
    expect(getFormatTokenClass('breach')).toBe('breach');
    expect(getFormatTokenClass('neutral')).toBe('neutral');

    // Verify the map contains all 5 expected tokens
    expect(Object.keys(FORMAT_TOKEN_CLASS_MAP)).toHaveLength(5);
    expect(FORMAT_TOKEN_CLASS_MAP).toHaveProperty('positive');
    expect(FORMAT_TOKEN_CLASS_MAP).toHaveProperty('negative');
    expect(FORMAT_TOKEN_CLASS_MAP).toHaveProperty('warning');
    expect(FORMAT_TOKEN_CLASS_MAP).toHaveProperty('breach');
    expect(FORMAT_TOKEN_CLASS_MAP).toHaveProperty('neutral');
  });

  it('returns neutral class for unknown tokens', () => {
    const neutralClass = getFormatTokenClass('neutral');

    expect(getFormatTokenClass('unknown_token')).toBe(neutralClass);
    expect(getFormatTokenClass('')).toBe(neutralClass);
    expect(getFormatTokenClass('critical')).toBe(neutralClass);
    expect(getFormatTokenClass('info')).toBe(neutralClass);
  });
});
