import axios from 'axios';
import scenariosReducer, {
  ScenariosState,
  mergeGridSections,
} from '../scenariosSlice';
import type {
  ScenarioDetail,
  GridRowData,
  DirectChangesData,
  ImpactDataData,
  CtaData,
} from '../scenariosSlice';
import { fetchScenarioGridSections } from '../../services/scenarioApi';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Increment 11 TG2 -- State Interfaces, Redux Slice, and API Layer', () => {
  const baseDetail: ScenarioDetail = {
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
      changesSummary: {
        changesTotal: 10,
        changesDirect: 5,
        changesIndirect: 5,
      },
      impactSummary: {
        impact: 'HIGH',
        lastRunAt: '2026-01-14T12:00:00Z',
        latestRunStatus: 'COMPLETED',
        exceptionsCount: 0,
      },
    },
    reviewApproval: {
      workflow: {
        workflowState: 'IMPACT_AVAILABLE',
        workflowStateLabel: 'Impact Available',
        progress: { current: 0, total: 5 },
      },
      messages: [],
      events: [],
    },
  };

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

  // Test 1: mergeGridSections correctly merges directChanges into existing selectedDetail
  // without overwriting header/summaryCards/reviewApproval
  it('mergeGridSections correctly merges directChanges into existing selectedDetail without overwriting header/summaryCards/reviewApproval', () => {
    const stateWithDetail: ScenariosState = {
      ...initialState,
      selectedDetail: { ...baseDetail },
    };

    const directChanges: DirectChangesData = {
      columns: ['Risk Factor', 'Risk Class', 'Sensitivity Type', 'Current Value', 'Proposed Value', 'Delta'],
      rows: [
        { rowId: 'row-1', payload: { 'Risk Factor': 'FX_USDJPY', 'Risk Class': 'FX', 'Sensitivity Type': 'Delta', 'Current Value': 1.35, 'Proposed Value': 1.40, 'Delta': 0.05 } },
      ],
    };

    const state = scenariosReducer(stateWithDetail, mergeGridSections({ directChanges }));

    // directChanges should be merged in
    expect(state.selectedDetail!.directChanges).toEqual(directChanges);
    // Existing fields should NOT be overwritten
    expect(state.selectedDetail!.header).toEqual(baseDetail.header);
    expect(state.selectedDetail!.summaryCards).toEqual(baseDetail.summaryCards);
    expect(state.selectedDetail!.reviewApproval).toEqual(baseDetail.reviewApproval);
    expect(state.selectedDetail!.id).toBe(baseDetail.id);
    expect(state.selectedDetail!.name).toBe(baseDetail.name);
  });

  // Test 2: mergeGridSections correctly merges impactData into existing selectedDetail
  it('mergeGridSections correctly merges impactData into existing selectedDetail', () => {
    const stateWithDetail: ScenariosState = {
      ...initialState,
      selectedDetail: { ...baseDetail },
    };

    const impactData: ImpactDataData = {
      columns: ['Risk Class', 'Risk Measure', 'Base Value', 'Stressed Value', 'Capital Charge'],
      rows: [
        { rowId: 'row-i-1', payload: { 'Risk Class': 'FX', 'Risk Measure': 'IMCC', 'Base Value': 1200000, 'Stressed Value': 1500000, 'Capital Charge': 300000 } },
      ],
      compareCta: { label: 'Compare results', url: 'https://example.com/compare' },
    };

    const state = scenariosReducer(stateWithDetail, mergeGridSections({ impactData }));

    // impactData should be merged in
    expect(state.selectedDetail!.impactData).toEqual(impactData);
    expect(state.selectedDetail!.impactData!.compareCta).toEqual({ label: 'Compare results', url: 'https://example.com/compare' });
    // Existing fields should NOT be overwritten
    expect(state.selectedDetail!.header).toEqual(baseDetail.header);
    expect(state.selectedDetail!.summaryCards).toEqual(baseDetail.summaryCards);
    expect(state.selectedDetail!.reviewApproval).toEqual(baseDetail.reviewApproval);
  });

  // Test 3: mergeGridSections handles merging when selectedDetail is null (no-op)
  it('mergeGridSections handles merging when selectedDetail is null (no-op)', () => {
    const stateWithNullDetail: ScenariosState = {
      ...initialState,
      selectedDetail: null,
    };

    const directChanges: DirectChangesData = {
      columns: ['Risk Factor'],
      rows: [{ rowId: 'row-1', payload: { 'Risk Factor': 'FX_USDJPY' } }],
    };

    const state = scenariosReducer(stateWithNullDetail, mergeGridSections({ directChanges }));

    // selectedDetail should remain null -- no-op
    expect(state.selectedDetail).toBeNull();
  });

  // Test 4: fetchScenarioGridSections API function calls correct URL with dynamic expand parameter
  it('fetchScenarioGridSections calls correct URL with dynamic expand parameter', async () => {
    const mockResponseData: Partial<ScenarioDetail> = {
      directChanges: {
        columns: ['Risk Factor', 'Risk Class'],
        rows: [{ rowId: 'row-1', payload: { 'Risk Factor': 'FX_USDJPY', 'Risk Class': 'FX' } }],
      },
      impactData: {
        columns: ['Risk Class', 'Risk Measure'],
        rows: [{ rowId: 'row-i-1', payload: { 'Risk Class': 'FX', 'Risk Measure': 'IMCC' } }],
        compareCta: null,
      },
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockResponseData });

    const result = await fetchScenarioGridSections('sc-sa-1', 'directChanges,impactData');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/scenarios/sc-sa-1?expand=directChanges,impactData')
    );
    expect(result).toEqual(mockResponseData);
  });

  // Test 5: GridRowData, DirectChangesData, and ImpactDataData interfaces compile with correct shape
  it('GridRowData, DirectChangesData, and ImpactDataData interfaces compile with correct shape', () => {
    // GridRowData type-check
    const row: GridRowData = {
      rowId: 'row-uuid-1',
      payload: { 'Risk Factor': 'FX_USDJPY', 'Current Value': 1.35, 'Is Active': true },
    };
    expect(row.rowId).toBe('row-uuid-1');
    expect(row.payload['Risk Factor']).toBe('FX_USDJPY');

    // DirectChangesData type-check
    const directChanges: DirectChangesData = {
      columns: ['Risk Factor', 'Current Value'],
      rows: [row],
    };
    expect(directChanges.columns).toHaveLength(2);
    expect(directChanges.rows).toHaveLength(1);

    // ImpactDataData type-check with compareCta present
    const ctaPresent: CtaData = { label: 'Compare results', url: 'https://example.com/compare' };
    const impactDataWithCta: ImpactDataData = {
      columns: ['Risk Class', 'Capital Charge'],
      rows: [{ rowId: 'row-i-1', payload: { 'Risk Class': 'FX', 'Capital Charge': 300000 } }],
      compareCta: ctaPresent,
    };
    expect(impactDataWithCta.compareCta).not.toBeNull();
    expect(impactDataWithCta.compareCta!.label).toBe('Compare results');

    // ImpactDataData type-check with compareCta null
    const impactDataNoCta: ImpactDataData = {
      columns: ['Risk Class'],
      rows: [],
      compareCta: null,
    };
    expect(impactDataNoCta.compareCta).toBeNull();
    expect(impactDataNoCta.rows).toHaveLength(0);
  });
});
