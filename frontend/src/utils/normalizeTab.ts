import type { ImpactReportSummaryFe } from '../types/renderedReport';

export type AnalysisTab = string;

const VALID_TABS: string[] = ['direct-changes', 'impact-reports'];

export function normalizeTab(tab: string | null | undefined): AnalysisTab {
  if (tab && VALID_TABS.includes(tab)) {
    return tab;
  }
  return 'direct-changes';
}

export function resolveInitialTab(
  initialTabParam: string | null | undefined,
  directChangesAvailable: boolean,
  reportSummaries: ImpactReportSummaryFe[]
): string | null {
  if (initialTabParam === 'direct-changes' && directChangesAvailable) {
    return 'direct-changes';
  }
  if (initialTabParam === 'impact-reports' && reportSummaries.length > 0) {
    return `report-${reportSummaries[0].id}`;
  }
  // Fallback chain
  if (directChangesAvailable) return 'direct-changes';
  if (reportSummaries.length > 0) return `report-${reportSummaries[0].id}`;
  return null;
}
