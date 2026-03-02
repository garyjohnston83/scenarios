import { render, screen } from '@testing-library/react';
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
  const result = render(
    <Provider store={testStore}>
      <FluentProvider theme={webLightTheme}>
        <ReviewApprovalSection data={data} scenarioId={scenarioId} />
      </FluentProvider>
    </Provider>
  );
  return { testStore, container: result.container };
};

const buildDataWithMessages = (): ReviewApprovalData => ({
  workflow: {
    workflowState: 'IMPACT_AVAILABLE',
    workflowStateLabel: 'Impact Available',
    progress: { current: 2, total: 5 },
  },
  messages: [
    {
      id: 'msg-1',
      authorDisplayName: 'Alice Smith',
      createdAt: '2026-02-18T09:00:00',
      text: 'First message.',
    },
    {
      id: 'msg-2',
      authorDisplayName: 'Bob Jones',
      createdAt: '2026-02-19T11:30:00',
      text: 'Second message.',
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
      actorDisplayName: 'System',
      eventType: 'IMPACT_COMPLETED',
      eventLabel: 'Impact assessment completed',
    },
  ],
});

describe('ReviewApprovalSection scrollable areas and EventData', () => {
  it('messagesList container has scrollable styling', () => {
    const { container } = renderComponent(buildDataWithMessages());

    // identity-obj-proxy maps CSS module class names to their property name strings,
    // so styles.messagesList renders as class="messagesList"
    const messagesListEl = container.querySelector('.messagesList');
    expect(messagesListEl).toBeInTheDocument();
  });

  it('eventsList container has scrollable styling', () => {
    const { container } = renderComponent(buildDataWithMessages());

    const eventsListEl = container.querySelector('.eventsList');
    expect(eventsListEl).toBeInTheDocument();
  });

  it('EventData with relatedMessageId renders without error', () => {
    const data: ReviewApprovalData = {
      ...buildDataWithMessages(),
      events: [
        {
          id: 'evt-with-related',
          createdAt: '2026-02-20T12:00:00',
          actorDisplayName: 'Jane Doe',
          eventType: 'RECALL',
          eventLabel: 'Scenario recalled',
          relatedMessageId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
      ],
    };

    renderComponent(data);

    expect(screen.getByText('Scenario recalled')).toBeInTheDocument();
  });

  it('EventData without relatedMessageId renders without error', () => {
    const data: ReviewApprovalData = {
      ...buildDataWithMessages(),
      events: [
        {
          id: 'evt-no-related',
          createdAt: '2026-02-20T14:00:00',
          actorDisplayName: 'System',
          eventType: 'IMPACT_COMPLETED',
          eventLabel: 'Impact assessment completed',
        },
      ],
    };

    renderComponent(data);

    expect(
      screen.getByText('Impact assessment completed')
    ).toBeInTheDocument();
  });
});
