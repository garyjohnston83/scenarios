import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { SectionRenderer } from '../SectionRenderer';
import type { ReportSection } from '../../../types/renderedReport';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
);

const renderWithProvider = (ui: React.ReactElement) => render(ui, { wrapper });

describe('SectionRenderer - multiple block types in correct order', () => {
  it('renders metric, text, and table blocks in order ascending', () => {
    const sectionWithAllBlocks: ReportSection = {
      sectionKey: 'mixed-section',
      sectionTitle: 'Complete Section',
      order: 1,
      contentBlocks: [
        {
          blockType: 'table',
          order: 3,
          tableKey: 'summary-table',
          label: 'Summary Table',
          columnLayout: {
            rowColumns: [{ key: 'item', header: 'Item' }],
            columnGroups: [
              {
                groupLabel: 'Values',
                columns: [{ key: 'val', header: 'Amount' }],
              },
            ],
          },
          rows: [
            {
              rowId: 'r1',
              cells: {
                item: { value: 'Row 1' },
                val: { value: '999' },
              },
            },
          ],
        },
        {
          blockType: 'metric',
          order: 1,
          metricKey: 'first-metric',
          label: 'First Metric Label',
          sourceField: 'source_1',
          format: 'number',
          unit: null,
          productionValue: 500,
          scenarioValue: 600,
          deltaValue: 100,
          deltaPct: 20.0,
          formattedProductionValue: '500',
          formattedScenarioValue: '600',
          formattedDelta: '+100',
          formatToken: 'negative',
        },
        {
          blockType: 'text',
          order: 2,
          textKey: 'middle-note',
          content: 'This is a text note between metric and table.',
        },
      ],
    };

    const { container } = renderWithProvider(
      <SectionRenderer section={sectionWithAllBlocks} />
    );

    // Section title is rendered
    expect(screen.getByText('Complete Section')).toBeInTheDocument();

    // Metric block rendered (order 1 - should appear first)
    expect(screen.getByText('First Metric Label')).toBeInTheDocument();

    // Text block rendered (order 2 - should appear second)
    expect(
      screen.getByText('This is a text note between metric and table.')
    ).toBeInTheDocument();

    // Table block rendered (order 3 - should appear third)
    expect(screen.getByText('Summary Table')).toBeInTheDocument();
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('999')).toBeInTheDocument();

    // Verify order: metric testid should appear before text testid, which appears before table testid
    const metricEl = screen.getByTestId('metric-block-first-metric');
    const textEl = screen.getByTestId('text-block-middle-note');
    const tableEl = screen.getByTestId('table-block-summary-table');

    // Use DOM ordering: the metric block should precede the text block,
    // and the text block should precede the table block
    const allElements = container.querySelectorAll('[data-testid]');
    const positions = Array.from(allElements).map((el) =>
      el.getAttribute('data-testid')
    );

    const metricIdx = positions.indexOf('metric-block-first-metric');
    const textIdx = positions.indexOf('text-block-middle-note');
    const tableIdx = positions.indexOf('table-block-summary-table');

    expect(metricIdx).toBeLessThan(textIdx);
    expect(textIdx).toBeLessThan(tableIdx);
  });
});
