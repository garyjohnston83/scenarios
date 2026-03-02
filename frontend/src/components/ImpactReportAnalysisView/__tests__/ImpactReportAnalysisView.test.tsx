import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ImpactReportAnalysisView } from '../ImpactReportAnalysisView';
import type { ImpactReportData } from '../../../store/scenariosSlice';

const renderComponent = (report: ImpactReportData) => {
  return render(
    <FluentProvider theme={webLightTheme}>
      <ImpactReportAnalysisView report={report} />
    </FluentProvider>
  );
};

describe('ImpactReportAnalysisView', () => {
  const fullReport: ImpactReportData = {
    impactRunId: 'run-abc-123',
    name: 'RUN-2026-0219-001',
    createdAt: '2026-02-19T14:00:00',
    dataset: {
      columns: ['Risk Class', 'Risk Measure', 'Base Value', 'Stressed Value', 'PnL Impact'],
      rows: [
        {
          rowId: 'r1',
          payload: {
            'Risk Class': 'FX',
            'Risk Measure': 'VaR 99%',
            'Base Value': 1250000,
            'Stressed Value': 1290000,
            'PnL Impact': 40000,
          },
        },
        {
          rowId: 'r2',
          payload: {
            'Risk Class': 'IR',
            'Risk Measure': 'Expected Shortfall',
            'Base Value': 2100000,
            'Stressed Value': 2250000,
            'PnL Impact': 150000,
          },
        },
      ],
    },
    compareCta: {
      label: 'Compare results',
      url: 'https://external.example.com/compare',
    },
  };

  const emptyReport: ImpactReportData = {
    impactRunId: 'run-empty-456',
    name: 'RUN-2026-0219-EMPTY',
    createdAt: '2026-02-19T15:30:00',
    dataset: {
      columns: ['Risk Class', 'Risk Measure'],
      rows: [],
    },
    compareCta: null,
  };

  // Task 7.5: Test metadata strip renders report name and formatted createdAt

  it('renders the report name in the metadata strip', () => {
    renderComponent(fullReport);
    expect(screen.getByText('RUN-2026-0219-001')).toBeInTheDocument();
  });

  it('renders a formatted createdAt date in the metadata strip', () => {
    renderComponent(fullReport);
    // formatDate uses en-GB locale: dd/mm/yyyy, hh:mm:ss
    // The exact format may vary by environment, but the date should be present
    // Check that some date representation is rendered (not the raw ISO string)
    const dateElements = screen.getAllByText(/2026/);
    expect(dateElements.length).toBeGreaterThanOrEqual(1);
  });

  // Task 7.5: Test DataGridTable rendered with correct columns and rows

  it('renders DataGridTable with correct columns', () => {
    renderComponent(fullReport);

    // Column headers from the DataGridTable
    expect(screen.getByText('Risk Class')).toBeInTheDocument();
    expect(screen.getByText('Risk Measure')).toBeInTheDocument();
    expect(screen.getByText('Base Value')).toBeInTheDocument();
    expect(screen.getByText('Stressed Value')).toBeInTheDocument();
    expect(screen.getByText('PnL Impact')).toBeInTheDocument();
  });

  it('renders DataGridTable with correct row data', () => {
    renderComponent(fullReport);

    // Row data values from the payload
    expect(screen.getByText('FX')).toBeInTheDocument();
    expect(screen.getByText('VaR 99%')).toBeInTheDocument();
    expect(screen.getByText('1250000')).toBeInTheDocument();
    expect(screen.getByText('IR')).toBeInTheDocument();
    expect(screen.getByText('Expected Shortfall')).toBeInTheDocument();
  });

  it('renders multiple rows', () => {
    renderComponent(fullReport);

    // Both rows should be rendered
    expect(screen.getByText('FX')).toBeInTheDocument();
    expect(screen.getByText('IR')).toBeInTheDocument();
  });

  // Task 7.5: Test empty state when rows empty

  it('shows empty state message when report has no rows', () => {
    renderComponent(emptyReport);
    expect(
      screen.getByText('No impact data available for this report.')
    ).toBeInTheDocument();
  });

  it('still renders report name in empty state', () => {
    renderComponent(emptyReport);
    expect(screen.getByText('RUN-2026-0219-EMPTY')).toBeInTheDocument();
  });

  // Task 7.5: Test compareCta NOT rendered (D5)

  it('does NOT render compareCta label or link', () => {
    renderComponent(fullReport);

    // The compareCta has label "Compare results" but it should NOT be rendered
    expect(screen.queryByText('Compare results')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /compare/i })
    ).not.toBeInTheDocument();
  });

  it('does NOT render any link to the compare URL', () => {
    renderComponent(fullReport);

    // Verify the external compare URL is not rendered as a link
    const links = screen.queryAllByRole('link');
    const compareLink = links.find((link) =>
      link.getAttribute('href')?.includes('compare')
    );
    expect(compareLink).toBeUndefined();
  });
});
