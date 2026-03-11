import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { TableBlockRenderer } from '../TableBlockRenderer';
import type { TableBlock } from '../../../types/renderedReport';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
);

const renderWithProvider = (ui: React.ReactElement) => render(ui, { wrapper });

describe('TableBlockRenderer', () => {
  const tableBlockWithGroups: TableBlock = {
    blockType: 'table',
    order: 1,
    tableKey: 'risk-breakdown',
    label: 'Risk Breakdown by Class',
    columnLayout: {
      rowColumns: [
        { key: 'riskClass', header: 'Risk Class' },
        { key: 'subBucket', header: 'Sub-bucket' },
      ],
      columnGroups: [
        {
          groupLabel: 'Production',
          columns: [
            { key: 'prod_var', header: 'VaR' },
            { key: 'prod_es', header: 'ES' },
          ],
        },
        {
          groupLabel: 'Scenario',
          columns: [
            { key: 'scen_var', header: 'VaR' },
            { key: 'scen_es', header: 'ES' },
          ],
        },
        {
          groupLabel: 'Delta',
          columns: [
            { key: 'delta_var', header: 'VaR', formatToken: 'negative' },
            { key: 'delta_es', header: 'ES', formatToken: 'positive' },
          ],
        },
      ],
    },
    rows: [
      {
        rowId: 'row-1',
        cells: {
          riskClass: { value: 'FX' },
          subBucket: { value: 'G10' },
          prod_var: { value: '1,250,000' },
          prod_es: { value: '1,800,000' },
          scen_var: { value: '1,350,000' },
          scen_es: { value: '1,750,000' },
          delta_var: { value: '+100,000', formatToken: 'negative' },
          delta_es: { value: '-50,000', formatToken: 'positive' },
        },
      },
    ],
  };

  it('renders two-level grouped headers (group header row + column header row)', () => {
    renderWithProvider(<TableBlockRenderer block={tableBlockWithGroups} />);

    // Table label heading
    expect(screen.getByText('Risk Breakdown by Class')).toBeInTheDocument();

    // Row column headers (with rowSpan=2)
    expect(screen.getByText('Risk Class')).toBeInTheDocument();
    expect(screen.getByText('Sub-bucket')).toBeInTheDocument();

    // Group headers
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Scenario')).toBeInTheDocument();
    expect(screen.getByText('Delta')).toBeInTheDocument();

    // Column headers within groups - VaR appears 3 times (Production, Scenario, Delta)
    const varHeaders = screen.getAllByText('VaR');
    expect(varHeaders.length).toBe(3);

    // ES column headers appear 3 times
    const esHeaders = screen.getAllByText('ES');
    expect(esHeaders.length).toBe(3);

    // Verify the group headers have correct colSpan
    const productionHeader = screen.getByText('Production');
    expect(productionHeader.closest('th')).toHaveAttribute('colspan', '2');

    // Verify row column headers have correct rowSpan
    const riskClassHeader = screen.getByText('Risk Class');
    expect(riskClassHeader.closest('th')).toHaveAttribute('rowspan', '2');

    // Verify row data
    expect(screen.getByText('FX')).toBeInTheDocument();
    expect(screen.getByText('G10')).toBeInTheDocument();
    expect(screen.getByText('1,250,000')).toBeInTheDocument();
  });

  it('applies cell-level formatToken CSS class', () => {
    renderWithProvider(<TableBlockRenderer block={tableBlockWithGroups} />);

    // Delta VaR cell with formatToken 'negative'
    const deltaVarCell = screen.getByText('+100,000');
    expect(deltaVarCell).toBeInTheDocument();
    // identity-obj-proxy returns class name as string, so 'negative' class is applied
    expect(deltaVarCell.closest('td')).toHaveClass('negative');

    // Delta ES cell with formatToken 'positive'
    const deltaEsCell = screen.getByText('-50,000');
    expect(deltaEsCell).toBeInTheDocument();
    expect(deltaEsCell.closest('td')).toHaveClass('positive');
  });
});
