import { render, screen, fireEvent, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import scenarioTypeAdminReducer from '../../../store/scenarioTypeAdminSlice';
import changeViewDefinitionAdminReducer from '../../../store/changeViewDefinitionAdminSlice';
import { ChangeViewStructuredEditorPanel, parseDeltaDefinition } from '../ChangeViewStructuredEditorPanel';
import type { ChangeViewDefinitionDetail } from '../../../services/changeViewDefinitionAdminApi';

// Polyfill ResizeObserver for jsdom (required by Fluent UI MessageBar)
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

const buildDeltaDefinitionJson = () => JSON.stringify({
  schema_version: '1.0',
  template_key: 'delta_view',
  scenario_type: 'FRTB_SA',
  display_name: 'Delta View',
  description: 'A delta view template',
  renderMode: 'DELTA_BY_UNIQUE_ID',
  dataTypes: [{
    dataTypeId: 'dt1',
    dataTypeTitle: 'Type 1',
    headerSummaryTextTemplate: '${changedValuesCount} values changed',
    columnDefinitions: [
      { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
      { dataAttribute: 'value', type: 'number', display: 'Value' },
    ],
    sortOrdering: { dataAttribute: 'name', direction: 'ASC' },
    rowThreshold: 100,
    overflowMessage: 'Too many rows.',
  }],
});

const buildDeltaDefinition = (): ChangeViewDefinitionDetail => ({
  id: 'def-delta-1',
  scenarioTypeCode: 'FRTB_SA',
  templateKey: 'delta_view',
  displayName: 'Delta View',
  renderMode: 'DELTA_BY_UNIQUE_ID',
  version: 1,
  isActive: false,
  createdAt: '2026-03-24T10:00:00Z',
  updatedAt: '2026-03-24T10:00:00Z',
  definition: buildDeltaDefinitionJson(),
  schemaVersion: '1.0',
});

describe('ChangeViewStructuredEditorPanel -- DELTA_BY_UNIQUE_ID Toggle Behavior (Task Group 2)', () => {

  // Test 2.1.1: Structured/JSON TabList is visible when definition has renderMode: 'DELTA_BY_UNIQUE_ID'
  it('shows the Structured/JSON TabList when definition has renderMode DELTA_BY_UNIQUE_ID', () => {
    renderWithProviders(
      <ChangeViewStructuredEditorPanel
        definition={buildDeltaDefinition()}
        onDefinitionChange={() => {}}
        scenarioTypeCode="FRTB_SA"
      />
    );

    // The TabList should now be visible (previously hidden by !isDeltaMode guard)
    expect(screen.getByTestId('cv-editor-mode-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('cv-structured-mode-tab')).toBeInTheDocument();
    expect(screen.getByTestId('cv-json-mode-tab')).toBeInTheDocument();
  });

  // Test 2.1.2: Switching from JSON to Structured mode for a DELTA_BY_UNIQUE_ID definition
  // calls parseDeltaDefinition() (not parseDefinition()) and does not strip renderMode or dataTypes
  it('preserves renderMode and dataTypes when switching JSON to Structured for DELTA_BY_UNIQUE_ID', () => {
    const onDefinitionChange = jest.fn();

    renderWithProviders(
      <ChangeViewStructuredEditorPanel
        definition={buildDeltaDefinition()}
        onDefinitionChange={onDefinitionChange}
        scenarioTypeCode="FRTB_SA"
      />
    );

    // Component should start in structured mode with the DeltaByUniqueIdEditorPanel rendered
    expect(screen.getByTestId('delta-editor-panel')).toBeInTheDocument();

    // Switch to JSON mode
    fireEvent.click(screen.getByTestId('cv-json-mode-tab'));

    // Now in JSON mode, Monaco editor should be visible
    expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument();

    // Switch back to Structured mode
    fireEvent.click(screen.getByTestId('cv-structured-mode-tab'));

    // Should be back in structured mode with DeltaByUniqueIdEditorPanel
    expect(screen.getByTestId('delta-editor-panel')).toBeInTheDocument();

    // Verify onDefinitionChange was called with JSON that preserves renderMode and dataTypes
    // (parseDeltaDefinition was used, not parseDefinition which strips these fields)
    const lastCallJson = onDefinitionChange.mock.calls[onDefinitionChange.mock.calls.length - 1][0];
    const parsed = JSON.parse(lastCallJson);
    expect(parsed.renderMode).toBe('DELTA_BY_UNIQUE_ID');
    expect(parsed.dataTypes).toBeDefined();
    expect(parsed.dataTypes).toHaveLength(1);
    expect(parsed.dataTypes[0].dataTypeId).toBe('dt1');
    expect(parsed.dataTypes[0].columnDefinitions).toHaveLength(2);
  });

  // Test 2.1.3: Switching from JSON to Structured with invalid JSON shows jsonSyncError
  // MessageBar and stays in JSON mode.
  // Uses fake timers to properly handle the MonacoEditorPanel's 300ms debounce.
  it('shows jsonSyncError and stays in JSON mode when switching from JSON to Structured with invalid JSON', () => {
    jest.useFakeTimers();

    try {
      renderWithProviders(
        <ChangeViewStructuredEditorPanel
          definition={buildDeltaDefinition()}
          onDefinitionChange={() => {}}
          scenarioTypeCode="FRTB_SA"
        />
      );

      // Switch to JSON mode first
      fireEvent.click(screen.getByTestId('cv-json-mode-tab'));

      // Now in JSON mode, modify the Monaco editor to have invalid JSON.
      // The mock calls MonacoEditorPanel's handleEditorChange which debounces by 300ms.
      const editor = screen.getByTestId('mock-monaco-editor') as HTMLTextAreaElement;
      fireEvent.change(editor, { target: { value: '{ invalid json !!!' } });

      // Advance timers to flush the MonacoEditorPanel debounce (300ms)
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // Try to switch back to Structured mode
      fireEvent.click(screen.getByTestId('cv-structured-mode-tab'));

      // Should still be in JSON mode with error message
      expect(screen.getByTestId('cv-json-sync-error')).toBeInTheDocument();
      expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('delta-editor-panel')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  // Test 2.1.4: JSON mode still renders MonacoEditorPanel unchanged for DELTA_BY_UNIQUE_ID definitions
  it('renders MonacoEditorPanel in JSON mode for DELTA_BY_UNIQUE_ID definitions', () => {
    renderWithProviders(
      <ChangeViewStructuredEditorPanel
        definition={buildDeltaDefinition()}
        onDefinitionChange={() => {}}
        scenarioTypeCode="FRTB_SA"
      />
    );

    // Initially in structured mode (DeltaByUniqueIdEditorPanel)
    expect(screen.getByTestId('delta-editor-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-monaco-editor')).not.toBeInTheDocument();

    // Switch to JSON mode
    fireEvent.click(screen.getByTestId('cv-json-mode-tab'));

    // Monaco editor should be rendered with the definition JSON
    const editor = screen.getByTestId('mock-monaco-editor') as HTMLTextAreaElement;
    expect(editor).toBeInTheDocument();

    // Verify the JSON content contains DELTA_BY_UNIQUE_ID fields
    const editorJson = JSON.parse(editor.value);
    expect(editorJson.renderMode).toBe('DELTA_BY_UNIQUE_ID');
    expect(editorJson.dataTypes).toBeDefined();
  });
});
