import createSagaMiddleware from 'redux-saga';
import { configureStore } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import * as scenarioApi from '../../services/scenarioApi';
import { watchFetchAnalysisData } from '../analysisSaga';
import analysisReducer, {
  AnalysisState,
  fetchAnalysisDataRequest,
  fetchDirectChangesDeltaFailure,
  fetchDirectChangesSuccess,
  selectDirectChangesDeltaData,
  selectDirectChangesDeltaLoading,
  selectDirectChangesDeltaError,
} from '../analysisSlice';
import type { DirectChangesRuntimeResponse, ScenarioTypeData, SummaryCardsData } from '../scenariosSlice';
import type { RootState } from '../store';

// Mock the API module
jest.mock('../../services/scenarioApi');
const mockedApi = scenarioApi as jest.Mocked<typeof scenarioApi>;

/**
 * Task Group 6 -- Gap tests for saga error handling, saga fallback path,
 * and selectors that were not covered in Task Group 3.
 */
describe('Task Group 6 Gap Tests: Saga & Selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const initialState: AnalysisState = {
    scenarioId: null,
    scenarioName: null,
    workflowState: null,
    scenarioType: null,
    summaryCards: null,
    directChanges: null,
    directChangesLoading: false,
    directChangesError: null,
    directChangesDeltaData: null,
    directChangesDeltaLoading: false,
    directChangesDeltaError: null,
    headerLoading: false,
    headerError: null,
    reportSummaries: null,
    reportSummariesLoading: false,
    reportSummariesError: null,
    reportDetails: {},
    activeTab: null,
  };

  const mockDeltaResponse: DirectChangesRuntimeResponse = {
    dataChanged: [
      {
        dataType: 'timeSeriesValues',
        header: '5 Time-series Points changed',
        externalLink: 'http://example.com/ts',
        totalDataChanges: 5,
        renderState: 'ROWS',
        columnDefinitions: [
          { dataAttribute: 'tsName', type: 'string', display: 'Time-Series Name', isEntityId: true },
        ],
        data: [{ tsName: 'TS1' }],
      },
    ],
  };

  const mockSummaryCards: SummaryCardsData = {
    changesSummary: { changesTotal: 10, changesDirect: 5, changesIndirect: 5 },
    impactSummary: { impact: 'HIGH', lastRunAt: '2026-01-14T12:00:00Z', latestRunStatus: 'COMPLETED', exceptionsCount: 0 },
  };

  // ======================================================================
  // Gap 1: Saga dispatches fetchDirectChangesDeltaFailure when
  //        getDirectChangesView throws an error
  // ======================================================================
  it('saga dispatches fetchDirectChangesDeltaFailure when getDirectChangesView throws', async () => {
    const mockScenarioType: ScenarioTypeData = {
      code: 'MARKET_DATA',
      name: 'Market Data',
      icon: 'ChartMultiple',
      directChangesMode: 'INTERNAL',
      impactDataMode: 'INTERNAL',
      directChangesInternalRenderMode: 'DELTA_BY_UNIQUE_ID',
    };

    mockedApi.fetchAnalysisHeader.mockResolvedValue({
      name: 'Error Scenario',
      workflowState: 'IMPACT_AVAILABLE',
      scenarioType: mockScenarioType,
      summaryCards: mockSummaryCards,
    });
    mockedApi.getDirectChangesView.mockRejectedValue(new Error('Network failure'));
    mockedApi.fetchImpactReportSummaries.mockResolvedValue([]);

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
    store.dispatch(fetchAnalysisDataRequest('sc-err'));

    await new Promise((resolve) => setTimeout(resolve, 100));

    const actionTypes = dispatchedActions.map((a) => a.type);

    // Should dispatch failure action
    expect(actionTypes).toContain(fetchDirectChangesDeltaFailure.type);

    // Should NOT have called the old fetchDirectChanges
    expect(mockedApi.fetchDirectChanges).not.toHaveBeenCalled();

    // Verify the error message was set in state
    const finalState = store.getState().analysis;
    expect(finalState.directChangesDeltaError).toBe('Network failure');
    expect(finalState.directChangesDeltaLoading).toBe(false);
  });

  // ======================================================================
  // Gap 2: Saga calls existing fetchDirectChangesSaga (not delta saga)
  //        when directChangesInternalRenderMode is absent/undefined
  // ======================================================================
  it('saga calls fetchDirectChanges (not getDirectChangesView) when renderMode is absent', async () => {
    const mockScenarioType: ScenarioTypeData = {
      code: 'FRTB_SA',
      name: 'FRTB SA',
      icon: 'ShieldTask',
      directChangesMode: 'INTERNAL',
      impactDataMode: 'INTERNAL',
      // directChangesInternalRenderMode is intentionally absent
    };

    mockedApi.fetchAnalysisHeader.mockResolvedValue({
      name: 'Legacy Scenario',
      workflowState: 'IMPACT_AVAILABLE',
      scenarioType: mockScenarioType,
      summaryCards: mockSummaryCards,
    });
    mockedApi.fetchDirectChanges.mockResolvedValue({
      columns: ['Risk Factor'],
      rows: [{ rowId: 'r-1', payload: { 'Risk Factor': 'FX_USD' } }],
    });
    mockedApi.fetchImpactReportSummaries.mockResolvedValue([]);

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
    store.dispatch(fetchAnalysisDataRequest('sc-legacy'));

    await new Promise((resolve) => setTimeout(resolve, 100));

    const actionTypes = dispatchedActions.map((a) => a.type);

    // Should call fetchDirectChanges (not getDirectChangesView)
    expect(mockedApi.fetchDirectChanges).toHaveBeenCalledWith('sc-legacy');
    expect(mockedApi.getDirectChangesView).not.toHaveBeenCalled();

    // Should dispatch fetchDirectChangesSuccess (not delta success)
    expect(actionTypes).toContain(fetchDirectChangesSuccess.type);

    // Verify state has the old-style direct changes data
    const finalState = store.getState().analysis;
    expect(finalState.directChanges).toEqual({
      columns: ['Risk Factor'],
      rows: [{ rowId: 'r-1', payload: { 'Risk Factor': 'FX_USD' } }],
    });
  });

  // ======================================================================
  // Gap 3: selectDirectChangesDeltaData, selectDirectChangesDeltaLoading,
  //        and selectDirectChangesDeltaError selectors return correct values
  // ======================================================================
  it('delta selectors return correct values from state', () => {
    const stateWithData = {
      analysis: {
        ...initialState,
        directChangesDeltaData: mockDeltaResponse,
        directChangesDeltaLoading: false,
        directChangesDeltaError: null,
      },
    } as RootState;

    expect(selectDirectChangesDeltaData(stateWithData)).toEqual(mockDeltaResponse);
    expect(selectDirectChangesDeltaLoading(stateWithData)).toBe(false);
    expect(selectDirectChangesDeltaError(stateWithData)).toBeNull();

    const stateWithError = {
      analysis: {
        ...initialState,
        directChangesDeltaData: null,
        directChangesDeltaLoading: false,
        directChangesDeltaError: 'Something went wrong',
      },
    } as RootState;

    expect(selectDirectChangesDeltaData(stateWithError)).toBeNull();
    expect(selectDirectChangesDeltaLoading(stateWithError)).toBe(false);
    expect(selectDirectChangesDeltaError(stateWithError)).toBe('Something went wrong');

    const stateLoading = {
      analysis: {
        ...initialState,
        directChangesDeltaLoading: true,
      },
    } as RootState;

    expect(selectDirectChangesDeltaLoading(stateLoading)).toBe(true);
    expect(selectDirectChangesDeltaData(stateLoading)).toBeNull();
  });
});
