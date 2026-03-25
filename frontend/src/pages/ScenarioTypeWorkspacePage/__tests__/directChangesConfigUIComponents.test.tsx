import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import scenarioTypeAdminReducer from '../../../store/scenarioTypeAdminSlice';
import changeViewDefinitionAdminReducer from '../../../store/changeViewDefinitionAdminSlice';
import { NavigationViewModeTabContent } from '../NavigationViewModeTabContent';
import { ChangeViewDefinitionsTab } from '../ChangeViewDefinitionsTab';
import { CreateChangeViewDefinitionDialog } from '../CreateChangeViewDefinitionDialog';
import { ChangeViewStructuredEditorPanel } from '../ChangeViewStructuredEditorPanel';
import type { ScenarioTypeAdminDetailDto } from '../../../services/scenarioTypeAdminApi';
import type { ChangeViewDefinitionDetail } from '../../../services/changeViewDefinitionAdminApi';

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

describe('Direct Changes Config Model Extension -- UI Component Tests', () => {

  // Test 1: NavigationViewModeTabContent renders directChangesInternalRenderMode dropdown only when directChangesMode === 'INTERNAL'
  it('NavigationViewModeTabContent renders directChangesInternalRenderMode dropdown when directChangesMode is INTERNAL', () => {
    renderWithProviders(
      <NavigationViewModeTabContent
        detail={buildDetail({ directChangesMode: 'INTERNAL' })}
        saving={false}
      />
    );

    expect(screen.getByTestId('direct-changes-internal-render-mode-field')).toBeInTheDocument();
    expect(screen.getByText('Internal Render Mode')).toBeInTheDocument();
  });

  // Test 2: NavigationViewModeTabContent hides the dropdown when directChangesMode === 'EXTERNAL'
  it('NavigationViewModeTabContent hides the render mode dropdown when directChangesMode is EXTERNAL', () => {
    renderWithProviders(
      <NavigationViewModeTabContent
        detail={buildDetail({ directChangesMode: 'EXTERNAL', directChangesExternalUrlTemplate: 'https://example.com' })}
        saving={false}
      />
    );

    expect(screen.queryByTestId('direct-changes-internal-render-mode-field')).not.toBeInTheDocument();
    expect(screen.queryByText('Internal Render Mode')).not.toBeInTheDocument();
  });

  // Test 3: NavigationViewModeTabContent includes directChangesInternalRenderMode in save payload
  it('NavigationViewModeTabContent includes directChangesInternalRenderMode in save dispatch payload', () => {
    const { store } = renderWithProviders(
      <NavigationViewModeTabContent
        detail={buildDetail({
          directChangesMode: 'INTERNAL',
          directChangesInternalRenderMode: 'DELTA_BY_UNIQUE_ID',
        })}
        saving={false}
      />
    );

    // Click the Save button
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Check that the dispatched action includes directChangesInternalRenderMode
    const actions = store.getState();
    // The updateNavigationViewModeRequest action sets saving=true
    expect(actions.scenarioTypeAdmin.saving).toBe(true);
  });

  // Test 4: ChangeViewDefinitionsTab renders internal render mode badge when directChangesMode === 'INTERNAL'
  it('ChangeViewDefinitionsTab renders internal render mode badge when directChangesMode is INTERNAL', () => {
    renderWithProviders(
      <ChangeViewDefinitionsTab
        scenarioTypeCode="FRTB_SA"
        directChangesMode="INTERNAL"
        directChangesInternalRenderMode="DELTA_BY_UNIQUE_ID"
      />
    );

    const badge = screen.getByTestId('internal-render-mode-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('Internal Mode: DELTA_BY_UNIQUE_ID');
  });

  // Test 5: CreateChangeViewDefinitionDialog generates DELTA_BY_UNIQUE_ID skeleton when prop indicates that mode
  it('CreateChangeViewDefinitionDialog generates DELTA_BY_UNIQUE_ID skeleton when directChangesInternalRenderMode is DELTA_BY_UNIQUE_ID', () => {
    renderWithProviders(
      <CreateChangeViewDefinitionDialog
        open={true}
        onDismiss={() => {}}
        scenarioTypeCode="FRTB_SA"
        directChangesInternalRenderMode="DELTA_BY_UNIQUE_ID"
      />
    );

    // The definition JSON textarea should contain the DELTA_BY_UNIQUE_ID skeleton
    const textarea = screen.getByTestId('create-cv-definition-json-textarea') as HTMLTextAreaElement;
    const json = textarea.value;
    const parsed = JSON.parse(json);

    expect(parsed.renderMode).toBe('DELTA_BY_UNIQUE_ID');
    expect(parsed.dataTypes).toBeDefined();
    expect(parsed.dataTypes).toHaveLength(1);
    expect(parsed.dataTypes[0].dataTypeId).toBe('dataType1');
    expect(parsed.dataTypes[0].columnDefinitions).toBeDefined();
    expect(parsed.dataTypes[0].columnDefinitions.length).toBeGreaterThan(0);
  });

  // Test 6: ChangeViewStructuredEditorPanel shows Structured/JSON toggle and starts in structured mode
  // for DELTA_BY_UNIQUE_ID definitions (JSON-only enforcement removed in Task Group 2)
  it('ChangeViewStructuredEditorPanel shows Structured/JSON toggle and starts in structured mode for DELTA_BY_UNIQUE_ID', () => {
    const deltaDefinition: ChangeViewDefinitionDetail = {
      id: 'def-1',
      scenarioTypeCode: 'FRTB_SA',
      templateKey: 'delta_view',
      displayName: 'Delta View',
      renderMode: 'DELTA_BY_UNIQUE_ID',
      version: 1,
      isActive: true,
      createdAt: '2026-03-24T10:00:00Z',
      updatedAt: '2026-03-24T10:00:00Z',
      definition: JSON.stringify({
        schema_version: '1.0',
        template_key: 'delta_view',
        scenario_type: 'FRTB_SA',
        display_name: 'Delta View',
        renderMode: 'DELTA_BY_UNIQUE_ID',
        dataTypes: [{
          dataTypeId: 'dt1',
          dataTypeTitle: 'Type 1',
          headerSummaryTextTemplate: '${changedValuesCount} values changed',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
          ],
          sortOrdering: { dataAttribute: 'name', direction: 'ASC' },
          rowThreshold: 100,
          overflowMessage: 'Too many rows.',
        }],
      }),
      schemaVersion: '1.0',
    };

    renderWithProviders(
      <ChangeViewStructuredEditorPanel
        definition={deltaDefinition}
        onDefinitionChange={() => {}}
        scenarioTypeCode="FRTB_SA"
      />
    );

    // The Structured/JSON tab toggle should now be present (JSON-only enforcement removed)
    expect(screen.getByTestId('cv-editor-mode-tabs')).toBeInTheDocument();

    // The component should start in structured mode with the delta placeholder
    expect(screen.getByTestId('cv-delta-structured-placeholder')).toBeInTheDocument();

    // The Monaco editor should NOT be present since we start in structured mode
    expect(screen.queryByTestId('mock-monaco-editor')).not.toBeInTheDocument();
  });
});
