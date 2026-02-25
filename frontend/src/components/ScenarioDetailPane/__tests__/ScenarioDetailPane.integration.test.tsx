import { render, screen, act } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import * as fs from 'fs';
import * as path from 'path';
import scenariosReducer, {
  ScenariosState,
  fetchScenarioDetailSuccess,
} from '../../../store/scenariosSlice';
import { ScenarioDetailPane } from '../ScenarioDetailPane';

/* ------------------------------------------------------------------ */
/* Mock @fluentui/react-icons: keep the real module's exports and      */
/* override only the icons we need to assert on.                       */
/* ------------------------------------------------------------------ */
jest.mock('@fluentui/react-icons', () => {
  const actual = jest.requireActual('@fluentui/react-icons');
  return {
    ...actual,
    ChatRegular: () => <span data-testid="icon-chat">ChatRegular</span>,
    PersonRegular: () => <span data-testid="icon-person">PersonRegular</span>,
    SettingsRegular: () => (
      <span data-testid="icon-settings">SettingsRegular</span>
    ),
    ArrowRightRegular: () => (
      <span data-testid="icon-arrow-right">ArrowRightRegular</span>
    ),
  };
});

/* ------------------------------------------------------------------ */
/* Mock formatDate to return predictable values for assertions         */
/* ------------------------------------------------------------------ */
jest.mock('../../../utils/formatDate', () => ({
  formatDate: (d: string) => `FORMATTED:${d}`,
}));

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

const renderWithProviders = (
  initialEntry: string,
  overrides?: Partial<ScenariosState>
) => {
  const testStore = createTestStore(overrides);
  render(
    <Provider store={testStore}>
      <FluentProvider theme={webLightTheme}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/scenarios" element={<ScenarioDetailPane />}>
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

describe('ScenarioDetailPane TG6 Integration', () => {
  // Test 1: ActivityTable renders inside the stickyHeader div
  it('renders ActivityTable inside the stickyHeader div, below quickMessageRow and error banner', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Test Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Alice',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'IMPACT_AVAILABLE',
            impact: 'MODERATE',
            ownerDisplayName: 'Alice',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
          },
          events: {
            rows: [
              {
                id: 'row-1',
                bucketType: 'MESSAGE',
                occurredAt: '2026-02-19T10:00:00',
                authorDisplayName: 'Alice',
                details: 'Hello world',
                statusTransition: null,
              },
            ],
          },
        })
      );
    });

    // ActivityTable renders its section heading "Activity"
    expect(screen.getByText('Activity')).toBeInTheDocument();

    // Verify it is inside the stickyHeader div by checking the DOM hierarchy
    const activityHeading = screen.getByText('Activity');
    const stickyHeader = activityHeading.closest('.stickyHeader');
    expect(stickyHeader).not.toBeNull();

    // Verify the activity table row content renders
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  // Test 2: ScenarioDetailPane does NOT render ReviewApprovalSection
  it('does NOT render ReviewApprovalSection', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Scenario With Review',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Alice',
          createdAt: '2026-02-10T08:00:00',
          updatedAt: '2026-02-15T10:00:00',
          header: {
            workflowState: 'SIGNOFF_IN_PROGRESS',
            impact: 'MODERATE',
            ownerDisplayName: 'Alice',
            createdAt: '2026-02-10T08:00:00',
            updatedAt: '2026-02-15T10:00:00',
          },
          reviewApproval: {
            workflow: {
              workflowState: 'SIGNOFF_IN_PROGRESS',
              workflowStateLabel: 'Sign-off In Progress',
              progress: { current: 3, total: 5 },
            },
            messages: [
              {
                id: 'msg-1',
                authorDisplayName: 'Alice',
                createdAt: '2026-02-18T09:00:00',
                text: 'Please review the curve data.',
              },
            ],
            events: [
              {
                id: 'evt-1',
                createdAt: '2026-02-15T08:00:00',
                actorDisplayName: 'System',
                eventType: 'SCENARIO_CREATED',
                eventLabel: 'Scenario created',
              },
            ],
          },
        })
      );
    });

    // ReviewApprovalSection headings should NOT be present
    expect(screen.queryByText('Workflow Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Messages')).not.toBeInTheDocument();
    expect(screen.queryByText('Events')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /export history/i })
    ).not.toBeInTheDocument();
    // Specific content from ReviewApprovalSection should not appear
    expect(screen.queryByText('Step 3 of 5')).not.toBeInTheDocument();
  });

  // Test 3: ScenarioDetailPane does NOT import ReviewApprovalSection
  it('does NOT import ReviewApprovalSection (import removed from source)', () => {
    const sourceFilePath = path.resolve(
      __dirname,
      '..',
      'ScenarioDetailPane.tsx'
    );
    const sourceContent = fs.readFileSync(sourceFilePath, 'utf-8');

    // Verify the import statement for ReviewApprovalSection is not present
    expect(sourceContent).not.toContain(
      "from '../ReviewApprovalSection'"
    );
    expect(sourceContent).not.toContain('ReviewApprovalSection');
  });

  // Test 4: Key Details card renders "Approvals" field with "X/Y" format
  it('renders "Approvals" field row with "received/required" format when both are non-null', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Approval Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Alice',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'SIGNOFF_IN_PROGRESS',
            impact: 'MODERATE',
            ownerDisplayName: 'Alice',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
          },
          events: {
            rows: [],
            approvalsReceived: 1,
            approvalsRequired: 2,
          },
        })
      );
    });

    // Verify the "Approvals" label is rendered
    expect(screen.getByText('Approvals')).toBeInTheDocument();
    // Verify the value format "1/2"
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  // Test 5: Key Details card does NOT render "Approvals" when approval values are null/undefined
  it('does NOT render "Approvals" field row when approval values are null/undefined', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'No Approval Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Bob',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'DRAFT',
            impact: 'NONE',
            ownerDisplayName: 'Bob',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
          },
          events: {
            rows: [],
            // approvalsReceived and approvalsRequired are undefined
          },
        })
      );
    });

    // Verify "Approvals" label is NOT rendered
    expect(screen.queryByText('Approvals')).not.toBeInTheDocument();
  });

  // Test 6: ActivityTable receives rows from selectedDetail.events.rows
  it('ActivityTable receives rows from selectedDetail.events.rows and renders them in the sticky header', () => {
    const store: EnhancedStore = renderWithProviders('/scenarios/sc-1');
    act(() => {
      store.dispatch(
        fetchScenarioDetailSuccess({
          id: 'sc-1',
          name: 'Activity Stream Scenario',
          scenarioTypeCode: 'INTEREST_RATE',
          ownerDisplayName: 'Alice',
          createdAt: '2026-01-10T08:00:00',
          updatedAt: '2026-01-15T10:00:00',
          header: {
            workflowState: 'SIGNOFF_IN_PROGRESS',
            impact: 'MODERATE',
            ownerDisplayName: 'Alice',
            createdAt: '2026-01-10T08:00:00',
            updatedAt: '2026-01-15T10:00:00',
          },
          events: {
            rows: [
              {
                id: 'row-1',
                bucketType: 'MESSAGE',
                occurredAt: '2026-02-19T10:00:00',
                authorDisplayName: 'Alice',
                details: 'First message',
                statusTransition: null,
              },
              {
                id: 'row-2',
                bucketType: 'USER',
                occurredAt: '2026-02-19T11:00:00',
                authorDisplayName: 'Bob',
                details: 'Sign-off started',
                statusTransition: 'Draft -> Sign-off In Progress',
              },
              {
                id: 'row-3',
                bucketType: 'SYSTEM',
                occurredAt: '2026-02-19T12:00:00',
                authorDisplayName: 'System',
                details: 'Impact completed',
                statusTransition: null,
              },
            ],
            approvalsReceived: 2,
            approvalsRequired: 3,
          },
        })
      );
    });

    // Verify all three rows are rendered
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Sign-off started')).toBeInTheDocument();
    expect(screen.getByText('Impact completed')).toBeInTheDocument();

    // Verify icons are rendered for each bucket type
    expect(screen.getByTestId('icon-chat')).toBeInTheDocument();
    expect(screen.getByTestId('icon-person')).toBeInTheDocument();
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument();

    // Verify dates are formatted
    expect(
      screen.getByText('FORMATTED:2026-02-19T10:00:00')
    ).toBeInTheDocument();
    expect(
      screen.getByText('FORMATTED:2026-02-19T11:00:00')
    ).toBeInTheDocument();
    expect(
      screen.getByText('FORMATTED:2026-02-19T12:00:00')
    ).toBeInTheDocument();

    // Verify status transition column
    expect(
      screen.getByText('Draft -> Sign-off In Progress')
    ).toBeInTheDocument();

    // Verify the table is inside the stickyHeader
    const table = screen.getByRole('table');
    const stickyHeader = table.closest('.stickyHeader');
    expect(stickyHeader).not.toBeNull();
  });
});
