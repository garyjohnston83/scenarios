import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ImpactReportDefinitionListItem,
  ImpactReportDefinitionDetail,
} from '../services/reportDefinitionAdminApi';
export interface ReportDefinitionAdminState {
  definitions: ImpactReportDefinitionListItem[];
  selectedDefinition: ImpactReportDefinitionDetail | null;
  loading: boolean;
  saving: boolean;
  savingSampleData: boolean;
  error: string | null;
}

const initialState: ReportDefinitionAdminState = {
  definitions: [],
  selectedDefinition: null,
  loading: false,
  saving: false,
  savingSampleData: false,
  error: null,
};

const reportDefinitionAdminSlice = createSlice({
  name: 'reportDefinitionAdmin',
  initialState,
  reducers: {
    // --- Fetch Definitions ---
    fetchDefinitionsRequest(state, _action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
    },
    fetchDefinitionsSuccess(
      state,
      action: PayloadAction<ImpactReportDefinitionListItem[]>
    ) {
      state.definitions = action.payload;
      state.loading = false;
    },
    fetchDefinitionsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },

    // --- Fetch Definition Detail ---
    fetchDefinitionDetailRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.loading = true;
      state.error = null;
    },
    fetchDefinitionDetailSuccess(
      state,
      action: PayloadAction<ImpactReportDefinitionDetail>
    ) {
      state.selectedDefinition = action.payload;
      state.loading = false;
    },
    fetchDefinitionDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },

    // --- Create Definition ---
    createDefinitionRequest(
      state,
      _action: PayloadAction<{
        scenarioTypeCode: string;
        reportKey: string;
        definition: string;
        sampleData?: string;
      }>
    ) {
      state.saving = true;
      state.error = null;
    },
    createDefinitionSuccess(state) {
      state.saving = false;
    },
    createDefinitionFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.saving = false;
    },

    // --- Delete Definition ---
    deleteDefinitionRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.saving = true;
      state.error = null;
    },
    deleteDefinitionSuccess(state) {
      state.saving = false;
      state.selectedDefinition = null;
    },
    deleteDefinitionFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.saving = false;
    },

    // --- Activate Definition ---
    activateDefinitionRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.error = null;
    },
    activateDefinitionSuccess(_state) {
      // no-op: saga re-fetches the list
    },
    activateDefinitionFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },

    // --- Deactivate Definition ---
    deactivateDefinitionRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.error = null;
    },
    deactivateDefinitionSuccess(_state) {
      // no-op: saga re-fetches the list
    },
    deactivateDefinitionFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },

    // --- Update Sample Data ---
    updateSampleDataRequest(
      state,
      _action: PayloadAction<{
        scenarioTypeCode: string;
        id: string;
        sampleData: string;
      }>
    ) {
      state.savingSampleData = true;
      state.error = null;
    },
    updateSampleDataSuccess(state, action: PayloadAction<string>) {
      state.savingSampleData = false;
      // Update the selectedDefinition with the new sample data
      if (state.selectedDefinition) {
        state.selectedDefinition = {
          ...state.selectedDefinition,
          sampleData: action.payload,
        };
      }
    },
    updateSampleDataFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.savingSampleData = false;
    },

    // --- Local Selection ---
    selectDefinition(
      state,
      action: PayloadAction<ImpactReportDefinitionDetail | null>
    ) {
      state.selectedDefinition = action.payload;
    },
    clearSelectedDefinition(state) {
      state.selectedDefinition = null;
    },
  },
});

export const {
  fetchDefinitionsRequest,
  fetchDefinitionsSuccess,
  fetchDefinitionsFailure,
  fetchDefinitionDetailRequest,
  fetchDefinitionDetailSuccess,
  fetchDefinitionDetailFailure,
  createDefinitionRequest,
  createDefinitionSuccess,
  createDefinitionFailure,
  deleteDefinitionRequest,
  deleteDefinitionSuccess,
  deleteDefinitionFailure,
  activateDefinitionRequest,
  activateDefinitionSuccess,
  activateDefinitionFailure,
  deactivateDefinitionRequest,
  deactivateDefinitionSuccess,
  deactivateDefinitionFailure,
  updateSampleDataRequest,
  updateSampleDataSuccess,
  updateSampleDataFailure,
  selectDefinition,
  clearSelectedDefinition,
} = reportDefinitionAdminSlice.actions;

export default reportDefinitionAdminSlice.reducer;
