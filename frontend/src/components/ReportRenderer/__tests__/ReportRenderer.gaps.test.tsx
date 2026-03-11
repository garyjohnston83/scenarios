import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { ReportRenderer } from '../ReportRenderer';
import { MetricBlockRenderer } from '../MetricBlockRenderer';
import { TableBlockRenderer } from '../TableBlockRenderer';
import analysisReducer, {
  AnalysisState,
  fetchAnalysisHeaderSuccess,
  fetchDirectChangesSuccess,
  fetchReportSummariesSuccess,
  fetchReportDetailSuccess,
  fetchReportDetailFailure,
  setActiveTab,
} from '../../../store/analysisSlice';
import scenariosReducer, { ScenariosState } from '../../../store/scenariosSlice';
import adminReducer, { AdminState } from '../../../store/adminSlice';
import { AnalysisPage } from '../../../pages/AnalysisPage/AnalysisPage';
import type {
  RenderedReport,
  MetricBlock,
  TableBlock,
  ImpactReportDetailFe,
} from '../../../types/renderedReport';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
);

const renderWithProvider = (ui: React.ReactElement) => render(ui, { wrapper });

// ============================================================================
// Component-level gap tests
// ============================================================================

describe('ReportRenderer - gap tests', () => {
  it('renders metadata but no sections when sections array is empty', () => {
    const emptyReport: RenderedReport = {
      reportKey: 'empty_report',
      reportName: 'Empty Report',
      definitionVersion: 1,
      generatedAt: '2026-03-01T12:00:00',
      scenarioId: 'sc-1',
      scenarioName: 'Test Scenario',
      scenarioTypeCode: 'FRTB_SA',
      sections: [],
    };

    renderWithProvider(<ReportRenderer renderedReport={emptyReport} />);

    // Metadata strip should render
    expect(screen.getByText('Empty Report')).toBeInTheDocument();
    expect(screen.getByText('01/03/2026 12:00:00')).toBeInTheDocument();

    // No section titles should be present
    const headings = screen.queryAllByText(/Section/);
    expect(headings).toHaveLength(0);
  });
});

describe('MetricBlockRenderer - deltaPct formatting gaps', () => {
  it('renders +X.XX% format when deltaPct is positive', () => {
    const positiveBlock: MetricBlock = {
      blockType: 'metric',
      order: 1,
      metricKey: 'positive-metric',
      label: 'Positive Delta Metric',
      sourceField: 'field_1',
      format: 'number',
      unit: 'USD',
      productionValue: 100000,
      scenarioValue: 112500,
      deltaValue: 12500,
      deltaPct: 12.5,
      formattedProductionValue: '100,000',
      formattedScenarioValue: '112,500',
      formattedDelta: '+12,500',
      formatToken: 'negative',
    };

    renderWithProvider(<MetricBlockRenderer block={positiveBlock} />);

    const deltaPctEl = screen.getByText('+12.50%');
    expect(deltaPctEl).toBeInTheDocument();
    expect(deltaPctEl).toHaveClass('negative');
  });

  it('renders -X.XX% format when deltaPct is negative', () => {
    const negativeBlock: MetricBlock = {
      blockType: 'metric',
      order: 1,
      metricKey: 'negative-metric',
      label: 'Negative Delta Metric',
      sourceField: 'field_2',
      format: 'number',
      unit: 'USD',
      productionValue: 100000,
      scenarioValue: 85000,
      deltaValue: -15000,
      deltaPct: -15.0,
      formattedProductionValue: '100,000',
      formattedScenarioValue: '85,000',
      formattedDelta: '-15,000',
      formatToken: 'positive',
    };

    renderWithProvider(<MetricBlockRenderer block={negativeBlock} />);

    const deltaPctEl = screen.getByText('-15.00%');
    expect(deltaPctEl).toBeInTheDocument();
    expect(deltaPctEl).toHaveClass('positive');
  });
});

describe('TableBlockRenderer - empty columnGroups gap', () => {
  it('renders single-row header when columnGroups is empty', () => {
    const flatTable: TableBlock = {
      blockType: 'table',
      order: 1,
      tableKey: 'flat-table',
      label: 'Flat Table',
      columnLayout: {
        rowColumns: [
          { key: 'name', header: 'Name' },
          { key: 'value', header: 'Value' },
        ],
        columnGroups: [],
      },
      rows: [
        {
          rowId: 'row-1',
          cells: {
            name: { value: 'Alpha' },
            value: { value: '100' },
          },
        },
      ],
    };

    renderWithProvider(<TableBlockRenderer block={flatTable} />);

    // Table heading
    expect(screen.getByText('Flat Table')).toBeInTheDocument();

    // Single-row header: both headers should appear in a single row
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();

    // Verify the row column headers do NOT have rowSpan (single row)
    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).not.toHaveAttribute('rowspan');

    // Verify body data renders
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('applies formatToken class to cells via getFormatTokenClass', () => {
    const tableWithTokens: TableBlock = {
      blockType: 'table',
      order: 1,
      tableKey: 'token-table',
      label: 'Token Table',
      columnLayout: {
        rowColumns: [{ key: 'label', header: 'Label' }],
        columnGroups: [
          {
            groupLabel: 'Values',
            columns: [{ key: 'delta', header: 'Delta' }],
          },
        ],
      },
      rows: [
        {
          rowId: 'row-1',
          cells: {
            label: { value: 'Item A' },
            delta: { value: '+500', formatToken: 'warning' },
          },
        },
        {
          rowId: 'row-2',
          cells: {
            label: { value: 'Item B' },
            delta: { value: '-200', formatToken: 'breach' },
          },
        },
      ],
    };

    renderWithProvider(<TableBlockRenderer block={tableWithTokens} />);

    // Warning token cell
    const warningCell = screen.getByText('+500').closest('td');
    expect(warningCell).toHaveClass('warning');

    // Breach token cell
    const breachCell = screen.getByText('-200').closest('td');
    expect(breachCell).toHaveClass('breach');
  });
});

// ============================================================================
// AnalysisPage integration gap tests (error + FAILED states)
// ============================================================================

const defaultAnalysisState: AnalysisState = {
  scenarioId: 'sc-1',
  scenarioName: null,
  workflowState: null,
  scenarioType: null,
  summaryCards: null,
  directChanges: null,
  directChangesLoading: true,
  directChangesError: null,
  headerLoading: true,
  headerError: null,
  reportSummaries: null,
  reportSummariesLoading: true,
  reportSummariesError: null,
  reportDetails: {},
  activeTab: null,
};

const defaultScenariosState: ScenariosState = {
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
  combinePosting: false,
  combinePostError: null,
  lhsCollapsed: false,
};

const defaultAdminState: AdminState = {
  policies: [],
  loading: false,
  error: null,
  saving: false,
};

const createTestStore = (analysisOverrides?: Partial<AnalysisState>) => {
  return configureStore({
    reducer: {
      analysis: analysisReducer,
      scenarios: scenariosReducer,
      admin: adminReducer,
    },
    preloadedState: {
      analysis: { ...defaultAnalysisState, ...analysisOverrides },
      scenarios: defaultScenariosState,
      admin: defaultAdminState,
    },
  });
};

const renderWithFullProviders = (
  initialEntry: string,
  analysisOverrides?: Partial<AnalysisState>
) => {
  const store = createTestStore(analysisOverrides);
  render(
    <Provider store={store}>
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path="/scenarios/:id/analysis"
              element={<AnalysisPage />}
            />
            <Route
              path="/scenarios/:id"
              element={<div data-testid="governance-page">Governance</div>}
            />
            <Route
              path="/scenarios"
              element={<div data-testid="scenarios-list">Scenarios List</div>}
            />
          </Routes>
        </MemoryRouter>
      </FluentProvider>
    </Provider>
  );
  return store;
};

const simulateDataLoad = async (
  store: ReturnType<typeof createTestStore>,
  opts?: {
    reportSummaries?: Parameters<typeof fetchReportSummariesSuccess>[0];
  }
) => {
  await act(async () => {
    store.dispatch(
      fetchAnalysisHeaderSuccess({
        name: 'Test Scenario',
        workflowState: 'IMPACT_AVAILABLE',
        scenarioType: {
          code: 'FRTB_SA',
          name: 'FRTB SA',
          icon: 'ShieldTask',
          directChangesMode: 'INTERNAL',
          impactDataMode: 'INTERNAL',
        },
        summaryCards: null,
      })
    );
    store.dispatch(
      fetchDirectChangesSuccess({ columns: ['Col'], rows: [] })
    );
    store.dispatch(
      fetchReportSummariesSuccess(opts?.reportSummaries ?? [])
    );
  });
};

describe('AnalysisPage - error and FAILED state gap tests', () => {
  it('renders Retry button on error state that dispatches fetchReportDetailRequest', async () => {
    const store = renderWithFullProviders('/scenarios/sc-1/analysis');

    await simulateDataLoad(store, {
      reportSummaries: [
        {
          id: 'err-report',
          scenarioId: 'sc-1',
          reportKey: 'error_report',
          reportName: 'Error Report',
          generatedAt: '2026-03-01T10:00:00',
          status: 'GENERATED',
        },
      ],
    });

    // Wait for initial tab to resolve
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // Switch to the report tab
    await act(async () => {
      store.dispatch(setActiveTab('report-err-report'));
    });

    // Simulate API failure for this report
    await act(async () => {
      store.dispatch(
        fetchReportDetailFailure({
          reportId: 'err-report',
          error: 'Server returned 500: Internal Server Error',
        })
      );
    });

    // Error message should be rendered
    await waitFor(() => {
      expect(
        screen.getByText('Server returned 500: Internal Server Error')
      ).toBeInTheDocument();
    });

    // Retry button should be present
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();

    // Click Retry -- should re-dispatch fetchReportDetailRequest and set loading: true
    await act(async () => {
      retryButton.click();
    });

    // After clicking Retry, the report detail should be back to loading state
    await waitFor(() => {
      expect(store.getState().analysis.reportDetails['err-report'].loading).toBe(true);
    });
  });

  it('renders errorMessage and "Report Generation Failed" heading for FAILED report', async () => {
    const store = renderWithFullProviders('/scenarios/sc-1/analysis');

    await simulateDataLoad(store, {
      reportSummaries: [
        {
          id: 'failed-rpt',
          scenarioId: 'sc-1',
          reportKey: 'sa_capital_summary',
          reportName: 'SA Capital Summary',
          generatedAt: '2026-03-01T11:00:00',
          status: 'FAILED',
        },
      ],
    });

    // Wait for initial tab
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // Switch to the FAILED report tab
    await act(async () => {
      store.dispatch(setActiveTab('report-failed-rpt'));
    });

    // Simulate the detail fetch returning a FAILED report with errorMessage
    const failedDetail: ImpactReportDetailFe = {
      id: 'failed-rpt',
      status: 'FAILED',
      reportName: 'SA Capital Summary',
      generatedAt: '2026-03-01T11:00:00',
      errorMessage: 'Data provider timeout: unable to fetch risk charge data within 30s',
      renderedReport: null,
    };
    await act(async () => {
      store.dispatch(
        fetchReportDetailSuccess({ reportId: 'failed-rpt', detail: failedDetail })
      );
    });

    // "Report Generation Failed" heading should be rendered
    await waitFor(() => {
      expect(
        screen.getByText('Report Generation Failed')
      ).toBeInTheDocument();
    });

    // The errorMessage from the DTO should be visible
    expect(
      screen.getByText(
        'Data provider timeout: unable to fetch risk charge data within 30s'
      )
    ).toBeInTheDocument();

    // Muted note should be visible
    expect(
      screen.getByText('This report could not be generated')
    ).toBeInTheDocument();
  });
});
