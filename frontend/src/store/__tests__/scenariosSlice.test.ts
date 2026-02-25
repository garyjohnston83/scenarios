import scenariosReducer, {
  ScenariosState,
  fetchScenarioListRequest,
  fetchScenarioListSuccess,
  fetchScenarioDetailSuccess,
  setSortOption,
  setWorkflowStateFilter,
  postMessageRequest,
  postMessageSuccess,
  postMessageFailure,
  postEventRequest,
  postEventSuccess,
  postEventFailure,
} from '../scenariosSlice';
import type { ScenarioListItem, ScenarioDetail, MessageData } from '../scenariosSlice';

describe('scenariosSlice', () => {
  const initialState: ScenariosState = {
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

  it('has correct initial state defaults', () => {
    const state = scenariosReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual(initialState);
  });

  it('fetchScenarioListRequest sets listLoading to true and clears listError', () => {
    const prevState: ScenariosState = {
      ...initialState,
      listLoading: false,
      listError: 'previous error',
    };
    const state = scenariosReducer(prevState, fetchScenarioListRequest());
    expect(state.listLoading).toBe(true);
    expect(state.listError).toBeNull();
  });

  it('fetchScenarioListSuccess populates items and sets listLoading to false', () => {
    const prevState: ScenariosState = {
      ...initialState,
      listLoading: true,
    };
    const items: ScenarioListItem[] = [
      {
        id: 'sc-1',
        name: 'Test Scenario',
        workflowState: 'IMPACT_AVAILABLE',
        impact: 'HIGH',
        updatedAt: '2026-01-15T10:00:00Z',
      },
    ];
    const state = scenariosReducer(prevState, fetchScenarioListSuccess(items));
    expect(state.items).toEqual(items);
    expect(state.listLoading).toBe(false);
  });

  it('fetchScenarioDetailSuccess populates selectedDetail and sets detailLoading to false', () => {
    const prevState: ScenariosState = {
      ...initialState,
      detailLoading: true,
    };
    const detail: ScenarioDetail = {
      id: 'sc-1',
      name: 'Test Scenario',
      scenarioTypeCode: 'INTEREST_RATE',
      ownerDisplayName: 'John Doe',
      createdAt: '2026-01-10T08:00:00Z',
      updatedAt: '2026-01-15T10:00:00Z',
      header: {
        workflowState: 'IMPACT_AVAILABLE',
        impact: 'MODERATE',
        ownerDisplayName: 'John Doe',
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      },
    };
    const state = scenariosReducer(prevState, fetchScenarioDetailSuccess(detail));
    expect(state.selectedDetail).toEqual(detail);
    expect(state.detailLoading).toBe(false);
  });

  it('setSortOption updates sortOption in state', () => {
    const state = scenariosReducer(initialState, setSortOption('name-asc'));
    expect(state.sortOption).toBe('name-asc');
  });

  it('setWorkflowStateFilter updates workflowStateFilter in state', () => {
    const states = ['IMPACT_AVAILABLE', 'SIGNED_OFF'];
    const state = scenariosReducer(
      initialState,
      setWorkflowStateFilter(states)
    );
    expect(state.workflowStateFilter).toEqual(states);
  });

  // ========================================================================
  // Gap tests for message posting reducers
  // (Updated for Increment 13: postMessageSuccess no longer appends to
  //  reviewApproval.messages -- it only clears messagePosting flag)
  // ========================================================================

  it('postMessageSuccess clears messagePosting and does NOT append to reviewApproval.messages', () => {
    const prevState: ScenariosState = {
      ...initialState,
      messagePosting: true,
      selectedDetail: {
        id: 'sc-1',
        name: 'Test Scenario',
        scenarioTypeCode: 'INTEREST_RATE',
        ownerDisplayName: 'John Doe',
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
        reviewApproval: {
          workflow: {
            workflowState: 'SIGNOFF_IN_PROGRESS',
            workflowStateLabel: 'Sign-off In Progress',
            progress: { current: 3, total: 5 },
          },
          messages: [
            {
              id: 'existing-msg-1',
              authorDisplayName: 'Alice Smith',
              createdAt: '2026-02-18T09:00:00',
              text: 'Existing message.',
            },
          ],
          events: [],
        },
      },
    };

    const newMessage: MessageData = {
      id: 'new-msg-1',
      authorDisplayName: 'Current User',
      createdAt: '2026-02-21T12:00:00',
      text: 'Newly posted message.',
    };

    const state = scenariosReducer(prevState, postMessageSuccess(newMessage));

    expect(state.messagePosting).toBe(false);
    // In Increment 13, postMessageSuccess no longer appends to reviewApproval.messages.
    // The reviewApproval.messages should remain unchanged (length 1).
    expect(state.selectedDetail?.reviewApproval?.messages).toHaveLength(1);
    expect(state.selectedDetail?.reviewApproval?.messages[0].id).toBe('existing-msg-1');
  });

  it('postMessageFailure sets messagePostError and clears messagePosting', () => {
    const prevState: ScenariosState = {
      ...initialState,
      messagePosting: true,
      messagePostError: null,
    };

    const state = scenariosReducer(
      prevState,
      postMessageFailure('Network error: failed to post message')
    );

    expect(state.messagePosting).toBe(false);
    expect(state.messagePostError).toBe('Network error: failed to post message');
  });

  it('postMessageRequest sets messagePosting to true and clears messagePostError', () => {
    const prevState: ScenariosState = {
      ...initialState,
      messagePosting: false,
      messagePostError: 'previous error',
    };

    const state = scenariosReducer(
      prevState,
      postMessageRequest({ scenarioId: 'sc-1', text: 'Hello' })
    );

    expect(state.messagePosting).toBe(true);
    expect(state.messagePostError).toBeNull();
  });

  // ========================================================================
  // Event posting reducers (postEvent actions)
  // ========================================================================

  it('postEventRequest sets eventPosting to true and clears eventPostError', () => {
    const prevState: ScenariosState = {
      ...initialState,
      eventPosting: false,
      eventPostError: 'previous error',
    };

    const state = scenariosReducer(
      prevState,
      postEventRequest({ scenarioId: 'sc-1', type: 'SIGNOFF' })
    );

    expect(state.eventPosting).toBe(true);
    expect(state.eventPostError).toBeNull();
  });

  it('postEventRequest with message payload sets eventPosting to true', () => {
    const state = scenariosReducer(
      initialState,
      postEventRequest({ scenarioId: 'sc-1', type: 'RECALL', message: 'Recalling for review' })
    );

    expect(state.eventPosting).toBe(true);
    expect(state.eventPostError).toBeNull();
  });

  it('postEventSuccess sets eventPosting to false', () => {
    const prevState: ScenariosState = {
      ...initialState,
      eventPosting: true,
    };

    const state = scenariosReducer(prevState, postEventSuccess());

    expect(state.eventPosting).toBe(false);
  });

  it('postEventFailure sets eventPosting to false and sets eventPostError', () => {
    const prevState: ScenariosState = {
      ...initialState,
      eventPosting: true,
      eventPostError: null,
    };

    const state = scenariosReducer(
      prevState,
      postEventFailure('SIGNOFF is not allowed from state: SIGNED_OFF')
    );

    expect(state.eventPosting).toBe(false);
    expect(state.eventPostError).toBe('SIGNOFF is not allowed from state: SIGNED_OFF');
  });
});
