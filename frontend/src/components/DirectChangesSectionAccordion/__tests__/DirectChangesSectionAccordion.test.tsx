import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme, Accordion } from '@fluentui/react-components';
import { DirectChangesSectionAccordion } from '../DirectChangesSectionAccordion';
import type { DirectChangesDataSectionFe } from '../../../store/scenariosSlice';

const renderWithAccordion = (section: DirectChangesDataSectionFe, defaultOpenItems?: string[]) => {
  render(
    <FluentProvider theme={webLightTheme}>
      <Accordion multiple collapsible defaultOpenItems={defaultOpenItems ?? [section.dataType]}>
        <DirectChangesSectionAccordion section={section} value={section.dataType} />
      </Accordion>
    </FluentProvider>
  );
};

const sectionWithRows: DirectChangesDataSectionFe = {
  dataType: 'timeSeriesValues',
  header: '5 Time-series Points changed',
  externalLink: 'https://external.example.com/ts',
  totalDataChanges: 5,
  renderState: 'ROWS',
  columnDefinitions: [
    { dataAttribute: 'tsName', type: 'string', display: 'Time-Series Name', isEntityId: true },
    { dataAttribute: 'date', type: 'date', display: 'Date' },
  ],
  data: [
    { tsName: 'TS_FX_USD', date: '2026-01-15' },
    { tsName: 'TS_IR_5Y', date: '2026-01-16' },
  ],
};

const sectionWithOverflow: DirectChangesDataSectionFe = {
  dataType: 'overflowSection',
  header: '1000 Risk factors changed',
  externalLink: 'https://external.example.com/overflow',
  totalDataChanges: 1000,
  renderState: 'OVERFLOW',
  columnDefinitions: [],
  data: null,
};

const sectionNoData: DirectChangesDataSectionFe = {
  dataType: 'noDataSection',
  header: '0 Items changed',
  externalLink: null,
  totalDataChanges: 0,
  renderState: 'NO_DATA',
  columnDefinitions: [],
  data: null,
};

const sectionNoLink: DirectChangesDataSectionFe = {
  dataType: 'noLinkSection',
  header: '3 Rows changed',
  externalLink: null,
  totalDataChanges: 3,
  renderState: 'ROWS',
  columnDefinitions: [
    { dataAttribute: 'name', type: 'string', display: 'Name' },
  ],
  data: [{ name: 'Test Row' }],
};

describe('DirectChangesSectionAccordion', () => {
  // Test 4: Renders header text and external link with target="_blank" and rel="noopener noreferrer"
  it('renders header text and external link with correct attributes', () => {
    renderWithAccordion(sectionWithRows);

    // Verify the header text is displayed
    expect(screen.getByText('5 Time-series Points changed')).toBeInTheDocument();

    // Find the external link in the header area
    const links = screen.getAllByText('Open in external view');
    // The header area link
    const headerLink = links[0].closest('a');
    expect(headerLink).toBeInTheDocument();
    expect(headerLink).toHaveAttribute('target', '_blank');
    expect(headerLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(headerLink).toHaveAttribute('href', 'https://external.example.com/ts');
  });

  // Test 5: Renders DirectChangesTable when ROWS; overflow message when OVERFLOW; "Data changes not available here" when NO_DATA
  it('renders correct body content based on renderState', () => {
    // Test ROWS state
    const { unmount: unmount1 } = render(
      <FluentProvider theme={webLightTheme}>
        <Accordion multiple collapsible defaultOpenItems={['timeSeriesValues']}>
          <DirectChangesSectionAccordion section={sectionWithRows} value={sectionWithRows.dataType} />
        </Accordion>
      </FluentProvider>
    );

    // ROWS should render a table with data
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('TS_FX_USD')).toBeInTheDocument();
    expect(screen.getByText('TS_IR_5Y')).toBeInTheDocument();
    unmount1();

    // Test OVERFLOW state
    const { unmount: unmount2 } = render(
      <FluentProvider theme={webLightTheme}>
        <Accordion multiple collapsible defaultOpenItems={['overflowSection']}>
          <DirectChangesSectionAccordion section={sectionWithOverflow} value={sectionWithOverflow.dataType} />
        </Accordion>
      </FluentProvider>
    );

    expect(screen.getByText(/Too many changes to display inline/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    unmount2();

    // Test NO_DATA state
    render(
      <FluentProvider theme={webLightTheme}>
        <Accordion multiple collapsible defaultOpenItems={['noDataSection']}>
          <DirectChangesSectionAccordion section={sectionNoData} value={sectionNoData.dataType} />
        </Accordion>
      </FluentProvider>
    );

    expect(screen.getByText('Data changes not available here')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // Test 6: External link does not exist when externalLink is null
  it('does not render external link when externalLink is null', () => {
    renderWithAccordion(sectionNoLink);

    // Verify the header text is displayed
    expect(screen.getByText('3 Rows changed')).toBeInTheDocument();

    // The "Open in external view" link should not exist anywhere
    expect(screen.queryByText('Open in external view')).not.toBeInTheDocument();
  });
});
