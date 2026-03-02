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

describe('ScenarioDetailPane action buttons', () => {
  it('clicking action buttons does not throw an error (no-op onClick)', async () => {
    const user = userEvent.setup();
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
            impact: 'MINIMAL',
            ownerDisplayName: 'Jane Doe',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
          },
        })
      );
    });

    // Clicking each button should not throw
    const signOffBtn = screen.getByText('Sign-off').closest('button')!;
    const recallBtn = screen.getByText('Recall').closest('button')!;
    const rejectBtn = screen.getByText('Reject').closest('button')!;

    await user.click(signOffBtn);
    await user.click(recallBtn);
    await user.click(rejectBtn);

    // Buttons should still be present after clicking (no state change)
    expect(screen.getByText('Sign-off')).toBeInTheDocument();
    expect(screen.getByText('Recall')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('renders correctly when navigating between scenarios (Redux state transitions)', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');

    // First scenario
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'First Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Alice',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'SIGNOFF_IN_PROGRESS',
            impact: 'SIGNIFICANT',
            ownerDisplayName: 'Alice',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
          },
        })
      );
    });
    expect(screen.getByText('Scenario: First Scenario')).toBeInTheDocument();
    expect(screen.getByText('Sign-off In Progress')).toBeInTheDocument();
    expect(screen.getByText('Significant')).toBeInTheDocument();

    // Second scenario (state transition)
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-2',
          name: 'Second Scenario',
          scenarioTypeCode: 'CREDIT_SPREAD',
          ownerDisplayName: 'Bob',
          createdAt: '2026-02-01T08:00:00',
          updatedAt: '2026-02-10T14:00:00',
          header: {
            workflowState: 'PROMOTED',
            impact: 'NONE',
            ownerDisplayName: 'Bob',
            createdAt: '2026-02-01T08:00:00',
            updatedAt: '2026-02-10T14:00:00',
          },
        })
      );
    });
    expect(screen.getByText('Scenario: Second Scenario')).toBeInTheDocument();
    expect(screen.getByText('Promoted')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.queryByText('First Scenario')).not.toBeInTheDocument();
  });
});
