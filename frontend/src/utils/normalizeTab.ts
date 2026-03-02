import type { ImpactReportData } from '../store/scenariosSlice';

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
  impactReports: ImpactReportData[]
): string | null {
  if (initialTabParam === 'direct-changes' && directChangesAvailable) {
    return 'direct-changes';
  }
  if (initialTabParam === 'impact-reports' && impactReports.length > 0) {
    return `impact-${impactReports[0].impactRunId}`;
  }
  // Fallback chain
  if (directChangesAvailable) return 'direct-changes';
  if (impactReports.length > 0) return `impact-${impactReports[0].impactRunId}`;
  return null;
}
