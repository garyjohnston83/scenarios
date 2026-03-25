import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme, Accordion } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import analysisReducer, { AnalysisState } from '../../store/analysisSlice';
import scenariosReducer from '../../store/scenariosSlice';
import adminReducer from '../../store/adminSlice';
import { DirectChangesDeltaView } from '../DirectChangesDeltaView/DirectChangesDeltaView';
import { DirectChangesSectionAccordion } from '../DirectChangesSectionAccordion/DirectChangesSectionAccordion';
import type { DirectChangesRuntimeResponse, DirectChangesDataSectionFe } from '../../store/scenariosSlice';

const defaultAnalysisState: AnalysisState = {
  scenarioId: null,
  scenarioName: null,
  workflowState: null,
  scenarioType: null,
  summaryCards: null,
  directChanges: null,
  directChangesLoading: false,
  directChangesError: null,
  directChangesDeltaData: null,
  directChangesDeltaLoading: false,
  directChangesDeltaError: null,
  headerLoading: false,
  headerError: null,
  reportSummaries: null,
  reportSummariesLoading: false,
  reportSummariesError: null,
  reportDetails: {},
  activeTab: null,
};

const createTestStore = (analysisOverrides?: Partial<AnalysisState>) => {
  return configureStore({
    reducer: {
      analysis: analysisReducer,
      scenarios: scenariosReducer,
      admin: adminReducer,
    },
    preloadedState: {
      analysis: { ...defaultAnalysisState, ...analysisOverrides },
    },
  });
};

/**
 * Task Group 6 -- Gap tests for UI components covering:
 * - OVERFLOW body external link rendering
 * - Correct number of accordion sections
 * - External link stopPropagation behavior
 * - DirectChangesDeltaView null data path
 */
describe('Task Group 6 Gap Tests: Component Behavior', () => {

  // ======================================================================
  // Gap 4: DirectChangesSectionAccordion renders external link in OVERFLOW
  //        state body (not just in header)
  // ======================================================================
  it('renders external link inside OVERFLOW body content', () => {
    const overflowSection: DirectChangesDataSectionFe = {
      dataType: 'curveDefinitions',
      header: '500 Curve definitions changed',
      externalLink: 'https://external.example.com/curves',
      totalDataChanges: 500,
      renderState: 'OVERFLOW',
      columnDefinitions: [],
      data: null,
    };

    render(
      <FluentProvider theme={webLightTheme}>
        <Accordion multiple collapsible defaultOpenItems={['curveDefinitions']}>
          <DirectChangesSectionAccordion section={overflowSection} value="curveDefinitions" />
        </Accordion>
      </FluentProvider>
    );

    // The overflow message should be shown
    expect(screen.getByText(/Too many changes to display inline/)).toBeInTheDocument();

    // Should have TWO "Open in external view" links: one in header area, one in OVERFLOW body
    const externalLinks = screen.getAllByText('Open in external view');
    expect(externalLinks.length).toBeGreaterThanOrEqual(2);

    // Verify all links point to the correct URL
    externalLinks.forEach((linkText) => {
      const anchor = linkText.closest('a');
      expect(anchor).toHaveAttribute('href', 'https://external.example.com/curves');
      expect(anchor).toHaveAttribute('target', '_blank');
      expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // ======================================================================
  // Gap 5: DirectChangesDeltaView renders the correct number of accordion
  //        sections matching the dataChanged array length
  // ======================================================================
  it('renders correct number of accordion sections matching dataChanged length', () => {
    const threeSectionResponse: DirectChangesRuntimeResponse = {
      dataChanged: [
        {
          dataType: 'timeSeriesValues',
          header: '5 Time-series Points changed',
          externalLink: null,
          totalDataChanges: 5,
          renderState: 'ROWS',
          columnDefinitions: [
            { dataAttribute: 'tsName', type: 'string', display: 'TS Name' },
          ],
          data: [{ tsName: 'TS1' }],
        },
        {
          dataType: 'riskFactors',
          header: '10 Risk factors changed',
          externalLink: null,
          totalDataChanges: 10,
          renderState: 'ROWS',
          columnDefinitions: [
            { dataAttribute: 'rfName', type: 'string', display: 'RF Name' },
          ],
          data: [{ rfName: 'RF1' }],
        },
        {
          dataType: 'positions',
          header: '200 Positions changed',
          externalLink: 'https://external.example.com/pos',
          totalDataChanges: 200,
          renderState: 'OVERFLOW',
          columnDefinitions: [],
          data: null,
        },
      ],
    };

    const store = createTestStore({ directChangesDeltaData: threeSectionResponse });
    render(
      <Provider store={store}>
        <FluentProvider theme={webLightTheme}>
          <DirectChangesDeltaView />
        </FluentProvider>
      </Provider>
    );

    // All three section headers should be present
    expect(screen.getByText('5 Time-series Points changed')).toBeInTheDocument();
    expect(screen.getByText('10 Risk factors changed')).toBeInTheDocument();
    expect(screen.getByText('200 Positions changed')).toBeInTheDocument();

    // Count the number of accordion item headers rendered (each section has one heading button)
    const accordionButtons = screen.getAllByRole('button');
    // Each AccordionHeader renders a button; there should be exactly 3
    expect(accordionButtons.length).toBe(3);
  });

  // ======================================================================
  // Gap 6: Clicking the external link wrapper calls stopPropagation,
  //        preventing the accordion from toggling
  // ======================================================================
  it('clicking external link wrapper calls stopPropagation to prevent accordion toggle', () => {
    const sectionWithLink: DirectChangesDataSectionFe = {
      dataType: 'timeSeriesValues',
      header: '5 TS Points changed',
      externalLink: 'https://external.example.com/ts',
      totalDataChanges: 5,
      renderState: 'ROWS',
      columnDefinitions: [
        { dataAttribute: 'tsName', type: 'string', display: 'TS Name' },
      ],
      data: [{ tsName: 'TS1' }],
    };

    render(
      <FluentProvider theme={webLightTheme}>
        <Accordion multiple collapsible>
          <DirectChangesSectionAccordion section={sectionWithLink} value="timeSeriesValues" />
        </Accordion>
      </FluentProvider>
    );

    // Initially, accordion should be collapsed (no table visible)
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // Find the external link in the header area
    const headerLinks = screen.getAllByText('Open in external view');
    const headerLink = headerLinks[0];

    // Click the external link -- this should NOT open the accordion
    fireEvent.click(headerLink);

    // The accordion should still be collapsed (table not visible)
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // ======================================================================
  // Gap 7: DirectChangesDeltaView shows empty message when deltaData is
  //        null (distinct from empty dataChanged array)
  // ======================================================================
  it('shows "No direct changes to display" when deltaData is null', () => {
    const store = createTestStore({
      directChangesDeltaData: null,
      directChangesDeltaLoading: false,
      directChangesDeltaError: null,
    });

    render(
      <Provider store={store}>
        <FluentProvider theme={webLightTheme}>
          <DirectChangesDeltaView />
        </FluentProvider>
      </Provider>
    );

    expect(screen.getByText('No direct changes to display')).toBeInTheDocument();
  });
});
