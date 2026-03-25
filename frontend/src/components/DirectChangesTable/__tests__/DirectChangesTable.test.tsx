import { render, screen } from '@testing-library/react';
import { DirectChangesTable } from '../DirectChangesTable';
import type { DirectChangesColumnDefinitionFe } from '../../../store/scenariosSlice';

const sampleColumnDefs: DirectChangesColumnDefinitionFe[] = [
  { dataAttribute: 'tsName', type: 'string', display: 'Time-Series Name', isEntityId: true },
  { dataAttribute: 'date', type: 'date', display: 'Date' },
  { dataAttribute: 'value', type: 'number', display: 'Value' },
];

const sampleRows: Record<string, unknown>[] = [
  { tsName: 'TS_FX_USD', date: '2026-01-15', value: 1.35 },
  { tsName: 'TS_IR_5Y', date: '2026-01-16', value: 0.025 },
];

describe('DirectChangesTable', () => {
  // Test 1: Renders column headers from columnDefinitions[].display values
  it('renders column headers from columnDefinitions display values', () => {
    render(<DirectChangesTable columnDefinitions={sampleColumnDefs} rows={sampleRows} />);

    expect(screen.getByText('Time-Series Name')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  // Test 2: Renders row data using row[column.dataAttribute], converting via String(value ?? '')
  it('renders row data using row[column.dataAttribute], converting values via String(value ?? "")', () => {
    const rowsWithNullAndUndefined: Record<string, unknown>[] = [
      { tsName: 'TS_FX_USD', date: '2026-01-15', value: 1.35 },
      { tsName: 'TS_IR_5Y', date: null, value: undefined },
    ];

    render(
      <DirectChangesTable
        columnDefinitions={sampleColumnDefs}
        rows={rowsWithNullAndUndefined}
      />
    );

    // First row values
    expect(screen.getByText('TS_FX_USD')).toBeInTheDocument();
    expect(screen.getByText('2026-01-15')).toBeInTheDocument();
    expect(screen.getByText('1.35')).toBeInTheDocument();

    // Second row values
    expect(screen.getByText('TS_IR_5Y')).toBeInTheDocument();

    // Verify the correct number of data rows
    const tableBody = screen.getByRole('table').querySelector('tbody');
    expect(tableBody).not.toBeNull();
    const dataRows = tableBody!.querySelectorAll('tr');
    expect(dataRows).toHaveLength(2);

    // Check that null/undefined values are rendered as empty string (empty td cells)
    const secondRowCells = dataRows[1].querySelectorAll('td');
    expect(secondRowCells[1].textContent).toBe('');
    expect(secondRowCells[2].textContent).toBe('');
  });

  // Test 3: Renders an empty tbody when rows is an empty array
  it('renders an empty tbody when rows is an empty array', () => {
    render(<DirectChangesTable columnDefinitions={sampleColumnDefs} rows={[]} />);

    // Table structure should still exist
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    // Headers should be present
    expect(screen.getByText('Time-Series Name')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();

    // Tbody should exist but have no rows
    const tableBody = table.querySelector('tbody');
    expect(tableBody).not.toBeNull();
    const dataRows = tableBody!.querySelectorAll('tr');
    expect(dataRows).toHaveLength(0);
  });
});
