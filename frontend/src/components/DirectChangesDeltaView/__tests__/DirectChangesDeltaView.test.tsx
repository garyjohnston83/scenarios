import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import analysisReducer, { AnalysisState } from '../../../store/analysisSlice';
import scenariosReducer from '../../../store/scenariosSlice';
import adminReducer from '../../../store/adminSlice';
import { DirectChangesDeltaView } from '../DirectChangesDeltaView';
import type { DirectChangesRuntimeResponse } from '../../../store/scenariosSlice';

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

const renderComponent = (analysisOverrides?: Partial<AnalysisState>) => {
  const store = createTestStore(analysisOverrides);
  render(
    <Provider store={store}>
      <FluentProvider theme={webLightTheme}>
        <DirectChangesDeltaView />
      </FluentProvider>
    </Provider>
  );
  return store;
};

const mockDeltaResponse: DirectChangesRuntimeResponse = {
  dataChanged: [
    {
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
      ],
    },
    {
      dataType: 'riskFactors',
      header: '3 Risk factors changed',
      externalLink: null,
      totalDataChanges: 3,
      renderState: 'ROWS',
      columnDefinitions: [
        { dataAttribute: 'rfName', type: 'string', display: 'Risk Factor Name' },
      ],
      data: [
        { rfName: 'FX_USDJPY' },
      ],
    },
  ],
};

describe('DirectChangesDeltaView', () => {
  // Test 7: Shows Spinner when loading; shows error when error is set
  it('shows Spinner when loading and error text when error is set', () => {
    // Test loading state
    const { unmount } = render(
      <Provider store={createTestStore({ directChangesDeltaLoading: true })}>
        <FluentProvider theme={webLightTheme}>
          <DirectChangesDeltaView />
        </FluentProvider>
      </Provider>
    );

    expect(screen.getByText('Loading direct changes...')).toBeInTheDocument();
    unmount();

    // Test error state
    render(
      <Provider store={createTestStore({ directChangesDeltaError: 'Failed to load delta changes' })}>
        <FluentProvider theme={webLightTheme}>
          <DirectChangesDeltaView />
        </FluentProvider>
      </Provider>
    );

    expect(screen.getByText('Failed to load delta changes')).toBeInTheDocument();
  });

  // Test 8: Shows "No direct changes to display" when dataChanged empty; renders accordion sections when data present
  it('shows empty message when dataChanged is empty and renders accordion sections when data is present', () => {
    // Test empty state
    const emptyResponse: DirectChangesRuntimeResponse = { dataChanged: [] };
    const { unmount } = render(
      <Provider store={createTestStore({ directChangesDeltaData: emptyResponse })}>
        <FluentProvider theme={webLightTheme}>
          <DirectChangesDeltaView />
        </FluentProvider>
      </Provider>
    );

    expect(screen.getByText('No direct changes to display')).toBeInTheDocument();
    unmount();

    // Test data present state
    renderComponent({ directChangesDeltaData: mockDeltaResponse });

    // Should show both section headers
    expect(screen.getByText('5 Time-series Points changed')).toBeInTheDocument();
    expect(screen.getByText('3 Risk factors changed')).toBeInTheDocument();

    // Should not show empty or loading messages
    expect(screen.queryByText('No direct changes to display')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading direct changes...')).not.toBeInTheDocument();
  });
});
