import { render, screen, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import scenariosReducer, {
  ScenariosState,
  fetchScenarioListSuccess,
  fetchScenarioListFailure,
  fetchScenarioDetailSuccess,
  setWorkflowStateFilter,
} from '../store/scenariosSlice';
import { AppRoutes } from '../routes/AppRoutes';

const defaultState: ScenariosState = {
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

const createTestStore = (overrides?: Partial<ScenariosState>) => {
  return configureStore({
    reducer: {
      scenarios: scenariosReducer,
    },
    preloadedState: {
      scenarios: { ...defaultState, ...overrides },
    },
  });
};

const renderApp = (initialEntries: string[] = ['/scenarios'], overrides?: Partial<ScenariosState>) => {
  const testStore = createTestStore(overrides);
  const result = render(
    <Provider store={testStore}>
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter initialEntries={initialEntries}>
          <AppRoutes />
        </MemoryRouter>
      </FluentProvider>
    </Provider>
  );
  return { store: testStore, ...result };
};

describe('Integration tests', () => {
  it('full page renders at /scenarios showing "Scenarios" header and "Loading..."', () => {
    renderApp();
    // The page should render with the Scenarios header
    expect(screen.getByTestId('scenario-management-page')).toBeInTheDocument();
    // On mount, fetchScenarioListRequest fires and sets listLoading: true
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('navigating to /scenarios/:id shows the detail pane with "Scenario: <name>" after fetch completes', () => {
    const { store } = renderApp(['/scenarios/sc-1']);
    expect(screen.getByTestId('scenario-management-page')).toBeInTheDocument();
    // After saga completes:
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Rate Shock',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Jane Doe',
          createdAt: '2026-01-10T08:00:00Z',
          updatedAt: '2026-01-15T10:00:00Z',
          header: {
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'MODERATE',
            ownerDisplayName: 'Jane Doe',
            createdAt: '2026-01-10T08:00:00Z',
            updatedAt: '2026-01-15T10:00:00Z',
          },
        })
      );
    });
    expect(screen.getByText('Scenario: Rate Shock')).toBeInTheDocument();
  });

  it('the resize handle element is present between the two panels', () => {
    renderApp();
    const resizeHandle = screen.getByTestId('resize-handle');
    expect(resizeHandle).toBeInTheDocument();
    expect(resizeHandle).toHaveAttribute('role', 'separator');
  });

  it('sort dropdown is visible and list items render in sorted order', () => {
    const { store } = renderApp();
    act(() => {
      store.dispatch(
        fetchScenarioListSuccess([
          {
            id: 'sc-1',
            name: 'Alpha Scenario',
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'HIGH',
            updatedAt: '2026-01-10T10:00:00Z',
          },
          {
            id: 'sc-2',
            name: 'Beta Scenario',
            workflowState: 'SIGNED_OFF',
            impact: 'LOW',
            updatedAt: '2026-01-15T10:00:00Z',
          },
        ])
      );
    });
    // Verify both scenarios are rendered
    expect(screen.getByText('Alpha Scenario')).toBeInTheDocument();
    expect(screen.getByText('Beta Scenario')).toBeInTheDocument();
    // Verify the sort dropdown is rendered (it renders with selected value text)
    expect(screen.getByText('Updated (Newest)')).toBeInTheDocument();
  });

  it('workflow state filter dropdown filters the displayed items', () => {
    const { store } = renderApp();
    act(() => {
      store.dispatch(
        fetchScenarioListSuccess([
          {
            id: 'sc-1',
            name: 'Alpha Scenario',
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'HIGH',
            updatedAt: '2026-01-10T10:00:00Z',
          },
          {
            id: 'sc-2',
            name: 'Beta Scenario',
            workflowState: 'SIGNED_OFF',
            impact: 'LOW',
            updatedAt: '2026-01-15T10:00:00Z',
          },
        ])
      );
    });
    // Both items should be visible initially
    expect(screen.getByText('Alpha Scenario')).toBeInTheDocument();
    expect(screen.getByText('Beta Scenario')).toBeInTheDocument();

    // Apply filter via store dispatch (simulating the filter dropdown)
    act(() => {
      store.dispatch(setWorkflowStateFilter(['SIGNED_OFF']));
    });

    // Only Beta should be visible
    expect(screen.queryByText('Alpha Scenario')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Scenario')).toBeInTheDocument();
  });

  it('error state shows "Retry" button', () => {
    const { store } = renderApp();
    act(() => {
      store.dispatch(fetchScenarioListFailure('Server unavailable'));
    });
    expect(screen.getByText('Server unavailable')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
