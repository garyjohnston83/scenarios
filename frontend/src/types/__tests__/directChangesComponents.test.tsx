import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme, Accordion } from '@fluentui/react-components';
import { DirectChangesSectionAccordion } from '../../components/DirectChangesSectionAccordion';
import { DirectChangesTable } from '../../components/DirectChangesTable';
import type {
  DirectChangesDataSectionFe,
  DirectChangesColumnDefinitionFe,
} from '../directChanges';

/**
 * Task Group 1 -- Tests 3 & 4: Verify refactored components still render
 * correctly when using the shared types from types/directChanges.ts.
 */

describe('DirectChangesSectionAccordion (shared type import)', () => {
  // Test 3: Renders correctly with a mock section prop (ROWS renderState)
  it('renders correctly with a mock section prop using ROWS renderState, column definitions, and data rows', () => {
    const mockSection: DirectChangesDataSectionFe = {
      dataType: 'riskFactors',
      header: '3 Risk Factors changed',
      externalLink: null,
      totalDataChanges: 3,
      renderState: 'ROWS',
      columnDefinitions: [
        { dataAttribute: 'rfName', type: 'string', display: 'Risk Factor', isEntityId: true },
        { dataAttribute: 'value', type: 'number', display: 'Value' },
      ],
      data: [
        { rfName: 'FX_USDJPY', value: 110.5 },
        { rfName: 'IR_5Y', value: 0.025 },
      ],
    };

    render(
      <FluentProvider theme={webLightTheme}>
        <Accordion multiple collapsible defaultOpenItems={['riskFactors']}>
          <DirectChangesSectionAccordion section={mockSection} value={mockSection.dataType} />
        </Accordion>
      </FluentProvider>
    );

    // Verify header renders
    expect(screen.getByText('3 Risk Factors changed')).toBeInTheDocument();

    // Verify table renders with data (accordion is open)
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Risk Factor')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('FX_USDJPY')).toBeInTheDocument();
    expect(screen.getByText('IR_5Y')).toBeInTheDocument();
  });
});

describe('DirectChangesTable (shared type import)', () => {
  // Test 4: Renders correct headers and row data from shared types
  it('renders correct headers and row data when given columnDefinitions and rows from the shared type', () => {
    const columnDefs: DirectChangesColumnDefinitionFe[] = [
      { dataAttribute: 'accountId', type: 'string', display: 'Account ID', isEntityId: true },
      { dataAttribute: 'balance', type: 'number', display: 'Balance' },
      { dataAttribute: 'active', type: 'boolean', display: 'Active' },
    ];

    const rows: Record<string, unknown>[] = [
      { accountId: 'ACC_001', balance: 1500.75, active: true },
      { accountId: 'ACC_002', balance: 2300.00, active: false },
    ];

    render(<DirectChangesTable columnDefinitions={columnDefs} rows={rows} />);

    // Verify headers render from columnDefinitions[].display
    expect(screen.getByText('Account ID')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    // Verify row data renders using row[column.dataAttribute]
    expect(screen.getByText('ACC_001')).toBeInTheDocument();
    expect(screen.getByText('1500.75')).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('ACC_002')).toBeInTheDocument();
    expect(screen.getByText('2300')).toBeInTheDocument();
    expect(screen.getByText('false')).toBeInTheDocument();

    // Verify correct number of data rows
    const tableBody = screen.getByRole('table').querySelector('tbody');
    expect(tableBody).not.toBeNull();
    const dataRows = tableBody!.querySelectorAll('tr');
    expect(dataRows).toHaveLength(2);
  });
});
