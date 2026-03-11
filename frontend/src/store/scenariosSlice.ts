import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ScenarioListItem {
  id: string;
  name: string;
  scenarioTypeCode?: string;
  workflowState: string;
  impact: string;
  updatedAt: string;
}

export type DataMode = 'EXTERNAL' | 'INTERNAL';

export interface ScenarioTypeData {
  code: string;
  name: string;
  icon: string;
  directChangesMode: DataMode;
  impactDataMode: DataMode;
}

export interface ScenarioHeaderData {
  workflowState: string;
  impact: string;
  ownerDisplayName: string;
  createdAt: string;
  updatedAt: string;
  scenarioType?: ScenarioTypeData;
}

export interface CtaData {
  label: string;
  url: string;
}

export interface ChangesSummaryData {
  changesTotal: number;
  changesDirect: number;
  changesIndirect: number;
  cta?: CtaData;
}

export interface ImpactSummaryData {
  impact: string;
  lastRunAt: string | null;
  latestRunStatus: string | null;
  exceptionsCount: number | null;
  cta?: CtaData;
}

export interface SummaryCardsData {
  changesSummary: ChangesSummaryData;
  impactSummary: ImpactSummaryData;
}

export interface ProgressData {
  current: number;
  total: number;
}

export interface WorkflowData {
  workflowState: string;
  workflowStateLabel: string;
  progress: ProgressData;
}

export interface MessageData {
  id: string;
  authorDisplayName: string;
  createdAt: string;
  text: string;
}

export interface EventData {
  id: string;
  createdAt: string;
  actorDisplayName: string;
  eventType: string;
  eventLabel: string;
  relatedMessageId?: string;
}

export interface ReviewApprovalData {
  workflow: WorkflowData;
  messages: MessageData[];
  events: EventData[];
  approvalsReceived?: number;
  approvalsRequired?: number;
}

export interface ActivityRowData {
  id: string;
  bucketType: "MESSAGE" | "USER" | "SYSTEM";
  occurredAt: string;
  authorDisplayName: string;
  details: string;
  statusTransition: string | null;
}

export interface ActivityStreamData {
  rows: ActivityRowData[];
  approvalsReceived?: number;
  approvalsRequired?: number;
}

export interface GridRowData {
  rowId: string;
  payload: Record<string, unknown>;
}

export interface DirectChangesData {
  columns: string[];
  rows: GridRowData[];
}

export interface ImpactDataData {
  columns: string[];
  rows: GridRowData[];
  compareCta: CtaData | null;
}

export interface ScenarioDetail {
  id: string;
  name: string;
  scenarioTypeCode: string;
  ownerDisplayName: string;
  createdAt: string;
  updatedAt: string;
  header?: ScenarioHeaderData;
  summaryCards?: SummaryCardsData;
  reviewApproval?: ReviewApprovalData;
  events?: ActivityStreamData;
  // directChanges and impactData removed — governance mode does not render grids
}

export interface CombineScenariosRequest {
  name: string;
  scenarioTypeCode: string;
  sourceScenarioIds: string[];
}

export interface ScenariosState {
  items: ScenarioListItem[];
  listLoading: boolean;
  listError: string | null;
  selectedDetail: ScenarioDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  sortOption: string;
  workflowStateFilter: string[];
  messagePosting: boolean;
  messagePostError: string | null;
  eventPosting: boolean;
  eventPostError: string | null;
  combinePosting: boolean;
  combinePostError: string | null;
  lhsCollapsed: boolean;
}

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
  combinePosting: false,
  combinePostError: null,
  lhsCollapsed: false,
};

const scenariosSlice = createSlice({
  name: 'scenarios',
  initialState,
  reducers: {
    fetchScenarioListRequest(state) {
      state.listLoading = true;
      state.listError = null;
    },
    fetchScenarioListSuccess(state, action: PayloadAction<ScenarioListItem[]>) {
      state.items = action.payload;
      state.listLoading = false;
    },
    fetchScenarioListFailure(state, action: PayloadAction<string>) {
      state.listError = action.payload;
      state.listLoading = false;
    },
    fetchScenarioDetailRequest(state, _action: PayloadAction<string>) {
      state.detailLoading = true;
      state.detailError = null;
    },
    fetchScenarioDetailSuccess(state, action: PayloadAction<ScenarioDetail>) {
      state.selectedDetail = action.payload;
      state.detailLoading = false;
    },
    fetchScenarioDetailFailure(state, action: PayloadAction<string>) {
      state.detailError = action.payload;
      state.detailLoading = false;
    },
    setSortOption(state, action: PayloadAction<string>) {
      state.sortOption = action.payload;
    },
    setWorkflowStateFilter(state, action: PayloadAction<string[]>) {
      state.workflowStateFilter = action.payload;
    },
    postMessageRequest(state, _action: PayloadAction<{ scenarioId: string; text: string }>) {
      state.messagePosting = true;
      state.messagePostError = null;
    },
    postMessageSuccess(state, _action: PayloadAction<MessageData>) {
      state.messagePosting = false;
    },
    postMessageFailure(state, action: PayloadAction<string>) {
      state.messagePostError = action.payload;
      state.messagePosting = false;
    },
    postEventRequest(state, _action: PayloadAction<{ scenarioId: string; type: string; message?: string }>) {
      state.eventPosting = true;
      state.eventPostError = null;
    },
    postEventSuccess(state) {
      state.eventPosting = false;
    },
    postEventFailure(state, action: PayloadAction<string>) {
      state.eventPosting = false;
      state.eventPostError = action.payload;
    },
    combineScenariosRequest(state, _action: PayloadAction<CombineScenariosRequest>) {
      state.combinePosting = true;
      state.combinePostError = null;
    },
    combineScenariosSuccess(state, _action: PayloadAction<ScenarioListItem>) {
      state.combinePosting = false;
    },
    combineScenariosFailure(state, action: PayloadAction<string>) {
      state.combinePosting = false;
      state.combinePostError = action.payload;
    },
    setLhsCollapsed(state, action: PayloadAction<boolean>) {
      state.lhsCollapsed = action.payload;
    },
  },
});

export const {
  fetchScenarioListRequest,
  fetchScenarioListSuccess,
  fetchScenarioListFailure,
  fetchScenarioDetailRequest,
  fetchScenarioDetailSuccess,
  fetchScenarioDetailFailure,
  setSortOption,
  setWorkflowStateFilter,
  postMessageRequest,
  postMessageSuccess,
  postMessageFailure,
  postEventRequest,
  postEventSuccess,
  postEventFailure,
  combineScenariosRequest,
  combineScenariosSuccess,
  combineScenariosFailure,
  setLhsCollapsed,
} = scenariosSlice.actions;

export default scenariosSlice.reducer;
