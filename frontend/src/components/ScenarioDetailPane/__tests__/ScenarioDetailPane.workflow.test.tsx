import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
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

/**
 * Helper to build a minimal ScenarioDetail fixture with a given workflowState.
 */
const buildDetailWithState = (workflowState: string) => ({
  id: 'sc-1',
  name: 'Test Scenario',
  scenarioTypeCode: 'INTEREST_RATE',
  ownerDisplayName: 'Jane Doe',
  createdAt: '2026-01-10T08:00:00',
  updatedAt: '2026-01-15T10:00:00',
  header: {
    workflowState,
    impact: 'MODERATE',
    ownerDisplayName: 'Jane Doe',
    createdAt: '2026-01-10T08:00:00',
    updatedAt: '2026-01-15T10:00:00',
  },
});

describe('ScenarioDetailPane workflow action buttons and dialogs', () => {
  it('Sign-off button is disabled when workflowState is DRAFT', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(fetchScenarioDetailSuccess(buildDetailWithState('DRAFT')));
    });

    const signoffButton = screen.getByRole('button', { name: /Sign-off/i });
    expect(signoffButton).toBeDisabled();
  });

  it('Sign-off button is enabled when workflowState is IMPACT_AVAILABLE', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('IMPACT_AVAILABLE'))
      );
    });

    const signoffButton = screen.getByRole('button', { name: /Sign-off/i });
    expect(signoffButton).not.toBeDisabled();
  });

  it('all action buttons are disabled when workflowState is SIGNED_OFF', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('SIGNED_OFF'))
      );
    });

    const signoffButton = screen.getByRole('button', { name: /Sign-off/i });
    const recallButton = screen.getByRole('button', { name: /Recall/i });
    const rejectButton = screen.getByRole('button', { name: /Reject/i });

    expect(signoffButton).toBeDisabled();
    expect(recallButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });

  it('Recall button opens dialog with textarea and confirm button', async () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('IMPACT_AVAILABLE'))
      );
    });

    const recallButton = screen.getByRole('button', { name: /Recall/i });
    fireEvent.click(recallButton);

    // Dialog renders in a portal -- use screen queries
    const dialogTitle = await screen.findByText('Recall Scenario');
    expect(dialogTitle).toBeInTheDocument();

    // Textarea should be present
    const textarea = screen.getByPlaceholderText('Enter reason for recall...');
    expect(textarea).toBeInTheDocument();

    // Confirm Recall button should be present
    const confirmButton = screen.getByRole('button', {
      name: /Confirm Recall/i,
    });
    expect(confirmButton).toBeInTheDocument();
  });

  it('Recall dialog confirm button is disabled when textarea is empty', async () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('IMPACT_AVAILABLE'))
      );
    });

    const recallButton = screen.getByRole('button', { name: /Recall/i });
    fireEvent.click(recallButton);

    const confirmButton = await screen.findByRole('button', {
      name: /Confirm Recall/i,
    });
    expect(confirmButton).toBeDisabled();
  });

  it('Reject dialog cancel closes the dialog', async () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('IMPACT_AVAILABLE'))
      );
    });

    // Open Reject dialog
    const rejectButton = screen.getByRole('button', { name: /^Reject$/i });
    fireEvent.click(rejectButton);

    // Wait for dialog to appear
    const dialogTitle = await screen.findByText('Reject Scenario');
    expect(dialogTitle).toBeInTheDocument();

    // Click Cancel
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    // Dialog should be closed
    await waitFor(() => {
      expect(screen.queryByText('Reject Scenario')).not.toBeInTheDocument();
    });
  });

  it('error banner displays eventPostError', () => {
    const errorMessage = 'SIGNOFF is not allowed from state: SIGNED_OFF';
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1', {
      eventPostError: errorMessage,
    });
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('SIGNED_OFF'))
      );
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('all action buttons are disabled when eventPosting is true', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1', {
      eventPosting: true,
    });
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('IMPACT_AVAILABLE'))
      );
    });

    const signoffButton = screen.getByRole('button', { name: /Sign-off/i });
    const recallButton = screen.getByRole('button', { name: /Recall/i });
    const rejectButton = screen.getByRole('button', { name: /Reject/i });

    expect(signoffButton).toBeDisabled();
    expect(recallButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });

  // ========================================================================
  // Gap tests (Task Group 10) -- strategic coverage for genuinely missing paths
  // ========================================================================

  it('error banner is NOT rendered when eventPostError is null', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1', {
      eventPostError: null,
    });
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('IMPACT_AVAILABLE'))
      );
    });

    // The error banner container should not be present
    // Verify no red error text is displayed near buttons
    const errorBanner = screen.queryByText(/is not allowed from state/i);
    expect(errorBanner).not.toBeInTheDocument();
  });

  it('DRAFT state: Recall and Reject buttons are enabled while Sign-off is disabled', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(fetchScenarioDetailSuccess(buildDetailWithState('DRAFT')));
    });

    const signoffButton = screen.getByRole('button', { name: /Sign-off/i });
    const recallButton = screen.getByRole('button', { name: /Recall/i });
    const rejectButton = screen.getByRole('button', { name: /^Reject$/i });

    expect(signoffButton).toBeDisabled();
    expect(recallButton).not.toBeDisabled();
    expect(rejectButton).not.toBeDisabled();
  });

  it('IMPACT_AVAILABLE state: all three action buttons are enabled', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('IMPACT_AVAILABLE'))
      );
    });

    const signoffButton = screen.getByRole('button', { name: /Sign-off/i });
    const recallButton = screen.getByRole('button', { name: /Recall/i });
    const rejectButton = screen.getByRole('button', { name: /^Reject$/i });

    expect(signoffButton).not.toBeDisabled();
    expect(recallButton).not.toBeDisabled();
    expect(rejectButton).not.toBeDisabled();
  });

  it('Reject button opens dialog with correct title and textarea', async () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('IMPACT_AVAILABLE'))
      );
    });

    const rejectButton = screen.getByRole('button', { name: /^Reject$/i });
    fireEvent.click(rejectButton);

    // Dialog renders in a portal -- use screen queries
    const dialogTitle = await screen.findByText('Reject Scenario');
    expect(dialogTitle).toBeInTheDocument();

    // Textarea should be present
    const textarea = screen.getByPlaceholderText(
      'Enter reason for rejection...'
    );
    expect(textarea).toBeInTheDocument();

    // Confirm Reject button should be present
    const confirmButton = screen.getByRole('button', {
      name: /Confirm Reject/i,
    });
    expect(confirmButton).toBeInTheDocument();
  });

  it('Reject dialog confirm button is disabled when textarea is empty', async () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('IMPACT_AVAILABLE'))
      );
    });

    const rejectButton = screen.getByRole('button', { name: /^Reject$/i });
    fireEvent.click(rejectButton);

    const confirmButton = await screen.findByRole('button', {
      name: /Confirm Reject/i,
    });
    expect(confirmButton).toBeDisabled();
  });

  it('all action buttons are disabled when workflowState is REJECTED', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess(buildDetailWithState('REJECTED'))
      );
    });

    const signoffButton = screen.getByRole('button', { name: /Sign-off/i });
    const recallButton = screen.getByRole('button', { name: /Recall/i });
    const rejectButton = screen.getByRole('button', { name: /^Reject$/i });

    expect(signoffButton).toBeDisabled();
    expect(recallButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });
});
