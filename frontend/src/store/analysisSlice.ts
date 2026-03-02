import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ScenarioTypeData, DirectChangesData, SummaryCardsData, ImpactReportData } from './scenariosSlice';
import type { RootState } from './store';

export interface AnalysisState {
  // Scenario metadata for header
  scenarioId: string | null;
  scenarioName: string | null;
  workflowState: string | null;
  scenarioType: ScenarioTypeData | null;

  // SummaryCards (needed for ExternalRedirectView to get the CTA URL)
  summaryCards: SummaryCardsData | null;

  // Direct Changes data
  directChanges: DirectChangesData | null;
  directChangesLoading: boolean;
  directChangesError: string | null;

  // Header/metadata loading
  headerLoading: boolean;
  headerError: string | null;

  // Impact Reports
  impactReports: ImpactReportData[] | null;
  impactReportsLoading: boolean;
  impactReportsError: string | null;

  // Active tab (D7)
  activeTab: string | null;
}

const initialState: AnalysisState = {
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
  impactReports: null,
  impactReportsLoading: false,
  impactReportsError: null,
  activeTab: null,
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    fetchAnalysisDataRequest(state, action: PayloadAction<string>) {
      state.scenarioId = action.payload;
      state.headerLoading = true;
      state.headerError = null;
      state.directChangesLoading = true;
      state.directChangesError = null;
      state.directChanges = null;
      state.scenarioName = null;
      state.workflowState = null;
      state.scenarioType = null;
      state.summaryCards = null;
      state.impactReportsLoading = true;
      state.impactReports = null;
      state.impactReportsError = null;
      state.activeTab = null;
    },
    fetchAnalysisHeaderSuccess(
      state,
      action: PayloadAction<{
        name: string;
        workflowState: string;
        scenarioType: ScenarioTypeData | null;
        summaryCards: SummaryCardsData | null;
      }>
    ) {
      state.scenarioName = action.payload.name;
      state.workflowState = action.payload.workflowState;
      state.scenarioType = action.payload.scenarioType;
      state.summaryCards = action.payload.summaryCards;
      state.headerLoading = false;
    },
    fetchAnalysisHeaderFailure(state, action: PayloadAction<string>) {
      state.headerError = action.payload;
      state.headerLoading = false;
    },
    fetchDirectChangesSuccess(state, action: PayloadAction<DirectChangesData>) {
      state.directChanges = action.payload;
      state.directChangesLoading = false;
    },
    fetchDirectChangesFailure(state, action: PayloadAction<string>) {
      state.directChangesError = action.payload;
      state.directChangesLoading = false;
    },
    fetchImpactReportsSuccess(state, action: PayloadAction<ImpactReportData[]>) {
      state.impactReports = action.payload;
      state.impactReportsLoading = false;
    },
    fetchImpactReportsFailure(state, action: PayloadAction<string>) {
      state.impactReportsError = action.payload;
      state.impactReportsLoading = false;
    },
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload;
    },
    clearAnalysisState() {
      return initialState;
    },
  },
});

export const {
  fetchAnalysisDataRequest,
  fetchAnalysisHeaderSuccess,
  fetchAnalysisHeaderFailure,
  fetchDirectChangesSuccess,
  fetchDirectChangesFailure,
  fetchImpactReportsSuccess,
  fetchImpactReportsFailure,
  setActiveTab,
  clearAnalysisState,
} = analysisSlice.actions;

// Selectors
export const selectDirectChanges = (state: RootState) => state.analysis.directChanges;
export const selectDirectChangesLoading = (state: RootState) => state.analysis.directChangesLoading;
export const selectDirectChangesError = (state: RootState) => state.analysis.directChangesError;

export const selectAnalysisHeader = (state: RootState) => ({
  scenarioId: state.analysis.scenarioId,
  scenarioName: state.analysis.scenarioName,
  workflowState: state.analysis.workflowState,
  scenarioType: state.analysis.scenarioType,
  summaryCards: state.analysis.summaryCards,
});

export const selectImpactReports = (state: RootState) => state.analysis.impactReports;
export const selectImpactReportsLoading = (state: RootState) => state.analysis.impactReportsLoading;
export const selectImpactReportsError = (state: RootState) => state.analysis.impactReportsError;
export const selectActiveTab = (state: RootState) => state.analysis.activeTab;

export const selectAnalysisLoading = (state: RootState) =>
  state.analysis.headerLoading || state.analysis.directChangesLoading || state.analysis.impactReportsLoading;

export default analysisSlice.reducer;
