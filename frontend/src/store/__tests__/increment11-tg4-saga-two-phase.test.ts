import { runSaga } from 'redux-saga';
import type { PayloadAction } from '@reduxjs/toolkit';
import * as scenarioApi from '../../services/scenarioApi';
import { handleFetchScenarioDetail } from '../scenariosSaga';
import {
  fetchScenarioDetailSuccess,
  fetchScenarioDetailFailure,
} from '../scenariosSlice';
import type { ScenarioDetail } from '../scenariosSlice';

// Mock the API module
jest.mock('../../services/scenarioApi');
const mockedApi = scenarioApi as jest.Mocked<typeof scenarioApi>;

describe('Increment 11 TG4 -- Single-Phase Fetch in handleFetchScenarioDetail Saga', () => {
  // Base detail for an INTERNAL-mode scenario (FRTB_SA)
  const internalDetail: ScenarioDetail = {
    id: 'sc-sa-1',
    name: 'SA Capital Recalculation',
    scenarioTypeCode: 'FRTB_SA',
    ownerDisplayName: 'Alice Johnson',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
    header: {
      workflowState: 'IMPACT_AVAILABLE',
      impact: 'HIGH',
      ownerDisplayName: 'Alice Johnson',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-15T10:00:00Z',
      scenarioType: {
        code: 'FRTB_SA',
        name: 'FRTB SA',
        icon: 'ShieldTask',
        directChangesMode: 'INTERNAL',
        impactDataMode: 'INTERNAL',
      },
    },
    summaryCards: {
      changesSummary: { changesTotal: 10, changesDirect: 5, changesIndirect: 5 },
      impactSummary: {
        impact: 'HIGH',
        lastRunAt: '2026-01-14T12:00:00Z',
        latestRunStatus: 'COMPLETED',
        exceptionsCount: 0,
      },
    },
  };

  // Base detail for an EXTERNAL-mode scenario (MARKET_DATA)
  const externalDetail: ScenarioDetail = {
    id: 'sc-md-1',
    name: 'Market Data Scenario',
    scenarioTypeCode: 'MARKET_DATA',
    ownerDisplayName: 'Bob Smith',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
    header: {
      workflowState: 'IMPACT_AVAILABLE',
      impact: 'MODERATE',
      ownerDisplayName: 'Bob Smith',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-15T10:00:00Z',
      scenarioType: {
        code: 'MARKET_DATA',
        name: 'Market Data',
        icon: 'DataTrending',
        directChangesMode: 'EXTERNAL',
        impactDataMode: 'EXTERNAL',
      },
    },
    summaryCards: {
      changesSummary: { changesTotal: 3, changesDirect: 2, changesIndirect: 1 },
      impactSummary: {
        impact: 'MODERATE',
        lastRunAt: '2026-01-12T09:00:00Z',
        latestRunStatus: 'COMPLETED',
        exceptionsCount: 0,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to run the saga and collect dispatched actions
  async function runDetailSaga(scenarioId: string): Promise<PayloadAction[]> {
    const dispatched: PayloadAction[] = [];

    await runSaga(
      {
        dispatch: (action: PayloadAction) => {
          dispatched.push(action);
        },
        getState: () => ({}),
      },
      handleFetchScenarioDetail,
      { type: 'scenarios/fetchScenarioDetailRequest', payload: scenarioId } as PayloadAction<string>
    ).toPromise();

    return dispatched;
  }

  // Test 1: INTERNAL mode does NOT trigger a second API call — saga only does phase 1
  it('when header.scenarioType has directChangesMode=INTERNAL and impactDataMode=INTERNAL, saga does NOT dispatch a second API call', async () => {
    mockedApi.fetchScenarioDetail.mockResolvedValue(internalDetail);

    const dispatched = await runDetailSaga('sc-sa-1');

    // Phase 1: fetchScenarioDetail should be called
    expect(mockedApi.fetchScenarioDetail).toHaveBeenCalledWith('sc-sa-1');

    // No phase 2: no fetchScenarioGridSections call
    expect(mockedApi.fetchScenarioDetail).toHaveBeenCalledTimes(1);

    // Should dispatch fetchScenarioDetailSuccess only
    const actionTypes = dispatched.map((a) => a.type);
    expect(actionTypes).toContain(fetchScenarioDetailSuccess.type);
    expect(actionTypes).toHaveLength(1);
  });

  // Test 2: EXTERNAL mode does NOT trigger a second API call
  it('when header.scenarioType has directChangesMode=EXTERNAL and impactDataMode=EXTERNAL, saga does NOT dispatch a second API call', async () => {
    mockedApi.fetchScenarioDetail.mockResolvedValue(externalDetail);

    const dispatched = await runDetailSaga('sc-md-1');

    // Phase 1: fetchScenarioDetail should be called
    expect(mockedApi.fetchScenarioDetail).toHaveBeenCalledWith('sc-md-1');

    // No phase 2: only one API call total
    expect(mockedApi.fetchScenarioDetail).toHaveBeenCalledTimes(1);

    // Should dispatch fetchScenarioDetailSuccess only
    const actionTypes = dispatched.map((a) => a.type);
    expect(actionTypes).toContain(fetchScenarioDetailSuccess.type);
    expect(actionTypes).toHaveLength(1);
  });

  // Test 3: Saga dispatches fetchScenarioDetailSuccess with correct payload
  it('saga dispatches fetchScenarioDetailSuccess with the returned detail data', async () => {
    mockedApi.fetchScenarioDetail.mockResolvedValue(internalDetail);

    const dispatched = await runDetailSaga('sc-sa-1');

    const successAction = dispatched.find((a) => a.type === fetchScenarioDetailSuccess.type);
    expect(successAction).toBeDefined();
    expect(successAction!.payload).toEqual(internalDetail);
  });

  // Test 4: Saga dispatches fetchScenarioDetailFailure on API error
  it('when fetchScenarioDetail fails, saga dispatches fetchScenarioDetailFailure with error message', async () => {
    mockedApi.fetchScenarioDetail.mockRejectedValue(new Error('Network error'));

    const dispatched = await runDetailSaga('sc-sa-1');

    const failureAction = dispatched.find((a) => a.type === fetchScenarioDetailFailure.type);
    expect(failureAction).toBeDefined();
    expect(failureAction!.payload).toBe('Network error');

    // fetchScenarioDetailSuccess should NOT have been dispatched
    const successAction = dispatched.find((a) => a.type === fetchScenarioDetailSuccess.type);
    expect(successAction).toBeUndefined();
  });

  // Test 5: Mixed-mode scenario (one INTERNAL, one EXTERNAL) still does NOT trigger a second API call
  it('when directChangesMode is INTERNAL and impactDataMode is EXTERNAL, saga does NOT dispatch a second API call', async () => {
    const mixedModeDetail: ScenarioDetail = {
      id: 'sc-mixed-1',
      name: 'Mixed Mode Scenario',
      scenarioTypeCode: 'HYBRID_TYPE',
      ownerDisplayName: 'Charlie Brown',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-15T10:00:00Z',
      header: {
        workflowState: 'IMPACT_AVAILABLE',
        impact: 'HIGH',
        ownerDisplayName: 'Charlie Brown',
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
        scenarioType: {
          code: 'HYBRID_TYPE',
          name: 'Hybrid',
          icon: 'Shield',
          directChangesMode: 'INTERNAL',
          impactDataMode: 'EXTERNAL',
        },
      },
      summaryCards: {
        changesSummary: { changesTotal: 5, changesDirect: 3, changesIndirect: 2 },
        impactSummary: {
          impact: 'HIGH',
          lastRunAt: '2026-01-14T12:00:00Z',
          latestRunStatus: 'COMPLETED',
          exceptionsCount: 0,
        },
      },
    };

    mockedApi.fetchScenarioDetail.mockResolvedValue(mixedModeDetail);

    const dispatched = await runDetailSaga('sc-mixed-1');

    // Only one API call — no phase 2
    expect(mockedApi.fetchScenarioDetail).toHaveBeenCalledTimes(1);

    // Should dispatch fetchScenarioDetailSuccess only
    const actionTypes = dispatched.map((a) => a.type);
    expect(actionTypes).toContain(fetchScenarioDetailSuccess.type);
    expect(actionTypes).toHaveLength(1);
  });
});
