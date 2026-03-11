import axios from 'axios';
import { fetchImpactReportSummaries, fetchImpactReportDetail } from '../scenarioApi';
import type { ImpactReportSummaryFe, ImpactReportDetailFe } from '../../types/renderedReport';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Report API functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetchImpactReportSummaries calls GET /scenarios/{id}/impact-reports and returns ImpactReportSummaryFe[]', async () => {
    const mockSummaries: ImpactReportSummaryFe[] = [
      {
        id: 'report-001',
        scenarioId: 'sc-1',
        reportKey: 'MARKET_RISK_SUMMARY',
        reportName: 'Market Risk Summary',
        generatedAt: '2026-03-01T10:00:00Z',
        status: 'GENERATED',
      },
      {
        id: 'report-002',
        scenarioId: 'sc-1',
        reportKey: 'SA_CAPITAL_CHARGE',
        reportName: 'SA Capital Charge Summary',
        generatedAt: '2026-03-01T10:05:00Z',
        status: 'FAILED',
      },
    ];

    mockedAxios.get.mockResolvedValueOnce({ data: mockSummaries });

    const result = await fetchImpactReportSummaries('sc-1');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/scenarios/sc-1/impact-reports')
    );
    // Ensure the URL does NOT contain a trailing report ID segment
    const calledUrl = mockedAxios.get.mock.calls[0][0];
    expect(calledUrl).toMatch(/\/scenarios\/sc-1\/impact-reports$/);
    expect(result).toEqual(mockSummaries);
    expect(result).toHaveLength(2);
    expect(result[0].reportKey).toBe('MARKET_RISK_SUMMARY');
  });

  it('fetchImpactReportDetail calls GET /scenarios/{id}/impact-reports/{reportId} and returns ImpactReportDetailFe', async () => {
    const mockDetail: ImpactReportDetailFe = {
      id: 'report-001',
      status: 'GENERATED',
      reportName: 'Market Risk Summary',
      generatedAt: '2026-03-01T10:00:00Z',
      errorMessage: null,
      renderedReport: {
        reportKey: 'MARKET_RISK_SUMMARY',
        reportName: 'Market Risk Summary',
        definitionVersion: 1,
        generatedAt: '2026-03-01T10:00:00Z',
        scenarioId: 'sc-1',
        scenarioName: 'Test Scenario',
        scenarioTypeCode: 'FRTB_SA',
        sections: [],
      },
    };

    mockedAxios.get.mockResolvedValueOnce({ data: mockDetail });

    const result = await fetchImpactReportDetail('sc-1', 'report-001');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/scenarios/sc-1/impact-reports/report-001')
    );
    expect(result).toEqual(mockDetail);
    expect(result.id).toBe('report-001');
    expect(result.status).toBe('GENERATED');
    expect(result.errorMessage).toBeNull();
    expect(result.renderedReport).not.toBeNull();
    expect(result.renderedReport!.reportKey).toBe('MARKET_RISK_SUMMARY');
  });
});
