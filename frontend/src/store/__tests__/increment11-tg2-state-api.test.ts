import type {
  GridRowData,
  DirectChangesData,
  ImpactDataData,
  CtaData,
} from '../scenariosSlice';

describe('Increment 11 TG2 -- State Interfaces (Retained Types)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test: GridRowData, DirectChangesData, and ImpactDataData interfaces compile with correct shape
  it('GridRowData, DirectChangesData, and ImpactDataData interfaces compile with correct shape', () => {
    // GridRowData type-check
    const row: GridRowData = {
      rowId: 'row-uuid-1',
      payload: { 'Risk Factor': 'FX_USDJPY', 'Current Value': 1.35, 'Is Active': true },
    };
    expect(row.rowId).toBe('row-uuid-1');
    expect(row.payload['Risk Factor']).toBe('FX_USDJPY');

    // DirectChangesData type-check
    const directChanges: DirectChangesData = {
      columns: ['Risk Factor', 'Current Value'],
      rows: [row],
    };
    expect(directChanges.columns).toHaveLength(2);
    expect(directChanges.rows).toHaveLength(1);

    // ImpactDataData type-check with compareCta present
    const ctaPresent: CtaData = { label: 'Compare results', url: 'https://example.com/compare' };
    const impactDataWithCta: ImpactDataData = {
      columns: ['Risk Class', 'Capital Charge'],
      rows: [{ rowId: 'row-i-1', payload: { 'Risk Class': 'FX', 'Capital Charge': 300000 } }],
      compareCta: ctaPresent,
    };
    expect(impactDataWithCta.compareCta).not.toBeNull();
    expect(impactDataWithCta.compareCta!.label).toBe('Compare results');

    // ImpactDataData type-check with compareCta null
    const impactDataNoCta: ImpactDataData = {
      columns: ['Risk Class'],
      rows: [],
      compareCta: null,
    };
    expect(impactDataNoCta.compareCta).toBeNull();
    expect(impactDataNoCta.rows).toHaveLength(0);
  });
});
