import { normalizeTab, resolveInitialTab } from '../normalizeTab';
import type { ImpactReportData } from '../../store/scenariosSlice';

describe('normalizeTab', () => {
  it("returns 'direct-changes' when given 'direct-changes'", () => {
    expect(normalizeTab('direct-changes')).toBe('direct-changes');
  });

  it("returns 'impact-reports' when given 'impact-reports'", () => {
    expect(normalizeTab('impact-reports')).toBe('impact-reports');
  });

  it("returns 'direct-changes' when given null", () => {
    expect(normalizeTab(null)).toBe('direct-changes');
  });

  it("returns 'direct-changes' when given undefined", () => {
    expect(normalizeTab(undefined)).toBe('direct-changes');
  });

  it("returns 'direct-changes' when given an empty string", () => {
    expect(normalizeTab('')).toBe('direct-changes');
  });

  it("returns 'direct-changes' when given an invalid value", () => {
    expect(normalizeTab('invalid-value')).toBe('direct-changes');
  });
});

// Task 7.3: Tests for resolveInitialTab

describe('resolveInitialTab', () => {
  const mockReport1: ImpactReportData = {
    impactRunId: 'run-abc',
    name: 'RUN-2026-0219-001',
    createdAt: '2026-02-19T14:00:00',
    dataset: { columns: ['Col1'], rows: [{ rowId: 'r1', payload: { Col1: 'v1' } }] },
    compareCta: null,
  };

  const mockReport2: ImpactReportData = {
    impactRunId: 'run-def',
    name: 'RUN-2026-0219-002',
    createdAt: '2026-02-19T15:30:00',
    dataset: { columns: ['Col1'], rows: [{ rowId: 'r2', payload: { Col1: 'v2' } }] },
    compareCta: null,
  };

  describe('when initial-tab=direct-changes', () => {
    it('returns "direct-changes" when directChangesAvailable=true', () => {
      const result = resolveInitialTab('direct-changes', true, [mockReport1]);
      expect(result).toBe('direct-changes');
    });

    it('falls through to impact reports when directChangesAvailable=false', () => {
      const result = resolveInitialTab('direct-changes', false, [mockReport1]);
      expect(result).toBe('impact-run-abc');
    });

    it('falls through to null when directChangesAvailable=false and no reports', () => {
      const result = resolveInitialTab('direct-changes', false, []);
      expect(result).toBeNull();
    });
  });

  describe('when initial-tab=impact-reports', () => {
    it('returns first impact tab when reports are available', () => {
      const result = resolveInitialTab('impact-reports', true, [mockReport1, mockReport2]);
      expect(result).toBe('impact-run-abc');
    });

    it('uses the first report impactRunId', () => {
      const result = resolveInitialTab('impact-reports', false, [mockReport2, mockReport1]);
      expect(result).toBe('impact-run-def');
    });

    it('falls through to direct-changes when reports empty and directChangesAvailable=true', () => {
      const result = resolveInitialTab('impact-reports', true, []);
      expect(result).toBe('direct-changes');
    });

    it('falls through to null when reports empty and directChangesAvailable=false', () => {
      const result = resolveInitialTab('impact-reports', false, []);
      expect(result).toBeNull();
    });
  });

  describe('fallback chain (no param or unknown param)', () => {
    it('returns "direct-changes" when directChangesAvailable=true and no param', () => {
      const result = resolveInitialTab(null, true, [mockReport1]);
      expect(result).toBe('direct-changes');
    });

    it('returns "direct-changes" when directChangesAvailable=true and undefined param', () => {
      const result = resolveInitialTab(undefined, true, []);
      expect(result).toBe('direct-changes');
    });

    it('returns first impact tab when directChangesAvailable=false and reports available', () => {
      const result = resolveInitialTab(null, false, [mockReport1, mockReport2]);
      expect(result).toBe('impact-run-abc');
    });

    it('returns null when nothing is available', () => {
      const result = resolveInitialTab(null, false, []);
      expect(result).toBeNull();
    });

    it('returns null when undefined param and nothing is available', () => {
      const result = resolveInitialTab(undefined, false, []);
      expect(result).toBeNull();
    });

    it('falls through unknown param to fallback chain (direct changes first)', () => {
      const result = resolveInitialTab('garbage-value', true, [mockReport1]);
      expect(result).toBe('direct-changes');
    });

    it('falls through unknown param to fallback chain (impact reports when no DC)', () => {
      const result = resolveInitialTab('unknown-tab', false, [mockReport1]);
      expect(result).toBe('impact-run-abc');
    });

    it('falls through unknown param to null when nothing available', () => {
      const result = resolveInitialTab('unknown-tab', false, []);
      expect(result).toBeNull();
    });
  });
});
