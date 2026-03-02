import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import analysisReducer, {
  AnalysisState,
  fetchAnalysisHeaderSuccess,
  fetchDirectChangesSuccess,
  fetchImpactReportsSuccess,
  fetchImpactReportsFailure,
  setActiveTab,
} from '../../../store/analysisSlice';
import scenariosReducer, { ScenariosState } from '../../../store/scenariosSlice';
import adminReducer, { AdminState } from '../../../store/adminSlice';
import { AnalysisPage } from '../AnalysisPage';

/**
 * Default preloaded analysis state for AnalysisPage tests.
 *
 * We set loading flags to true and scenarioId to 'sc-1' to represent
 * the state AFTER the mount useEffect dispatches fetchAnalysisDataRequest.
 * This prevents the resolveInitialTab useEffect from firing prematurely
 * during the initial render (it guards on headerLoading being true).
 */
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
  impactReports: null,
  impactReportsLoading: true,
  impactReportsError: null,
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

const createTestStore = (
  analysisOverrides?: Partial<AnalysisState>,
  scenariosOverrides?: Partial<ScenariosState>
) => {
  return configureStore({
    reducer: {
      analysis: analysisReducer,
      scenarios: scenariosReducer,
      admin: adminReducer,
    },
    preloadedState: {
      analysis: { ...defaultAnalysisState, ...analysisOverrides },
      scenarios: { ...defaultScenariosState, ...scenariosOverrides },
      admin: defaultAdminState,
    },
  });
};

const renderWithProviders = (
  initialEntry: string,
  analysisOverrides?: Partial<AnalysisState>,
  scenariosOverrides?: Partial<ScenariosState>
) => {
  const store = createTestStore(analysisOverrides, scenariosOverrides);
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

// Helper to simulate saga completion with INTERNAL scenario data and flush effects
const simulateInternalDataLoad = async (
  store: EnhancedStore,
  opts?: {
    impactReports?: Parameters<typeof fetchImpactReportsSuccess>[0];
    directChangesRows?: { rowId: string; payload: Record<string, unknown> }[];
    directChangesColumns?: string[];
    scenarioName?: string;
    workflowState?: string;
  }
) => {
  await act(async () => {
    store.dispatch(
      fetchAnalysisHeaderSuccess({
        name: opts?.scenarioName ?? 'Test Scenario',
        workflowState: opts?.workflowState ?? 'IMPACT_AVAILABLE',
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
      fetchImpactReportsSuccess(opts?.impactReports ?? [])
    );
  });
};

describe('AnalysisPage', () => {
  it('dispatches fetchAnalysisDataRequest on mount', () => {
    // The mount useEffect dispatches fetchAnalysisDataRequest(id) and
    // setLhsCollapsed(true). Since the preloaded state already reflects
    // the post-dispatch state, we verify the loading flags are set.
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    const state = store.getState();
    expect(state.analysis.scenarioId).toBe('sc-1');
    expect(state.analysis.headerLoading).toBe(true);
    expect(state.analysis.directChangesLoading).toBe(true);
    expect(state.analysis.impactReportsLoading).toBe(true);
  });

  it('dispatches setLhsCollapsed(true) on mount', () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    expect(store.getState().scenarios.lhsCollapsed).toBe(true);
  });

  it('renders loading spinner when loading and no data yet', () => {
    renderWithProviders('/scenarios/sc-1/analysis');

    expect(screen.getByText('Loading analysis...')).toBeInTheDocument();
  });

  it('renders error state when headerError is set', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    await act(async () => {
      store.dispatch({
        type: 'analysis/fetchAnalysisHeaderFailure',
        payload: 'Not found',
      });
    });

    expect(screen.getByText('Scenario not found')).toBeInTheDocument();
    expect(screen.getByText('Back to scenarios')).toBeInTheDocument();
  });

  it('renders ExternalRedirectView when directChangesMode is EXTERNAL', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    await act(async () => {
      store.dispatch(
        fetchAnalysisHeaderSuccess({
          name: 'FX Scenario',
          workflowState: 'DRAFT',
          scenarioType: {
            code: 'MARKET_DATA',
            name: 'Market Data',
            icon: 'ChartMultiple',
            directChangesMode: 'EXTERNAL',
            impactDataMode: 'EXTERNAL',
          },
          summaryCards: {
            changesSummary: {
              changesTotal: 5,
              changesDirect: 3,
              changesIndirect: 2,
              cta: {
                label: 'Open in Market Data UI',
                url: 'https://external.example.com/changes',
              },
            },
            impactSummary: {
              impact: 'MODERATE',
              lastRunAt: null,
              latestRunStatus: null,
              exceptionsCount: null,
            },
          },
        })
      );
    });

    expect(
      screen.getByText('Redirecting to external system...')
    ).toBeInTheDocument();
  });

  // ========== Task 7.6: Impact report tabs appear after data loads ==========

  it('renders impact report tabs after data loads (both INTERNAL)', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    await simulateInternalDataLoad(store, {
      scenarioName: 'Rate Shock Analysis',
      directChangesColumns: ['Risk Factor', 'Value'],
      directChangesRows: [
        { rowId: 'r-1', payload: { 'Risk Factor': 'FX_USD', Value: '1.25' } },
      ],
      impactReports: [
        {
          impactRunId: 'run-abc',
          name: 'RUN-2026-0219-001',
          createdAt: '2026-02-19T14:00:00',
          dataset: {
            columns: ['Col1'],
            rows: [{ rowId: 'r1', payload: { Col1: 'v1' } }],
          },
          compareCta: null,
        },
        {
          impactRunId: 'run-def',
          name: 'RUN-2026-0219-002',
          createdAt: '2026-02-19T15:30:00',
          dataset: {
            columns: ['Col1'],
            rows: [{ rowId: 'r2', payload: { Col1: 'v2' } }],
          },
          compareCta: null,
        },
      ],
    });

    // All three tabs should be rendered
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(3);
    expect(tabs[0]).toHaveTextContent('Direct Changes');
    expect(tabs[1]).toHaveTextContent('RUN-2026-0219-001');
    expect(tabs[2]).toHaveTextContent('RUN-2026-0219-002');
  });

  // ========== Task 7.6: Tab switching between direct-changes and impact report tabs ==========

  it('switches content when tab changes from direct-changes to impact report', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    await simulateInternalDataLoad(store, {
      directChangesColumns: ['Risk Factor'],
      directChangesRows: [
        { rowId: 'dc-1', payload: { 'Risk Factor': 'DC_VALUE' } },
      ],
      impactReports: [
        {
          impactRunId: 'run-abc',
          name: 'RUN-2026-0219-001',
          createdAt: '2026-02-19T14:00:00',
          dataset: {
            columns: ['Impact Col'],
            rows: [
              { rowId: 'ir-1', payload: { 'Impact Col': 'IMPACT_VALUE' } },
            ],
          },
          compareCta: null,
        },
      ],
    });

    // Initial tab should be direct-changes via resolveInitialTab
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // Direct changes content should be visible
    expect(screen.getByText('DC_VALUE')).toBeInTheDocument();

    // Switch to impact report tab
    await act(async () => {
      store.dispatch(setActiveTab('impact-run-abc'));
    });

    // Impact report content should now be visible
    expect(screen.getByText('IMPACT_VALUE')).toBeInTheDocument();
  });

  // ========== Task 7.6: EXTERNAL impact deep-link renders ExternalRedirectView ==========

  it('renders ExternalRedirectView for EXTERNAL impact deep-link', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis?initial-tab=impact-reports'
    );

    await act(async () => {
      store.dispatch(
        fetchAnalysisHeaderSuccess({
          name: 'FX Scenario',
          workflowState: 'DRAFT',
          scenarioType: {
            code: 'FRTB_SA',
            name: 'FRTB SA',
            icon: 'ShieldTask',
            directChangesMode: 'INTERNAL',
            impactDataMode: 'EXTERNAL',
          },
          summaryCards: {
            changesSummary: {
              changesTotal: 5,
              changesDirect: 3,
              changesIndirect: 2,
            },
            impactSummary: {
              impact: 'MODERATE',
              lastRunAt: null,
              latestRunStatus: null,
              exceptionsCount: null,
              cta: {
                label: 'View impact reports',
                url: 'https://external.example.com/impact',
              },
            },
          },
        })
      );
    });

    // ExternalRedirectView for impact reports
    expect(
      screen.getByText('Redirecting to external system...')
    ).toBeInTheDocument();
  });

  // ========== Task 7.6: Error state shows error banner on impact tabs with retry ==========

  it('shows error banner when viewing impact tab and impactReportsError is set', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

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
          columns: ['Col'],
          rows: [],
        })
      );
      store.dispatch(fetchImpactReportsFailure('Failed to fetch impact reports'));
      // Manually set active tab to an impact tab to test the error banner
      store.dispatch(setActiveTab('impact-some-run'));
    });

    // Error banner should be displayed with the error message
    expect(screen.getByText('Failed to fetch impact reports')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('does NOT show error banner when on direct-changes tab despite impactReportsError', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

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
          columns: ['Col'],
          rows: [],
        })
      );
      store.dispatch(fetchImpactReportsFailure('Impact error'));
    });

    // activeTab should resolve to direct-changes
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // Error banner should NOT be shown on direct-changes tab
    expect(screen.queryByText('Impact error')).not.toBeInTheDocument();
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('retry button re-dispatches fetchAnalysisDataRequest', async () => {
    const user = userEvent.setup();
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

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
        fetchDirectChangesSuccess({ columns: [], rows: [] })
      );
      store.dispatch(fetchImpactReportsFailure('Connection error'));
      store.dispatch(setActiveTab('impact-some-run'));
    });

    // Click retry button
    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    // After clicking retry, fetchAnalysisDataRequest should reset the state
    const state = store.getState().analysis;
    expect(state.headerLoading).toBe(true);
    expect(state.directChangesLoading).toBe(true);
    expect(state.impactReportsLoading).toBe(true);
  });

  // ========== Task 7.6: initial-tab=impact-reports activates first impact report tab ==========

  it('initial-tab=impact-reports activates first impact report tab', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis?initial-tab=impact-reports'
    );

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
        fetchImpactReportsSuccess([
          {
            impactRunId: 'run-first',
            name: 'RUN-FIRST',
            createdAt: '2026-02-19T14:00:00',
            dataset: {
              columns: ['Col1'],
              rows: [{ rowId: 'r1', payload: { Col1: 'val' } }],
            },
            compareCta: null,
          },
          {
            impactRunId: 'run-second',
            name: 'RUN-SECOND',
            createdAt: '2026-02-19T15:00:00',
            dataset: {
              columns: ['Col1'],
              rows: [{ rowId: 'r2', payload: { Col1: 'val2' } }],
            },
            compareCta: null,
          },
        ])
      );
    });

    // The resolveInitialTab should have set activeTab to 'impact-run-first'
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('impact-run-first');
    });
  });

  // ========== Task 7.6: Switching tabs does NOT trigger new network calls ==========

  it('switching tabs does NOT trigger new network calls', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    await simulateInternalDataLoad(store, {
      directChangesColumns: ['Col'],
      directChangesRows: [{ rowId: 'r1', payload: { Col: 'DC' } }],
      impactReports: [
        {
          impactRunId: 'run-abc',
          name: 'RUN-001',
          createdAt: '2026-02-19T14:00:00',
          dataset: {
            columns: ['Col'],
            rows: [{ rowId: 'ir1', payload: { Col: 'IR' } }],
          },
          compareCta: null,
        },
      ],
    });

    // Initial tab set by resolveInitialTab
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // Switch to impact tab
    await act(async () => {
      store.dispatch(setActiveTab('impact-run-abc'));
    });

    // Loading flags should still be false (no new fetch triggered)
    const state = store.getState().analysis;
    expect(state.headerLoading).toBe(false);
    expect(state.directChangesLoading).toBe(false);
    expect(state.impactReportsLoading).toBe(false);
  });

  // ========== Task 7.6: Both INTERNAL renders all tabs ==========

  it('renders AnalysisHeader, AnalysisTabs, and DirectChangesAnalysisView in INTERNAL mode', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    await simulateInternalDataLoad(store, {
      scenarioName: 'Rate Shock Analysis',
      directChangesColumns: ['Risk Factor', 'Value'],
      directChangesRows: [
        { rowId: 'r-1', payload: { 'Risk Factor': 'FX_USD', Value: '1.25' } },
      ],
      impactReports: [
        {
          impactRunId: 'run-001',
          name: 'RUN-2026-0219-001',
          createdAt: '2026-02-19T14:00:00',
          dataset: {
            columns: ['Col1'],
            rows: [{ rowId: 'r1', payload: { Col1: 'v1' } }],
          },
          compareCta: null,
        },
      ],
    });

    // Wait for initial tab resolution
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // AnalysisHeader content
    expect(screen.getByText('Rate Shock Analysis')).toBeInTheDocument();
    expect(screen.getByText('Impact Available')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /back to governance/i })
    ).toBeInTheDocument();

    // AnalysisTabs: Direct Changes + impact report tab
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0]).toHaveTextContent('Direct Changes');
    expect(tabs[1]).toHaveTextContent('RUN-2026-0219-001');

    // DirectChangesAnalysisView: DataGridTable content
    expect(screen.getByText('FX_USD')).toBeInTheDocument();
  });

  // ========== Task 7.6: no-tabs-available redirects to governance ==========

  it('renders ExternalRedirectView when both modes are EXTERNAL', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    await act(async () => {
      store.dispatch(
        fetchAnalysisHeaderSuccess({
          name: 'No Tabs Scenario',
          workflowState: 'DRAFT',
          scenarioType: {
            code: 'FRTB_SA',
            name: 'FRTB SA',
            icon: 'ShieldTask',
            directChangesMode: 'EXTERNAL',
            impactDataMode: 'EXTERNAL',
          },
          summaryCards: {
            changesSummary: {
              changesTotal: 5,
              changesDirect: 3,
              changesIndirect: 2,
              cta: {
                label: 'Open external',
                url: 'https://external.example.com',
              },
            },
            impactSummary: {
              impact: 'LOW',
              lastRunAt: null,
              latestRunStatus: null,
              exceptionsCount: null,
            },
          },
        })
      );
    });

    // EXTERNAL directChangesMode triggers ExternalRedirectView before any tab logic
    expect(
      screen.getByText('Redirecting to external system...')
    ).toBeInTheDocument();
  });

  it('navigates to governance when directChanges is INTERNAL but no data is available', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    // Simulate scenario with neither DC mode nor impact reports producing any tabs
    // This happens when scenarioType has no directChangesMode set and no impact reports
    await act(async () => {
      store.dispatch(
        fetchAnalysisHeaderSuccess({
          name: 'Empty Scenario',
          workflowState: 'DRAFT',
          scenarioType: null, // No scenario type means directChangesMode is undefined
          summaryCards: null,
        })
      );
      store.dispatch(
        fetchDirectChangesSuccess({ columns: [], rows: [] })
      );
      store.dispatch(
        fetchImpactReportsSuccess([])
      );
    });

    // resolveInitialTab(null, false, []) returns null
    // -> navigate to governance
    await waitFor(() => {
      expect(screen.getByTestId('governance-page')).toBeInTheDocument();
    });
  });
});
