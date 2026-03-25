import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ColumnDefinitionsEditor } from '../ColumnDefinitionsEditor';
import type { ColumnDefinition } from '../ColumnDefinitionsEditor';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <FluentProvider theme={webLightTheme}>
      {ui}
    </FluentProvider>
  );
};

const buildTestColumns = (): ColumnDefinition[] => [
  { dataAttribute: 'name', display: 'Name', type: 'string', isEntityId: true },
  { dataAttribute: 'value', display: 'Value', type: 'number', isEntityId: false },
  { dataAttribute: 'date', display: 'Date', type: 'date', isEntityId: false },
];

describe('ColumnDefinitionsEditor (Task Group 3)', () => {

  // Test 3.1.1: Column list renders all columns with correct field values
  it('renders all columns with correct field values (dataAttribute, display, type, isEntityId)', () => {
    const columns = buildTestColumns();
    const onChange = jest.fn();

    renderWithProvider(
      <ColumnDefinitionsEditor columns={columns} onChange={onChange} />
    );

    // Verify table is rendered
    expect(screen.getByTestId('col-table')).toBeInTheDocument();

    // Verify all 3 rows exist
    expect(screen.getByTestId('col-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('col-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('col-row-2')).toBeInTheDocument();

    // Verify first column field values
    const da0 = screen.getByTestId('col-dataAttribute-0') as HTMLInputElement;
    expect(da0.value).toBe('name');

    const display0 = screen.getByTestId('col-display-0') as HTMLInputElement;
    expect(display0.value).toBe('Name');

    // Fluent UI Select renders data-testid on the native <select> element directly
    const type0Select = screen.getByTestId('col-type-0') as HTMLSelectElement;
    expect(type0Select.value).toBe('string');

    // Fluent UI Checkbox renders data-testid on the native <input type="checkbox"> directly
    const checkbox0 = screen.getByTestId('col-isEntityId-0') as HTMLInputElement;
    expect(checkbox0.checked).toBe(true);

    // Verify second column has isEntityId unchecked
    const checkbox1 = screen.getByTestId('col-isEntityId-1') as HTMLInputElement;
    expect(checkbox1.checked).toBe(false);

    // Verify second column type is number
    const type1Select = screen.getByTestId('col-type-1') as HTMLSelectElement;
    expect(type1Select.value).toBe('number');

    // Verify third column type is date
    const type2Select = screen.getByTestId('col-type-2') as HTMLSelectElement;
    expect(type2Select.value).toBe('date');
  });

  // Test 3.1.2: Clicking "Add Column" appends a new column with default values and calls onChange
  it('clicking Add Column appends a new column with default values and calls onChange', () => {
    const columns = buildTestColumns();
    const onChange = jest.fn();

    renderWithProvider(
      <ColumnDefinitionsEditor columns={columns} onChange={onChange} />
    );

    // Click Add Column button
    fireEvent.click(screen.getByTestId('col-add-button'));

    // onChange should have been called with 4 columns (3 original + 1 new)
    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedColumns = onChange.mock.calls[0][0] as ColumnDefinition[];
    expect(updatedColumns).toHaveLength(4);

    // Verify the new column has default values
    const newCol = updatedColumns[3];
    expect(newCol.dataAttribute).toBe('');
    expect(newCol.display).toBe('');
    expect(newCol.type).toBe('string');
    expect(newCol.isEntityId).toBe(false);

    // Verify original columns are unchanged
    expect(updatedColumns[0].dataAttribute).toBe('name');
    expect(updatedColumns[1].dataAttribute).toBe('value');
    expect(updatedColumns[2].dataAttribute).toBe('date');
  });

  // Test 3.1.3: Deleting a column removes it and calls onChange with the updated array
  it('deleting a column removes it and calls onChange with the updated array', () => {
    const columns = buildTestColumns();
    const onChange = jest.fn();

    renderWithProvider(
      <ColumnDefinitionsEditor columns={columns} onChange={onChange} />
    );

    // Delete the second column (index 1: "value")
    fireEvent.click(screen.getByTestId('col-delete-1'));

    // onChange should have been called with 2 columns
    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedColumns = onChange.mock.calls[0][0] as ColumnDefinition[];
    expect(updatedColumns).toHaveLength(2);

    // Verify the correct column was removed
    expect(updatedColumns[0].dataAttribute).toBe('name');
    expect(updatedColumns[1].dataAttribute).toBe('date');
    // "value" column should be gone
    expect(updatedColumns.find((c) => c.dataAttribute === 'value')).toBeUndefined();
  });

  // Test 3.1.4: Checking isEntityId on one column unchecks all other columns' isEntityId (radio-like behavior)
  it('checking isEntityId on one column unchecks all other columns isEntityId (radio-like behavior)', () => {
    const columns = buildTestColumns(); // first column has isEntityId: true
    const onChange = jest.fn();

    renderWithProvider(
      <ColumnDefinitionsEditor columns={columns} onChange={onChange} />
    );

    // Fluent UI Checkbox renders data-testid on the native <input type="checkbox"> directly
    // Click the checkbox for the second column (index 1: "value") to check it
    const checkbox1 = screen.getByTestId('col-isEntityId-1') as HTMLInputElement;
    fireEvent.click(checkbox1);

    // onChange should have been called
    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedColumns = onChange.mock.calls[0][0] as ColumnDefinition[];

    // Column 1 should now have isEntityId: true
    expect(updatedColumns[1].isEntityId).toBe(true);

    // Column 0 (previously true) should now have isEntityId: false
    expect(updatedColumns[0].isEntityId).toBe(false);

    // Column 2 should still be false
    expect(updatedColumns[2].isEntityId).toBe(false);
  });

  // Test 3.1.5: Reorder (up/down) correctly swaps columns and calls onChange with the new order
  it('reorder up/down correctly swaps columns and calls onChange with the new order', () => {
    const columns = buildTestColumns(); // [name, value, date]
    const onChange = jest.fn();

    renderWithProvider(
      <ColumnDefinitionsEditor columns={columns} onChange={onChange} />
    );

    // Verify that first row's "move up" button is disabled
    expect(screen.getByTestId('col-move-up-0')).toBeDisabled();

    // Verify that last row's "move down" button is disabled
    expect(screen.getByTestId('col-move-down-2')).toBeDisabled();

    // Move column at index 1 ("value") up -- should swap with index 0 ("name")
    fireEvent.click(screen.getByTestId('col-move-up-1'));

    expect(onChange).toHaveBeenCalledTimes(1);
    let updatedColumns = onChange.mock.calls[0][0] as ColumnDefinition[];
    // After moving index 1 up: [value, name, date]
    expect(updatedColumns[0].dataAttribute).toBe('value');
    expect(updatedColumns[1].dataAttribute).toBe('name');
    expect(updatedColumns[2].dataAttribute).toBe('date');

    // Test move down: move column at index 0 ("name") down -- should swap with index 1 ("value")
    onChange.mockClear();
    fireEvent.click(screen.getByTestId('col-move-down-0'));

    expect(onChange).toHaveBeenCalledTimes(1);
    updatedColumns = onChange.mock.calls[0][0] as ColumnDefinition[];
    // After moving index 0 down: [value, name, date]
    expect(updatedColumns[0].dataAttribute).toBe('value');
    expect(updatedColumns[1].dataAttribute).toBe('name');
    expect(updatedColumns[2].dataAttribute).toBe('date');
  });
});
