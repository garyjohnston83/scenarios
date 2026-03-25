import { validateDeltaDefinition } from '../deltaValidation';
import type { DeltaDefinitionState } from '../ChangeViewStructuredEditorPanel';

/**
 * Builds a valid DeltaDefinitionState with sensible defaults.
 * Individual tests override specific fields to trigger validation errors.
 */
function buildValidDefinition(overrides?: Partial<DeltaDefinitionState>): DeltaDefinitionState {
  return {
    schema_version: '1.0',
    template_key: 'test_template',
    scenario_type: 'TEST_TYPE',
    display_name: 'Test Template',
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
    ],
    ...overrides,
  };
}

describe('deltaValidation -- validateDeltaDefinition (Task Group 6)', () => {

  // 6.1.1: Test that missing/empty dataTypeId produces a validation error
  it('produces a validation error when dataTypeId is missing or empty', () => {
    const def = buildValidDefinition({
      dataTypes: [
        {
          dataTypeId: '',
          dataTypeTitle: 'Risk Measures',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
          ],
        },
      ],
    });

    const result = validateDeltaDefinition(def);

    // Aggregate errors should contain the dataTypeId error
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('dataTypeId') && e.message.includes('non-empty string'))).toBe(true);

    // dataTypeErrors for dataType index 0 should contain an entry for dataTypeId
    expect(result.dataTypeErrors[0]).toBeDefined();
    expect(result.dataTypeErrors[0]['dataTypeId']).toBeDefined();
    expect(result.dataTypeErrors[0]['dataTypeId']).toContain('non-empty string');
  });

  // 6.1.2: Test that duplicate dataTypeId across dataTypes produces a validation error
  it('produces a validation error when duplicate dataTypeId exists across dataTypes', () => {
    const def = buildValidDefinition({
      dataTypes: [
        {
          dataTypeId: 'duplicate_id',
          dataTypeTitle: 'First',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
          ],
        },
        {
          dataTypeId: 'duplicate_id',
          dataTypeTitle: 'Second',
          columnDefinitions: [
            { dataAttribute: 'id', type: 'string', display: 'ID', isEntityId: true },
          ],
        },
      ],
    });

    const result = validateDeltaDefinition(def);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('Duplicate dataTypeId') && e.message.includes('duplicate_id'))).toBe(true);

    // The second dataType (index 1) should have the duplicate error
    expect(result.dataTypeErrors[1]).toBeDefined();
    expect(result.dataTypeErrors[1]['dataTypeId']).toContain('Duplicate dataTypeId');
  });

  // 6.1.3: Test that missing/empty dataTypeTitle produces a validation error
  it('produces a validation error when dataTypeTitle is missing or empty', () => {
    const def = buildValidDefinition({
      dataTypes: [
        {
          dataTypeId: 'dt1',
          dataTypeTitle: '',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
          ],
        },
      ],
    });

    const result = validateDeltaDefinition(def);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('dataTypeTitle') && e.message.includes('non-empty string'))).toBe(true);

    expect(result.dataTypeErrors[0]).toBeDefined();
    expect(result.dataTypeErrors[0]['dataTypeTitle']).toContain('non-empty string');
  });

  // 6.1.4: Test that an empty columnDefinitions array produces a validation error
  it('produces a validation error when columnDefinitions array is empty', () => {
    const def = buildValidDefinition({
      dataTypes: [
        {
          dataTypeId: 'dt1',
          dataTypeTitle: 'Risk Measures',
          columnDefinitions: [],
        },
      ],
    });

    const result = validateDeltaDefinition(def);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('columnDefinitions') && e.message.includes('non-empty array'))).toBe(true);

    expect(result.dataTypeErrors[0]).toBeDefined();
    expect(result.dataTypeErrors[0]['columnDefinitions']).toContain('non-empty array');
  });

  // 6.1.5: Test that duplicate dataAttribute within a dataType's columns produces a validation error
  it('produces a validation error when duplicate dataAttribute exists within a dataType columns', () => {
    const def = buildValidDefinition({
      dataTypes: [
        {
          dataTypeId: 'dt1',
          dataTypeTitle: 'Risk Measures',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
            { dataAttribute: 'name', type: 'number', display: 'Name Again' },
          ],
        },
      ],
    });

    const result = validateDeltaDefinition(def);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('duplicate value') && e.message.includes("'name'"))).toBe(true);

    // The column error should be on the second column (index 1)
    expect(result.columnErrors[0]).toBeDefined();
    expect(result.columnErrors[0][1]).toBeDefined();
    expect(result.columnErrors[0][1]['dataAttribute']).toContain('duplicate value');
  });

  // 6.1.6: Test that a dataType without exactly one isEntityId: true column produces a validation error
  it('produces a validation error when no column has isEntityId: true', () => {
    const def = buildValidDefinition({
      dataTypes: [
        {
          dataTypeId: 'dt1',
          dataTypeTitle: 'Risk Measures',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: false },
            { dataAttribute: 'value', type: 'number', display: 'Value', isEntityId: false },
          ],
        },
      ],
    });

    const result = validateDeltaDefinition(def);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('exactly one column must have isEntityId: true'))).toBe(true);

    expect(result.dataTypeErrors[0]).toBeDefined();
    expect(result.dataTypeErrors[0]['isEntityId']).toContain('exactly one column must have isEntityId: true');
  });

  // 6.1.7: Test that sortOrdering.dataAttribute referencing a non-existent column produces a validation error
  it('produces a validation error when sortOrdering.dataAttribute references a non-existent column', () => {
    const def = buildValidDefinition({
      dataTypes: [
        {
          dataTypeId: 'dt1',
          dataTypeTitle: 'Risk Measures',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
          ],
          sortOrdering: { dataAttribute: 'nonExistentColumn', direction: 'ASC' },
        },
      ],
    });

    const result = validateDeltaDefinition(def);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) =>
      e.message.includes('sortOrdering.dataAttribute') &&
      e.message.includes('nonExistentColumn') &&
      e.message.includes('does not reference an existing columnDefinition')
    )).toBe(true);

    expect(result.dataTypeErrors[0]).toBeDefined();
    expect(result.dataTypeErrors[0]['sortOrdering.dataAttribute']).toContain('does not reference an existing columnDefinition');
  });

  // 6.1.8: Test that headerSummaryTextTemplate with invalid placeholders produces a validation error,
  //         while ${changedValuesCount} and ${changedEntitiesCount} are accepted
  it('produces a validation error for invalid placeholders in headerSummaryTextTemplate while accepting valid ones', () => {
    // First, verify that valid placeholders produce NO errors
    const validDef = buildValidDefinition({
      dataTypes: [
        {
          dataTypeId: 'dt1',
          dataTypeTitle: 'Risk Measures',
          headerSummaryTextTemplate: '${changedValuesCount} values and ${changedEntitiesCount} entities changed',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
          ],
        },
      ],
    });

    const validResult = validateDeltaDefinition(validDef);
    // Should have zero errors related to headerSummaryTextTemplate
    expect(validResult.errors.filter((e) => e.path.includes('headerSummaryTextTemplate'))).toHaveLength(0);

    // Now test with an invalid placeholder alongside a valid one
    const invalidDef = buildValidDefinition({
      dataTypes: [
        {
          dataTypeId: 'dt1',
          dataTypeTitle: 'Risk Measures',
          headerSummaryTextTemplate: '${invalidName} data changed with ${changedValuesCount} values',
          columnDefinitions: [
            { dataAttribute: 'name', type: 'string', display: 'Name', isEntityId: true },
          ],
        },
      ],
    });

    const invalidResult = validateDeltaDefinition(invalidDef);

    expect(invalidResult.errors.length).toBeGreaterThan(0);
    expect(invalidResult.errors.some((e) =>
      e.message.includes('headerSummaryTextTemplate') &&
      e.message.includes('invalid placeholder') &&
      e.message.includes('invalidName')
    )).toBe(true);

    expect(invalidResult.dataTypeErrors[0]).toBeDefined();
    expect(invalidResult.dataTypeErrors[0]['headerSummaryTextTemplate']).toContain('invalid placeholder');

    // Only one headerSummaryTextTemplate error should exist -- the invalid placeholder.
    // The valid placeholder ${changedValuesCount} must NOT produce its own error.
    const headerErrors = invalidResult.errors.filter((e) => e.path.includes('headerSummaryTextTemplate'));
    expect(headerErrors).toHaveLength(1);
    // The single error should specifically identify 'invalidName' as the offending placeholder
    expect(headerErrors[0].message).toContain("'${invalidName}'");
  });
});
