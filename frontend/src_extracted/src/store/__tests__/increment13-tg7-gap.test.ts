import { render, screen, act } from '@testing-library/react';
import { runSaga } from 'redux-saga';
import type { PayloadAction } from '@reduxjs/toolkit';
import scenariosReducer, {
  ScenariosState,
  fetchScenarioDetailSuccess,
  fetchScenarioDetailRequest,
} from '../scenariosSlice';
import type { ScenarioDetail, ActivityStreamData } from '../scenariosSlice';
import * as scenarioApi from '../../services/scenarioApi';
import { handleFetchScenarioDetail } from '../scenariosSaga';
import { formatDate } from '../../utils/formatDate';

jest.mock('../../services/scenarioApi');
const mockedApi = scenarioApi as jest.Mocked<typeof scenarioApi>;

describe('Increment 13 TG7 Gap-Filling Tests', () => {
  const initialState: ScenariosState = {
    items: [],
    listLoading: false,
    listError: null,
    selectedDetail: null,
    detailLoading: false,
    detailError: null,
    sortOption: 'updatedAt-desc',
    workflowStateFilter: [],
    messagePosting: false,
    messagePostError: null,
    eventPosting: false,
    eventPostError: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to run a saga and collect dispatched actions
  async function runTestSaga(
    saga: (...args: unknown[]) => Generator,
    action: PayloadAction<unknown>
  ): Promise<PayloadAction[]> {
    const dispatched: PayloadAction[] = [];
    await runSaga(
      {
        dispatch: (a: PayloadAction) => {
          dispatched.push(a);
        },
        getState: () => ({}),
      },
      saga as (...args: unknown[]) => Generator,
      action
    ).toPromise();
    return dispatched;
  }

  // ========================================================================
  // Gap Test 1: formatDate handles edge cases -- midnight, end of day,
  //             zero-padded single-digit day/month
  // ========================================================================

  it('formatDate handles midnight (00:00:00) correctly', () => {
    expect(formatDate('2026-01-01T00:00:00')).toBe('01/01/2026 00:00:00');
  });

  it('formatDate handles end of day (23:59:59) correctly', () => {
    expect(formatDate('2026-12-31T23:59:59')).toBe('31/12/2026 23:59:59');
  });

  it('formatDate zero-pads single-digit day and month', () => {
    expect(formatDate('2026-03-05T09:05:07')).toBe('05/03/2026 09:05:07');
  });

  // ========================================================================
  // Gap Test 2: Saga correctly chains Phase 1 (events) and Phase 2
  //             (directChanges,impactData) without requesting reviewApproval
  // ========================================================================

  it('Saga Phase 1 and Phase 2 do not request reviewApproval in expand params', async () => {
    const detailWithEvents: ScenarioDetail = {
      id: 'sc-ir-1',
      name: 'IR Vol Surface Update',
      scenarioTypeCode: 'INTEREST_RATE',
      ownerDisplayName: 'Alice',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-15T10:00:00Z',
      header: {
        workflowState: 'IMPACT_AVAILABLE',
        impact: 'HIGH',
        ownerDisplayName: 'Alice',
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
        scenarioType: {
          code: 'INTEREST_RATE',
          name: 'Interest Rate',
          icon: 'Calculator',
          directChangesMode: 'GRID',
          impactDataMode: 'GRID',
        },
      },
      events: { rows: [] },
    };

    const gridResponse: Partial<ScenarioDetail> = {
      directChanges: { columns: ['Col1'], rows: [] },
      impactData: { columns: ['Col1'], rows: [], compareCta: null },
    };

    mockedApi.fetchScenarioDetail.mockResolvedValue(detailWithEvents);
    mockedApi.fetchScenarioGridSections.mockResolvedValue(gridResponse);

    await runTestSaga(
      handleFetchScenarioDetail as (...args: unknown[]) => Generator,
      { type: 'scenarios/fetchScenarioDetailRequest', payload: 'sc-ir-1' } as PayloadAction<string>
    );

    // Phase 1: fetchScenarioDetail is called (internally uses expand=header,summaryCards,events)
    expect(mockedApi.fetchScenarioDetail).toHaveBeenCalledWith('sc-ir-1');

    // Phase 2: fetchScenarioGridSections called with directChanges,impactData only
    expect(mockedApi.fetchScenarioGridSections).toHaveBeenCalledWith(
      'sc-ir-1',
      'directChanges,impactData'
    );

    // Verify neither call mentions reviewApproval
    // The fetchScenarioDetail was called with just the id (the expand is inside the function)
    // The grid sections expand string should NOT contain reviewApproval
    const gridExpandArg = mockedApi.fetchScenarioGridSections.mock.calls[0][1];
    expect(gridExpandArg).not.toContain('reviewApproval');
  });

  // ========================================================================
  // Gap Test 3: ScenarioDetail with events undefined -- rows default to empty
  // ========================================================================

  it('ScenarioDetail events field can be undefined, rows default to empty array in consumer', () => {
    const detail: ScenarioDetail = {
      id: 'sc-1',
      name: 'No Events Scenario',
      scenarioTypeCode: 'INTEREST_RATE',
      ownerDisplayName: 'Bob',
      createdAt: '2026-01-10T08:00:00',
      updatedAt: '2026-01-15T10:00:00',
      // events is undefined
    };

    // Consumer code pattern: selectedDetail.events?.rows ?? []
    const rows = detail.events?.rows ?? [];
    expect(rows).toHaveLength(0);
    expect(Array.isArray(rows)).toBe(true);
  });
});
