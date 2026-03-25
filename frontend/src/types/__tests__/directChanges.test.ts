import type {
  DirectChangesColumnDefinitionFe,
  DirectChangesDataSectionFe,
} from '../directChanges';

/**
 * Task Group 1 -- Tests 1 & 2: Shared type shape verification.
 * These tests verify that the extracted interfaces from types/directChanges.ts
 * have the correct shape by constructing objects that satisfy the interface
 * and asserting on their properties at runtime.
 */

describe('directChanges shared types', () => {
  // Test 1: DirectChangesColumnDefinitionFe has the correct shape
  it('DirectChangesColumnDefinitionFe has the correct shape (dataAttribute, type, display, isEntityId)', () => {
    const colDef: DirectChangesColumnDefinitionFe = {
      dataAttribute: 'accountId',
      type: 'string',
      display: 'Account ID',
      isEntityId: true,
    };

    expect(colDef).toHaveProperty('dataAttribute', 'accountId');
    expect(colDef).toHaveProperty('type', 'string');
    expect(colDef).toHaveProperty('display', 'Account ID');
    expect(colDef).toHaveProperty('isEntityId', true);

    // isEntityId is optional -- verify a column without it also satisfies the type
    const colDefWithoutEntityId: DirectChangesColumnDefinitionFe = {
      dataAttribute: 'value',
      type: 'number',
      display: 'Value',
    };

    expect(colDefWithoutEntityId).toHaveProperty('dataAttribute', 'value');
    expect(colDefWithoutEntityId).toHaveProperty('type', 'number');
    expect(colDefWithoutEntityId).toHaveProperty('display', 'Value');
    expect(colDefWithoutEntityId.isEntityId).toBeUndefined();
  });

  // Test 2: DirectChangesDataSectionFe has the correct shape
  it('DirectChangesDataSectionFe has the correct shape (dataType, header, externalLink, totalDataChanges, renderState, columnDefinitions, data)', () => {
    const section: DirectChangesDataSectionFe = {
      dataType: 'timeSeriesValues',
      header: '5 Time-series Points changed',
      externalLink: 'https://example.com/view',
      totalDataChanges: 5,
      renderState: 'ROWS',
      columnDefinitions: [
        { dataAttribute: 'tsName', type: 'string', display: 'Time-Series Name', isEntityId: true },
        { dataAttribute: 'date', type: 'date', display: 'Date' },
      ],
      data: [
        { tsName: 'TS_FX_USD', date: '2026-01-15' },
      ],
    };

    expect(section).toHaveProperty('dataType', 'timeSeriesValues');
    expect(section).toHaveProperty('header', '5 Time-series Points changed');
    expect(section).toHaveProperty('externalLink', 'https://example.com/view');
    expect(section).toHaveProperty('totalDataChanges', 5);
    expect(section).toHaveProperty('renderState', 'ROWS');
    expect(section.columnDefinitions).toHaveLength(2);
    expect(section.columnDefinitions[0]).toHaveProperty('dataAttribute', 'tsName');
    expect(section.data).toHaveLength(1);
    expect(section.data![0]).toHaveProperty('tsName', 'TS_FX_USD');

    // Verify null data and null externalLink are also valid
    const sectionNoData: DirectChangesDataSectionFe = {
      dataType: 'emptySection',
      header: '0 Items',
      externalLink: null,
      totalDataChanges: 0,
      renderState: 'NO_DATA',
      columnDefinitions: [],
      data: null,
    };

    expect(sectionNoData.externalLink).toBeNull();
    expect(sectionNoData.data).toBeNull();
    expect(sectionNoData.renderState).toBe('NO_DATA');
  });
});
