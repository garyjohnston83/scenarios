import apiClient from '../axiosInstance';
import { getDirectChangesView } from '../scenarioApi';
import type {
  DirectChangesRuntimeResponse,
  DirectChangesDataSectionFe,
  DirectChangesColumnDefinitionFe,
  ScenarioTypeData,
} from '../../store/scenariosSlice';

jest.mock('../axiosInstance');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('getDirectChangesView API function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Test 1: Verify getDirectChangesView calls GET /scenarios/{id}/direct-changes
  //         and returns typed DirectChangesRuntimeResponse
  // ==========================================================================

  it('calls GET /scenarios/{id}/direct-changes and returns typed DirectChangesRuntimeResponse', async () => {
    const mockResponse: DirectChangesRuntimeResponse = {
      dataChanged: [
        {
          dataType: 'timeSeriesValues',
          header: '5 Time-series Points have been changed for 2 Time-Series',
          externalLink: 'http://example.com/ts-link',
          totalDataChanges: 5,
          renderState: 'ROWS',
          columnDefinitions: [
            { dataAttribute: 'tsName', type: 'string', display: 'Time-Series Name', isEntityId: true },
            { dataAttribute: 'date', type: 'date', display: 'Date' },
          ],
          data: [
            { tsName: 'TS Name 1', date: '13/10/2025', cur: 10.4, new: 9.1 },
          ],
        },
      ],
    };

    mockedApiClient.get.mockResolvedValueOnce({ data: mockResponse });

    const result = await getDirectChangesView('sc-123');

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/scenarios/sc-123/direct-changes')
    );
    // Verify URL ends with /direct-changes (not the old ?expand=directChanges)
    const calledUrl = mockedApiClient.get.mock.calls[0][0];
    expect(calledUrl).toMatch(/\/scenarios\/sc-123\/direct-changes$/);
    expect(result).toEqual(mockResponse);
    expect(result.dataChanged).toHaveLength(1);
    expect(result.dataChanged[0].dataType).toBe('timeSeriesValues');
    expect(result.dataChanged[0].renderState).toBe('ROWS');
  });

  // ==========================================================================
  // Test 2: Verify getDirectChangesView propagates network errors correctly
  // ==========================================================================

  it('propagates network errors correctly', async () => {
    const networkError = new Error('Network Error');
    mockedApiClient.get.mockRejectedValueOnce(networkError);

    await expect(getDirectChangesView('sc-456')).rejects.toThrow('Network Error');

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/scenarios/sc-456/direct-changes')
    );
  });

  // ==========================================================================
  // Test 3: Verify DirectChangesRuntimeResponse interface shape matches
  //         the expected backend contract
  // ==========================================================================

  it('DirectChangesRuntimeResponse interface shape matches backend contract', () => {
    // This test verifies at compile-time and runtime that the interfaces
    // match the expected backend contract shape.
    const columnDef: DirectChangesColumnDefinitionFe = {
      dataAttribute: 'tsName',
      type: 'string',
      display: 'Time-Series Name',
      isEntityId: true,
    };

    const columnDefWithoutEntityId: DirectChangesColumnDefinitionFe = {
      dataAttribute: 'date',
      type: 'date',
      display: 'Date',
      // isEntityId is optional -- omitted here
    };

    const sectionRows: DirectChangesDataSectionFe = {
      dataType: 'timeSeriesValues',
      header: '5 points changed',
      externalLink: 'http://example.com',
      totalDataChanges: 5,
      renderState: 'ROWS',
      columnDefinitions: [columnDef, columnDefWithoutEntityId],
      data: [{ tsName: 'TS1', date: '01/01/2026' }],
    };

    const sectionOverflow: DirectChangesDataSectionFe = {
      dataType: 'curveDefinitions',
      header: '100 curve changes',
      externalLink: null,
      totalDataChanges: 100,
      renderState: 'OVERFLOW',
      columnDefinitions: [columnDef],
      data: null,
    };

    const sectionNoData: DirectChangesDataSectionFe = {
      dataType: 'positions',
      header: 'Position changes',
      externalLink: null,
      totalDataChanges: 0,
      renderState: 'NO_DATA',
      columnDefinitions: [],
      data: null,
    };

    const response: DirectChangesRuntimeResponse = {
      dataChanged: [sectionRows, sectionOverflow, sectionNoData],
    };

    expect(response.dataChanged).toHaveLength(3);
    expect(response.dataChanged[0].renderState).toBe('ROWS');
    expect(response.dataChanged[0].data).not.toBeNull();
    expect(response.dataChanged[1].renderState).toBe('OVERFLOW');
    expect(response.dataChanged[1].data).toBeNull();
    expect(response.dataChanged[1].externalLink).toBeNull();
    expect(response.dataChanged[2].renderState).toBe('NO_DATA');
    expect(columnDef.isEntityId).toBe(true);
    expect(columnDefWithoutEntityId.isEntityId).toBeUndefined();
  });

  // ==========================================================================
  // Test 4: Verify ScenarioTypeData interface accepts optional
  //         directChangesInternalRenderMode and remains backward-compatible
  // ==========================================================================

  it('ScenarioTypeData accepts optional directChangesInternalRenderMode and is backward-compatible', () => {
    // With the new field present
    const typeDataWithRenderMode: ScenarioTypeData = {
      code: 'MARKET_DATA',
      name: 'Market Data',
      icon: 'ChartMultiple',
      directChangesMode: 'INTERNAL',
      impactDataMode: 'INTERNAL',
      directChangesInternalRenderMode: 'DELTA_BY_UNIQUE_ID',
    };

    expect(typeDataWithRenderMode.directChangesInternalRenderMode).toBe('DELTA_BY_UNIQUE_ID');

    // Without the new field (backward compatibility)
    const typeDataWithoutRenderMode: ScenarioTypeData = {
      code: 'RISK_FACTOR',
      name: 'Risk Factor',
      icon: 'Pulse',
      directChangesMode: 'EXTERNAL',
      impactDataMode: 'EXTERNAL',
    };

    expect(typeDataWithoutRenderMode.directChangesInternalRenderMode).toBeUndefined();

    // With explicit FULL_DATA_CHANGES
    const typeDataFullDataChanges: ScenarioTypeData = {
      code: 'INTEREST_RATE',
      name: 'Interest Rate',
      icon: 'ArrowTrendingLines',
      directChangesMode: 'INTERNAL',
      impactDataMode: 'INTERNAL',
      directChangesInternalRenderMode: 'FULL_DATA_CHANGES',
    };

    expect(typeDataFullDataChanges.directChangesInternalRenderMode).toBe('FULL_DATA_CHANGES');
  });
});
