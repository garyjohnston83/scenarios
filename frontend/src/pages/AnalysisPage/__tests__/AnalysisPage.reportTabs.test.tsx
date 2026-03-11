import { render, screen, act, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import analysisReducer, {
  AnalysisState,
  fetchAnalysisHeaderSuccess,
  fetchDirectChangesSuccess,
  fetchReportSummariesSuccess,
  fetchReportDetailRequest,
  fetchReportDetailSuccess,
  setActiveTab,
} from '../../../store/analysisSlice';
import scenariosReducer, { ScenariosState } from '../../../store/scenariosSlice';
import adminReducer, { AdminState } from '../../../store/adminSlice';
import { AnalysisPage } from '../AnalysisPage';
import type { RenderedReport, ImpactReportDetailFe } from '../../../types/renderedReport';

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

const renderWithProviders = (
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

const simulateInternalDataLoad = async (
  store: EnhancedStore,
  opts?: {
    reportSummaries?: Parameters<typeof fetchReportSummariesSuccess>[0];
    directChangesRows?: { rowId: string; payload: Record<string, unknown> }[];
    directChangesColumns?: string[];
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
      fetchDirectChangesSuccess({
        columns: opts?.directChangesColumns ?? ['Col'],
        rows: opts?.directChangesRows ?? [],
      })
    );
    store.dispatch(
      fetchReportSummariesSuccess(opts?.reportSummaries ?? [])
    );
  });
};

const mockRenderedReport: RenderedReport = {
  reportKey: 'market_risk_summary',
  reportName: 'Market Risk Summary',
  definitionVersion: 1,
  generatedAt: '2026-02-19T14:00:00',
  scenarioId: 'sc-1',
  scenarioName: 'Rate Shock Analysis',
  scenarioTypeCode: 'FRTB_SA',
  sections: [
    {
      sectionKey: 'key_metrics',
      sectionTitle: 'Key Risk Metrics',
      order: 1,
      contentBlocks: [
        {
          blockType: 'text' as const,
          order: 1,
          textKey: 'intro',
          content: 'Summary of key metrics for this scenario.',
        },
      ],
    },
  ],
};

describe('AnalysisPage - Report Tab Integration', () => {
  it('constructs tabs from reportSummaries with report-{id} tab IDs', async () => {
    const store = renderWithProviders('/scenarios/sc-1/analysis');

    await simulateInternalDataLoad(store, {
      reportSummaries: [
        {
          id: 'abc-123',
          scenarioId: 'sc-1',
          reportKey: 'market_risk_summary',
          reportName: 'Market Risk Summary',
          generatedAt: '2026-02-19T14:00:00',
          status: 'GENERATED',
        },
        {
          id: 'def-456',
          scenarioId: 'sc-1',
          reportKey: 'sa_capital_summary',
          reportName: 'SA Capital Summary',
          generatedAt: '2026-02-19T15:00:00',
          status: 'GENERATED',
        },
      ],
    });

    const tabs = screen.getAllByRole('tab');
    // 1 direct-changes tab + 2 report tabs
    expect(tabs.length).toBe(3);
    expect(tabs[0]).toHaveTextContent('Direct Changes');
    expect(tabs[1]).toHaveTextContent('Market Risk Summary');
    expect(tabs[2]).toHaveTextContent('SA Capital Summary');
  });

  it('shows loading spinner when report detail is in loading state via eager fetch without user tab interaction', async () => {
    const store = renderWithProviders('/scenarios/sc-1/analysis');

    await simulateInternalDataLoad(store, {
      reportSummaries: [
        {
          id: 'abc-123',
          scenarioId: 'sc-1',
          reportKey: 'market_risk_summary',
          reportName: 'Market Risk Summary',
          generatedAt: '2026-02-19T14:00:00',
          status: 'GENERATED',
        },
      ],
    });

    // Wait for initial tab to resolve
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // Simulate the saga's eager fetch having dispatched fetchReportDetailRequest
    // (sets loading state in reportDetails) and then switch to the report tab
    await act(async () => {
      store.dispatch(fetchReportDetailRequest({ scenarioId: 'sc-1', reportId: 'abc-123' }));
      store.dispatch(setActiveTab('report-abc-123'));
    });

    // The loading spinner should be visible -- the saga's eager fetch set the
    // loading state, no lazy-fetch useEffect is involved
    await waitFor(() => {
      expect(screen.getByText('Loading report...')).toBeInTheDocument();
    });
  });

  it('shows rendered report content immediately when report detail is already populated via eager fetch', async () => {
    const store = renderWithProviders('/scenarios/sc-1/analysis');

    await simulateInternalDataLoad(store, {
      reportSummaries: [
        {
          id: 'abc-123',
          scenarioId: 'sc-1',
          reportKey: 'market_risk_summary',
          reportName: 'Market Risk Summary',
          generatedAt: '2026-02-19T14:00:00',
          status: 'GENERATED',
        },
      ],
    });

    // Wait for initial tab to resolve
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // Simulate the saga's eager fetch having already completed by dispatching
    // fetchReportDetailSuccess before switching to the report tab
    const detail: ImpactReportDetailFe = {
      id: 'abc-123',
      status: 'GENERATED',
      reportName: 'Market Risk Summary',
      generatedAt: '2026-02-19T14:00:00',
      errorMessage: null,
      renderedReport: mockRenderedReport,
    };
    await act(async () => {
      store.dispatch(fetchReportDetailSuccess({ reportId: 'abc-123', detail }));
    });

    // Switch to report tab -- detail is already populated via eager fetch
    await act(async () => {
      store.dispatch(setActiveTab('report-abc-123'));
    });

    // ReportRenderer should render the content immediately without any
    // intermediate loading state
    await waitFor(() => {
      expect(screen.getByText('Key Risk Metrics')).toBeInTheDocument();
      expect(screen.getByText('Summary of key metrics for this scenario.')).toBeInTheDocument();
    });

    // Verify no loading spinner is present
    expect(screen.queryByText('Loading report...')).not.toBeInTheDocument();
  });

  it('renders loading spinner when reportDetails[id].loading is true', async () => {
    const store = renderWithProviders('/scenarios/sc-1/analysis');

    await simulateInternalDataLoad(store, {
      reportSummaries: [
        {
          id: 'abc-123',
          scenarioId: 'sc-1',
          reportKey: 'market_risk_summary',
          reportName: 'Market Risk Summary',
          generatedAt: '2026-02-19T14:00:00',
          status: 'GENERATED',
        },
      ],
    });

    // Wait for initial tab
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // Switch to report tab -- the detail state is not yet populated,
    // so the spinner should appear
    await act(async () => {
      store.dispatch(setActiveTab('report-abc-123'));
    });

    // The loading spinner should be visible
    await waitFor(() => {
      expect(screen.getByText('Loading report...')).toBeInTheDocument();
    });
  });

  it('renders ReportRenderer when detail data is loaded', async () => {
    const store = renderWithProviders('/scenarios/sc-1/analysis');

    await simulateInternalDataLoad(store, {
      reportSummaries: [
        {
          id: 'abc-123',
          scenarioId: 'sc-1',
          reportKey: 'market_risk_summary',
          reportName: 'Market Risk Summary',
          generatedAt: '2026-02-19T14:00:00',
          status: 'GENERATED',
        },
      ],
    });

    // Wait for initial tab
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // Switch to report tab
    await act(async () => {
      store.dispatch(setActiveTab('report-abc-123'));
    });

    // Simulate successful detail fetch
    const detail: ImpactReportDetailFe = {
      id: 'abc-123',
      status: 'GENERATED',
      reportName: 'Market Risk Summary',
      generatedAt: '2026-02-19T14:00:00',
      errorMessage: null,
      renderedReport: mockRenderedReport,
    };
    await act(async () => {
      store.dispatch(fetchReportDetailSuccess({ reportId: 'abc-123', detail }));
    });

    // ReportRenderer should render the section title and text content
    // (report name appears in both the tab label and the metadata strip,
    // so we check for unique content rendered only by ReportRenderer)
    await waitFor(() => {
      // Report name appears in both tab and metadata strip -- verify both exist
      const reportNameElements = screen.getAllByText('Market Risk Summary');
      expect(reportNameElements.length).toBeGreaterThanOrEqual(2);
      // Section title from the rendered report (unique to ReportRenderer)
      expect(screen.getByText('Key Risk Metrics')).toBeInTheDocument();
      // Text block content (unique to ReportRenderer)
      expect(screen.getByText('Summary of key metrics for this scenario.')).toBeInTheDocument();
    });
  });
});
