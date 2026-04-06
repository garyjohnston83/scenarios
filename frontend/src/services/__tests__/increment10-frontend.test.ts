import apiClient from '../axiosInstance';
import { CURRENT_USER_ID } from '../../constants/user';
import { postMessage, postEvent } from '../scenarioApi';
import type { ScenarioHeaderData, ScenarioTypeData } from '../../store/scenariosSlice';
import scenariosReducer, {
  ScenariosState,
  fetchScenarioDetailSuccess,
} from '../../store/scenariosSlice';
import type { ScenarioDetail } from '../../store/scenariosSlice';

jest.mock('../axiosInstance');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Increment 10 -- Frontend Changes', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: CURRENT_USER_ID constant equals "current-user"
  it('CURRENT_USER_ID constant equals "current-user"', () => {
    expect(CURRENT_USER_ID).toBe('current-user');
  });

  // Test 2: postMessage() sends X-Actor-Id header with value "current-user" on axios POST
  it('postMessage() sends X-Actor-Id header with value "current-user" on axios POST', async () => {
    const mockResponse = {
      data: {
        id: 'msg-1',
        authorDisplayName: 'Current User',
        createdAt: '2026-02-22T10:00:00Z',
        text: 'Hello',
      },
    };
    mockedApiClient.post.mockResolvedValueOnce(mockResponse);

    await postMessage('sc-1', 'Hello');

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/scenarios/sc-1/messages'),
      { text: 'Hello' },
      { headers: { 'X-Actor-Id': 'current-user' } }
    );
  });

  // Test 3: postEvent() sends X-Actor-Id header with value "current-user" on axios POST
  it('postEvent() sends X-Actor-Id header with value "current-user" on axios POST', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: undefined });

    await postEvent('sc-1', 'SIGNOFF');

    expect(mockedApiClient.post).toHaveBeenCalledWith(
      expect.stringContaining('/scenarios/sc-1/events'),
      { type: 'SIGNOFF' },
      { headers: { 'X-Actor-Id': 'current-user' } }
    );
  });

  // Test 4: ScenarioHeaderData interface accepts an object with scenarioType property
  it('ScenarioHeaderData interface accepts an object with scenarioType property containing code, name, icon, directChangesMode, impactDataMode', () => {
    const scenarioType: ScenarioTypeData = {
      code: 'MARKET_DATA',
      name: 'Market Data',
      icon: 'ChartMultiple',
      directChangesMode: 'EXTERNAL',
      impactDataMode: 'EXTERNAL',
    };

    const headerData: ScenarioHeaderData = {
      workflowState: 'IMPACT_AVAILABLE',
      impact: 'HIGH',
      ownerDisplayName: 'Alice Johnson',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-15T10:00:00Z',
      scenarioType,
    };

    expect(headerData.scenarioType).toBeDefined();
    expect(headerData.scenarioType!.code).toBe('MARKET_DATA');
    expect(headerData.scenarioType!.name).toBe('Market Data');
    expect(headerData.scenarioType!.icon).toBe('ChartMultiple');
    expect(headerData.scenarioType!.directChangesMode).toBe('EXTERNAL');
    expect(headerData.scenarioType!.impactDataMode).toBe('EXTERNAL');
  });

  // ========================================================================
  // Gap tests (Task Group 6) -- fill coverage gaps for Increment 10
  // ========================================================================

  describe('Increment 10 Gap Tests', () => {
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

    // Gap Test 1: scenariosSlice reducer correctly stores header data with scenarioType present
    it('scenariosSlice reducer correctly stores header data with scenarioType present', () => {
      const prevState: ScenariosState = {
        ...initialState,
        detailLoading: true,
      };

      const detail: ScenarioDetail = {
        id: 'sc-1',
        name: 'Market Data Scenario',
        scenarioTypeCode: 'MARKET_DATA',
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
            code: 'MARKET_DATA',
            name: 'Market Data',
            icon: 'ChartMultiple',
            directChangesMode: 'EXTERNAL',
            impactDataMode: 'EXTERNAL',
          },
        },
      };

      const state = scenariosReducer(prevState, fetchScenarioDetailSuccess(detail));

      expect(state.selectedDetail).not.toBeNull();
      expect(state.selectedDetail!.header).toBeDefined();
      expect(state.selectedDetail!.header!.scenarioType).toBeDefined();
      expect(state.selectedDetail!.header!.scenarioType!.code).toBe('MARKET_DATA');
      expect(state.selectedDetail!.header!.scenarioType!.name).toBe('Market Data');
      expect(state.selectedDetail!.header!.scenarioType!.icon).toBe('ChartMultiple');
      expect(state.selectedDetail!.header!.scenarioType!.directChangesMode).toBe('EXTERNAL');
      expect(state.selectedDetail!.header!.scenarioType!.impactDataMode).toBe('EXTERNAL');
      expect(state.detailLoading).toBe(false);
    });

    // Gap Test 2: scenariosSlice reducer correctly stores header data with scenarioType absent (backward compat)
    it('scenariosSlice reducer correctly stores header data with scenarioType absent (backward compat)', () => {
      const prevState: ScenariosState = {
        ...initialState,
        detailLoading: true,
      };

      const detail: ScenarioDetail = {
        id: 'sc-2',
        name: 'Legacy Scenario',
        scenarioTypeCode: 'RISK_FACTOR',
        ownerDisplayName: 'Bob Smith',
        createdAt: '2026-01-05T08:00:00Z',
        updatedAt: '2026-01-12T10:00:00Z',
        header: {
          workflowState: 'DRAFT',
          impact: 'LOW',
          ownerDisplayName: 'Bob Smith',
          createdAt: '2026-01-05T08:00:00Z',
          updatedAt: '2026-01-12T10:00:00Z',
          // scenarioType intentionally omitted to simulate older API response
        },
      };

      const state = scenariosReducer(prevState, fetchScenarioDetailSuccess(detail));

      expect(state.selectedDetail).not.toBeNull();
      expect(state.selectedDetail!.header).toBeDefined();
      expect(state.selectedDetail!.header!.scenarioType).toBeUndefined();
      expect(state.selectedDetail!.header!.workflowState).toBe('DRAFT');
      expect(state.selectedDetail!.header!.ownerDisplayName).toBe('Bob Smith');
      expect(state.detailLoading).toBe(false);
    });

    // Gap Test 3: postMessage error handling still works with X-Actor-Id header present
    it('postMessage error handling still works with X-Actor-Id header present', async () => {
      const networkError = new Error('Network Error');
      mockedApiClient.post.mockRejectedValueOnce(networkError);

      await expect(postMessage('sc-1', 'Hello')).rejects.toThrow('Network Error');

      // Verify the call was still made with the X-Actor-Id header
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/scenarios/sc-1/messages'),
        { text: 'Hello' },
        { headers: { 'X-Actor-Id': 'current-user' } }
      );
    });

    // Gap Test 4: postEvent error handling still works with X-Actor-Id header present
    it('postEvent error handling still works with X-Actor-Id header present', async () => {
      const serverError = new Error('Request failed with status code 400');
      mockedApiClient.post.mockRejectedValueOnce(serverError);

      await expect(postEvent('sc-1', 'SIGNOFF')).rejects.toThrow('Request failed with status code 400');

      // Verify the call was still made with the X-Actor-Id header
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/scenarios/sc-1/events'),
        { type: 'SIGNOFF' },
        { headers: { 'X-Actor-Id': 'current-user' } }
      );
    });
  });
});
