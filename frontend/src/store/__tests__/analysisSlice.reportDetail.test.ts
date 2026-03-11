import analysisReducer, {
  AnalysisState,
  fetchReportSummariesSuccess,
  fetchReportSummariesFailure,
  fetchReportDetailRequest,
  fetchReportDetailSuccess,
  fetchReportDetailFailure,
} from '../analysisSlice';
import type { ImpactReportSummaryFe, ImpactReportDetailFe, RenderedReport } from '../../types/renderedReport';

describe('analysisSlice - report detail reducers', () => {
  const initialState: AnalysisState = {
    scenarioId: null,
    scenarioName: null,
    workflowState: null,
    scenarioType: null,
    summaryCards: null,
    directChanges: null,
    directChangesLoading: false,
    directChangesError: null,
    headerLoading: false,
    headerError: null,
    reportSummaries: null,
    reportSummariesLoading: false,
    reportSummariesError: null,
    reportDetails: {},
    activeTab: null,
  };

  const mockRenderedReport: RenderedReport = {
    reportKey: 'market_risk_summary',
    reportName: 'Market Risk Summary',
    definitionVersion: 1,
    generatedAt: '2026-02-19T14:00:00',
    scenarioId: 'sc-1',
    scenarioName: 'Rate Shock Analysis',
    scenarioTypeCode: 'FRTB_SA',
    sections: [],
  };

  describe('fetchReportSummariesSuccess', () => {
    it('stores summaries and clears loading flag', () => {
      const summaries: ImpactReportSummaryFe[] = [
        {
          id: 'r1',
          scenarioId: 'sc-1',
          reportKey: 'market_risk_summary',
          reportName: 'Market Risk Summary',
          generatedAt: '2026-02-19T14:00:00',
          status: 'GENERATED',
        },
        {
          id: 'r2',
          scenarioId: 'sc-1',
          reportKey: 'sa_capital_summary',
          reportName: 'SA Capital Summary',
          generatedAt: '2026-02-19T15:00:00',
          status: 'FAILED',
        },
      ];
      const prevState: AnalysisState = { ...initialState, reportSummariesLoading: true };
      const state = analysisReducer(prevState, fetchReportSummariesSuccess(summaries));

      expect(state.reportSummaries).toEqual(summaries);
      expect(state.reportSummariesLoading).toBe(false);
      expect(state.reportSummariesError).toBeNull();
    });
  });

  describe('fetchReportSummariesFailure', () => {
    it('stores error and clears loading flag', () => {
      const prevState: AnalysisState = { ...initialState, reportSummariesLoading: true };
      const state = analysisReducer(prevState, fetchReportSummariesFailure('Network error'));

      expect(state.reportSummariesError).toBe('Network error');
      expect(state.reportSummariesLoading).toBe(false);
      expect(state.reportSummaries).toBeNull();
    });
  });

  describe('fetchReportDetailRequest', () => {
    it('sets reportDetails[reportId] with loading: true', () => {
      const state = analysisReducer(
        initialState,
        fetchReportDetailRequest({ scenarioId: 'sc-1', reportId: 'r1' })
      );

      expect(state.reportDetails['r1']).toEqual({
        loading: true,
        data: null,
        error: null,
        errorMessage: null,
      });
    });
  });

  describe('fetchReportDetailSuccess', () => {
    it('sets reportDetails[reportId] with data and loading: false', () => {
      const detail: ImpactReportDetailFe = {
        id: 'r1',
        status: 'GENERATED',
        reportName: 'Market Risk Summary',
        generatedAt: '2026-02-19T14:00:00',
        errorMessage: null,
        renderedReport: mockRenderedReport,
      };

      const prevState: AnalysisState = {
        ...initialState,
        reportDetails: {
          'r1': { loading: true, data: null, error: null, errorMessage: null },
        },
      };

      const state = analysisReducer(
        prevState,
        fetchReportDetailSuccess({ reportId: 'r1', detail })
      );

      expect(state.reportDetails['r1']).toEqual({
        loading: false,
        data: mockRenderedReport,
        error: null,
        errorMessage: null,
      });
    });

    it('stores errorMessage from FAILED report detail', () => {
      const detail: ImpactReportDetailFe = {
        id: 'r2',
        status: 'FAILED',
        reportName: 'SA Capital Summary',
        generatedAt: '2026-02-19T15:00:00',
        errorMessage: 'Data provider timeout after 30s',
        renderedReport: null,
      };

      const prevState: AnalysisState = {
        ...initialState,
        reportDetails: {
          'r2': { loading: true, data: null, error: null, errorMessage: null },
        },
      };

      const state = analysisReducer(
        prevState,
        fetchReportDetailSuccess({ reportId: 'r2', detail })
      );

      expect(state.reportDetails['r2']).toEqual({
        loading: false,
        data: null,
        error: null,
        errorMessage: 'Data provider timeout after 30s',
      });
    });
  });

  describe('fetchReportDetailFailure', () => {
    it('sets reportDetails[reportId] with error and loading: false', () => {
      const prevState: AnalysisState = {
        ...initialState,
        reportDetails: {
          'r1': { loading: true, data: null, error: null, errorMessage: null },
        },
      };

      const state = analysisReducer(
        prevState,
        fetchReportDetailFailure({ reportId: 'r1', error: 'Server error' })
      );

      expect(state.reportDetails['r1']).toEqual({
        loading: false,
        data: null,
        error: 'Server error',
        errorMessage: null,
      });
    });
  });
});
