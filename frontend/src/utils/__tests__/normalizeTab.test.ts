import { normalizeTab, resolveInitialTab } from '../normalizeTab';
import type { ImpactReportSummaryFe } from '../../types/renderedReport';

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

// Tests for resolveInitialTab (updated for report summaries)

describe('resolveInitialTab', () => {
  const mockSummary1: ImpactReportSummaryFe = {
    id: 'run-abc',
    scenarioId: 'sc-1',
    reportKey: 'market_risk_summary',
    reportName: 'Market Risk Summary',
    generatedAt: '2026-02-19T14:00:00',
    status: 'GENERATED',
  };

  const mockSummary2: ImpactReportSummaryFe = {
    id: 'run-def',
    scenarioId: 'sc-1',
    reportKey: 'sa_capital_summary',
    reportName: 'SA Capital Summary',
    generatedAt: '2026-02-19T15:30:00',
    status: 'GENERATED',
  };

  describe('when initial-tab=direct-changes', () => {
    it('returns "direct-changes" when directChangesAvailable=true', () => {
      const result = resolveInitialTab('direct-changes', true, [mockSummary1]);
      expect(result).toBe('direct-changes');
    });

    it('falls through to report summaries when directChangesAvailable=false', () => {
      const result = resolveInitialTab('direct-changes', false, [mockSummary1]);
      expect(result).toBe('report-run-abc');
    });

    it('falls through to null when directChangesAvailable=false and no reports', () => {
      const result = resolveInitialTab('direct-changes', false, []);
      expect(result).toBeNull();
    });
  });

  describe('when initial-tab=impact-reports', () => {
    it('returns first report tab when reports are available', () => {
      const result = resolveInitialTab('impact-reports', true, [mockSummary1, mockSummary2]);
      expect(result).toBe('report-run-abc');
    });

    it('uses the first report id', () => {
      const result = resolveInitialTab('impact-reports', false, [mockSummary2, mockSummary1]);
      expect(result).toBe('report-run-def');
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
      const result = resolveInitialTab(null, true, [mockSummary1]);
      expect(result).toBe('direct-changes');
    });

    it('returns "direct-changes" when directChangesAvailable=true and undefined param', () => {
      const result = resolveInitialTab(undefined, true, []);
      expect(result).toBe('direct-changes');
    });

    it('returns first report tab when directChangesAvailable=false and reports available', () => {
      const result = resolveInitialTab(null, false, [mockSummary1, mockSummary2]);
      expect(result).toBe('report-run-abc');
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
      const result = resolveInitialTab('garbage-value', true, [mockSummary1]);
      expect(result).toBe('direct-changes');
    });

    it('falls through unknown param to fallback chain (report tab when no DC)', () => {
      const result = resolveInitialTab('unknown-tab', false, [mockSummary1]);
      expect(result).toBe('report-run-abc');
    });

    it('falls through unknown param to null when nothing available', () => {
      const result = resolveInitialTab('unknown-tab', false, []);
      expect(result).toBeNull();
    });
  });
});
