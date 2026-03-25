import createSagaMiddleware from 'redux-saga';
import { configureStore } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import * as scenarioApi from '../../services/scenarioApi';
import { watchFetchAnalysisData } from '../analysisSaga';
import analysisReducer, {
  AnalysisState,
  fetchAnalysisDataRequest,
  fetchDirectChangesDeltaSuccess,
  fetchDirectChangesDeltaFailure,
  clearAnalysisState,
  selectAnalysisLoading,
  selectDirectChangesDeltaData,
  selectDirectChangesDeltaLoading,
  selectDirectChangesDeltaError,
} from '../analysisSlice';
import type { DirectChangesRuntimeResponse, ScenarioTypeData, SummaryCardsData } from '../scenariosSlice';
import type { RootState } from '../store';

// Mock the API module
jest.mock('../../services/scenarioApi');
const mockedApi = scenarioApi as jest.Mocked<typeof scenarioApi>;

describe('Task Group 3: Redux Slice Extension and Saga Branching', () => {
  // Build the initial state that matches the updated AnalysisState interface
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
          { dataAttribute: 'date', type: 'date', display: 'Date' },
        ],
        data: [{ tsName: 'TS1', date: '13/10/2025' }],
      },
    ],
  };

  // ==========================================================================
  // Test 1: fetchAnalysisDataRequest sets directChangesDeltaLoading: true,
  //         directChangesDeltaData: null, directChangesDeltaError: null
  // ==========================================================================
  it('Test 1: fetchAnalysisDataRequest initializes delta loading state', () => {
    const prevState: AnalysisState = {
      ...initialState,
      directChangesDeltaData: mockDeltaResponse,
      directChangesDeltaLoading: false,
      directChangesDeltaError: 'old error',
    };

    const state = analysisReducer(prevState, fetchAnalysisDataRequest('sc-123'));

    expect(state.directChangesDeltaLoading).toBe(true);
    expect(state.directChangesDeltaData).toBeNull();
    expect(state.directChangesDeltaError).toBeNull();
  });

  // ==========================================================================
  // Test 2: fetchDirectChangesDeltaSuccess sets data and clears loading
  // ==========================================================================
  it('Test 2: fetchDirectChangesDeltaSuccess sets data and clears loading', () => {
    const prevState: AnalysisState = {
      ...initialState,
      directChangesDeltaLoading: true,
    };

    const state = analysisReducer(prevState, fetchDirectChangesDeltaSuccess(mockDeltaResponse));

    expect(state.directChangesDeltaData).toEqual(mockDeltaResponse);
    expect(state.directChangesDeltaLoading).toBe(false);
  });

  // ==========================================================================
  // Test 3: fetchDirectChangesDeltaFailure sets error and clears loading
  // ==========================================================================
  it('Test 3: fetchDirectChangesDeltaFailure sets error and clears loading', () => {
    const prevState: AnalysisState = {
      ...initialState,
      directChangesDeltaLoading: true,
    };

    const state = analysisReducer(prevState, fetchDirectChangesDeltaFailure('Delta fetch failed'));

    expect(state.directChangesDeltaError).toBe('Delta fetch failed');
    expect(state.directChangesDeltaLoading).toBe(false);
  });

  // ==========================================================================
  // Test 4: clearAnalysisState resets delta fields to initial values
  // ==========================================================================
  it('Test 4: clearAnalysisState resets delta fields to initial values', () => {
    const dirtyState: AnalysisState = {
      ...initialState,
      scenarioId: 'sc-999',
      directChangesDeltaData: mockDeltaResponse,
      directChangesDeltaLoading: true,
      directChangesDeltaError: 'some error',
    };

    const state = analysisReducer(dirtyState, clearAnalysisState());

    expect(state.directChangesDeltaData).toBeNull();
    expect(state.directChangesDeltaLoading).toBe(false);
    expect(state.directChangesDeltaError).toBeNull();
    expect(state).toEqual(initialState);
  });

  // ==========================================================================
  // Test 5: selectAnalysisLoading returns true when directChangesDeltaLoading is true
  // ==========================================================================
  it('Test 5: selectAnalysisLoading returns true when directChangesDeltaLoading is true', () => {
    const stateWithDeltaLoading = {
      analysis: {
        ...initialState,
        directChangesDeltaLoading: true,
      },
    } as RootState;

    expect(selectAnalysisLoading(stateWithDeltaLoading)).toBe(true);

    // Verify it returns false when all loading flags are false
    const stateAllFalse = {
      analysis: {
        ...initialState,
      },
    } as RootState;

    expect(selectAnalysisLoading(stateAllFalse)).toBe(false);
  });

  // ==========================================================================
  // Test 6: Saga branches to getDirectChangesView when
  //         directChangesInternalRenderMode === 'DELTA_BY_UNIQUE_ID'
  //         and dispatches fetchDirectChangesDeltaSuccess on success
  // ==========================================================================
  it('Test 6: saga branches to getDirectChangesView for DELTA_BY_UNIQUE_ID and dispatches delta success', async () => {
    const mockScenarioType: ScenarioTypeData = {
      code: 'MARKET_DATA',
      name: 'Market Data',
      icon: 'ChartMultiple',
      directChangesMode: 'INTERNAL',
      impactDataMode: 'INTERNAL',
      directChangesInternalRenderMode: 'DELTA_BY_UNIQUE_ID',
    };

    const mockSummaryCards: SummaryCardsData = {
      changesSummary: { changesTotal: 10, changesDirect: 5, changesIndirect: 5 },
      impactSummary: { impact: 'HIGH', lastRunAt: '2026-01-14T12:00:00Z', latestRunStatus: 'COMPLETED', exceptionsCount: 0 },
    };

    const mockHeaderResult = {
      name: 'Delta Scenario',
      workflowState: 'IMPACT_AVAILABLE',
      scenarioType: mockScenarioType,
      summaryCards: mockSummaryCards,
    };

    const mockReportSummaries = [
      {
        id: 'r1',
        scenarioId: 'sc-delta',
        reportKey: 'market_risk_summary',
        reportName: 'Market Risk Summary',
        generatedAt: '2026-02-19T14:00:00',
        status: 'GENERATED',
      },
    ];

    mockedApi.fetchAnalysisHeader.mockResolvedValue(mockHeaderResult);
    mockedApi.getDirectChangesView.mockResolvedValue(mockDeltaResponse);
    mockedApi.fetchImpactReportSummaries.mockResolvedValue(mockReportSummaries);
    mockedApi.fetchImpactReportDetail.mockResolvedValue({
      renderedReport: null,
      errorMessage: null,
    } as any);

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

    store.dispatch(fetchAnalysisDataRequest('sc-delta'));

    // Allow the saga to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    const actionTypes = dispatchedActions.map((a) => a.type);

    // Should call getDirectChangesView (not fetchDirectChanges)
    expect(mockedApi.getDirectChangesView).toHaveBeenCalledWith('sc-delta');
    expect(mockedApi.fetchDirectChanges).not.toHaveBeenCalled();

    // Should dispatch fetchDirectChangesDeltaSuccess
    expect(actionTypes).toContain(fetchDirectChangesDeltaSuccess.type);

    const deltaSuccessAction = dispatchedActions.find(
      (a) => a.type === fetchDirectChangesDeltaSuccess.type
    );
    expect(deltaSuccessAction!.payload).toEqual(mockDeltaResponse);

    // Verify final state has delta data
    const finalState = store.getState().analysis;
    expect(finalState.directChangesDeltaData).toEqual(mockDeltaResponse);
    expect(finalState.directChangesDeltaLoading).toBe(false);
  });
});
