import { render, screen } from '@testing-library/react';
import { DeltaByUniqueIdReadOnlyView } from '../DeltaByUniqueIdReadOnlyView';

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
          { dataAttribute: 'tradeDate', type: 'date', display: 'Trade Date' },
          { dataAttribute: 'isActive', type: 'boolean', display: 'Active' },
        ],
        sortOrdering: { dataAttribute: 'posId', direction: 'DESC' },
      },
    ],
    ...overrides,
  };
  return JSON.stringify(base, null, 2);
}

describe('DeltaByUniqueIdReadOnlyView (Task Group 8)', () => {

  // 8.1.1: Test that the component renders all definition-level properties as labels
  it('renders all definition-level properties as labels', () => {
    const json = buildTestDefinitionJson();

    render(<DeltaByUniqueIdReadOnlyView definition={json} />);

    // All definition-level properties should be present as read-only labels
    expect(screen.getByTestId('delta-readonly-template-key')).toHaveTextContent('test_template');
    expect(screen.getByTestId('delta-readonly-scenario-type')).toHaveTextContent('TEST_TYPE');
    expect(screen.getByTestId('delta-readonly-schema-version')).toHaveTextContent('1.0');
    expect(screen.getByTestId('delta-readonly-display-name')).toHaveTextContent('Test Delta Template');
    expect(screen.getByTestId('delta-readonly-description')).toHaveTextContent('A test description');

    // Verify there are no input elements or textarea elements -- pure presentation
    const container = screen.getByTestId('delta-readonly-view');
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('textarea')).toHaveLength(0);
  });

  // 8.1.2: Test that each dataType is rendered with its fields as label-value pairs
  it('renders each dataType with its fields as label-value pairs', () => {
    const json = buildTestDefinitionJson();

    render(<DeltaByUniqueIdReadOnlyView definition={json} />);

    // First dataType: Risk Measures
    const dt0 = screen.getByTestId('delta-readonly-datatype-0');
    expect(dt0).toBeInTheDocument();
    expect(screen.getByTestId('delta-readonly-dt-0-dataTypeId')).toHaveTextContent('dt1');
    expect(screen.getByTestId('delta-readonly-dt-0-dataTypeTitle')).toHaveTextContent('Risk Measures');
    expect(screen.getByTestId('delta-readonly-dt-0-headerSummaryTextTemplate')).toHaveTextContent(
      '${changedValuesCount} values changed'
    );
    expect(screen.getByTestId('delta-readonly-dt-0-rowThreshold')).toHaveTextContent('100');
    expect(screen.getByTestId('delta-readonly-dt-0-overflowMessage')).toHaveTextContent('Too many rows.');
    expect(screen.getByTestId('delta-readonly-dt-0-sortOrdering')).toHaveTextContent('name (ASC)');

    // Second dataType: Positions
    const dt1 = screen.getByTestId('delta-readonly-datatype-1');
    expect(dt1).toBeInTheDocument();
    expect(screen.getByTestId('delta-readonly-dt-1-dataTypeId')).toHaveTextContent('dt2');
    expect(screen.getByTestId('delta-readonly-dt-1-dataTypeTitle')).toHaveTextContent('Positions');
    expect(screen.getByTestId('delta-readonly-dt-1-headerSummaryTextTemplate')).toHaveTextContent(
      '${changedEntitiesCount} entities changed'
    );
    // No rowThreshold set for dt2 -- should display dash
    expect(screen.getByTestId('delta-readonly-dt-1-rowThreshold')).toHaveTextContent('-');
    expect(screen.getByTestId('delta-readonly-dt-1-overflowMessage')).toHaveTextContent('-');
    expect(screen.getByTestId('delta-readonly-dt-1-sortOrdering')).toHaveTextContent('posId (DESC)');
  });

  // 8.1.3: Test that columnDefinitions for each dataType render as a table with correct column values
  it('renders columnDefinitions as a table with correct values per dataType', () => {
    const json = buildTestDefinitionJson();

    render(<DeltaByUniqueIdReadOnlyView definition={json} />);

    // First dataType columns table
    const table0 = screen.getByTestId('delta-readonly-dt-0-columns-table');
    expect(table0).toBeInTheDocument();

    // Check that the table has proper headers
    const headers0 = table0.querySelectorAll('th');
    expect(headers0).toHaveLength(4);
    expect(headers0[0]).toHaveTextContent('Data Attribute');
    expect(headers0[1]).toHaveTextContent('Display');
    expect(headers0[2]).toHaveTextContent('Type');
    expect(headers0[3]).toHaveTextContent('Is Entity ID');

    // Check first dataType column rows
    const col0_0 = screen.getByTestId('delta-readonly-dt-0-col-0');
    const cells0_0 = col0_0.querySelectorAll('td');
    expect(cells0_0[0]).toHaveTextContent('name');
    expect(cells0_0[1]).toHaveTextContent('Name');
    expect(cells0_0[2]).toHaveTextContent('string');
    expect(cells0_0[3]).toHaveTextContent('Yes');

    const col0_1 = screen.getByTestId('delta-readonly-dt-0-col-1');
    const cells0_1 = col0_1.querySelectorAll('td');
    expect(cells0_1[0]).toHaveTextContent('value');
    expect(cells0_1[1]).toHaveTextContent('Value');
    expect(cells0_1[2]).toHaveTextContent('number');
    expect(cells0_1[3]).toHaveTextContent('No');

    // Second dataType columns table -- 4 columns
    const table1 = screen.getByTestId('delta-readonly-dt-1-columns-table');
    expect(table1).toBeInTheDocument();

    const col1_0 = screen.getByTestId('delta-readonly-dt-1-col-0');
    const cells1_0 = col1_0.querySelectorAll('td');
    expect(cells1_0[0]).toHaveTextContent('posId');
    expect(cells1_0[1]).toHaveTextContent('Position ID');
    expect(cells1_0[2]).toHaveTextContent('string');
    expect(cells1_0[3]).toHaveTextContent('Yes');

    const col1_1 = screen.getByTestId('delta-readonly-dt-1-col-1');
    const cells1_1 = col1_1.querySelectorAll('td');
    expect(cells1_1[0]).toHaveTextContent('amount');
    expect(cells1_1[1]).toHaveTextContent('Amount');
    expect(cells1_1[2]).toHaveTextContent('number');
    expect(cells1_1[3]).toHaveTextContent('No');

    const col1_2 = screen.getByTestId('delta-readonly-dt-1-col-2');
    const cells1_2 = col1_2.querySelectorAll('td');
    expect(cells1_2[0]).toHaveTextContent('tradeDate');
    expect(cells1_2[1]).toHaveTextContent('Trade Date');
    expect(cells1_2[2]).toHaveTextContent('date');
    expect(cells1_2[3]).toHaveTextContent('No');

    const col1_3 = screen.getByTestId('delta-readonly-dt-1-col-3');
    const cells1_3 = col1_3.querySelectorAll('td');
    expect(cells1_3[0]).toHaveTextContent('isActive');
    expect(cells1_3[1]).toHaveTextContent('Active');
    expect(cells1_3[2]).toHaveTextContent('boolean');
    expect(cells1_3[3]).toHaveTextContent('No');

    // Confirm no editable controls anywhere in the view
    const container = screen.getByTestId('delta-readonly-view');
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('textarea')).toHaveLength(0);
    expect(container.querySelectorAll('select')).toHaveLength(0);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
