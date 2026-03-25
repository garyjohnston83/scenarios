import { render, screen, act, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import analysisReducer, {
  AnalysisState,
  fetchAnalysisHeaderSuccess,
  fetchDirectChangesSuccess,
  fetchDirectChangesDeltaSuccess,
  fetchReportSummariesSuccess,
  setActiveTab,
} from '../../../store/analysisSlice';
import scenariosReducer, { ScenariosState } from '../../../store/scenariosSlice';
import adminReducer, { AdminState } from '../../../store/adminSlice';
import { AnalysisPage } from '../AnalysisPage';

const defaultAnalysisState: AnalysisState = {
  scenarioId: 'sc-1',
  scenarioName: null,
  workflowState: null,
  scenarioType: null,
  summaryCards: null,
  directChanges: null,
  directChangesLoading: true,
  directChangesError: null,
  directChangesDeltaData: null,
  directChangesDeltaLoading: true,
  directChangesDeltaError: null,
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

describe('AnalysisPage delta routing', () => {
  // Test 1: When directChangesInternalRenderMode === 'DELTA_BY_UNIQUE_ID' and
  // activeTab === 'direct-changes', DirectChangesDeltaView is rendered
  it('renders DirectChangesDeltaView when directChangesInternalRenderMode is DELTA_BY_UNIQUE_ID', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    await act(async () => {
      store.dispatch(
        fetchAnalysisHeaderSuccess({
          name: 'Delta Scenario',
          workflowState: 'IMPACT_AVAILABLE',
          scenarioType: {
            code: 'MARKET_DATA',
            name: 'Market Data',
            icon: 'ChartMultiple',
            directChangesMode: 'INTERNAL',
            impactDataMode: 'INTERNAL',
            directChangesInternalRenderMode: 'DELTA_BY_UNIQUE_ID',
          },
          summaryCards: null,
        })
      );
      store.dispatch(
        fetchDirectChangesDeltaSuccess({
          dataChanged: [
            {
              dataType: 'timeSeriesValues',
              header: '5 Time-series Points changed',
              externalLink: null,
              totalDataChanges: 5,
              renderState: 'ROWS',
              columnDefinitions: [
                { dataAttribute: 'tsName', type: 'string', display: 'Time-Series Name' },
              ],
              data: [{ tsName: 'TS_DELTA_TEST' }],
            },
          ],
        })
      );
      store.dispatch(
        fetchDirectChangesSuccess({ columns: ['Col'], rows: [] })
      );
      store.dispatch(fetchReportSummariesSuccess([]));
    });

    // Wait for tab resolution
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // DirectChangesDeltaView should render the accordion section header
    expect(screen.getByText('5 Time-series Points changed')).toBeInTheDocument();

    // The old DirectChangesAnalysisView empty state should NOT be visible
    expect(screen.queryByText('No direct changes data available')).not.toBeInTheDocument();
  });

  // Test 2: When directChangesInternalRenderMode is absent/undefined and
  // activeTab === 'direct-changes', DirectChangesAnalysisView is rendered
  it('renders DirectChangesAnalysisView when directChangesInternalRenderMode is absent', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    await act(async () => {
      store.dispatch(
        fetchAnalysisHeaderSuccess({
          name: 'Legacy Scenario',
          workflowState: 'IMPACT_AVAILABLE',
          scenarioType: {
            code: 'FRTB_SA',
            name: 'FRTB SA',
            icon: 'ShieldTask',
            directChangesMode: 'INTERNAL',
            impactDataMode: 'INTERNAL',
            // No directChangesInternalRenderMode set
          },
          summaryCards: null,
        })
      );
      store.dispatch(
        fetchDirectChangesSuccess({
          columns: ['Risk Factor'],
          rows: [
            { rowId: 'r-1', payload: { 'Risk Factor': 'LEGACY_GRID_VALUE' } },
          ],
        })
      );
      store.dispatch(fetchReportSummariesSuccess([]));
    });

    // Wait for tab resolution
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // DirectChangesAnalysisView should render the DataGridTable with the legacy value
    expect(screen.getByText('LEGACY_GRID_VALUE')).toBeInTheDocument();

    // Should NOT show the delta view elements
    expect(screen.queryByText('No direct changes to display')).not.toBeInTheDocument();
  });

  // Test 3: When directChangesInternalRenderMode === 'FULL_DATA_CHANGES',
  // DirectChangesAnalysisView is rendered
  it('renders DirectChangesAnalysisView when directChangesInternalRenderMode is FULL_DATA_CHANGES', async () => {
    const store: EnhancedStore = renderWithProviders(
      '/scenarios/sc-1/analysis'
    );

    await act(async () => {
      store.dispatch(
        fetchAnalysisHeaderSuccess({
          name: 'Full Data Scenario',
          workflowState: 'IMPACT_AVAILABLE',
          scenarioType: {
            code: 'FRTB_SA',
            name: 'FRTB SA',
            icon: 'ShieldTask',
            directChangesMode: 'INTERNAL',
            impactDataMode: 'INTERNAL',
            directChangesInternalRenderMode: 'FULL_DATA_CHANGES',
          },
          summaryCards: null,
        })
      );
      store.dispatch(
        fetchDirectChangesSuccess({
          columns: ['Item'],
          rows: [
            { rowId: 'r-1', payload: { Item: 'FULL_DATA_VALUE' } },
          ],
        })
      );
      store.dispatch(fetchReportSummariesSuccess([]));
    });

    // Wait for tab resolution
    await waitFor(() => {
      expect(store.getState().analysis.activeTab).toBe('direct-changes');
    });

    // DirectChangesAnalysisView should render with the DataGridTable
    expect(screen.getByText('FULL_DATA_VALUE')).toBeInTheDocument();

    // Should NOT show delta view elements
    expect(screen.queryByText('No direct changes to display')).not.toBeInTheDocument();
  });
});
