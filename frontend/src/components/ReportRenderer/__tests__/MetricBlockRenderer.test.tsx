import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { MetricBlockRenderer } from '../MetricBlockRenderer';
import type { MetricBlock } from '../../../types/renderedReport';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
);

const renderWithProvider = (ui: React.ReactElement) => render(ui, { wrapper });

describe('MetricBlockRenderer', () => {
  const metricBlock: MetricBlock = {
    blockType: 'metric',
    order: 1,
    metricKey: 'total-var',
    label: 'Total VaR',
    sourceField: 'var_99',
    format: 'number',
    unit: 'USD',
    productionValue: 1250000,
    scenarioValue: 1350000,
    deltaValue: 100000,
    deltaPct: 8.0,
    formattedProductionValue: '1,250,000',
    formattedScenarioValue: '1,350,000',
    formattedDelta: '+100,000',
    formatToken: 'negative',
  };

  it('renders label, formatted values, and delta with format token CSS class', () => {
    renderWithProvider(<MetricBlockRenderer block={metricBlock} />);

    // Label
    expect(screen.getByText('Total VaR')).toBeInTheDocument();

    // Formatted production value
    expect(screen.getByText('1,250,000')).toBeInTheDocument();

    // Formatted scenario value
    expect(screen.getByText('1,350,000')).toBeInTheDocument();

    // Formatted delta
    const deltaElement = screen.getByText('+100,000');
    expect(deltaElement).toBeInTheDocument();
    // identity-obj-proxy returns the class name string as-is, so getFormatTokenClass('negative') returns 'negative'
    expect(deltaElement).toHaveClass('negative');

    // Delta percentage formatted as +X.XX%
    const deltaPctElement = screen.getByText('+8.00%');
    expect(deltaPctElement).toBeInTheDocument();
    expect(deltaPctElement).toHaveClass('negative');
  });

  it('renders "N/A" in neutral styling when values are "N/A"', () => {
    const naBlock: MetricBlock = {
      blockType: 'metric',
      order: 2,
      metricKey: 'na-metric',
      label: 'Unavailable Metric',
      sourceField: 'missing',
      format: 'number',
      unit: null,
      productionValue: 'N/A',
      scenarioValue: 'N/A',
      deltaValue: 'N/A',
      deltaPct: 'N/A',
      formattedProductionValue: 'N/A',
      formattedScenarioValue: 'N/A',
      formattedDelta: 'N/A',
      formatToken: 'neutral',
    };

    renderWithProvider(<MetricBlockRenderer block={naBlock} />);

    // Label should still render
    expect(screen.getByText('Unavailable Metric')).toBeInTheDocument();

    // All N/A values should render with the naValue class (neutral styling)
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThanOrEqual(4); // production, scenario, delta, deltaPct

    naElements.forEach((el) => {
      expect(el).toHaveClass('naValue');
    });
  });
});
