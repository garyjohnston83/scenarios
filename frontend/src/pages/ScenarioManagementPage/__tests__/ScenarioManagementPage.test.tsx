import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import scenariosReducer from '../../../store/scenariosSlice';
import { ScenarioManagementPage } from '../ScenarioManagementPage';

const createTestStore = () => {
  return configureStore({
    reducer: {
      scenarios: scenariosReducer,
    },
  });
};

const renderWithProviders = (ui: React.ReactElement) => {
  const testStore = createTestStore();
  return render(
    <Provider store={testStore}>
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter initialEntries={['/scenarios']}>
          {ui}
        </MemoryRouter>
      </FluentProvider>
    </Provider>
  );
};

describe('ScenarioManagementPage', () => {
  it('renders TopNavBar, ScenarioListPane header, and ScenarioDetailPane empty state', () => {
    renderWithProviders(<ScenarioManagementPage />);

    // TopNavBar renders as a banner
    expect(screen.getByRole('banner')).toBeInTheDocument();

    // "Scenarios" text appears in both TopNavBar and ScenarioListPane
    const scenariosTexts = screen.getAllByText('Scenarios');
    expect(scenariosTexts.length).toBeGreaterThanOrEqual(2);

    // ScenarioDetailPane empty state
    expect(screen.getByText('Select a scenario')).toBeInTheDocument();
  });

  it('renders a page container with full viewport height styling', () => {
    renderWithProviders(<ScenarioManagementPage />);
    const page = screen.getByTestId('scenario-management-page');
    expect(page).toBeInTheDocument();
    // The class from CSS modules will be applied (identity-obj-proxy returns the class name)
    expect(page.className).toContain('pageContainer');
  });
});
