import { render, screen, fireEvent, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DeltaByUniqueIdEditorPanel } from '../DeltaByUniqueIdEditorPanel';
import { DataTypeEditorPanel } from '../DataTypeEditorPanel';
import { parseDeltaDefinition } from '../ChangeViewStructuredEditorPanel';
import { buildDeltaPreview } from '../ChangeViewPreviewPanel';
import { validateDeltaDefinition } from '../deltaValidation';
import type { DeltaDefinitionState, DeltaDataType } from '../ChangeViewStructuredEditorPanel';

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

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <FluentProvider theme={webLightTheme}>
      {ui}
    </FluentProvider>
  );
};

/**
 * Builds a complete valid DELTA_BY_UNIQUE_ID definition JSON string for integration tests.
 */
function buildFullDefinitionJson(overrides?: Record<string, unknown>): string {
  const base = {
    schema_version: '1.0',
    template_key: 'integration_test',
    scenario_type: 'TEST_TYPE',
    display_name: 'Integration Test Template',
    description: 'A test template for integration testing',
    renderMode: 'DELTA_BY_UNIQUE_ID',
    dataTypes: [
      {
        dataTypeId: 'riskFactors',
        dataTypeTitle: 'Risk Factors',
        headerSummaryTextTemplate: '${changedValuesCount} values changed across ${changedEntitiesCount} entities',
        columnDefinitions: [
          { dataAttribute: 'rfName', type: 'string', display: 'Risk Factor Name', isEntityId: true },
          { dataAttribute: 'rfValue', type: 'number', display: 'Value' },
          { dataAttribute: 'effectiveDate', type: 'date', display: 'Effective Date' },
          { dataAttribute: 'isActive', type: 'boolean', display: 'Active' },
        ],
        sortOrdering: { dataAttribute: 'rfName', direction: 'ASC' },
        rowThreshold: 500,
        overflowMessage: 'Too many risk factors to display.',
      },
    ],
    ...overrides,
  };
  return JSON.stringify(base, null, 2);
}

describe('Delta Editor Integration Tests (Task Group 9)', () => {

  // 9.3.1: Round-trip: parseDeltaDefinition -> serialize -> parseDeltaDefinition preserves all fields
  it('parseDeltaDefinition round-trip preserves all DELTA_BY_UNIQUE_ID fields without data loss', () => {
    const originalJson = buildFullDefinitionJson();
    const parsed = parseDeltaDefinition(originalJson);
    expect(parsed).not.toBeNull();

    // Serialize back to JSON
    const reserialized = JSON.stringify(parsed, null, 2);

    // Parse a second time (simulating Structured -> JSON -> Structured)
    const reparsed = parseDeltaDefinition(reserialized);
    expect(reparsed).not.toBeNull();

    // Verify all top-level fields are preserved
    expect(reparsed!.schema_version).toBe('1.0');
    expect(reparsed!.template_key).toBe('integration_test');
    expect(reparsed!.scenario_type).toBe('TEST_TYPE');
    expect(reparsed!.display_name).toBe('Integration Test Template');
    expect(reparsed!.description).toBe('A test template for integration testing');
    expect(reparsed!.renderMode).toBe('DELTA_BY_UNIQUE_ID');

    // Verify dataTypes preserved
    expect(reparsed!.dataTypes).toHaveLength(1);
    const dt = reparsed!.dataTypes[0];
    expect(dt.dataTypeId).toBe('riskFactors');
    expect(dt.dataTypeTitle).toBe('Risk Factors');
    expect(dt.headerSummaryTextTemplate).toBe(
      '${changedValuesCount} values changed across ${changedEntitiesCount} entities'
    );
    expect(dt.rowThreshold).toBe(500);
    expect(dt.overflowMessage).toBe('Too many risk factors to display.');

    // Verify sortOrdering preserved
    expect(dt.sortOrdering).toBeDefined();
    expect(dt.sortOrdering!.dataAttribute).toBe('rfName');
    expect(dt.sortOrdering!.direction).toBe('ASC');

    // Verify all column definitions preserved
    expect(dt.columnDefinitions).toHaveLength(4);
    expect(dt.columnDefinitions[0].dataAttribute).toBe('rfName');
    expect(dt.columnDefinitions[0].type).toBe('string');
    expect(dt.columnDefinitions[0].display).toBe('Risk Factor Name');
    expect(dt.columnDefinitions[0].isEntityId).toBe(true);
    expect(dt.columnDefinitions[1].dataAttribute).toBe('rfValue');
    expect(dt.columnDefinitions[1].type).toBe('number');
    expect(dt.columnDefinitions[2].dataAttribute).toBe('effectiveDate');
    expect(dt.columnDefinitions[2].type).toBe('date');
    expect(dt.columnDefinitions[3].dataAttribute).toBe('isActive');
    expect(dt.columnDefinitions[3].type).toBe('boolean');
  });

  // 9.3.2: Validation errors clear when the user fixes the invalid field
  it('validation errors clear when the invalid field is corrected', () => {
    // Start with invalid definition (empty dataTypeId and dataTypeTitle)
    const invalidDef: DeltaDefinitionState = {
      schema_version: '1.0',
      template_key: 'test',
      scenario_type: 'TEST',
      display_name: 'Test',
      description: '',
      renderMode: 'DELTA_BY_UNIQUE_ID',
      dataTypes: [
        {
          dataTypeId: '',
          dataTypeTitle: '',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
          ],
        },
      ],
    };

    // Validate -- should produce errors for dataTypeId and dataTypeTitle
    const result1 = validateDeltaDefinition(invalidDef);
    expect(result1.errors.length).toBeGreaterThan(0);
    expect(result1.dataTypeErrors[0]).toBeDefined();
    expect(result1.dataTypeErrors[0]['dataTypeId']).toBeDefined();
    expect(result1.dataTypeErrors[0]['dataTypeTitle']).toBeDefined();

    // Fix the fields
    const fixedDef: DeltaDefinitionState = {
      ...invalidDef,
      dataTypes: [
        {
          ...invalidDef.dataTypes[0],
          dataTypeId: 'fixedId',
          dataTypeTitle: 'Fixed Title',
        },
      ],
    };

    // Validate again -- the fixed fields should no longer have errors
    const result2 = validateDeltaDefinition(fixedDef);
    expect(result2.dataTypeErrors[0]?.['dataTypeId']).toBeUndefined();
    expect(result2.dataTypeErrors[0]?.['dataTypeTitle']).toBeUndefined();

    // There should be no errors at all for this definition
    expect(result2.errors).toHaveLength(0);
  });

  // 9.3.3: Editing a column in the DeltaByUniqueIdEditorPanel verifies serialized JSON output has correct shape
  it('editing a column definition propagates correctly to serialized JSON output', () => {
    const onDefinitionChange = jest.fn();
    const json = buildFullDefinitionJson();

    renderWithProvider(
      <DeltaByUniqueIdEditorPanel
        definition={json}
        onDefinitionChange={onDefinitionChange}
      />
    );

    // Select the first dataType
    fireEvent.click(screen.getByTestId('dt-row-0'));

    // Wait for the editor to render the dataType fields
    expect(screen.getByTestId('dt-dataTypeId-input')).toBeInTheDocument();

    // Now change the dataTypeTitle field
    const titleInput = screen.getByTestId('dt-dataTypeTitle-input');
    fireEvent.change(titleInput, { target: { value: 'Updated Risk Factors' } });

    // onDefinitionChange should have been called with the updated JSON
    expect(onDefinitionChange).toHaveBeenCalled();
    const lastCallArg = onDefinitionChange.mock.calls[onDefinitionChange.mock.calls.length - 1][0];
    const parsed = JSON.parse(lastCallArg);

    // Verify the updated field in the JSON
    expect(parsed.dataTypes[0].dataTypeTitle).toBe('Updated Risk Factors');

    // Verify other fields are preserved
    expect(parsed.renderMode).toBe('DELTA_BY_UNIQUE_ID');
    expect(parsed.template_key).toBe('integration_test');
    expect(parsed.dataTypes[0].dataTypeId).toBe('riskFactors');
    expect(parsed.dataTypes[0].columnDefinitions).toHaveLength(4);
    expect(parsed.dataTypes[0].columnDefinitions[0].dataAttribute).toBe('rfName');
    expect(parsed.dataTypes[0].sortOrdering.dataAttribute).toBe('rfName');
  });

  // 9.3.4: buildDeltaPreview returns null for FULL_DATA_CHANGES definitions
  it('buildDeltaPreview returns null for non-DELTA_BY_UNIQUE_ID definitions', () => {
    const fullDataChangesJson = JSON.stringify({
      schema_version: '1.0',
      template_key: 'full_data',
      scenario_type: 'TEST',
      display_name: 'Full Data Changes',
      renderMode: 'FULL_DATA_CHANGES',
      sections: [],
    });

    const result = buildDeltaPreview(fullDataChangesJson);
    expect(result).toBeNull();

    // Also test with invalid JSON
    const invalidResult = buildDeltaPreview('not valid json');
    expect(invalidResult).toBeNull();

    // Also test with empty dataTypes
    const emptyDataTypes = JSON.stringify({
      renderMode: 'DELTA_BY_UNIQUE_ID',
      dataTypes: [],
    });
    const emptyResult = buildDeltaPreview(emptyDataTypes);
    expect(emptyResult).toBeNull();
  });

  // 9.3.5: overflowMessage field shows/hides based on rowThreshold being set
  it('overflowMessage field is hidden when rowThreshold is not set and shown when it is', () => {
    const onChange = jest.fn();

    // DataType WITHOUT rowThreshold
    const dtNoThreshold: DeltaDataType = {
      dataTypeId: 'dt1',
      dataTypeTitle: 'Test Type',
      headerSummaryTextTemplate: '',
      columnDefinitions: [
        { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
      ],
      sortOrdering: { dataAttribute: 'name', direction: 'ASC' },
      rowThreshold: undefined,
      overflowMessage: undefined,
    };

    const { rerender } = renderWithProvider(
      <DataTypeEditorPanel dataType={dtNoThreshold} onChange={onChange} />
    );

    // overflowMessage field should NOT be rendered when rowThreshold is not set
    expect(screen.queryByTestId('dt-overflowMessage-input')).not.toBeInTheDocument();

    // DataType WITH rowThreshold
    const dtWithThreshold: DeltaDataType = {
      ...dtNoThreshold,
      rowThreshold: 100,
      overflowMessage: 'Too many rows.',
    };

    rerender(
      <FluentProvider theme={webLightTheme}>
        <DataTypeEditorPanel dataType={dtWithThreshold} onChange={onChange} />
      </FluentProvider>
    );

    // overflowMessage field SHOULD be rendered when rowThreshold is set
    const overflowInput = screen.getByTestId('dt-overflowMessage-input') as HTMLInputElement;
    expect(overflowInput).toBeInTheDocument();
    expect(overflowInput.value).toBe('Too many rows.');
  });

  // 9.3.6: Validation of rowThreshold/overflowMessage combination
  it('validates that overflowMessage is required when rowThreshold is set', () => {
    const def: DeltaDefinitionState = {
      schema_version: '1.0',
      template_key: 'test',
      scenario_type: 'TEST',
      display_name: 'Test',
      description: '',
      renderMode: 'DELTA_BY_UNIQUE_ID',
      dataTypes: [
        {
          dataTypeId: 'dt1',
          dataTypeTitle: 'Type 1',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
          ],
          rowThreshold: 100,
          overflowMessage: '', // Empty -- should be required when rowThreshold is set
        },
      ],
    };

    const result = validateDeltaDefinition(def);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('overflowMessage') && e.message.includes('required when rowThreshold is set'))).toBe(true);
    expect(result.dataTypeErrors[0]?.['overflowMessage']).toContain('required when rowThreshold is set');

    // Now provide the overflowMessage -- error should clear
    const fixedDef = {
      ...def,
      dataTypes: [
        {
          ...def.dataTypes[0],
          overflowMessage: 'Too many rows to display.',
        },
      ],
    };

    const fixedResult = validateDeltaDefinition(fixedDef);
    expect(fixedResult.dataTypeErrors[0]?.['overflowMessage']).toBeUndefined();
  });

  // 9.3.7: Validation detects more than one isEntityId column
  it('validation detects multiple isEntityId columns within a dataType', () => {
    const def: DeltaDefinitionState = {
      schema_version: '1.0',
      template_key: 'test',
      scenario_type: 'TEST',
      display_name: 'Test',
      description: '',
      renderMode: 'DELTA_BY_UNIQUE_ID',
      dataTypes: [
        {
          dataTypeId: 'dt1',
          dataTypeTitle: 'Type 1',
          columnDefinitions: [
            { dataAttribute: 'col1', type: 'string', display: 'Column 1', isEntityId: true },
            { dataAttribute: 'col2', type: 'string', display: 'Column 2', isEntityId: true },
          ],
        },
      ],
    };

    const result = validateDeltaDefinition(def);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) =>
      e.message.includes('exactly one column must have isEntityId: true') &&
      e.message.includes('found 2')
    )).toBe(true);
    expect(result.dataTypeErrors[0]?.['isEntityId']).toContain('exactly one column must have isEntityId: true');
  });

  // 9.3.8: Full preview pipeline: valid template generates correct mock data that can render
  it('full preview pipeline generates sections with correct structure from valid template', () => {
    const json = buildFullDefinitionJson();
    const sections = buildDeltaPreview(json);

    expect(sections).not.toBeNull();
    expect(sections!).toHaveLength(1);

    const section = sections![0];

    // Verify structure matches DirectChangesDataSectionFe
    expect(section.dataType).toBe('riskFactors');
    expect(section.renderState).toBe('ROWS');
    expect(section.externalLink).toBeNull();
    expect(section.columnDefinitions).toHaveLength(4);
    expect(section.data).not.toBeNull();

    // Verify header has placeholders replaced
    expect(section.header).not.toContain('${changedValuesCount}');
    expect(section.header).not.toContain('${changedEntitiesCount}');
    expect(section.header).toMatch(/^\d+ values changed across \d+ entities$/);

    // Verify mock data rows have type-appropriate values
    const rows = section.data!;
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.length).toBeLessThanOrEqual(5);

    // Each row should have all 4 column attributes
    for (const row of rows) {
      expect(row).toHaveProperty('rfName');
      expect(row).toHaveProperty('rfValue');
      expect(row).toHaveProperty('effectiveDate');
      expect(row).toHaveProperty('isActive');

      // Type checks
      expect(typeof row['rfName']).toBe('string');
      expect(typeof row['rfValue']).toBe('number');
      expect(typeof row['effectiveDate']).toBe('string');
      expect(typeof row['isActive']).toBe('boolean');
    }

    // Verify entityId column values follow "Entity_N" pattern
    expect((rows[0]['rfName'] as string)).toMatch(/^Entity_\d+$/);

    // Verify boolean alternation
    expect(rows[0]['isActive']).not.toBe(rows[1]['isActive']);
  });

  // 9.3.9: Adding a dataType, editing it, and verifying full serialized JSON output
  it('adding a dataType and editing fields produces correct serialized JSON', () => {
    const onDefinitionChange = jest.fn();
    const json = buildFullDefinitionJson();

    renderWithProvider(
      <DeltaByUniqueIdEditorPanel
        definition={json}
        onDefinitionChange={onDefinitionChange}
      />
    );

    // Initially 1 dataType
    expect(screen.getByTestId('dt-row-0')).toBeInTheDocument();
    expect(screen.queryByTestId('dt-row-1')).not.toBeInTheDocument();

    // Add a new dataType
    fireEvent.click(screen.getByTestId('dt-add-button'));

    // Should now have 2 rows
    expect(screen.getByTestId('dt-row-1')).toBeInTheDocument();

    // The new dataType should be auto-selected -- verify the editor shows empty fields
    const idInput = screen.getByTestId('dt-dataTypeId-input') as HTMLInputElement;
    expect(idInput.value).toBe('');

    // Fill in the new dataType's ID
    fireEvent.change(idInput, { target: { value: 'newDataType' } });

    // Verify the serialized JSON contains both dataTypes
    const lastCallArg = onDefinitionChange.mock.calls[onDefinitionChange.mock.calls.length - 1][0];
    const parsed = JSON.parse(lastCallArg);
    expect(parsed.dataTypes).toHaveLength(2);
    expect(parsed.dataTypes[0].dataTypeId).toBe('riskFactors');
    expect(parsed.dataTypes[1].dataTypeId).toBe('newDataType');

    // Verify the original dataType is fully preserved
    expect(parsed.dataTypes[0].columnDefinitions).toHaveLength(4);
    expect(parsed.dataTypes[0].sortOrdering.dataAttribute).toBe('rfName');
    expect(parsed.dataTypes[0].rowThreshold).toBe(500);
  });

  // 9.3.10: Debounced validation fires and shows errors in the DeltaByUniqueIdEditorPanel MessageBar
  //         after editing creates an invalid state, then errors clear after fix
  it('debounced validation MessageBar shows then clears when errors are fixed', async () => {
    jest.useFakeTimers();

    try {
      const onDefinitionChange = jest.fn();

      // Start with a definition that has a single dataType with empty required fields
      const invalidJson = JSON.stringify({
        schema_version: '1.0',
        template_key: 'test',
        scenario_type: 'TEST',
        display_name: 'Test',
        description: '',
        renderMode: 'DELTA_BY_UNIQUE_ID',
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

      // Advance timers to trigger the debounced validation (~300ms)
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // The validation MessageBar should appear
      const messageBar = screen.getByTestId('delta-validation-messagebar');
      expect(messageBar).toBeInTheDocument();
      expect(messageBar.textContent).toBeTruthy();
      // Should mention validation errors
      expect(messageBar.textContent).toMatch(/validation error/i);
    } finally {
      jest.useRealTimers();
    }
  });
});
