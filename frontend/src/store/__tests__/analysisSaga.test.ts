import createSagaMiddleware from 'redux-saga';
import { configureStore } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import * as scenarioApi from '../../services/scenarioApi';
import { watchFetchAnalysisData } from '../analysisSaga';
import analysisReducer, {
  fetchAnalysisDataRequest,
  fetchAnalysisHeaderSuccess,
  fetchAnalysisHeaderFailure,
  fetchDirectChangesSuccess,
  fetchDirectChangesFailure,
  fetchReportSummariesSuccess,
  fetchReportSummariesFailure,
} from '../analysisSlice';
import type { DirectChangesData, ScenarioTypeData, SummaryCardsData } from '../scenariosSlice';

// Mock the API module
jest.mock('../../services/scenarioApi');
const mockedApi = scenarioApi as jest.Mocked<typeof scenarioApi>;

describe('analysisSaga', () => {
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

  const mockReportSummaries = [
    {
      id: 'r1',
      scenarioId: 'sc-123',
      reportKey: 'market_risk_summary',
      reportName: 'Market Risk Summary',
      generatedAt: '2026-02-19T14:00:00',
      status: 'GENERATED',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for fetchImpactReportSummaries to prevent unhandled calls
    mockedApi.fetchImpactReportSummaries.mockResolvedValue(mockReportSummaries);
  });

  /**
   * Helper: creates a real Redux store with the saga middleware running
   * watchFetchAnalysisData, dispatches the trigger action, and waits for
   * the saga to finish processing.  Returns the final analysis state.
   * Also collects all dispatched actions via a middleware spy.
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

    sagaMiddleware.run(watchFetchAnalysisData);

    store.dispatch(fetchAnalysisDataRequest(scenarioId));

    // Allow the saga to process (async API calls resolve on next tick)
    await new Promise((resolve) => setTimeout(resolve, 50));

    return { state: store.getState().analysis, dispatchedActions };
  }

  describe('handleFetchAnalysisData triggers both sub-sagas in parallel', () => {
    it('dispatches both header success and direct changes success when both APIs succeed', async () => {
      mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
      mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-123');

      const actionTypes = dispatchedActions.map((a) => a.type);
      expect(actionTypes).toContain(fetchAnalysisHeaderSuccess.type);
      expect(actionTypes).toContain(fetchDirectChangesSuccess.type);

      // Both APIs should be called with the scenario ID
      expect(mockedApi.fetchAnalysisHeader).toHaveBeenCalledWith('sc-123');
      expect(mockedApi.fetchDirectChanges).toHaveBeenCalledWith('sc-123');
    });

    it('dispatches header failure and direct changes success when header API fails', async () => {
      mockedApi.fetchAnalysisHeader.mockRejectedValue(new Error('Header fetch failed'));
      mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-123');

      const actionTypes = dispatchedActions.map((a) => a.type);
      expect(actionTypes).toContain(fetchAnalysisHeaderFailure.type);
      expect(actionTypes).toContain(fetchDirectChangesSuccess.type);

      const headerFailAction = dispatchedActions.find(
        (a) => a.type === fetchAnalysisHeaderFailure.type
      );
      expect(headerFailAction!.payload).toBe('Header fetch failed');
    });

    it('dispatches header success and direct changes failure when direct changes API fails', async () => {
      mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
      mockedApi.fetchDirectChanges.mockRejectedValue(new Error('DC fetch failed'));

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-123');

      const actionTypes = dispatchedActions.map((a) => a.type);
      expect(actionTypes).toContain(fetchAnalysisHeaderSuccess.type);
      expect(actionTypes).toContain(fetchDirectChangesFailure.type);

      const dcFailAction = dispatchedActions.find(
        (a) => a.type === fetchDirectChangesFailure.type
      );
      expect(dcFailAction!.payload).toBe('DC fetch failed');
    });
  });

  describe('fetchAnalysisHeaderSaga', () => {
    it('dispatches fetchAnalysisHeaderSuccess with correct payload on API success', async () => {
      mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
      mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-200');

      const successAction = dispatchedActions.find(
        (a) => a.type === fetchAnalysisHeaderSuccess.type
      );
      expect(successAction).toBeDefined();
      expect(successAction!.payload).toEqual(mockHeaderResult);
    });

    it('dispatches fetchAnalysisHeaderFailure with error message on API error', async () => {
      mockedApi.fetchAnalysisHeader.mockRejectedValue(new Error('Network error'));
      mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-200');

      const failureAction = dispatchedActions.find(
        (a) => a.type === fetchAnalysisHeaderFailure.type
      );
      expect(failureAction).toBeDefined();
      expect(failureAction!.payload).toBe('Network error');

      // Success action should NOT have been dispatched for header
      const successAction = dispatchedActions.find(
        (a) => a.type === fetchAnalysisHeaderSuccess.type
      );
      expect(successAction).toBeUndefined();
    });

    it('dispatches fetchAnalysisHeaderFailure with default message for non-Error throws', async () => {
      mockedApi.fetchAnalysisHeader.mockRejectedValue('string error');
      mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-200');

      const failureAction = dispatchedActions.find(
        (a) => a.type === fetchAnalysisHeaderFailure.type
      );
      expect(failureAction).toBeDefined();
      expect(failureAction!.payload).toBe('Failed to fetch analysis header');
    });
  });

  describe('fetchDirectChangesSaga', () => {
    it('dispatches fetchDirectChangesSuccess with correct payload on API success', async () => {
      mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
      mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-300');

      const successAction = dispatchedActions.find(
        (a) => a.type === fetchDirectChangesSuccess.type
      );
      expect(successAction).toBeDefined();
      expect(successAction!.payload).toEqual(mockDirectChanges);
    });

    it('dispatches fetchDirectChangesFailure with error message on API error', async () => {
      mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
      mockedApi.fetchDirectChanges.mockRejectedValue(new Error('Service unavailable'));

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-300');

      const failureAction = dispatchedActions.find(
        (a) => a.type === fetchDirectChangesFailure.type
      );
      expect(failureAction).toBeDefined();
      expect(failureAction!.payload).toBe('Service unavailable');

      // Success action should NOT have been dispatched for direct changes
      const successAction = dispatchedActions.find(
        (a) => a.type === fetchDirectChangesSuccess.type
      );
      expect(successAction).toBeUndefined();
    });

    it('dispatches fetchDirectChangesFailure with default message for non-Error throws', async () => {
      mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
      mockedApi.fetchDirectChanges.mockRejectedValue(42);

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-300');

      const failureAction = dispatchedActions.find(
        (a) => a.type === fetchDirectChangesFailure.type
      );
      expect(failureAction).toBeDefined();
      expect(failureAction!.payload).toBe('Failed to fetch direct changes');
    });
  });

  describe('fetchImpactReportsSaga (now calls fetchImpactReportSummaries)', () => {
    it('dispatches fetchReportSummariesSuccess with summaries on API success', async () => {
      mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
      mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);
      mockedApi.fetchImpactReportSummaries.mockResolvedValue(mockReportSummaries);

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-123');

      const successAction = dispatchedActions.find(
        (a) => a.type === fetchReportSummariesSuccess.type
      );
      expect(successAction).toBeDefined();
      expect(successAction!.payload).toEqual(mockReportSummaries);
      expect(mockedApi.fetchImpactReportSummaries).toHaveBeenCalledWith('sc-123');
    });

    it('dispatches fetchReportSummariesFailure on API error', async () => {
      mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
      mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);
      mockedApi.fetchImpactReportSummaries.mockRejectedValue(new Error('Summary fetch failed'));

      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-123');

      const failureAction = dispatchedActions.find(
        (a) => a.type === fetchReportSummariesFailure.type
      );
      expect(failureAction).toBeDefined();
      expect(failureAction!.payload).toBe('Summary fetch failed');
    });
  });

  describe('watchFetchAnalysisData', () => {
    it('uses takeLatest on fetchAnalysisDataRequest.type', async () => {
      mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
      mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);

      // Dispatch the trigger action and verify the saga responds
      const { dispatchedActions } = await runAnalysisSagaWithStore('sc-400');

      // If takeLatest is wired to the wrong action type, no APIs would be called
      expect(mockedApi.fetchAnalysisHeader).toHaveBeenCalledWith('sc-400');
      expect(mockedApi.fetchDirectChanges).toHaveBeenCalledWith('sc-400');

      // And we should see both success actions dispatched
      const actionTypes = dispatchedActions.map((a) => a.type);
      expect(actionTypes).toContain(fetchAnalysisHeaderSuccess.type);
      expect(actionTypes).toContain(fetchDirectChangesSuccess.type);
    });

    it('responds to fetchAnalysisDataRequest action and not other actions', async () => {
      mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
      mockedApi.fetchDirectChanges.mockResolvedValue(mockDirectChanges);

      const sagaMiddleware = createSagaMiddleware();
      const store = configureStore({
        reducer: { analysis: analysisReducer },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware().concat(sagaMiddleware),
      });

      sagaMiddleware.run(watchFetchAnalysisData);

      // Dispatch an unrelated action
      store.dispatch({ type: 'UNRELATED_ACTION', payload: 'sc-999' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // APIs should NOT have been called
      expect(mockedApi.fetchAnalysisHeader).not.toHaveBeenCalled();
      expect(mockedApi.fetchDirectChanges).not.toHaveBeenCalled();
    });
  });
});
