import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { SummaryCardsSection } from '../SummaryCardsSection';
import { SummaryCardsData } from '../../../store/scenariosSlice';

const renderComponent = (data: SummaryCardsData) => {
  render(
    <FluentProvider theme={webLightTheme}>
      <SummaryCardsSection data={data} />
    </FluentProvider>
  );
};

describe('SummaryCardsSection', () => {
  it('renders both cards with all field values correctly', () => {
    renderComponent({
      changesSummary: {
        changesTotal: 42,
        changesDirect: 30,
        changesIndirect: 12,
        cta: {
          label: 'Open in Market Data UI \u2192',
          url: 'https://marketdata.example.com/changes',
        },
      },
      impactSummary: {
        impact: 'MODERATE',
        lastRunAt: '2026-02-20T14:00:00',
        latestRunStatus: 'SUCCEEDED',
        exceptionsCount: 3,
        cta: {
          label: 'View all impact reports \u2192',
          url: 'https://marketdata.example.com/impacts',
        },
      },
    });

    // Changes Summary card
    expect(screen.getByText('Changes Summary')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    // Impact Summary card
    expect(screen.getByText('Impact Summary')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('20 Feb 2026')).toBeInTheDocument();
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders em-dash for null lastRunAt, null latestRunStatus, and null exceptionsCount', () => {
    renderComponent({
      changesSummary: {
        changesTotal: 10,
        changesDirect: 5,
        changesIndirect: 5,
        cta: {
          label: 'Open in Market Data UI \u2192',
          url: 'https://marketdata.example.com/changes',
        },
      },
      impactSummary: {
        impact: 'SIGNIFICANT',
        lastRunAt: null,
        latestRunStatus: null,
        exceptionsCount: null,
        cta: {
          label: 'View all impact reports \u2192',
          url: 'https://marketdata.example.com/impacts',
        },
      },
    });

    // All three null fields should display em-dash
    const emDashes = screen.getAllByText('\u2014');
    expect(emDashes).toHaveLength(3);
  });

  it('renders "0" (not em-dash) when exceptionsCount is 0', () => {
    renderComponent({
      changesSummary: {
        changesTotal: 5,
        changesDirect: 3,
        changesIndirect: 2,
        cta: {
          label: 'Open in Market Data UI \u2192',
          url: 'https://marketdata.example.com/changes',
        },
      },
      impactSummary: {
        impact: 'MINIMAL',
        lastRunAt: '2026-02-19T10:00:00',
        latestRunStatus: 'SUCCEEDED',
        exceptionsCount: 0,
        cta: {
          label: 'View all impact reports \u2192',
          url: 'https://marketdata.example.com/impacts',
        },
      },
    });

    expect(screen.getByText('0')).toBeInTheDocument();
    // Should NOT have any em-dashes since no null values
    expect(screen.queryByText('\u2014')).not.toBeInTheDocument();
  });

  it('displays friendly label via getImpactLabel() for impact value', () => {
    renderComponent({
      changesSummary: {
        changesTotal: 1,
        changesDirect: 1,
        changesIndirect: 0,
        cta: {
          label: 'Open in Market Data UI \u2192',
          url: 'https://marketdata.example.com/changes',
        },
      },
      impactSummary: {
        impact: 'SIGNIFICANT',
        lastRunAt: '2026-02-20T14:00:00',
        latestRunStatus: 'SUCCEEDED',
        exceptionsCount: 1,
        cta: {
          label: 'View all impact reports \u2192',
          url: 'https://marketdata.example.com/impacts',
        },
      },
    });

    // "SIGNIFICANT" should display as "Significant" via getImpactLabel()
    expect(screen.getByText('Significant')).toBeInTheDocument();
    expect(screen.queryByText('SIGNIFICANT')).not.toBeInTheDocument();
  });

  it('renders both CTA links with correct labels and attributes', () => {
    renderComponent({
      changesSummary: {
        changesTotal: 10,
        changesDirect: 7,
        changesIndirect: 3,
        cta: {
          label: 'Open in Market Data UI \u2192',
          url: 'https://marketdata.example.com/changes',
        },
      },
      impactSummary: {
        impact: 'MODERATE',
        lastRunAt: '2026-02-20T14:00:00',
        latestRunStatus: 'SUCCEEDED',
        exceptionsCount: 2,
        cta: {
          label: 'View all impact reports \u2192',
          url: 'https://marketdata.example.com/impacts',
        },
      },
    });

    const marketDataLink = screen.getByText('Open in Market Data UI \u2192');
    const impactReportsLink = screen.getByText('View all impact reports \u2192');

    expect(marketDataLink).toBeInTheDocument();
    expect(impactReportsLink).toBeInTheDocument();

    // Verify they are actual anchor elements (links, not buttons)
    const marketDataAnchor = marketDataLink.closest('a');
    const impactReportsAnchor = impactReportsLink.closest('a');

    expect(marketDataAnchor).toBeInTheDocument();
    expect(impactReportsAnchor).toBeInTheDocument();

    // Verify href attributes
    expect(marketDataAnchor).toHaveAttribute('href', 'https://marketdata.example.com/changes');
    expect(impactReportsAnchor).toHaveAttribute('href', 'https://marketdata.example.com/impacts');

    // Verify target and rel attributes
    expect(marketDataAnchor).toHaveAttribute('target', '_blank');
    expect(impactReportsAnchor).toHaveAttribute('target', '_blank');
    expect(marketDataAnchor).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(marketDataAnchor).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    expect(impactReportsAnchor).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(impactReportsAnchor).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('when cta is undefined on both summaries, renders em-dash in both ctaContainers', () => {
    renderComponent({
      changesSummary: {
        changesTotal: 10,
        changesDirect: 7,
        changesIndirect: 3,
      },
      impactSummary: {
        impact: 'MODERATE',
        lastRunAt: '2026-02-20T14:00:00',
        latestRunStatus: 'SUCCEEDED',
        exceptionsCount: 2,
      },
    });

    // Both CTA areas should render em-dash since cta is undefined
    const emDashes = screen.getAllByText('\u2014');
    expect(emDashes).toHaveLength(2);

    // No anchor elements should be present in the rendered output
    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(0);
  });

  it('when cta has a custom label, the link text matches the custom label and href matches URL', () => {
    renderComponent({
      changesSummary: {
        changesTotal: 10,
        changesDirect: 7,
        changesIndirect: 3,
        cta: {
          label: 'Custom Changes Link',
          url: 'https://example.com/custom-changes',
        },
      },
      impactSummary: {
        impact: 'MODERATE',
        lastRunAt: '2026-02-20T14:00:00',
        latestRunStatus: 'SUCCEEDED',
        exceptionsCount: 2,
        cta: {
          label: 'Custom Impact Link',
          url: 'https://example.com/custom-impacts',
        },
      },
    });

    // Verify custom labels are rendered
    const changesLink = screen.getByText('Custom Changes Link');
    const impactLink = screen.getByText('Custom Impact Link');

    expect(changesLink).toBeInTheDocument();
    expect(impactLink).toBeInTheDocument();

    // Verify the anchor elements have the correct hrefs
    const changesAnchor = changesLink.closest('a');
    const impactAnchor = impactLink.closest('a');

    expect(changesAnchor).toHaveAttribute('href', 'https://example.com/custom-changes');
    expect(impactAnchor).toHaveAttribute('href', 'https://example.com/custom-impacts');
  });

  // Gap test: mixed state -- one card has CTA, other does not
  it('when only changesSummary has CTA and impactSummary does not, renders link for changes and em-dash for impact', () => {
    renderComponent({
      changesSummary: {
        changesTotal: 12,
        changesDirect: 8,
        changesIndirect: 4,
        cta: {
          label: 'Open in Market Data UI \u2192',
          url: 'https://marketdata.example.com/changes',
        },
      },
      impactSummary: {
        impact: 'MODERATE',
        lastRunAt: '2026-02-20T14:00:00',
        latestRunStatus: 'SUCCEEDED',
        exceptionsCount: 2,
      },
    });

    // Changes card should render a CTA link
    const changesLink = screen.getByText('Open in Market Data UI \u2192');
    expect(changesLink).toBeInTheDocument();
    const changesAnchor = changesLink.closest('a');
    expect(changesAnchor).toBeInTheDocument();
    expect(changesAnchor).toHaveAttribute('href', 'https://marketdata.example.com/changes');

    // Impact card CTA area should render em-dash (no link)
    const emDashes = screen.getAllByText('\u2014');
    expect(emDashes).toHaveLength(1);

    // Only one link should be present overall
    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(1);
  });
});
