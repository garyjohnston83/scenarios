import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import scenariosReducer, {
  ScenariosState,
  fetchScenarioDetailSuccess,
} from '../../../store/scenariosSlice';
import { ScenarioDetailPane } from '../ScenarioDetailPane';

// Mock useNavigate so we can verify navigation calls
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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
  combinePosting: false,
  combinePostError: null,
  lhsCollapsed: false,
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

const renderWithProviders = (
  initialEntry: string,
  overrides?: Partial<ScenariosState>
) => {
  const testStore = createTestStore(overrides);
  render(
    <Provider store={testStore}>
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/scenarios" element={<ScenarioDetailPane />}>
              <Route index element={null} />
              <Route path=":id" element={null} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FluentProvider>
    </Provider>
  );
  return testStore;
};

describe('ScenarioDetailPane CTA Navigation', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('clicking the INTERNAL Changes Summary CTA navigates to /scenarios/:id/analysis?initial-tab=direct-changes', async () => {
    const user = userEvent.setup();
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');

    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Internal Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Alice',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'MODERATE',
            ownerDisplayName: 'Alice',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
            scenarioType: {
              code: 'INTEREST_RATE',
              name: 'Interest Rate',
              icon: 'ChartMultiple',
              directChangesMode: 'INTERNAL',
              impactDataMode: 'INTERNAL',
            },
          },
          summaryCards: {
            changesSummary: {
              changesTotal: 10,
              changesDirect: 7,
              changesIndirect: 3,
              cta: {
                label: 'View Changes',
                url: '',
              },
            },
            impactSummary: {
              impact: 'MODERATE',
              lastRunAt: '2026-01-12T09:00:00',
              latestRunStatus: 'SUCCEEDED',
              exceptionsCount: 0,
              cta: {
                label: 'View Impacts',
                url: '',
              },
            },
          },
        })
      );
    });

    const changesCta = screen.getByText('View Changes');
    await user.click(changesCta);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/scenarios/sc-1/analysis?initial-tab=direct-changes'
    );
  });

  it('clicking the INTERNAL Impact Summary CTA navigates to /scenarios/:id/analysis?initial-tab=impact-reports', async () => {
    const user = userEvent.setup();
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');

    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Internal Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Alice',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'MODERATE',
            ownerDisplayName: 'Alice',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
            scenarioType: {
              code: 'INTEREST_RATE',
              name: 'Interest Rate',
              icon: 'ChartMultiple',
              directChangesMode: 'INTERNAL',
              impactDataMode: 'INTERNAL',
            },
          },
          summaryCards: {
            changesSummary: {
              changesTotal: 10,
              changesDirect: 7,
              changesIndirect: 3,
              cta: {
                label: 'View Changes',
                url: '',
              },
            },
            impactSummary: {
              impact: 'MODERATE',
              lastRunAt: '2026-01-12T09:00:00',
              latestRunStatus: 'SUCCEEDED',
              exceptionsCount: 0,
              cta: {
                label: 'View Impacts',
                url: '',
              },
            },
          },
        })
      );
    });

    const impactCta = screen.getByText('View Impacts');
    await user.click(impactCta);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/scenarios/sc-1/analysis?initial-tab=impact-reports'
    );
  });

  it('EXTERNAL CTAs render as <Link> with target="_blank" and correct href', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-ext-1');

    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-ext-1',
          name: 'External Scenario',
          scenarioTypeCode: 'MARKET_DATA',
          ownerDisplayName: 'Bob',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'MODERATE',
            ownerDisplayName: 'Bob',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
            scenarioType: {
              code: 'MARKET_DATA',
              name: 'Market Data',
              icon: 'ChartMultiple',
              directChangesMode: 'EXTERNAL',
              impactDataMode: 'EXTERNAL',
            },
          },
          summaryCards: {
            changesSummary: {
              changesTotal: 5,
              changesDirect: 3,
              changesIndirect: 2,
              cta: {
                label: 'Open in Market Data UI',
                url: 'https://marketdata.example.com/changes',
              },
            },
            impactSummary: {
              impact: 'MODERATE',
              lastRunAt: '2026-01-12T09:00:00',
              latestRunStatus: 'SUCCEEDED',
              exceptionsCount: 0,
              cta: {
                label: 'View external impacts',
                url: 'https://marketdata.example.com/impacts',
              },
            },
          },
        })
      );
    });

    // Changes CTA: should be an anchor with target="_blank"
    const changesLink = screen.getByText('Open in Market Data UI').closest('a');
    expect(changesLink).toHaveAttribute(
      'href',
      'https://marketdata.example.com/changes'
    );
    expect(changesLink).toHaveAttribute('target', '_blank');

    // Impact CTA: should be an anchor with target="_blank"
    const impactLink = screen
      .getByText('View external impacts')
      .closest('a');
    expect(impactLink).toHaveAttribute(
      'href',
      'https://marketdata.example.com/impacts'
    );
    expect(impactLink).toHaveAttribute('target', '_blank');
  });

  it('does not dispatch a toast for INTERNAL CTAs', async () => {
    const user = userEvent.setup();
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');

    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Internal Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Alice',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'MODERATE',
            ownerDisplayName: 'Alice',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
            scenarioType: {
              code: 'INTEREST_RATE',
              name: 'Interest Rate',
              icon: 'ChartMultiple',
              directChangesMode: 'INTERNAL',
              impactDataMode: 'INTERNAL',
            },
          },
          summaryCards: {
            changesSummary: {
              changesTotal: 10,
              changesDirect: 7,
              changesIndirect: 3,
              cta: {
                label: 'View Changes',
                url: '',
              },
            },
            impactSummary: {
              impact: 'MODERATE',
              lastRunAt: '2026-01-12T09:00:00',
              latestRunStatus: 'SUCCEEDED',
              exceptionsCount: 0,
              cta: {
                label: 'View Impacts',
                url: '',
              },
            },
          },
        })
      );
    });

    // Click the INTERNAL changes CTA
    const changesCta = screen.getByText('View Changes');
    await user.click(changesCta);

    // No toast should appear (no "coming soon" or any toast text)
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/analysis.*coming soon/i)).not.toBeInTheDocument();

    // The CTA should navigate instead of dispatching a toast
    expect(mockNavigate).toHaveBeenCalledWith(
      '/scenarios/sc-1/analysis?initial-tab=direct-changes'
    );
  });
});
