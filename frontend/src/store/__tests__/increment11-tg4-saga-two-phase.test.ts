import { runSaga } from 'redux-saga';
import type { PayloadAction } from '@reduxjs/toolkit';
import * as scenarioApi from '../../services/scenarioApi';
import { handleFetchScenarioDetail } from '../scenariosSaga';
import {
  fetchScenarioDetailSuccess,
  fetchScenarioDetailFailure,
  mergeGridSections,
} from '../scenariosSlice';
import type { ScenarioDetail } from '../scenariosSlice';

// Mock the API module
jest.mock('../../services/scenarioApi');
const mockedApi = scenarioApi as jest.Mocked<typeof scenarioApi>;

describe('Increment 11 TG4 -- Two-Phase Fetch in handleFetchScenarioDetail Saga', () => {
  // Base detail for a GRID-mode scenario (FRTB_SA)
  const gridDetail: ScenarioDetail = {
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
        directChangesMode: 'GRID',
        impactDataMode: 'GRID',
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

  // Base detail for a LINK_OUT-mode scenario (MARKET_DATA)
  const linkOutDetail: ScenarioDetail = {
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
        directChangesMode: 'LINK_OUT',
        impactDataMode: 'LINK_OUT',
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

  const gridSectionsResponse: Partial<ScenarioDetail> = {
    directChanges: {
      columns: ['Risk Factor', 'Risk Class', 'Sensitivity Type', 'Current Value', 'Proposed Value', 'Delta'],
      rows: [
        { rowId: 'row-dc-1', payload: { 'Risk Factor': 'FX_USDJPY', 'Risk Class': 'FX', 'Sensitivity Type': 'Delta', 'Current Value': 1.35, 'Proposed Value': 1.40, 'Delta': 0.05 } },
      ],
    },
    impactData: {
      columns: ['Risk Class', 'Risk Measure', 'Base Value', 'Stressed Value', 'Capital Charge'],
      rows: [
        { rowId: 'row-id-1', payload: { 'Risk Class': 'FX', 'Risk Measure': 'IMCC', 'Base Value': 1200000, 'Stressed Value': 1500000, 'Capital Charge': 300000 } },
      ],
      compareCta: { label: 'Compare results', url: 'https://example.com/compare' },
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

  // Test 1: GRID mode triggers second API call with expand=directChanges,impactData
  it('when header.scenarioType has directChangesMode=GRID and impactDataMode=GRID, saga dispatches second API call with expand=directChanges,impactData', async () => {
    mockedApi.fetchScenarioDetail.mockResolvedValue(gridDetail);
    mockedApi.fetchScenarioGridSections.mockResolvedValue(gridSectionsResponse);

    const dispatched = await runDetailSaga('sc-sa-1');

    // Phase 1: fetchScenarioDetail should be called
    expect(mockedApi.fetchScenarioDetail).toHaveBeenCalledWith('sc-sa-1');

    // Phase 2: fetchScenarioGridSections should be called with both grid sections
    expect(mockedApi.fetchScenarioGridSections).toHaveBeenCalledWith(
      'sc-sa-1',
      'directChanges,impactData'
    );

    // Should dispatch fetchScenarioDetailSuccess followed by mergeGridSections
    const actionTypes = dispatched.map((a) => a.type);
    expect(actionTypes).toContain(fetchScenarioDetailSuccess.type);
    expect(actionTypes).toContain(mergeGridSections.type);
  });

  // Test 2: LINK_OUT mode does NOT trigger second API call
  it('when header.scenarioType has directChangesMode=LINK_OUT and impactDataMode=LINK_OUT, saga does NOT dispatch a second API call', async () => {
    mockedApi.fetchScenarioDetail.mockResolvedValue(linkOutDetail);

    const dispatched = await runDetailSaga('sc-md-1');

    // Phase 1: fetchScenarioDetail should be called
    expect(mockedApi.fetchScenarioDetail).toHaveBeenCalledWith('sc-md-1');

    // Phase 2: fetchScenarioGridSections should NOT be called
    expect(mockedApi.fetchScenarioGridSections).not.toHaveBeenCalled();

    // Should dispatch fetchScenarioDetailSuccess only
    const actionTypes = dispatched.map((a) => a.type);
    expect(actionTypes).toContain(fetchScenarioDetailSuccess.type);
    expect(actionTypes).not.toContain(mergeGridSections.type);
  });

  // Test 3: Phase 2 success dispatches mergeGridSections with the returned data
  it('when phase 2 call succeeds, saga dispatches mergeGridSections with the returned directChanges/impactData data', async () => {
    mockedApi.fetchScenarioDetail.mockResolvedValue(gridDetail);
    mockedApi.fetchScenarioGridSections.mockResolvedValue(gridSectionsResponse);

    const dispatched = await runDetailSaga('sc-sa-1');

    // Find the mergeGridSections action
    const mergeAction = dispatched.find((a) => a.type === mergeGridSections.type);
    expect(mergeAction).toBeDefined();
    expect(mergeAction!.payload).toEqual(gridSectionsResponse);

    // Verify the payload contains the expected grid data
    const payload = mergeAction!.payload as Partial<ScenarioDetail>;
    expect(payload.directChanges).toBeDefined();
    expect(payload.directChanges!.columns).toHaveLength(6);
    expect(payload.directChanges!.rows).toHaveLength(1);
    expect(payload.impactData).toBeDefined();
    expect(payload.impactData!.columns).toHaveLength(5);
    expect(payload.impactData!.rows).toHaveLength(1);
    expect(payload.impactData!.compareCta).toEqual({ label: 'Compare results', url: 'https://example.com/compare' });
  });

  // Test 4: Phase 2 failure sets detailError but preserves phase 1 data
  it('when phase 2 call fails, saga sets detailError but preserves phase 1 data in selectedDetail', async () => {
    mockedApi.fetchScenarioDetail.mockResolvedValue(gridDetail);
    mockedApi.fetchScenarioGridSections.mockRejectedValue(new Error('Grid sections fetch failed'));

    const dispatched = await runDetailSaga('sc-sa-1');

    // Phase 1 should have succeeded
    const successAction = dispatched.find((a) => a.type === fetchScenarioDetailSuccess.type);
    expect(successAction).toBeDefined();
    expect(successAction!.payload).toEqual(gridDetail);

    // Phase 2 failure should dispatch fetchScenarioDetailFailure with error message
    const failureAction = dispatched.find((a) => a.type === fetchScenarioDetailFailure.type);
    expect(failureAction).toBeDefined();
    expect(failureAction!.payload).toBe('Grid sections fetch failed');

    // mergeGridSections should NOT have been dispatched
    const mergeAction = dispatched.find((a) => a.type === mergeGridSections.type);
    expect(mergeAction).toBeUndefined();

    // Verify that fetchScenarioDetailSuccess was dispatched BEFORE fetchScenarioDetailFailure
    // (meaning phase 1 data was stored before the error was set)
    const successIndex = dispatched.findIndex((a) => a.type === fetchScenarioDetailSuccess.type);
    const failureIndex = dispatched.findIndex((a) => a.type === fetchScenarioDetailFailure.type);
    expect(successIndex).toBeLessThan(failureIndex);
  });

  // ========================================================================
  // Increment 11 Gap Test: mixed mode (one GRID, one LINK_OUT)
  // ========================================================================

  it('when only directChangesMode is GRID and impactDataMode is LINK_OUT, saga builds expand string with only directChanges', async () => {
    // Create a hypothetical mixed-mode scenario: directChanges=GRID, impactData=LINK_OUT
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
          directChangesMode: 'GRID',
          impactDataMode: 'LINK_OUT',
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

    const directChangesOnlyResponse: Partial<ScenarioDetail> = {
      directChanges: {
        columns: ['Risk Factor', 'Risk Class'],
        rows: [{ rowId: 'row-dc-1', payload: { 'Risk Factor': 'FX_USDJPY', 'Risk Class': 'FX' } }],
      },
    };

    mockedApi.fetchScenarioDetail.mockResolvedValue(mixedModeDetail);
    mockedApi.fetchScenarioGridSections.mockResolvedValue(directChangesOnlyResponse);

    const dispatched = await runDetailSaga('sc-mixed-1');

    // Phase 2 should be called with ONLY 'directChanges' (not impactData since it is LINK_OUT)
    expect(mockedApi.fetchScenarioGridSections).toHaveBeenCalledWith(
      'sc-mixed-1',
      'directChanges'
    );

    // Should dispatch mergeGridSections with only directChanges
    const mergeAction = dispatched.find((a) => a.type === mergeGridSections.type);
    expect(mergeAction).toBeDefined();
    const payload = mergeAction!.payload as Partial<ScenarioDetail>;
    expect(payload.directChanges).toBeDefined();
    expect(payload.impactData).toBeUndefined();
  });
});
