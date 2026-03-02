import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import scenariosReducer, { ScenariosState } from '../../store/scenariosSlice';
import adminReducer, { AdminState } from '../../store/adminSlice';
import { AppRoutes } from '../AppRoutes';

const defaultState: ScenariosState = {
  items: [],
  listLoading: false,
  listError: null,
  selectedDetail: null,
  detailLoading: false,
  detailError: null,
  sortOption: 'updatedAt-desc',
  workflowStateFilter: [],
};

const defaultAdminState: AdminState = {
  policies: [],
  loading: false,
  error: null,
  saving: false,
};

const createTestStore = (overrides?: Partial<ScenariosState>) => {
  return configureStore({
    reducer: {
      scenarios: scenariosReducer,
      admin: adminReducer,
    },
    preloadedState: {
      scenarios: { ...defaultState, ...overrides },
      admin: defaultAdminState,
    },
  });
};

const renderWithProviders = (initialEntries: string[], overrides?: Partial<ScenariosState>) => {
  const testStore = createTestStore(overrides);
  return render(
    <Provider store={testStore}>
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter initialEntries={initialEntries}>
          <AppRoutes />
        </MemoryRouter>
      </FluentProvider>
    </Provider>
  );
};

describe('AppRoutes', () => {
  it('navigating to /scenarios renders ScenarioManagementPage', () => {
    renderWithProviders(['/scenarios']);
    expect(screen.getByTestId('scenario-management-page')).toBeInTheDocument();
  });

  it('navigating to /scenarios/some-id renders ScenarioManagementPage', () => {
    renderWithProviders(['/scenarios/some-id']);
    expect(screen.getByTestId('scenario-management-page')).toBeInTheDocument();
  });

  it('navigating to an unknown path redirects to /scenarios', () => {
    renderWithProviders(['/unknown-path']);
    expect(screen.getByTestId('scenario-management-page')).toBeInTheDocument();
  });

  // ========================================================================
  // Increment 12, Task Group 6: Gap Test -- Admin route
  // ========================================================================

  it('navigating to /admin/signoff-policies renders SignoffPoliciesAdminPage', () => {
    renderWithProviders(['/admin/signoff-policies']);
    expect(screen.getByTestId('signoff-policies-admin-page')).toBeInTheDocument();
  });
});
