import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { DataGridTable } from '../DataGridTable';
import { DirectChangesSection } from '../../DirectChangesSection/DirectChangesSection';
import { ImpactDataSection } from '../../ImpactDataSection/ImpactDataSection';
import type {
  GridRowData,
  DirectChangesData,
  ImpactDataData,
} from '../../../store/scenariosSlice';

const sampleColumns = ['Risk Factor', 'Risk Class', 'Current Value'];

const sampleRows: GridRowData[] = [
  {
    rowId: 'row-1',
    payload: {
      'Risk Factor': 'FX_USDJPY',
      'Risk Class': 'FX',
      'Current Value': '1.35',
    },
  },
  {
    rowId: 'row-2',
    payload: {
      'Risk Factor': 'IR_TENOR_5Y',
      'Risk Class': 'IR',
      'Current Value': '0.025',
    },
  },
  {
    rowId: 'row-3',
    payload: {
      'Risk Factor': 'EQ_SP500',
      'Risk Class': 'EQ',
      'Current Value': '4500',
    },
  },
];

const renderDataGridTable = (columns: string[], rows: GridRowData[]) => {
  render(<DataGridTable columns={columns} rows={rows} />);
};

const renderDirectChangesSection = (data: DirectChangesData) => {
  render(<DirectChangesSection data={data} />);
};

const renderImpactDataSection = (data: ImpactDataData) => {
  render(
    <FluentProvider theme={webLightTheme}>
      <ImpactDataSection data={data} />
    </FluentProvider>
  );
};

describe('DataGridTable', () => {
  it('renders column headers from provided columns array', () => {
    renderDataGridTable(sampleColumns, sampleRows);

    expect(screen.getByText('Risk Factor')).toBeInTheDocument();
    expect(screen.getByText('Risk Class')).toBeInTheDocument();
    expect(screen.getByText('Current Value')).toBeInTheDocument();
  });

  it('renders rows with correct cell values from payload, using rowId as React key', () => {
    renderDataGridTable(sampleColumns, sampleRows);

    // Row 1 values
    expect(screen.getByText('FX_USDJPY')).toBeInTheDocument();
    expect(screen.getByText('FX')).toBeInTheDocument();
    expect(screen.getByText('1.35')).toBeInTheDocument();

    // Row 2 values
    expect(screen.getByText('IR_TENOR_5Y')).toBeInTheDocument();
    expect(screen.getByText('IR')).toBeInTheDocument();
    expect(screen.getByText('0.025')).toBeInTheDocument();

    // Row 3 values
    expect(screen.getByText('EQ_SP500')).toBeInTheDocument();
    expect(screen.getByText('EQ')).toBeInTheDocument();
    expect(screen.getByText('4500')).toBeInTheDocument();

    // Verify correct number of data rows (tbody rows)
    const tableBody = screen.getByRole('table').querySelector('tbody');
    expect(tableBody).not.toBeNull();
    const dataRows = tableBody!.querySelectorAll('tr');
    expect(dataRows).toHaveLength(3);
  });

  it('sorting: clicking a column header sorts rows ascending; clicking again sorts descending', async () => {
    const user = userEvent.setup();
    renderDataGridTable(sampleColumns, sampleRows);

    // Click "Risk Factor" to sort ascending
    await user.click(screen.getByText('Risk Factor'));

    // Verify ascending order: EQ_SP500, FX_USDJPY, IR_TENOR_5Y
    const tableBody = screen.getByRole('table').querySelector('tbody');
    let rows = tableBody!.querySelectorAll('tr');
    expect(rows[0]).toHaveTextContent('EQ_SP500');
    expect(rows[1]).toHaveTextContent('FX_USDJPY');
    expect(rows[2]).toHaveTextContent('IR_TENOR_5Y');

    // Verify ascending indicator is shown
    expect(screen.getByText('\u25B2')).toBeInTheDocument();

    // Click "Risk Factor" again to sort descending
    await user.click(screen.getByText('Risk Factor'));

    rows = tableBody!.querySelectorAll('tr');
    expect(rows[0]).toHaveTextContent('IR_TENOR_5Y');
    expect(rows[1]).toHaveTextContent('FX_USDJPY');
    expect(rows[2]).toHaveTextContent('EQ_SP500');

    // Verify descending indicator is shown
    expect(screen.getByText('\u25BC')).toBeInTheDocument();
  });

  it('filtering: entering text in filter input filters rows where any cell value contains the text (case-insensitive)', async () => {
    const user = userEvent.setup();
    renderDataGridTable(sampleColumns, sampleRows);

    const filterInput = screen.getByLabelText('Filter rows');

    // Filter by "fx" (case-insensitive) -- should match row-1 (FX_USDJPY, FX)
    await user.type(filterInput, 'fx');

    const tableBody = screen.getByRole('table').querySelector('tbody');
    const visibleRows = tableBody!.querySelectorAll('tr');
    expect(visibleRows).toHaveLength(1);
    expect(visibleRows[0]).toHaveTextContent('FX_USDJPY');

    // Clear filter and type new text
    await user.clear(filterInput);
    await user.type(filterInput, 'eq');

    const visibleRowsAfter = tableBody!.querySelectorAll('tr');
    expect(visibleRowsAfter).toHaveLength(1);
    expect(visibleRowsAfter[0]).toHaveTextContent('EQ_SP500');
  });

  // ========================================================================
  // Increment 11 Gap Test: numeric sort
  // ========================================================================

  it('with numeric values sorts numerically not lexicographically', async () => {
    const user = userEvent.setup();
    const numericColumns = ['Item', 'Amount'];
    const numericRows: GridRowData[] = [
      { rowId: 'r-1', payload: { 'Item': 'Alpha', 'Amount': 100 } },
      { rowId: 'r-2', payload: { 'Item': 'Beta', 'Amount': 9 } },
      { rowId: 'r-3', payload: { 'Item': 'Gamma', 'Amount': 50 } },
      { rowId: 'r-4', payload: { 'Item': 'Delta', 'Amount': 1000 } },
    ];

    renderDataGridTable(numericColumns, numericRows);

    // Click "Amount" to sort ascending
    await user.click(screen.getByText('Amount'));

    const tableBody = screen.getByRole('table').querySelector('tbody');
    const rows = tableBody!.querySelectorAll('tr');

    // Numeric ascending order: 9, 50, 100, 1000
    // If sorted lexicographically it would be: 100, 1000, 50, 9
    expect(rows[0]).toHaveTextContent('9');
    expect(rows[1]).toHaveTextContent('50');
    expect(rows[2]).toHaveTextContent('100');
    expect(rows[3]).toHaveTextContent('1000');

    // Verify Beta (9) is first, Delta (1000) is last
    expect(rows[0]).toHaveTextContent('Beta');
    expect(rows[3]).toHaveTextContent('Delta');
  });

  // ========================================================================
  // Increment 11 Gap Test: filter clears correctly
  // ========================================================================

  it('filter clears correctly when filter text is emptied, restoring all rows', async () => {
    const user = userEvent.setup();
    renderDataGridTable(sampleColumns, sampleRows);

    const filterInput = screen.getByLabelText('Filter rows');

    // Filter to show only 1 row
    await user.type(filterInput, 'IR_TENOR');

    const tableBody = screen.getByRole('table').querySelector('tbody');
    let rows = tableBody!.querySelectorAll('tr');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('IR_TENOR_5Y');

    // Clear the filter completely
    await user.clear(filterInput);

    // All 3 rows should be visible again
    rows = tableBody!.querySelectorAll('tr');
    expect(rows).toHaveLength(3);

    // Verify all original rows are present
    expect(screen.getByText('FX_USDJPY')).toBeInTheDocument();
    expect(screen.getByText('IR_TENOR_5Y')).toBeInTheDocument();
    expect(screen.getByText('EQ_SP500')).toBeInTheDocument();
  });
});

describe('DirectChangesSection', () => {
  it('renders DataGridTable with correct props and shows empty state when rows array is empty', () => {
    const emptyData: DirectChangesData = {
      columns: ['Risk Factor', 'Risk Class'],
      rows: [],
    };
    renderDirectChangesSection(emptyData);

    // Verify section heading
    expect(screen.getByText('Direct Changes')).toBeInTheDocument();

    // Verify empty state message
    expect(
      screen.getByText('No direct changes data available')
    ).toBeInTheDocument();

    // Verify no table is rendered
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders DataGridTable with data when rows are present', () => {
    const data: DirectChangesData = {
      columns: sampleColumns,
      rows: sampleRows,
    };
    renderDirectChangesSection(data);

    // Verify section heading
    expect(screen.getByText('Direct Changes')).toBeInTheDocument();

    // Verify table is rendered with data
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('FX_USDJPY')).toBeInTheDocument();

    // Verify no empty state message
    expect(
      screen.queryByText('No direct changes data available')
    ).not.toBeInTheDocument();
  });
});

describe('ImpactDataSection', () => {
  it('renders DataGridTable with correct props and shows Compare CTA link when compareCta is present', () => {
    const data: ImpactDataData = {
      columns: ['Risk Class', 'Risk Measure', 'Capital Charge'],
      rows: [
        {
          rowId: 'impact-1',
          payload: {
            'Risk Class': 'FX',
            'Risk Measure': 'IMCC',
            'Capital Charge': '125000',
          },
        },
      ],
      compareCta: {
        label: 'Compare results',
        url: 'https://compare.example.com/results',
      },
    };
    renderImpactDataSection(data);

    // Verify section heading
    expect(screen.getByText('Impact Data')).toBeInTheDocument();

    // Verify table data renders
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('IMCC')).toBeInTheDocument();
    expect(screen.getByText('125000')).toBeInTheDocument();

    // Verify Compare CTA link renders
    const ctaLink = screen.getByText('Compare results');
    expect(ctaLink).toBeInTheDocument();
    const anchor = ctaLink.closest('a');
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute(
      'href',
      'https://compare.example.com/results'
    );
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute(
      'rel',
      expect.stringContaining('noopener')
    );
    expect(anchor).toHaveAttribute(
      'rel',
      expect.stringContaining('noreferrer')
    );
  });

  it('renders empty state "No impact data available" when rows array is empty', () => {
    const data: ImpactDataData = {
      columns: ['Risk Class', 'Risk Measure'],
      rows: [],
      compareCta: null,
    };
    renderImpactDataSection(data);

    // Verify section heading
    expect(screen.getByText('Impact Data')).toBeInTheDocument();

    // Verify empty state message
    expect(screen.getByText('No impact data available')).toBeInTheDocument();

    // Verify no table is rendered
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('does not render Compare CTA when compareCta is null', () => {
    const data: ImpactDataData = {
      columns: ['Risk Class', 'Risk Measure', 'Capital Charge'],
      rows: [
        {
          rowId: 'impact-1',
          payload: {
            'Risk Class': 'FX',
            'Risk Measure': 'IMCC',
            'Capital Charge': '125000',
          },
        },
      ],
      compareCta: null,
    };
    renderImpactDataSection(data);

    // Verify table renders
    expect(screen.getByRole('table')).toBeInTheDocument();

    // Verify no CTA link is rendered
    expect(screen.queryByText('Compare results')).not.toBeInTheDocument();
    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(0);
  });
});
