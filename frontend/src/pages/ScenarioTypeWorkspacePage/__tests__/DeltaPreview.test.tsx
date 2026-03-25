import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { buildDeltaPreview } from '../ChangeViewPreviewPanel';
import { DeltaPreviewRenderer } from '../DeltaPreviewRenderer';
import type { DirectChangesDataSectionFe } from '../../../types/directChanges';

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
function buildTestDefinitionJson(): string {
  const def = {
    schema_version: '1.0',
    template_key: 'test_template',
    scenario_type: 'TEST_TYPE',
    display_name: 'Test Delta Template',
    description: 'A test description',
    renderMode: 'DELTA_BY_UNIQUE_ID',
    dataTypes: [
      {
        dataTypeId: 'riskMeasures',
        dataTypeTitle: 'Risk Measures',
        headerSummaryTextTemplate: '${changedValuesCount} values changed across ${changedEntitiesCount} entities',
        columnDefinitions: [
          { dataAttribute: 'entityName', type: 'string', display: 'Entity Name', isEntityId: true },
          { dataAttribute: 'currentValue', type: 'number', display: 'Current Value' },
          { dataAttribute: 'effectiveDate', type: 'date', display: 'Effective Date' },
          { dataAttribute: 'isActive', type: 'boolean', display: 'Is Active' },
        ],
        sortOrdering: { dataAttribute: 'entityName', direction: 'ASC' },
        rowThreshold: 500,
        overflowMessage: 'Too many changes to display inline.',
      },
      {
        dataTypeId: 'positions',
        dataTypeTitle: 'Positions',
        headerSummaryTextTemplate: '${changedEntitiesCount} positions changed',
        columnDefinitions: [
          { dataAttribute: 'posId', type: 'string', display: 'Position ID', isEntityId: true },
          { dataAttribute: 'amount', type: 'number', display: 'Amount' },
        ],
        sortOrdering: { dataAttribute: 'posId', direction: 'DESC' },
      },
    ],
  };
  return JSON.stringify(def, null, 2);
}

describe('DeltaPreview (Task Group 7)', () => {

  // 7.1.1: Test that buildDeltaPreview() generates the correct number of mock data sections
  //         from a valid DELTA_BY_UNIQUE_ID template JSON
  it('buildDeltaPreview generates the correct number of mock data sections', () => {
    const json = buildTestDefinitionJson();
    const sections = buildDeltaPreview(json);

    expect(sections).not.toBeNull();
    expect(sections!.length).toBe(2);

    // First section should correspond to 'riskMeasures'
    expect(sections![0].dataType).toBe('riskMeasures');
    // Second section should correspond to 'positions'
    expect(sections![1].dataType).toBe('positions');

    // Each section should have 3-5 mock rows
    expect(sections![0].data).not.toBeNull();
    expect(sections![0].data!.length).toBeGreaterThanOrEqual(3);
    expect(sections![0].data!.length).toBeLessThanOrEqual(5);

    expect(sections![1].data).not.toBeNull();
    expect(sections![1].data!.length).toBeGreaterThanOrEqual(3);
    expect(sections![1].data!.length).toBeLessThanOrEqual(5);

    // Column definitions should be populated
    expect(sections![0].columnDefinitions.length).toBe(4);
    expect(sections![1].columnDefinitions.length).toBe(2);

    // Default renderState should be 'ROWS'
    expect(sections![0].renderState).toBe('ROWS');
    expect(sections![1].renderState).toBe('ROWS');
  });

  // 7.1.2: Test that mock rows contain type-appropriate values
  it('mock rows contain type-appropriate values for each column type', () => {
    const json = buildTestDefinitionJson();
    const sections = buildDeltaPreview(json);
    expect(sections).not.toBeNull();

    // The first section (riskMeasures) has: entityName (string, isEntityId), currentValue (number),
    // effectiveDate (date), isActive (boolean)
    const rows = sections![0].data!;
    expect(rows.length).toBeGreaterThan(0);

    // Check first row
    const firstRow = rows[0];

    // entityId string column should have "Entity_X" pattern
    expect(typeof firstRow['entityName']).toBe('string');
    expect((firstRow['entityName'] as string)).toMatch(/^Entity_\d+$/);

    // number column should have a numeric value
    expect(typeof firstRow['currentValue']).toBe('number');

    // date column should be an ISO date string
    expect(typeof firstRow['effectiveDate']).toBe('string');
    expect((firstRow['effectiveDate'] as string)).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // boolean column should be true or false
    expect(typeof firstRow['isActive']).toBe('boolean');

    // Check second row to verify alternating boolean
    const secondRow = rows[1];
    expect(typeof secondRow['isActive']).toBe('boolean');
    expect(secondRow['isActive']).toBe(!firstRow['isActive']);

    // Regular (non-entityId) string columns in the second section should have "Value_X" pattern
    // (second section only has entityId and number columns, but let's verify entityId pattern too)
    const posRows = sections![1].data!;
    expect((posRows[0]['posId'] as string)).toMatch(/^Entity_\d+$/);
    expect(typeof posRows[0]['amount']).toBe('number');
  });

  // 7.1.3: Test that headerSummaryTextTemplate placeholders are replaced with mock counts
  it('headerSummaryTextTemplate placeholders are replaced with mock counts', () => {
    const json = buildTestDefinitionJson();
    const sections = buildDeltaPreview(json);
    expect(sections).not.toBeNull();

    // First section template: '${changedValuesCount} values changed across ${changedEntitiesCount} entities'
    // After replacement, should contain actual numbers instead of ${...}
    expect(sections![0].header).not.toContain('${changedValuesCount}');
    expect(sections![0].header).not.toContain('${changedEntitiesCount}');
    // The header should contain numeric values (the row count and entity count)
    expect(sections![0].header).toMatch(/^\d+ values changed across \d+ entities$/);

    // Second section template: '${changedEntitiesCount} positions changed'
    expect(sections![1].header).not.toContain('${changedEntitiesCount}');
    expect(sections![1].header).toMatch(/^\d+ positions changed$/);
  });

  // 7.1.4: Test that DeltaPreviewRenderer renders DirectChangesSectionAccordion for each section
  it('DeltaPreviewRenderer renders an accordion section for each dataType', () => {
    const json = buildTestDefinitionJson();
    const sections = buildDeltaPreview(json);
    expect(sections).not.toBeNull();

    renderWithProvider(
      <DeltaPreviewRenderer sections={sections!} />
    );

    // Both section headers should be rendered via the accordion
    // The headers contain the filled-in template text
    // Verify the container is present
    expect(screen.getByTestId('delta-preview-renderer')).toBeInTheDocument();

    // Each section should have a state toggle group
    expect(screen.getByTestId('state-toggle-riskMeasures')).toBeInTheDocument();
    expect(screen.getByTestId('state-toggle-positions')).toBeInTheDocument();

    // Each toggle group should have three buttons: ROWS, OVERFLOW, NO_DATA
    const riskToggle = screen.getByTestId('state-toggle-riskMeasures');
    expect(riskToggle.querySelectorAll('button').length).toBe(3);
  });

  // 7.1.5: Test that per-section state toggle buttons change the section's renderState
  it('per-section state toggle buttons change the render state and update the display', () => {
    const sections: DirectChangesDataSectionFe[] = [
      {
        dataType: 'testSection',
        header: '3 values changed',
        externalLink: null,
        totalDataChanges: 3,
        renderState: 'ROWS',
        columnDefinitions: [
          { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
        ],
        data: [
          { name: 'Entity_1' },
          { name: 'Entity_2' },
          { name: 'Entity_3' },
        ],
      },
    ];

    renderWithProvider(
      <DeltaPreviewRenderer sections={sections} />
    );

    // Initially in ROWS state -- should show the table
    expect(screen.getByRole('table')).toBeInTheDocument();

    // Click OVERFLOW toggle button
    const overflowButton = screen.getByTestId('toggle-OVERFLOW-testSection');
    fireEvent.click(overflowButton);

    // Should now show the overflow message, no table
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/Too many changes to display inline/)).toBeInTheDocument();

    // Click NO_DATA toggle button
    const noDataButton = screen.getByTestId('toggle-NO_DATA-testSection');
    fireEvent.click(noDataButton);

    // Should now show the no-data message
    expect(screen.getByText('Data changes not available here')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // Click ROWS toggle button to go back
    const rowsButton = screen.getByTestId('toggle-ROWS-testSection');
    fireEvent.click(rowsButton);

    // Should be back to showing a table
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
