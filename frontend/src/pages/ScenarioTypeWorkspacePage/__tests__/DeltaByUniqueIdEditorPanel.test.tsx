import { render, screen, fireEvent, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DeltaByUniqueIdEditorPanel } from '../DeltaByUniqueIdEditorPanel';

// Polyfill ResizeObserver for jsdom (required by Fluent UI components)
beforeAll(() => {
  if (typeof window.ResizeObserver === 'undefined') {
    (window as unknown as Record<string, unknown>).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <FluentProvider theme={webLightTheme}>
      {ui}
    </FluentProvider>
  );
};

/**
 * Builds a valid DELTA_BY_UNIQUE_ID definition JSON string for testing.
 */
function buildTestDefinitionJson(overrides?: Record<string, unknown>): string {
  const base = {
    schema_version: '1.0',
    template_key: 'test_template',
    scenario_type: 'TEST_TYPE',
    display_name: 'Test Delta Template',
    description: 'A test description',
    renderMode: 'DELTA_BY_UNIQUE_ID',
    dataTypes: [
      {
        dataTypeId: 'dt1',
        dataTypeTitle: 'Risk Measures',
        headerSummaryTextTemplate: '${changedValuesCount} values changed',
        columnDefinitions: [
          { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
          { dataAttribute: 'value', type: 'number', display: 'Value' },
        ],
        sortOrdering: { dataAttribute: 'name', direction: 'ASC' },
        rowThreshold: 100,
        overflowMessage: 'Too many rows.',
      },
      {
        dataTypeId: 'dt2',
        dataTypeTitle: 'Positions',
        headerSummaryTextTemplate: '${changedEntitiesCount} entities changed',
        columnDefinitions: [
          { dataAttribute: 'posId', type: 'string', display: 'Position ID', isEntityId: true },
          { dataAttribute: 'amount', type: 'number', display: 'Amount' },
        ],
        sortOrdering: { dataAttribute: 'posId', direction: 'DESC' },
      },
    ],
    ...overrides,
  };
  return JSON.stringify(base, null, 2);
}

describe('DeltaByUniqueIdEditorPanel (Task Group 5)', () => {

  // 5.1.1: Parses a valid DELTA_BY_UNIQUE_ID JSON string and renders definition-level read-only fields
  //         and editable fields
  it('parses a valid DELTA_BY_UNIQUE_ID JSON string and renders definition-level fields', () => {
    const onDefinitionChange = jest.fn();
    const json = buildTestDefinitionJson();

    renderWithProvider(
      <DeltaByUniqueIdEditorPanel
        definition={json}
        onDefinitionChange={onDefinitionChange}
      />
    );

    // Read-only fields should render as labels (spans)
    expect(screen.getByTestId('delta-template-key')).toHaveTextContent('test_template');
    expect(screen.getByTestId('delta-scenario-type')).toHaveTextContent('TEST_TYPE');
    expect(screen.getByTestId('delta-schema-version')).toHaveTextContent('1.0');

    // Editable fields should render as inputs
    const displayNameInput = screen.getByTestId('delta-display-name-input') as HTMLInputElement;
    expect(displayNameInput.value).toBe('Test Delta Template');

    const descriptionTextarea = screen.getByTestId('delta-description-textarea') as HTMLTextAreaElement;
    expect(descriptionTextarea.value).toBe('A test description');
  });

  // 5.1.2: Selecting a dataType in DataTypeList populates DataTypeEditorPanel with that dataType's fields
  it('selecting a dataType in DataTypeList populates DataTypeEditorPanel with that dataType fields', () => {
    const onDefinitionChange = jest.fn();
    const json = buildTestDefinitionJson();

    renderWithProvider(
      <DeltaByUniqueIdEditorPanel
        definition={json}
        onDefinitionChange={onDefinitionChange}
      />
    );

    // Initially no dataType should be selected; the editor should show placeholder
    expect(screen.getByTestId('dt-editor-placeholder')).toBeInTheDocument();

    // Click the first dataType row
    fireEvent.click(screen.getByTestId('dt-row-0'));

    // The editor should now show the first dataType's fields
    expect(screen.queryByTestId('dt-editor-placeholder')).not.toBeInTheDocument();

    const idInput = screen.getByTestId('dt-dataTypeId-input') as HTMLInputElement;
    expect(idInput.value).toBe('dt1');

    const titleInput = screen.getByTestId('dt-dataTypeTitle-input') as HTMLInputElement;
    expect(titleInput.value).toBe('Risk Measures');

    // Now click the second dataType row
    fireEvent.click(screen.getByTestId('dt-row-1'));

    const idInput2 = screen.getByTestId('dt-dataTypeId-input') as HTMLInputElement;
    expect(idInput2.value).toBe('dt2');

    const titleInput2 = screen.getByTestId('dt-dataTypeTitle-input') as HTMLInputElement;
    expect(titleInput2.value).toBe('Positions');
  });

  // 5.1.3: Editing a field calls onDefinitionChange with updated serialized JSON
  it('editing a field calls onDefinitionChange with updated serialized JSON', () => {
    const onDefinitionChange = jest.fn();
    const json = buildTestDefinitionJson();

    renderWithProvider(
      <DeltaByUniqueIdEditorPanel
        definition={json}
        onDefinitionChange={onDefinitionChange}
      />
    );

    // Edit the display_name field
    const displayNameInput = screen.getByTestId('delta-display-name-input');
    fireEvent.change(displayNameInput, { target: { value: 'Updated Template Name' } });

    // onDefinitionChange should have been called
    expect(onDefinitionChange).toHaveBeenCalled();

    // The last call should contain the updated display_name in the serialized JSON
    const lastCallArg = onDefinitionChange.mock.calls[onDefinitionChange.mock.calls.length - 1][0];
    const parsed = JSON.parse(lastCallArg);
    expect(parsed.display_name).toBe('Updated Template Name');
    // Other fields should be preserved
    expect(parsed.template_key).toBe('test_template');
    expect(parsed.renderMode).toBe('DELTA_BY_UNIQUE_ID');
    expect(parsed.dataTypes).toHaveLength(2);
  });

  // 5.1.4: Adding a new dataType creates a default entry and auto-selects it
  it('adding a new dataType creates a default entry and auto-selects it', () => {
    const onDefinitionChange = jest.fn();
    const json = buildTestDefinitionJson();

    renderWithProvider(
      <DeltaByUniqueIdEditorPanel
        definition={json}
        onDefinitionChange={onDefinitionChange}
      />
    );

    // Initially 2 dataTypes exist
    expect(screen.getByTestId('dt-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('dt-row-1')).toBeInTheDocument();

    // Click "Add Data Type" button
    fireEvent.click(screen.getByTestId('dt-add-button'));

    // onDefinitionChange should have been called
    expect(onDefinitionChange).toHaveBeenCalled();

    // The serialized JSON should now contain 3 dataTypes
    const lastCallArg = onDefinitionChange.mock.calls[onDefinitionChange.mock.calls.length - 1][0];
    const parsed = JSON.parse(lastCallArg);
    expect(parsed.dataTypes).toHaveLength(3);

    // The new dataType should have default values
    const newDt = parsed.dataTypes[2];
    expect(newDt.dataTypeId).toBe('');
    expect(newDt.dataTypeTitle).toBe('');

    // A third row should now exist in the list
    expect(screen.getByTestId('dt-row-2')).toBeInTheDocument();

    // The new dataType should be auto-selected; the editor should show its fields
    const idInput = screen.getByTestId('dt-dataTypeId-input') as HTMLInputElement;
    expect(idInput.value).toBe('');
  });

  // 5.1.5: Aggregate validation MessageBar appears when validation errors exist
  it('aggregate validation MessageBar appears when validation errors exist', async () => {
    jest.useFakeTimers();
    const onDefinitionChange = jest.fn();

    // Build a definition with validation problems:
    // - empty dataTypeId on the first dataType
    // - missing isEntityId on columns
    const invalidJson = buildTestDefinitionJson({
      dataTypes: [
        {
          dataTypeId: '',
          dataTypeTitle: '',
          columnDefinitions: [],
        },
      ],
    });

    renderWithProvider(
      <DeltaByUniqueIdEditorPanel
        definition={invalidJson}
        onDefinitionChange={onDefinitionChange}
      />
    );

    // Advance timers to trigger the debounced validation
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // The validation MessageBar should appear with aggregate errors
    const messageBar = screen.getByTestId('delta-validation-messagebar');
    expect(messageBar).toBeInTheDocument();
    // It should contain error text about the validation issues
    expect(messageBar.textContent).toBeTruthy();

    jest.useRealTimers();
  });
});
