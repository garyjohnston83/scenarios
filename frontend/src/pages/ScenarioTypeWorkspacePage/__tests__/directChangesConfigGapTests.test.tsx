import { render, screen, fireEvent, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import scenarioTypeAdminReducer from '../../../store/scenarioTypeAdminSlice';
import changeViewDefinitionAdminReducer from '../../../store/changeViewDefinitionAdminSlice';
import { NavigationViewModeTabContent } from '../NavigationViewModeTabContent';
import { CreateChangeViewDefinitionDialog } from '../CreateChangeViewDefinitionDialog';
import { ChangeViewDefinitionsTab } from '../ChangeViewDefinitionsTab';
import type { ScenarioTypeAdminDetailDto } from '../../../services/scenarioTypeAdminApi';

// Polyfill ResizeObserver for jsdom (required by Fluent UI MessageBar and react-resizable-panels)
beforeAll(() => {
  if (typeof window.ResizeObserver === 'undefined') {
    (window as unknown as Record<string, unknown>).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

// Mock Monaco Editor -- render a textarea that captures value and onChange
jest.mock('@monaco-editor/react', () => {
  return {
    __esModule: true,
    default: ({
      value,
      onChange,
    }: {
      value: string;
      onChange: (value: string | undefined) => void;
    }) => (
      <textarea
        data-testid="mock-monaco-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  };
});

const createTestStore = () => {
  return configureStore({
    reducer: {
      scenarioTypeAdmin: scenarioTypeAdminReducer,
      changeViewDefinitionAdmin: changeViewDefinitionAdminReducer,
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

const buildDetail = (overrides: Partial<ScenarioTypeAdminDetailDto> = {}): ScenarioTypeAdminDetailDto => ({
  code: 'FRTB_SA',
  name: 'FRTB SA',
  icon: 'ChartMultiple',
  directChangesMode: 'INTERNAL',
  impactDataMode: 'INTERNAL',
  directChangesExternalUrlTemplate: null,
  impactExternalUrlTemplate: null,
  directChangesInternalRenderMode: 'FULL_DATA_CHANGES',
  isEnabled: true,
  sortOrder: 1,
  activeReportDefinitionCount: 0,
  activeSignoffPolicyCount: 0,
  activeChangeViewDefinitionCount: 0,
  activeSignoffPolicyDefinitionCount: 0,
  ...overrides,
});

/**
 * Increment 16 Task Group 6 -- Gap tests for UI components.
 *
 * These 3 tests fill coverage gaps identified during review of Task Group 5:
 * 1. NavigationViewModeTabContent re-initializes form state when detail prop changes
 * 2. CreateChangeViewDefinitionDialog generates correct FULL_DATA_CHANGES skeleton when mode is not DELTA
 * 3. ChangeViewDefinitionsTab hides the internal render mode badge when directChangesMode is EXTERNAL
 */
describe('Direct Changes Config Model Extension -- UI Gap Tests', () => {

  // Gap Test 1: NavigationViewModeTabContent re-initializes form state when detail prop changes
  it('NavigationViewModeTabContent re-initializes form state when detail prop changes', () => {
    const initialDetail = buildDetail({
      directChangesMode: 'INTERNAL',
      directChangesInternalRenderMode: 'FULL_DATA_CHANGES',
    });

    const { rerender, store } = renderWithProviders(
      <NavigationViewModeTabContent
        detail={initialDetail}
        saving={false}
      />
    );

    // Verify initial state: FULL_DATA_CHANGES is shown
    const selectEl = screen.getByTestId('direct-changes-internal-render-mode-field');
    expect(selectEl).toBeInTheDocument();

    // Now re-render with a changed detail (simulating a save success that changes the value)
    const updatedDetail = buildDetail({
      directChangesMode: 'INTERNAL',
      directChangesInternalRenderMode: 'DELTA_BY_UNIQUE_ID',
    });

    rerender(
      <Provider store={store}>
        <FluentProvider theme={webLightTheme}>
          <NavigationViewModeTabContent
            detail={updatedDetail}
            saving={false}
          />
        </FluentProvider>
      </Provider>
    );

    // After re-render with new detail, the select should reflect DELTA_BY_UNIQUE_ID.
    // The useEffect[detail] should re-initialize the form state.
    const renderModeField = screen.getByTestId('direct-changes-internal-render-mode-field');
    expect(renderModeField).toBeInTheDocument();
    // The select element inside should have the updated value
    const selectElement = renderModeField.querySelector('select') as HTMLSelectElement | null;
    // Fluent UI Select uses a <select> internally in tests
    if (selectElement) {
      expect(selectElement.value).toBe('DELTA_BY_UNIQUE_ID');
    }
  });

  // Gap Test 2: CreateChangeViewDefinitionDialog generates correct FULL_DATA_CHANGES skeleton when mode is not DELTA
  it('CreateChangeViewDefinitionDialog generates FULL_DATA_CHANGES skeleton when directChangesInternalRenderMode is FULL_DATA_CHANGES', () => {
    renderWithProviders(
      <CreateChangeViewDefinitionDialog
        open={true}
        onDismiss={() => {}}
        scenarioTypeCode="FRTB_SA"
        directChangesInternalRenderMode="FULL_DATA_CHANGES"
      />
    );

    // The definition JSON textarea should contain the FULL_DATA_CHANGES (sections-based) skeleton
    const textarea = screen.getByTestId('create-cv-definition-json-textarea') as HTMLTextAreaElement;
    const json = textarea.value;
    const parsed = JSON.parse(json);

    // FULL_DATA_CHANGES skeleton should have sections, NOT renderMode/dataTypes
    expect(parsed.sections).toBeDefined();
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].contentBlocks).toBeDefined();
    expect(parsed.sections[0].contentBlocks.length).toBeGreaterThan(0);
    expect(parsed.renderMode).toBeUndefined();
    expect(parsed.dataTypes).toBeUndefined();
  });

  // Gap Test 3: ChangeViewDefinitionsTab hides the internal render mode badge when directChangesMode is EXTERNAL
  it('ChangeViewDefinitionsTab hides internal render mode badge when directChangesMode is EXTERNAL', () => {
    renderWithProviders(
      <ChangeViewDefinitionsTab
        scenarioTypeCode="FRTB_SA"
        directChangesMode="EXTERNAL"
        directChangesInternalRenderMode="FULL_DATA_CHANGES"
      />
    );

    // The internal render mode badge should NOT be present
    expect(screen.queryByTestId('internal-render-mode-badge')).not.toBeInTheDocument();
    // The external mode warning should be present
    expect(screen.getByTestId('external-mode-warning')).toBeInTheDocument();
  });
});
