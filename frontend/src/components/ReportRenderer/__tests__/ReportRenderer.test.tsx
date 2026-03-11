import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ReportRenderer } from '../ReportRenderer';
import { SectionRenderer } from '../SectionRenderer';
import { TextBlockRenderer } from '../TextBlockRenderer';
import type { RenderedReport, ReportSection, TextBlock } from '../../../types/renderedReport';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
);

const renderWithProvider = (ui: React.ReactElement) => render(ui, { wrapper });

describe('ReportRenderer', () => {
  const mockReport: RenderedReport = {
    reportKey: 'market_risk_summary',
    reportName: 'Market Risk Summary',
    definitionVersion: 1,
    generatedAt: '2026-02-19T14:00:00',
    scenarioId: 'scenario-001',
    scenarioName: 'Test Scenario',
    scenarioTypeCode: 'FRTB_SA',
    sections: [
      {
        sectionKey: 'section-b',
        sectionTitle: 'Second Section',
        order: 2,
        contentBlocks: [
          {
            blockType: 'text',
            order: 1,
            textKey: 'text-2',
            content: 'Content in section B',
          },
        ],
      },
      {
        sectionKey: 'section-a',
        sectionTitle: 'First Section',
        order: 1,
        contentBlocks: [
          {
            blockType: 'text',
            order: 1,
            textKey: 'text-1',
            content: 'Content in section A',
          },
        ],
      },
    ],
  };

  it('renders metadata strip with report name and formatted date', () => {
    renderWithProvider(<ReportRenderer renderedReport={mockReport} />);

    expect(screen.getByText('Market Risk Summary')).toBeInTheDocument();
    // formatDate produces dd/mm/yyyy hh:mm:ss format
    expect(screen.getByText('19/02/2026 14:00:00')).toBeInTheDocument();
  });

  it('renders sections sorted by order ascending', () => {
    renderWithProvider(<ReportRenderer renderedReport={mockReport} />);

    const sectionTitles = screen.getAllByText(/Section/);
    // First Section (order=1) should appear before Second Section (order=2)
    expect(sectionTitles[0]).toHaveTextContent('First Section');
    expect(sectionTitles[1]).toHaveTextContent('Second Section');
  });
});

describe('SectionRenderer', () => {
  const sectionWithMixedBlocks: ReportSection = {
    sectionKey: 'mixed-section',
    sectionTitle: 'Key Risk Metrics',
    order: 1,
    contentBlocks: [
      {
        blockType: 'text',
        order: 2,
        textKey: 'note-1',
        content: 'This is a text note.',
      },
      {
        blockType: 'metric',
        order: 1,
        metricKey: 'total-var',
        label: 'Total VaR',
        sourceField: 'var',
        format: 'number',
        unit: 'USD',
        productionValue: 1000000,
        scenarioValue: 1100000,
        deltaValue: 100000,
        deltaPct: 10.0,
        formattedProductionValue: '1,000,000',
        formattedScenarioValue: '1,100,000',
        formattedDelta: '+100,000',
        formatToken: 'negative',
      },
    ],
  };

  it('renders section title and dispatches content blocks by blockType', () => {
    renderWithProvider(<SectionRenderer section={sectionWithMixedBlocks} />);

    // Section title rendered
    expect(screen.getByText('Key Risk Metrics')).toBeInTheDocument();

    // Metric block dispatched (label visible)
    expect(screen.getByText('Total VaR')).toBeInTheDocument();

    // Text block dispatched (content visible)
    expect(screen.getByText('This is a text note.')).toBeInTheDocument();
  });
});

describe('TextBlockRenderer', () => {
  const textBlock: TextBlock = {
    blockType: 'text',
    order: 1,
    textKey: 'summary-note',
    content: 'This report summarizes the key risk metrics for the scenario.',
  };

  it('renders text content', () => {
    renderWithProvider(<TextBlockRenderer block={textBlock} />);

    expect(
      screen.getByText('This report summarizes the key risk metrics for the scenario.')
    ).toBeInTheDocument();
  });
});
