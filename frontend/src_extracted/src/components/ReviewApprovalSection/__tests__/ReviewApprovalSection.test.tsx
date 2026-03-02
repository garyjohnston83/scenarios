import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import scenariosReducer, {
  ScenariosState,
  ReviewApprovalData,
} from '../../../store/scenariosSlice';
import { ReviewApprovalSection } from '../ReviewApprovalSection';

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

const renderComponent = (
  data: ReviewApprovalData,
  scenarioId: string = 'test-scenario-id',
  stateOverrides?: Partial<ScenariosState>
) => {
  const testStore = createTestStore(stateOverrides);
  render(
    <Provider store={testStore}>
      <FluentProvider theme={webLightTheme}>
        <ReviewApprovalSection data={data} scenarioId={scenarioId} />
      </FluentProvider>
    </Provider>
  );
  return testStore;
};

const buildFullData = (): ReviewApprovalData => ({
  workflow: {
    workflowState: 'SIGNOFF_IN_PROGRESS',
    workflowStateLabel: 'Sign-off In Progress',
    progress: { current: 3, total: 5 },
  },
  messages: [
    {
      id: 'msg-1',
      authorDisplayName: 'Alice Smith',
      createdAt: '2026-02-18T09:00:00',
      text: 'Please review the updated parameters.',
    },
    {
      id: 'msg-2',
      authorDisplayName: 'Bob Jones',
      createdAt: '2026-02-19T11:30:00',
      text: 'Looks good, proceeding with sign-off.',
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
    {
      id: 'evt-2',
      createdAt: '2026-02-16T10:00:00',
      actorDisplayName: 'Jane Doe',
      eventType: 'IMPACT_COMPLETED',
      eventLabel: 'Impact assessment completed',
    },
    {
      id: 'evt-3',
      createdAt: '2026-02-17T14:00:00',
      actorDisplayName: 'Carlos Rivera',
      eventType: 'SIGNOFF_COMMENCED',
      eventLabel: 'Sign-off commenced',
    },
  ],
});

describe('ReviewApprovalSection', () => {
  it('renders workflow status label and progress text', () => {
    renderComponent(buildFullData());

    expect(screen.getByText('Sign-off In Progress')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
  });

  it('renders list of messages with author, date, and text', () => {
    renderComponent(buildFullData());

    // Author display names
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();

    // Formatted dates (dd/MM/yyyy HH:mm:ss format -- updated in Increment 13)
    expect(screen.getByText('18/02/2026 09:00:00')).toBeInTheDocument();
    expect(screen.getByText('19/02/2026 11:30:00')).toBeInTheDocument();

    // Message text
    expect(
      screen.getByText('Please review the updated parameters.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Looks good, proceeding with sign-off.')
    ).toBeInTheDocument();
  });

  it('renders list of events with event label, actor, and date', () => {
    renderComponent(buildFullData());

    // Event labels (friendly labels from backend)
    expect(screen.getByText('Scenario created')).toBeInTheDocument();
    expect(
      screen.getByText('Impact assessment completed')
    ).toBeInTheDocument();
    expect(screen.getByText('Sign-off commenced')).toBeInTheDocument();

    // Actor display names
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Carlos Rivera')).toBeInTheDocument();

    // Formatted event dates (dd/MM/yyyy HH:mm:ss format -- updated in Increment 13)
    expect(screen.getByText('15/02/2026 08:00:00')).toBeInTheDocument();
    expect(screen.getByText('16/02/2026 10:00:00')).toBeInTheDocument();
    expect(screen.getByText('17/02/2026 14:00:00')).toBeInTheDocument();
  });

  it('renders "No messages" when messages array is empty', () => {
    const data: ReviewApprovalData = {
      ...buildFullData(),
      messages: [],
    };
    renderComponent(data);

    expect(screen.getByText('No messages')).toBeInTheDocument();
  });

  it('renders "No events" when events array is empty', () => {
    const data: ReviewApprovalData = {
      ...buildFullData(),
      events: [],
    };
    renderComponent(data);

    expect(screen.getByText('No events')).toBeInTheDocument();
  });

  it('Send button is disabled when input is empty', () => {
    renderComponent(buildFullData());

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('renders Export History button', () => {
    renderComponent(buildFullData());

    const exportButton = screen.getByRole('button', {
      name: /export history/i,
    });
    expect(exportButton).toBeInTheDocument();
  });

  // ========================================================================
  // Gap tests for critical paths
  // ========================================================================

  it('Send button becomes enabled when text is entered', async () => {
    const user = userEvent.setup();
    renderComponent(buildFullData());

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();

    // Type text into the textarea
    const textarea = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea, 'Hello world');

    expect(sendButton).not.toBeDisabled();
  });

  it('Send button is disabled when messagePosting is true', async () => {
    const user = userEvent.setup();
    renderComponent(buildFullData(), 'test-scenario-id', {
      messagePosting: true,
    });

    // Even with text typed, button should remain disabled during posting
    const textarea = screen.getByPlaceholderText('Type a message...');
    await user.type(textarea, 'Some message');

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('displays error message when messagePostError is set', () => {
    renderComponent(buildFullData(), 'test-scenario-id', {
      messagePostError: 'Failed to send message',
    });

    expect(screen.getByText('Failed to send message')).toBeInTheDocument();
  });

  // ========================================================================
  // Increment 12, Task Group 4: Approval progress display tests
  // ========================================================================

  it('renders "Approvals received 2 of 3" when data includes approvalsReceived=2 and approvalsRequired=3', () => {
    const data: ReviewApprovalData = {
      ...buildFullData(),
      approvalsReceived: 2,
      approvalsRequired: 3,
    };
    renderComponent(data);

    expect(
      screen.getByText('Approvals received 2 of 3')
    ).toBeInTheDocument();
  });

  it('does NOT render approval progress text when approvalsReceived and approvalsRequired are absent', () => {
    // buildFullData() does not include approvalsReceived/approvalsRequired
    renderComponent(buildFullData());

    expect(
      screen.queryByText(/Approvals received/)
    ).not.toBeInTheDocument();
  });
});
