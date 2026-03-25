import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DataTypeList } from '../DataTypeList';
import { DataTypeEditorPanel } from '../DataTypeEditorPanel';
import type { DeltaDataType } from '../ChangeViewStructuredEditorPanel';

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

const buildTestDataTypes = (): DeltaDataType[] => [
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
    overflowMessage: 'Too many rows to display.',
  },
  {
    dataTypeId: 'dt2',
    dataTypeTitle: 'Positions',
    headerSummaryTextTemplate: '${changedEntitiesCount} entities changed',
    columnDefinitions: [
      { dataAttribute: 'posId', type: 'string', display: 'Position ID', isEntityId: true },
      { dataAttribute: 'amount', type: 'number', display: 'Amount' },
      { dataAttribute: 'date', type: 'date', display: 'Trade Date' },
    ],
    sortOrdering: { dataAttribute: 'posId', direction: 'DESC' },
  },
  {
    dataTypeId: 'dt3',
    dataTypeTitle: 'Sensitivities',
    headerSummaryTextTemplate: '',
    columnDefinitions: [
      { dataAttribute: 'sensId', type: 'string', display: 'Sensitivity ID', isEntityId: true },
    ],
    sortOrdering: { dataAttribute: 'sensId', direction: 'ASC' },
  },
];

describe('DataTypeList and DataTypeEditorPanel (Task Group 4)', () => {

  // Test 4.1.1: DataTypeList renders all dataTypes with correct columns
  it('DataTypeList renders all dataTypes with correct columns (dataTypeTitle, dataTypeId, column count, rowThreshold)', () => {
    const dataTypes = buildTestDataTypes();
    const onSelect = jest.fn();
    const onAdd = jest.fn();
    const onDelete = jest.fn();
    const onMove = jest.fn();

    renderWithProvider(
      <DataTypeList
        dataTypes={dataTypes}
        selectedIndex={null}
        onSelect={onSelect}
        onAdd={onAdd}
        onDelete={onDelete}
        onMove={onMove}
      />
    );

    // Verify the table is rendered
    expect(screen.getByTestId('dt-list-table')).toBeInTheDocument();

    // Verify all 3 rows exist
    expect(screen.getByTestId('dt-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('dt-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('dt-row-2')).toBeInTheDocument();

    // First dataType: title, id, column count (2), rowThreshold (100)
    const row0 = screen.getByTestId('dt-row-0');
    expect(row0).toHaveTextContent('Risk Measures');
    expect(row0).toHaveTextContent('dt1');
    expect(row0).toHaveTextContent('2');
    expect(row0).toHaveTextContent('100');

    // Second dataType: title, id, column count (3), rowThreshold (-)
    const row1 = screen.getByTestId('dt-row-1');
    expect(row1).toHaveTextContent('Positions');
    expect(row1).toHaveTextContent('dt2');
    expect(row1).toHaveTextContent('3');

    // Third dataType
    const row2 = screen.getByTestId('dt-row-2');
    expect(row2).toHaveTextContent('Sensitivities');
    expect(row2).toHaveTextContent('dt3');
    expect(row2).toHaveTextContent('1');
  });

  // Test 4.1.2: Clicking a row selects it and calls onSelect
  it('clicking a row in DataTypeList selects it (highlighted with ruleRowSelected style) and calls onSelect', () => {
    const dataTypes = buildTestDataTypes();
    const onSelect = jest.fn();
    const onAdd = jest.fn();
    const onDelete = jest.fn();
    const onMove = jest.fn();

    const { rerender } = renderWithProvider(
      <DataTypeList
        dataTypes={dataTypes}
        selectedIndex={null}
        onSelect={onSelect}
        onAdd={onAdd}
        onDelete={onDelete}
        onMove={onMove}
      />
    );

    // Click the second row
    fireEvent.click(screen.getByTestId('dt-row-1'));
    expect(onSelect).toHaveBeenCalledWith(1);

    // Rerender with selectedIndex=1 to verify selected styling
    rerender(
      <FluentProvider theme={webLightTheme}>
        <DataTypeList
          dataTypes={dataTypes}
          selectedIndex={1}
          onSelect={onSelect}
          onAdd={onAdd}
          onDelete={onDelete}
          onMove={onMove}
        />
      </FluentProvider>
    );

    // The selected row should have the ruleRowSelected class
    // identity-obj-proxy maps CSS module classes to their name strings
    const selectedRow = screen.getByTestId('dt-row-1');
    expect(selectedRow.className).toContain('ruleRowSelected');

    // Non-selected rows should not have it
    const nonSelectedRow = screen.getByTestId('dt-row-0');
    expect(nonSelectedRow.className).not.toContain('ruleRowSelected');
  });

  // Test 4.1.3: DataTypeList add/delete/reorder actions work correctly
  it('DataTypeList add/delete/reorder actions work correctly (matching SignoffPolicyEditorPanel pattern)', () => {
    const dataTypes = buildTestDataTypes();
    const onSelect = jest.fn();
    const onAdd = jest.fn();
    const onDelete = jest.fn();
    const onMove = jest.fn();

    renderWithProvider(
      <DataTypeList
        dataTypes={dataTypes}
        selectedIndex={null}
        onSelect={onSelect}
        onAdd={onAdd}
        onDelete={onDelete}
        onMove={onMove}
      />
    );

    // Test Add button
    fireEvent.click(screen.getByTestId('dt-add-button'));
    expect(onAdd).toHaveBeenCalledTimes(1);

    // Test Delete on second row
    fireEvent.click(screen.getByTestId('dt-delete-1'));
    expect(onDelete).toHaveBeenCalledWith(1);

    // Test Move Up on second row
    fireEvent.click(screen.getByTestId('dt-move-up-1'));
    expect(onMove).toHaveBeenCalledWith(1, 'up');

    // Test Move Down on second row
    fireEvent.click(screen.getByTestId('dt-move-down-1'));
    expect(onMove).toHaveBeenCalledWith(1, 'down');

    // First row's move-up should be disabled
    expect(screen.getByTestId('dt-move-up-0')).toBeDisabled();

    // Last row's move-down should be disabled
    expect(screen.getByTestId('dt-move-down-2')).toBeDisabled();
  });

  // Test 4.1.4: DataTypeEditorPanel renders all fields for a selected dataType
  it('DataTypeEditorPanel renders all fields for a selected dataType', () => {
    const dataType = buildTestDataTypes()[0];
    const onChange = jest.fn();

    renderWithProvider(
      <DataTypeEditorPanel
        dataType={dataType}
        onChange={onChange}
      />
    );

    // Verify the editor panel is rendered (not the placeholder)
    expect(screen.getByTestId('dt-editor-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('dt-editor-placeholder')).not.toBeInTheDocument();

    // Verify dataTypeId field
    const idInput = screen.getByTestId('dt-dataTypeId-input') as HTMLInputElement;
    expect(idInput.value).toBe('dt1');

    // Verify dataTypeTitle field
    const titleInput = screen.getByTestId('dt-dataTypeTitle-input') as HTMLInputElement;
    expect(titleInput.value).toBe('Risk Measures');

    // Verify headerSummaryTextTemplate field
    const headerTextarea = screen.getByTestId('dt-headerSummaryTextTemplate-textarea') as HTMLTextAreaElement;
    expect(headerTextarea.value).toBe('${changedValuesCount} values changed');

    // Verify rowThreshold field
    const thresholdInput = screen.getByTestId('dt-rowThreshold-input') as HTMLInputElement;
    expect(thresholdInput.value).toBe('100');

    // Verify overflowMessage field (shown since rowThreshold is set)
    const overflowInput = screen.getByTestId('dt-overflowMessage-input') as HTMLInputElement;
    expect(overflowInput.value).toBe('Too many rows to display.');

    // Verify sortOrdering.direction
    const directionSelect = screen.getByTestId('dt-sortDirection-select') as HTMLSelectElement;
    expect(directionSelect.value).toBe('ASC');

    // Verify sortOrdering.dataAttribute dropdown
    const sortAttrSelect = screen.getByTestId('dt-sortDataAttribute-select') as HTMLSelectElement;
    expect(sortAttrSelect.value).toBe('name');

    // Verify ColumnDefinitionsEditor is embedded
    expect(screen.getByTestId('column-definitions-editor')).toBeInTheDocument();
  });

  // Test 4.1.5: DataTypeEditorPanel shows placeholder when no dataType is selected
  it('DataTypeEditorPanel shows a placeholder message when no dataType is selected', () => {
    const onChange = jest.fn();

    renderWithProvider(
      <DataTypeEditorPanel
        dataType={null}
        onChange={onChange}
      />
    );

    // Verify placeholder is shown
    expect(screen.getByTestId('dt-editor-placeholder')).toBeInTheDocument();
    expect(screen.getByTestId('dt-editor-placeholder')).toHaveTextContent(
      'Select a data type from the list above to edit.'
    );

    // Verify no form fields are rendered
    expect(screen.queryByTestId('dt-dataTypeId-input')).not.toBeInTheDocument();
  });

  // Test 4.1.6: sortOrdering.dataAttribute dropdown is populated from the current dataType's columnDefinitions
  it('sortOrdering.dataAttribute dropdown is populated from the current dataType columnDefinitions', () => {
    const dataType = buildTestDataTypes()[1]; // Positions: posId, amount, date
    const onChange = jest.fn();

    renderWithProvider(
      <DataTypeEditorPanel
        dataType={dataType}
        onChange={onChange}
      />
    );

    // Verify sortOrdering.dataAttribute dropdown
    const sortAttrSelect = screen.getByTestId('dt-sortDataAttribute-select') as HTMLSelectElement;

    // Should have options: empty option + 3 column dataAttributes
    const options = sortAttrSelect.querySelectorAll('option');
    // The options should include the column data attributes
    const optionValues = Array.from(options).map((opt) => opt.value);
    expect(optionValues).toContain('posId');
    expect(optionValues).toContain('amount');
    expect(optionValues).toContain('date');

    // The current value should be 'posId' (from the dataType's sortOrdering)
    expect(sortAttrSelect.value).toBe('posId');
  });
});
