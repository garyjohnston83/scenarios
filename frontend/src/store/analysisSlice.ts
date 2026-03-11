import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ScenarioTypeData, DirectChangesData, SummaryCardsData } from './scenariosSlice';
import type { ImpactReportSummaryFe, ImpactReportDetailFe, ReportDetailState } from '../types/renderedReport';
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

  // Report Summaries (replaces impactReports)
  reportSummaries: ImpactReportSummaryFe[] | null;
  reportSummariesLoading: boolean;
  reportSummariesError: string | null;

  // Per-report cached detail state
  reportDetails: Record<string, ReportDetailState>;

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
  reportSummaries: null,
  reportSummariesLoading: false,
  reportSummariesError: null,
  reportDetails: {},
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
      state.reportSummaries = null;
      state.reportSummariesLoading = true;
      state.reportSummariesError = null;
      state.reportDetails = {};
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
    fetchReportSummariesSuccess(state, action: PayloadAction<ImpactReportSummaryFe[]>) {
      state.reportSummaries = action.payload;
      state.reportSummariesLoading = false;
    },
    fetchReportSummariesFailure(state, action: PayloadAction<string>) {
      state.reportSummariesError = action.payload;
      state.reportSummariesLoading = false;
    },
    fetchReportDetailRequest(state, action: PayloadAction<{ scenarioId: string; reportId: string }>) {
      state.reportDetails[action.payload.reportId] = { loading: true, data: null, error: null, errorMessage: null };
    },
    fetchReportDetailSuccess(state, action: PayloadAction<{ reportId: string; detail: ImpactReportDetailFe }>) {
      state.reportDetails[action.payload.reportId] = {
        loading: false,
        data: action.payload.detail.renderedReport,
        error: null,
        errorMessage: action.payload.detail.errorMessage,
      };
    },
    fetchReportDetailFailure(state, action: PayloadAction<{ reportId: string; error: string }>) {
      state.reportDetails[action.payload.reportId] = {
        loading: false,
        data: null,
        error: action.payload.error,
        errorMessage: null,
      };
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
  fetchReportSummariesSuccess,
  fetchReportSummariesFailure,
  fetchReportDetailRequest,
  fetchReportDetailSuccess,
  fetchReportDetailFailure,
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

export const selectReportSummaries = (state: RootState) => state.analysis.reportSummaries;
export const selectReportSummariesLoading = (state: RootState) => state.analysis.reportSummariesLoading;
export const selectReportSummariesError = (state: RootState) => state.analysis.reportSummariesError;
export const selectReportDetails = (state: RootState) => state.analysis.reportDetails;
export const selectActiveTab = (state: RootState) => state.analysis.activeTab;

export const selectAnalysisLoading = (state: RootState) =>
  state.analysis.headerLoading || state.analysis.directChangesLoading || state.analysis.reportSummariesLoading;

export default analysisSlice.reducer;
