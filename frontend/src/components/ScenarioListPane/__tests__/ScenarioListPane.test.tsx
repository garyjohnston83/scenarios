import { render, screen, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import scenariosReducer, {
  ScenariosState,
  fetchScenarioListSuccess,
  fetchScenarioListFailure,
} from '../../../store/scenariosSlice';
import { ScenarioListPane } from '../ScenarioListPane';

const defaultState: ScenariosState = {
  items: [],
  listLoading: false,
  listError: null,
  selectedDetail: null,
  detailLoading: false,
  detailError: null,
  sortOption: 'updatedAt-desc',
  workflowStateFilter: [],
  messagePosting: false,
  messagePostError: null,
  eventPosting: false,
  eventPostError: null,
};

const createTestStore = (overrides?: Partial<ScenariosState>) => {
  return configureStore({
    reducer: {
      scenarios: scenariosReducer,
    },
    preloadedState: {
      scenarios: { ...defaultState, ...overrides },
    },
  });
};

const renderWithProviders = (overrides?: Partial<ScenariosState>) => {
  const testStore = createTestStore(overrides);
  render(
    <Provider store={testStore}>
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter initialEntries={['/scenarios']}>
          <Routes>
            <Route path="/scenarios" element={<ScenarioListPane />}>
              <Route index element={null} />
              <Route path=":id" element={null} />
            </Route>
          </Routes>
        </MemoryRouter>
      </FluentProvider>
    </Provider>
  );
  return testStore;
};

describe('ScenarioListPane', () => {
  it('renders "Loading..." text when listLoading is true', () => {
    // On mount, fetchScenarioListRequest is dispatched which sets listLoading: true
    renderWithProviders({ listLoading: false });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error message and a "Retry" button when listError is set', () => {
    const store: EnhancedStore = renderWithProviders();
    // Simulate saga returning an error
    act(() => {
      store.dispatch(fetchScenarioListFailure('Network error'));
    });
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders scenario list items when items are populated', () => {
    const store: EnhancedStore = renderWithProviders();
    // Simulate saga returning items
    act(() => {
      store.dispatch(
        fetchScenarioListSuccess([
          {
            id: 'sc-1',
            name: 'Rate Shock',
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'HIGH',
            updatedAt: '2026-01-15T10:00:00Z',
          },
          {
            id: 'sc-2',
            name: 'Credit Spread',
            workflowState: 'SIGNED_OFF',
            impact: 'LOW',
            updatedAt: '2026-01-10T08:00:00Z',
          },
        ])
      );
    });
    expect(screen.getByText('Rate Shock')).toBeInTheDocument();
    expect(screen.getByText('Credit Spread')).toBeInTheDocument();
    expect(screen.getByText('IMPACT_AVAILABLE')).toBeInTheDocument();
    expect(screen.getByText('SIGNED_OFF')).toBeInTheDocument();
  });

  it('renders "No scenarios" when items is empty and listLoading is false', () => {
    const store: EnhancedStore = renderWithProviders();
    // Simulate saga returning an empty list
    act(() => {
      store.dispatch(fetchScenarioListSuccess([]));
    });
    expect(screen.getByText('No scenarios')).toBeInTheDocument();
  });
});
