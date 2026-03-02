import { normalizeMode } from '../normalizeMode';

describe('normalizeMode', () => {
  it('maps LINK_OUT to EXTERNAL', () => {
    expect(normalizeMode('LINK_OUT')).toBe('EXTERNAL');
  });

  it('maps GRID to INTERNAL', () => {
    expect(normalizeMode('GRID')).toBe('INTERNAL');
  });

  it('passes through EXTERNAL unchanged', () => {
    expect(normalizeMode('EXTERNAL')).toBe('EXTERNAL');
  });

  it('passes through INTERNAL unchanged', () => {
    expect(normalizeMode('INTERNAL')).toBe('INTERNAL');
  });

  it('defaults unknown values to EXTERNAL with console.warn', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    expect(normalizeMode('FOOBAR')).toBe('EXTERNAL');
    expect(warnSpy).toHaveBeenCalledWith(
      'Unknown scenario mode "FOOBAR", defaulting to EXTERNAL'
    );
    warnSpy.mockRestore();
  });
});
