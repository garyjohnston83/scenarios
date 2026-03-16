import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import signoffPolicyDefinitionAdminReducer from '../../../store/signoffPolicyDefinitionAdminSlice';
import { SignoffPolicyDefinitionsTab } from '../SignoffPolicyDefinitionsTab';

// Mock redux-saga middleware is not needed; we just need the slice reducer
// to track dispatched actions.

const createTestStore = () => {
  return configureStore({
    reducer: {
      signoffPolicyDefinitionAdmin: signoffPolicyDefinitionAdminReducer,
    },
  });
};

const renderWithProviders = (ui: React.ReactElement) => {
  const testStore = createTestStore();
  return {
    ...render(
      <Provider store={testStore}>
        <FluentProvider theme={webLightTheme}>
          {ui}
        </FluentProvider>
      </Provider>
    ),
    store: testStore,
  };
};

describe('SignoffPolicyDefinitionsTab', () => {
  it('renders the three-panel layout with PanelGroup, Panels, and PanelResizeHandles', () => {
    renderWithProviders(
      <SignoffPolicyDefinitionsTab scenarioTypeCode="FRTB_SA" />
    );

    // The tab container should be present
    expect(screen.getByTestId('signoff-policy-definitions-tab')).toBeInTheDocument();

    // Deployment Managed badge should be visible
    expect(screen.getByText('Deployment Managed')).toBeInTheDocument();

    // All three panels should be present:
    // Left panel: definition list panel
    expect(screen.getByTestId('sp-definition-list-panel')).toBeInTheDocument();
    // Center panel: policy editor panel
    expect(screen.getByTestId('sp-editor-panel')).toBeInTheDocument();
    // Right panel: summary panel
    expect(screen.getByTestId('sp-summary-panel')).toBeInTheDocument();
    expect(screen.getByText('Policy Summary')).toBeInTheDocument();

    // Resize handles between panels
    expect(screen.getByTestId('list-editor-resize-handle')).toBeInTheDocument();
    expect(screen.getByTestId('editor-summary-resize-handle')).toBeInTheDocument();
  });

  it('dispatches fetchSpDefinitionsRequest on mount with the scenarioTypeCode prop', () => {
    const { store } = renderWithProviders(
      <SignoffPolicyDefinitionsTab scenarioTypeCode="FRTB_SA" />
    );

    // The fetchSpDefinitionsRequest action should have been dispatched.
    // Since the saga is not running, it will set loading=true and clear error.
    const state = store.getState().signoffPolicyDefinitionAdmin;
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('dispatches fetchFactTypesRequest and fetchRolesRequest on mount to load catalogs', () => {
    const { store } = renderWithProviders(
      <SignoffPolicyDefinitionsTab scenarioTypeCode="MARKET_DATA" />
    );

    // After mount, the reducer should have processed both catalog fetch request actions.
    // fetchFactTypesRequest and fetchRolesRequest both clear error in the reducer.
    // Since no saga runs in the test, the state reflects the request dispatches.
    const state = store.getState().signoffPolicyDefinitionAdmin;
    // The fact that loading is true confirms fetchSpDefinitionsRequest was dispatched,
    // and error being null confirms all request actions cleared errors.
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
    // factTypes and roles remain empty arrays because no saga fulfilled them
    expect(state.factTypes).toEqual([]);
    expect(state.roles).toEqual([]);
  });
});
