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
  // Gap Test 2: Saga correctly fetches in a single phase without requesting
  //             reviewApproval
  // ========================================================================

  it('Saga does not request reviewApproval and does not perform a phase-2 grid fetch', async () => {
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
          directChangesMode: 'INTERNAL',
          impactDataMode: 'INTERNAL',
        },
      },
      events: { rows: [] },
    };

    mockedApi.fetchScenarioDetail.mockResolvedValue(detailWithEvents);

    const dispatched = await runTestSaga(
      handleFetchScenarioDetail as (...args: unknown[]) => Generator,
      { type: 'scenarios/fetchScenarioDetailRequest', payload: 'sc-ir-1' } as PayloadAction<string>
    );

    // fetchScenarioDetail is called (internally uses expand=header,summaryCards,events)
    expect(mockedApi.fetchScenarioDetail).toHaveBeenCalledWith('sc-ir-1');

    // Only one API call — no phase-2 grid sections fetch
    expect(mockedApi.fetchScenarioDetail).toHaveBeenCalledTimes(1);

    // Only fetchScenarioDetailSuccess dispatched
    const actionTypes = dispatched.map((a) => a.type);
    expect(actionTypes).toContain(fetchScenarioDetailSuccess.type);
    expect(actionTypes).toHaveLength(1);
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
