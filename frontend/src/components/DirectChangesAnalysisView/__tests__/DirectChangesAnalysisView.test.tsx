import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import analysisReducer, { AnalysisState } from '../../../store/analysisSlice';
import scenariosReducer from '../../../store/scenariosSlice';
import adminReducer from '../../../store/adminSlice';
import { DirectChangesAnalysisView } from '../DirectChangesAnalysisView';

const defaultAnalysisState: AnalysisState = {
  scenarioId: null,
  scenarioName: null,
  workflowState: null,
  scenarioType: null,
  summaryCards: null,
  directChanges: null,
  directChangesLoading: false,
  directChangesError: null,
  headerLoading: false,
  headerError: null,
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
        <DirectChangesAnalysisView />
      </FluentProvider>
    </Provider>
  );
  return store;
};

describe('DirectChangesAnalysisView', () => {
  it('renders a spinner when loading', () => {
    renderComponent({ directChangesLoading: true });

    expect(screen.getByText('Loading direct changes...')).toBeInTheDocument();
  });

  it('renders an error message when there is an error', () => {
    renderComponent({
      directChangesError: 'Failed to load direct changes data',
    });

    expect(
      screen.getByText('Failed to load direct changes data')
    ).toBeInTheDocument();
  });

  it('renders empty state message when there are zero rows', () => {
    renderComponent({
      directChanges: {
        columns: ['Risk Factor', 'Risk Class'],
        rows: [],
      },
    });

    expect(
      screen.getByText('No direct changes data available')
    ).toBeInTheDocument();
  });

  it('renders empty state message when directChanges is null', () => {
    renderComponent({
      directChanges: null,
      directChangesLoading: false,
      directChangesError: null,
    });

    expect(
      screen.getByText('No direct changes data available')
    ).toBeInTheDocument();
  });

  it('renders DataGridTable with correct columns and rows on success', () => {
    renderComponent({
      directChanges: {
        columns: ['Risk Factor', 'Risk Class', 'Current Value'],
        rows: [
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
        ],
      },
    });

    // Verify column headers are rendered
    expect(screen.getByText('Risk Factor')).toBeInTheDocument();
    expect(screen.getByText('Risk Class')).toBeInTheDocument();
    expect(screen.getByText('Current Value')).toBeInTheDocument();

    // Verify row data is rendered
    expect(screen.getByText('FX_USDJPY')).toBeInTheDocument();
    expect(screen.getByText('FX')).toBeInTheDocument();
    expect(screen.getByText('1.35')).toBeInTheDocument();
    expect(screen.getByText('IR_TENOR_5Y')).toBeInTheDocument();
    expect(screen.getByText('IR')).toBeInTheDocument();
    expect(screen.getByText('0.025')).toBeInTheDocument();

    // Verify a table element is present
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
