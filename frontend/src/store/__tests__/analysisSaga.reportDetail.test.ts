import createSagaMiddleware from 'redux-saga';
import { configureStore } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import * as scenarioApi from '../../services/scenarioApi';
import { watchFetchReportDetail } from '../analysisSaga';
import analysisReducer, {
  fetchReportDetailRequest,
  fetchReportDetailSuccess,
  fetchReportDetailFailure,
} from '../analysisSlice';
import type { ImpactReportDetailFe, RenderedReport } from '../../types/renderedReport';

// Mock the API module
jest.mock('../../services/scenarioApi');
const mockedApi = scenarioApi as jest.Mocked<typeof scenarioApi>;

describe('analysisSaga - fetchReportDetailSaga', () => {
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

  const mockDetail: ImpactReportDetailFe = {
    id: 'r1',
    status: 'GENERATED',
    reportName: 'Market Risk Summary',
    generatedAt: '2026-02-19T14:00:00',
    errorMessage: null,
    renderedReport: mockRenderedReport,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper: creates a real Redux store with the saga middleware running
   * watchFetchReportDetail, dispatches the trigger action, and waits for
   * the saga to finish processing.
   */
  async function runReportDetailSagaWithStore(scenarioId: string, reportId: string) {
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

    sagaMiddleware.run(watchFetchReportDetail);

    store.dispatch(fetchReportDetailRequest({ scenarioId, reportId }));

    // Allow the saga to process (async API calls resolve on next tick)
    await new Promise((resolve) => setTimeout(resolve, 50));

    return { state: store.getState().analysis, dispatchedActions };
  }

  it('calls detail API and dispatches fetchReportDetailSuccess on success', async () => {
    mockedApi.fetchImpactReportDetail.mockResolvedValue(mockDetail);

    const { dispatchedActions } = await runReportDetailSagaWithStore('sc-1', 'r1');

    // Verify the API was called with the correct arguments
    expect(mockedApi.fetchImpactReportDetail).toHaveBeenCalledWith('sc-1', 'r1');

    // Verify the success action was dispatched
    const successAction = dispatchedActions.find(
      (a) => a.type === fetchReportDetailSuccess.type
    );
    expect(successAction).toBeDefined();
    expect(successAction!.payload).toEqual({
      reportId: 'r1',
      detail: mockDetail,
    });

    // Verify the failure action was NOT dispatched
    const failureAction = dispatchedActions.find(
      (a) => a.type === fetchReportDetailFailure.type
    );
    expect(failureAction).toBeUndefined();
  });
});
