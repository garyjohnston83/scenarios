import analysisReducer, {
  AnalysisState,
  clearAnalysisState,
  fetchReportDetailRequest,
  fetchReportSummariesSuccess,
} from '../analysisSlice';
import type { RenderedReport, ImpactReportSummaryFe } from '../../types/renderedReport';

describe('analysisSlice - cleanup and edge case gaps', () => {
  const populatedState: AnalysisState = {
    scenarioId: 'sc-1',
    scenarioName: 'Test Scenario',
    workflowState: 'IMPACT_AVAILABLE',
    scenarioType: {
      code: 'FRTB_SA',
      name: 'FRTB SA',
      icon: 'ShieldTask',
      directChangesMode: 'INTERNAL',
      impactDataMode: 'INTERNAL',
    },
    summaryCards: null,
    directChanges: { columns: ['Col'], rows: [] },
    directChangesLoading: false,
    directChangesError: null,
    headerLoading: false,
    headerError: null,
    reportSummaries: [
      {
        id: 'r1',
        scenarioId: 'sc-1',
        reportKey: 'market_risk_summary',
        reportName: 'Market Risk Summary',
        generatedAt: '2026-02-19T14:00:00',
        status: 'GENERATED',
      },
    ],
    reportSummariesLoading: false,
    reportSummariesError: null,
    reportDetails: {
      r1: {
        loading: false,
        data: {
          reportKey: 'market_risk_summary',
          reportName: 'Market Risk Summary',
          definitionVersion: 1,
          generatedAt: '2026-02-19T14:00:00',
          scenarioId: 'sc-1',
          scenarioName: 'Test Scenario',
          scenarioTypeCode: 'FRTB_SA',
          sections: [],
        },
        error: null,
        errorMessage: null,
      },
    },
    activeTab: 'report-r1',
  };

  it('clearAnalysisState resets reportSummaries and reportDetails to initial state', () => {
    const state = analysisReducer(populatedState, clearAnalysisState());

    expect(state.reportSummaries).toBeNull();
    expect(state.reportDetails).toEqual({});
    expect(state.reportSummariesLoading).toBe(false);
    expect(state.reportSummariesError).toBeNull();
    expect(state.scenarioId).toBeNull();
    expect(state.scenarioName).toBeNull();
    expect(state.activeTab).toBeNull();
    expect(state.directChanges).toBeNull();
  });

  it('fetchReportDetailRequest for already-loading report does not create duplicate entry', () => {
    // Set up state where r1 is already loading
    const stateWithLoading: AnalysisState = {
      ...populatedState,
      reportDetails: {
        r1: { loading: true, data: null, error: null, errorMessage: null },
      },
    };

    // Dispatch another fetchReportDetailRequest for the same report
    const state = analysisReducer(
      stateWithLoading,
      fetchReportDetailRequest({ scenarioId: 'sc-1', reportId: 'r1' })
    );

    // Should still have only one entry for r1
    expect(Object.keys(state.reportDetails)).toHaveLength(1);
    expect(state.reportDetails['r1']).toEqual({
      loading: true,
      data: null,
      error: null,
      errorMessage: null,
    });

    // No additional keys should be created
    expect(state.reportDetails['r1-duplicate']).toBeUndefined();
  });
});
