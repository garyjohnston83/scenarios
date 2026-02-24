import { render, screen, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import scenariosReducer, {
  ScenariosState,
  fetchScenarioDetailSuccess,
  fetchScenarioDetailFailure,
} from '../../../store/scenariosSlice';
import { ScenarioDetailPane } from '../ScenarioDetailPane';

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

describe('ScenarioDetailPane', () => {
  it('renders sticky header with all metadata fields when header data is present', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Rate Shock Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'John Doe',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'SIGNOFF_IN_PROGRESS',
            impact: 'MODERATE',
            ownerDisplayName: 'John Doe',
            createdAt: '2026-02-18T08:00:00',
            updatedAt: '2026-02-20T14:30:00',
          },
        })
      );
    });
    expect(screen.getByText('Scenario: Rate Shock Scenario')).toBeInTheDocument();
    expect(screen.getByText('Sign-off In Progress')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('18 Feb 2026')).toBeInTheDocument();
    expect(screen.getByText('20 Feb 2026')).toBeInTheDocument();
  });

  it('renders three action buttons as enabled Fluent UI Buttons', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Test Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Jane Doe',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'NONE',
            ownerDisplayName: 'Jane Doe',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
          },
        })
      );
    });
    const signOffButton = screen.getByText('Sign-off');
    const recallButton = screen.getByText('Recall');
    const rejectButton = screen.getByText('Reject');

    expect(signOffButton).toBeInTheDocument();
    expect(recallButton).toBeInTheDocument();
    expect(rejectButton).toBeInTheDocument();

    // Verify buttons are not disabled
    expect(signOffButton.closest('button')).not.toBeDisabled();
    expect(recallButton.closest('button')).not.toBeDisabled();
    expect(rejectButton.closest('button')).not.toBeDisabled();
  });

  it('renders "Select a scenario" empty state when no scenario is selected', () => {
    renderWithProviders('/scenarios');
    expect(screen.getByText('Select a scenario')).toBeInTheDocument();
  });

  it('renders scenario name without crashing when header is undefined (base-only response)', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Base Only Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'John Doe',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
        })
      );
    });
    expect(screen.getByText('Scenario: Base Only Scenario')).toBeInTheDocument();
    // Action buttons should not be present when header is missing
    expect(screen.queryByText('Sign-off')).not.toBeInTheDocument();
    expect(screen.queryByText('Recall')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  it('renders "Loading..." when detailLoading is true', () => {
    renderWithProviders('/scenarios/sc-1');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders "Scenario not found" when detailError is set', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/invalid-id');
    act(() => {
      store.dispatch(fetchScenarioDetailFailure('Not found'));
    });
    expect(screen.getByText('Scenario not found')).toBeInTheDocument();
    expect(screen.getByText('Back to scenarios')).toBeInTheDocument();
  });

  it('renders SummaryCardsSection when summaryCards data is present with CTA links', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Scenario With Cards',
          scenarioTypeCode: 'FX',
          ownerDisplayName: 'Alice Smith',
          createdAt: '2026-02-10T08:00:00',
          updatedAt: '2026-02-15T10:00:00',
          header: {
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'MODERATE',
            ownerDisplayName: 'Alice Smith',
            createdAt: '2026-02-10T08:00:00',
            updatedAt: '2026-02-15T10:00:00',
          },
          summaryCards: {
            changesSummary: {
              changesTotal: 15,
              changesDirect: 10,
              changesIndirect: 5,
              cta: {
                label: 'Open in Market Data UI \u2192',
                url: 'https://marketdata.example.com/changes',
              },
            },
            impactSummary: {
              impact: 'MODERATE',
              lastRunAt: '2026-02-20T14:00:00',
              latestRunStatus: 'SUCCEEDED',
              exceptionsCount: 2,
              cta: {
                label: 'View all impact reports \u2192',
                url: 'https://marketdata.example.com/impacts',
              },
            },
          },
        })
      );
    });

    // Verify summary cards section renders with field values
    expect(screen.getByText('Changes Summary')).toBeInTheDocument();
    expect(screen.getByText('Impact Summary')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Verify CTA links render with dynamic labels from API
    expect(screen.getByText('Open in Market Data UI \u2192')).toBeInTheDocument();
    expect(screen.getByText('View all impact reports \u2192')).toBeInTheDocument();

    // Verify CTAs are semantic anchor elements
    const changesLink = screen.getByText('Open in Market Data UI \u2192').closest('a');
    const impactLink = screen.getByText('View all impact reports \u2192').closest('a');
    expect(changesLink).toHaveAttribute('href', 'https://marketdata.example.com/changes');
    expect(impactLink).toHaveAttribute('href', 'https://marketdata.example.com/impacts');
  });

  it('does NOT render summary cards when summaryCards is absent from selectedDetail', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'No Cards Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Bob Jones',
          createdAt: '2026-02-10T08:00:00',
          updatedAt: '2026-02-15T10:00:00',
          header: {
            workflowState: 'DRAFT',
            impact: 'MINIMAL',
            ownerDisplayName: 'Bob Jones',
            createdAt: '2026-02-10T08:00:00',
            updatedAt: '2026-02-15T10:00:00',
          },
        })
      );
    });

    // Verify scenario name and header render
    expect(screen.getByText('Scenario: No Cards Scenario')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();

    // Verify summary cards content is NOT present
    expect(screen.queryByText('Changes Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Impact Summary')).not.toBeInTheDocument();

    // Verify no CTA links are present
    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(0);
  });

  // ========================================================================
  // Gap tests for ReviewApprovalSection integration
  // ========================================================================

  it('renders ReviewApprovalSection when reviewApproval data is present in selectedDetail', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Scenario With Review',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Alice Smith',
          createdAt: '2026-02-10T08:00:00',
          updatedAt: '2026-02-15T10:00:00',
          header: {
            workflowState: 'SIGNOFF_IN_PROGRESS',
            impact: 'MODERATE',
            ownerDisplayName: 'Alice Smith',
            createdAt: '2026-02-10T08:00:00',
            updatedAt: '2026-02-15T10:00:00',
          },
          reviewApproval: {
            workflow: {
              workflowState: 'SIGNOFF_IN_PROGRESS',
              workflowStateLabel: 'Sign-off In Progress',
              progress: { current: 3, total: 5 },
            },
            messages: [
              {
                id: 'msg-1',
                authorDisplayName: 'Alice Smith',
                createdAt: '2026-02-18T09:00:00',
                text: 'Please review the curve data.',
              },
            ],
            events: [
              {
                id: 'evt-1',
                createdAt: '2026-02-15T08:00:00',
                actorDisplayName: 'System',
                eventType: 'SCENARIO_CREATED',
                eventLabel: 'Scenario created',
              },
            ],
          },
        })
      );
    });

    // Verify ReviewApprovalSection renders with workflow status
    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();

    // Verify Messages heading and message content
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Please review the curve data.')).toBeInTheDocument();

    // Verify Events heading and event content
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Scenario created')).toBeInTheDocument();

    // Verify Export History button
    expect(screen.getByRole('button', { name: /export history/i })).toBeInTheDocument();
  });

  it('does NOT render ReviewApprovalSection when reviewApproval is absent from selectedDetail', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'No Review Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Bob Jones',
          createdAt: '2026-02-10T08:00:00',
          updatedAt: '2026-02-15T10:00:00',
          header: {
            workflowState: 'DRAFT',
            impact: 'NONE',
            ownerDisplayName: 'Bob Jones',
            createdAt: '2026-02-10T08:00:00',
            updatedAt: '2026-02-15T10:00:00',
          },
        })
      );
    });

    // Verify scenario name renders
    expect(screen.getByText('Scenario: No Review Scenario')).toBeInTheDocument();

    // Verify ReviewApprovalSection headings are NOT present
    expect(screen.queryByText('Workflow Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Messages')).not.toBeInTheDocument();
    expect(screen.queryByText('Events')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export history/i })).not.toBeInTheDocument();
  });

  // ========================================================================
  // Increment 11 Gap Test: LINK_OUT scenario does not render grid sections
  // ========================================================================

  it('does NOT render DirectChangesSection or ImpactDataSection when data fields are absent (LINK_OUT scenario integration)', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-md-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-md-1',
          name: 'FX Curve Recalibration',
          scenarioTypeCode: 'MARKET_DATA',
          ownerDisplayName: 'Bob Smith',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'MODERATE',
            ownerDisplayName: 'Bob Smith',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
            scenarioType: {
              code: 'MARKET_DATA',
              name: 'Market Data',
              icon: 'ChartMultiple',
              directChangesMode: 'LINK_OUT',
              impactDataMode: 'LINK_OUT',
            },
          },
          summaryCards: {
            changesSummary: {
              changesTotal: 3,
              changesDirect: 2,
              changesIndirect: 1,
              cta: {
                label: 'Open in Market Data UI',
                url: 'https://marketdata.example.com/changes',
              },
            },
            impactSummary: {
              impact: 'MODERATE',
              lastRunAt: '2026-01-12T09:00:00',
              latestRunStatus: 'COMPLETED',
              exceptionsCount: 0,
            },
          },
          // No directChanges or impactData fields -- LINK_OUT scenarios never have them
        })
      );
    });

    // Verify scenario name renders
    expect(screen.getByText('Scenario: FX Curve Recalibration')).toBeInTheDocument();

    // Verify summary cards section still renders (LINK_OUT has summaryCards)
    expect(screen.getByText('Changes Summary')).toBeInTheDocument();

    // Verify Direct Changes section heading is NOT rendered
    expect(screen.queryByText('Direct Changes')).not.toBeInTheDocument();

    // Verify Impact Data section heading is NOT rendered
    expect(screen.queryByText('Impact Data')).not.toBeInTheDocument();

    // Verify no DataGridTable is rendered (no table elements from grid sections)
    // The summary cards may have tables, so we specifically check for grid-related text
    expect(screen.queryByText('No direct changes data available')).not.toBeInTheDocument();
    expect(screen.queryByText('No impact data available')).not.toBeInTheDocument();
  });
});
