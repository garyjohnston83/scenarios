import createSagaMiddleware from 'redux-saga';
import { configureStore } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { fork, all } from 'redux-saga/effects';
import * as scenarioApi from '../../services/scenarioApi';
import { watchFetchAnalysisData, watchFetchReportDetail } from '../analysisSaga';
import analysisReducer, {
  fetchAnalysisDataRequest,
  fetchReportDetailRequest,
  fetchReportDetailSuccess,
  fetchReportDetailFailure,
  fetchReportSummariesSuccess,
  fetchReportSummariesFailure,
} from '../analysisSlice';
import type { DirectChangesData, ScenarioTypeData, SummaryCardsData } from '../scenariosSlice';
import type { ImpactReportDetailFe, RenderedReport } from '../../types/renderedReport';

// Mock the API module
jest.mock('../../services/scenarioApi');
const mockedApi = scenarioApi as jest.Mocked<typeof scenarioApi>;

describe('analysisSaga - eager detail loading', () => {
  const mockScenarioType: ScenarioTypeData = {
    code: 'FRTB_SA',
    name: 'FRTB SA',
    icon: 'ShieldTask',
    directChangesMode: 'INTERNAL',
    impactDataMode: 'INTERNAL',
  };

  const mockSummaryCards: SummaryCardsData = {
    changesSummary: { changesTotal: 10, changesDirect: 5, changesIndirect: 5 },
    impactSummary: {
      impact: 'HIGH',
      lastRunAt: '2026-01-14T12:00:00Z',
      latestRunStatus: 'COMPLETED',
      exceptionsCount: 0,
    },
  };

  const mockHeaderResult = {
    name: 'Test Scenario',
    workflowState: 'IMPACT_AVAILABLE',
    scenarioType: mockScenarioType,
    summaryCards: mockSummaryCards,
  };

  const mockDirectChanges: DirectChangesData = {
    columns: ['col1', 'col2'],
    rows: [{ rowId: 'r1', payload: { col1: 'a', col2: 'b' } }],
  };

  const mockRenderedReport: RenderedReport = {
    reportKey: 'market_risk_summary',
    reportName: 'Market Risk Summary',
    definitionVersion: 1,
    generatedAt: '2026-02-19T14:00:00',
    scenarioId: 'sc-123',
    scenarioName: 'Rate Shock Analysis',
    scenarioTypeCode: 'FRTB_SA',
    sections: [],
  };

  const mockDetail1: ImpactReportDetailFe = {
    id: 'r1',
    status: 'GENERATED',
    reportName: 'Market Risk Summary',
    generatedAt: '2026-02-19T14:00:00',
    errorMessage: null,
    renderedReport: mockRenderedReport,
  };

  const mockDetail2: ImpactReportDetailFe = {
    id: 'r2',
    status: 'GENERATED',
    reportName: 'Credit Risk Summary',
    generatedAt: '2026-02-19T15:00:00',
    errorMessage: null,
    renderedReport: { ...mockRenderedReport, reportKey: 'credit_risk_summary', reportName: 'Credit Risk Summary' },
  };

  const mockReportSummaries2 = [
    {
      id: 'r1',
      scenarioId: 'sc-123',
      reportKey: 'market_risk_summary',
      reportName: 'Market Risk Summary',
      generatedAt: '2026-02-19T14:00:00',
      status: 'GENERATED',
    },
    {
      id: 'r2',
      scenarioId: 'sc-123',
      reportKey: 'credit_risk_summary',
      reportName: 'Credit Risk Summary',
      generatedAt: '2026-02-19T15:00:00',
      status: 'GENERATED',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks for header and direct changes (always succeed)
    mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
    mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);
  });

  /**
   * Root saga that forks both watchers, mirroring production rootSaga.ts behavior.
   */
  function* testRootSaga() {
    yield all([fork(watchFetchAnalysisData), fork(watchFetchReportDetail)]);
  }

  /**
   * Helper: creates a real Redux store with the saga middleware running
   * both watchFetchAnalysisData and watchFetchReportDetail, dispatches
   * the trigger action, and waits for the saga to finish processing.
   * Returns the final analysis state and all dispatched actions.
   */
  async function runAnalysisSagaWithStore(scenarioId: string) {
    const dispatchedActions: PayloadAction[] = [];

    const sagaMiddleware = createSagaMiddleware();

    const actionCollector = () => (next: (action: any) => any) => (action: any) => {
      dispatchedActions.push(action);
      return next(action);
    };

    const store = configureStore({
      reducer: { analysis: analysisReducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(actionCollector, sagaMiddleware),
    });

    sagaMiddleware.run(testRootSaga);

    store.dispatch(fetchAnalysisDataRequest(scenarioId));

    // Allow the saga to process (async API calls resolve on next tick)
    await new Promise((resolve) => setTimeout(resolve, 100));

    return { state: store.getState().analysis, dispatchedActions };
  }

  it('dispatches fetchReportDetailRequest and fetchReportDetailSuccess for each report when summaries return N=2 reports', async () => {
    mockedApi.fetchImpactReportSummaries.mockResolvedValue(mockReportSummaries2);
    mockedApi.fetchImpactReportDetail.mockImplementation(async (_scenarioId: string, reportId: string) => {
      if (reportId === 'r1') return mockDetail1;
      if (reportId === 'r2') return mockDetail2;
      throw new Error('Unknown report');
    });

    const { dispatchedActions } = await runAnalysisSagaWithStore('sc-123');

    const actionTypes = dispatchedActions.map((a) => a.type);

    // Summaries should succeed first
    expect(actionTypes).toContain(fetchReportSummariesSuccess.type);

    // fetchReportDetailRequest should be dispatched for each report
    const detailRequests = dispatchedActions.filter(
      (a) => a.type === fetchReportDetailRequest.type
    );
    const requestedReportIds = detailRequests.map((a: any) => a.payload.reportId);
    expect(requestedReportIds).toContain('r1');
    expect(requestedReportIds).toContain('r2');

    // fetchReportDetailSuccess should be dispatched for each report
    const detailSuccesses = dispatchedActions.filter(
      (a) => a.type === fetchReportDetailSuccess.type
    );
    const successReportIds = detailSuccesses.map((a: any) => a.payload.reportId);
    expect(successReportIds).toContain('r1');
    expect(successReportIds).toContain('r2');

    // Verify API was called for each report
    expect(mockedApi.fetchImpactReportDetail).toHaveBeenCalledWith('sc-123', 'r1');
    expect(mockedApi.fetchImpactReportDetail).toHaveBeenCalledWith('sc-123', 'r2');
  });

  it('dispatches fetchReportDetailSuccess for the successful report and fetchReportDetailFailure for the failed one (independent error handling)', async () => {
    mockedApi.fetchImpactReportSummaries.mockResolvedValue(mockReportSummaries2);
    mockedApi.fetchImpactReportDetail.mockImplementation(async (_scenarioId: string, reportId: string) => {
      if (reportId === 'r1') return mockDetail1;
      if (reportId === 'r2') throw new Error('Report r2 fetch failed');
      throw new Error('Unknown report');
    });

    const { dispatchedActions } = await runAnalysisSagaWithStore('sc-123');

    // r1 should succeed
    const detailSuccesses = dispatchedActions.filter(
      (a) => a.type === fetchReportDetailSuccess.type
    );
    const successReportIds = detailSuccesses.map((a: any) => a.payload.reportId);
    expect(successReportIds).toContain('r1');

    // r2 should fail
    const detailFailures = dispatchedActions.filter(
      (a) => a.type === fetchReportDetailFailure.type
    );
    const failureReportIds = detailFailures.map((a: any) => a.payload.reportId);
    expect(failureReportIds).toContain('r2');

    // Verify r2 failure has the correct error message
    const r2Failure = detailFailures.find((a: any) => a.payload.reportId === 'r2');
    expect(r2Failure!.payload).toEqual({ reportId: 'r2', error: 'Report r2 fetch failed' });

    // r1 should NOT appear in failures
    expect(failureReportIds).not.toContain('r1');
    // r2 should NOT appear in successes
    expect(successReportIds).not.toContain('r2');
  });

  it('dispatches no fetchReportDetailRequest actions when summaries return an empty array', async () => {
    mockedApi.fetchImpactReportSummaries.mockResolvedValue([]);

    const { dispatchedActions } = await runAnalysisSagaWithStore('sc-123');

    const actionTypes = dispatchedActions.map((a) => a.type);

    // Summaries should succeed
    expect(actionTypes).toContain(fetchReportSummariesSuccess.type);

    // No detail request actions should be dispatched
    const detailRequests = dispatchedActions.filter(
      (a) => a.type === fetchReportDetailRequest.type
    );
    expect(detailRequests).toHaveLength(0);

    // No detail success/failure actions should be dispatched
    const detailSuccesses = dispatchedActions.filter(
      (a) => a.type === fetchReportDetailSuccess.type
    );
    const detailFailures = dispatchedActions.filter(
      (a) => a.type === fetchReportDetailFailure.type
    );
    expect(detailSuccesses).toHaveLength(0);
    expect(detailFailures).toHaveLength(0);

    // fetchImpactReportDetail should never be called
    expect(mockedApi.fetchImpactReportDetail).not.toHaveBeenCalled();
  });

  it('dispatches no fetchReportDetailRequest actions when fetchImpactReportSummaries fails', async () => {
    mockedApi.fetchImpactReportSummaries.mockRejectedValue(new Error('Summary fetch failed'));

    const { dispatchedActions } = await runAnalysisSagaWithStore('sc-123');

    const actionTypes = dispatchedActions.map((a) => a.type);

    // Summaries should fail
    expect(actionTypes).toContain(fetchReportSummariesFailure.type);

    // No detail request actions should be dispatched
    const detailRequests = dispatchedActions.filter(
      (a) => a.type === fetchReportDetailRequest.type
    );
    expect(detailRequests).toHaveLength(0);

    // No detail success/failure actions should be dispatched
    const detailSuccesses = dispatchedActions.filter(
      (a) => a.type === fetchReportDetailSuccess.type
    );
    const detailFailures = dispatchedActions.filter(
      (a) => a.type === fetchReportDetailFailure.type
    );
    expect(detailSuccesses).toHaveLength(0);
    expect(detailFailures).toHaveLength(0);

    // fetchImpactReportDetail should never be called
    expect(mockedApi.fetchImpactReportDetail).not.toHaveBeenCalled();
  });
});
