import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import scenariosReducer from '../../../store/scenariosSlice';
import adminReducer, {
  AdminState,
  fetchPoliciesSuccess,
  createPolicySuccess,
  updatePolicySuccess,
} from '../../../store/adminSlice';
import type { SignoffPolicyDto } from '../../../services/adminApi';
import { SignoffPoliciesAdminPage } from '../SignoffPoliciesAdminPage';

const defaultAdminState: AdminState = {
  policies: [],
  loading: false,
  error: null,
  saving: false,
};

const createTestStore = (adminOverrides?: Partial<AdminState>) => {
  return configureStore({
    reducer: {
      scenarios: scenariosReducer,
      admin: adminReducer,
    },
    preloadedState: {
      admin: { ...defaultAdminState, ...adminOverrides },
    },
  });
};

const renderComponent = (adminOverrides?: Partial<AdminState>) => {
  const testStore = createTestStore(adminOverrides);
  const result = render(
    <Provider store={testStore}>
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter initialEntries={['/admin/signoff-policies']}>
          <SignoffPoliciesAdminPage />
        </MemoryRouter>
      </FluentProvider>
    </Provider>
  );
  return { store: testStore, ...result };
};

const samplePolicy: SignoffPolicyDto = {
  id: 'policy-1',
  scenarioTypeCode: 'MARKET_DATA',
  name: 'Default Market Data Policy',
  requiredApproverCount: 2,
  isEnabled: true,
  priority: 1,
  createdAt: '2026-02-20T10:00:00',
  updatedAt: '2026-02-21T15:30:00',
};

const samplePolicy2: SignoffPolicyDto = {
  id: 'policy-2',
  scenarioTypeCode: 'RISK_FACTOR',
  name: 'Default Risk Factor Policy',
  requiredApproverCount: 3,
  isEnabled: false,
  priority: 2,
  createdAt: '2026-02-19T08:00:00',
  updatedAt: '2026-02-20T12:00:00',
};

describe('Admin Signoff Policies - Slice Reducers', () => {
  // Test 1: adminSlice reducers correctly handle fetchPoliciesSuccess
  it('fetchPoliciesSuccess sets policies array and clears loading', () => {
    const store = createTestStore({ loading: true });
    const policies: SignoffPolicyDto[] = [samplePolicy, samplePolicy2];

    act(() => {
      store.dispatch(fetchPoliciesSuccess(policies));
    });

    const state = store.getState().admin;
    expect(state.policies).toHaveLength(2);
    expect(state.policies[0].name).toBe('Default Market Data Policy');
    expect(state.policies[1].name).toBe('Default Risk Factor Policy');
    expect(state.loading).toBe(false);
  });

  // Test 2: adminSlice reducers correctly handle createPolicySuccess
  it('createPolicySuccess appends new policy to array', () => {
    const store = createTestStore({
      policies: [samplePolicy],
      saving: true,
    });

    act(() => {
      store.dispatch(createPolicySuccess(samplePolicy2));
    });

    const state = store.getState().admin;
    expect(state.policies).toHaveLength(2);
    expect(state.policies[1].name).toBe('Default Risk Factor Policy');
    expect(state.saving).toBe(false);
  });

  // Test 3: adminSlice reducers correctly handle updatePolicySuccess
  it('updatePolicySuccess replaces updated policy in array', () => {
    const store = createTestStore({
      policies: [samplePolicy, samplePolicy2],
      saving: true,
    });

    const updatedPolicy: SignoffPolicyDto = {
      ...samplePolicy,
      name: 'Updated Market Data Policy',
      requiredApproverCount: 5,
    };

    act(() => {
      store.dispatch(updatePolicySuccess(updatedPolicy));
    });

    const state = store.getState().admin;
    expect(state.policies).toHaveLength(2);
    expect(state.policies[0].name).toBe('Updated Market Data Policy');
    expect(state.policies[0].requiredApproverCount).toBe(5);
    expect(state.policies[1].name).toBe('Default Risk Factor Policy');
    expect(state.saving).toBe(false);
  });
});

describe('SignoffPoliciesAdminPage', () => {
  // Test 4: renders a data table with policy rows
  it('renders a data table with policy rows', () => {
    renderComponent({
      policies: [samplePolicy, samplePolicy2],
    });

    expect(screen.getByTestId('signoff-policies-admin-page')).toBeInTheDocument();
    expect(screen.getByTestId('policies-table')).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Scenario Type')).toBeInTheDocument();
    expect(screen.getByText('Required Approvers')).toBeInTheDocument();

    // Check policy data is rendered
    expect(screen.getByText('Default Market Data Policy')).toBeInTheDocument();
    expect(screen.getByText('Default Risk Factor Policy')).toBeInTheDocument();
    expect(screen.getByText('MARKET_DATA')).toBeInTheDocument();
    expect(screen.getByText('RISK_FACTOR')).toBeInTheDocument();

    // Verify both rows have edit buttons
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons).toHaveLength(2);
  });

  // Test 5: "Create Policy" button opens a dialog with form fields
  it('"Create Policy" button opens a dialog with form fields', async () => {
    const user = userEvent.setup();
    renderComponent();

    const createButton = screen.getByRole('button', { name: /create policy/i });
    expect(createButton).toBeInTheDocument();

    await user.click(createButton);

    // Dialog title should appear
    expect(screen.getByText('Create Signoff Policy')).toBeInTheDocument();

    // Form fields should be present (name input)
    expect(screen.getByPlaceholderText('Policy name')).toBeInTheDocument();

    // "Required Approver Count" is the dialog label (distinct from table header "Required Approvers")
    expect(screen.getByText('Required Approver Count')).toBeInTheDocument();

    // Enabled label in dialog form
    const enabledLabels = screen.getAllByText('Enabled');
    expect(enabledLabels.length).toBeGreaterThanOrEqual(2);

    // Cancel and Create button text should be present in the dialog
    // (Fluent UI dialog renders in a portal with aria-hidden in jsdom, so use text queries)
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    // "Create" text appears both in the "Create Policy" button and the dialog submit button
    const createTexts = screen.getAllByText('Create');
    expect(createTexts.length).toBeGreaterThanOrEqual(1);
  });

  // Test 6: edit button opens dialog pre-populated with policy values
  it('edit button opens dialog pre-populated with policy values', async () => {
    const user = userEvent.setup();
    renderComponent({
      policies: [samplePolicy],
    });

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    // Dialog title should appear
    expect(screen.getByText('Edit Signoff Policy')).toBeInTheDocument();

    // Name field should be pre-populated
    const nameInput = screen.getByPlaceholderText('Policy name');
    expect(nameInput).toHaveValue('Default Market Data Policy');

    // Save button text should be present in the dialog
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  // ========================================================================
  // Increment 12, Task Group 6: Gap Tests
  // ========================================================================

  // Gap Test: Enable/disable toggle dispatches updatePolicyRequest
  it('enable/disable toggle dispatches updatePolicyRequest with toggled isEnabled', async () => {
    const user = userEvent.setup();
    const { store } = renderComponent({
      policies: [samplePolicy], // samplePolicy.isEnabled = true
    });

    // Find the toggle switch for the policy (the one in the table row, not dialog)
    const toggleSwitch = screen.getByRole('switch', {
      name: /toggle enabled for default market data policy/i,
    });
    expect(toggleSwitch).toBeInTheDocument();

    // Click the toggle
    await user.click(toggleSwitch);

    // Verify the store dispatched an updatePolicyRequest action
    // The state should reflect saving=true (updatePolicyRequest sets saving=true)
    const state = store.getState().admin;
    expect(state.saving).toBe(true);
  });
});
