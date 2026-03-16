import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ChangeViewDefinitionListItem,
  ChangeViewDefinitionDetail,
} from '../services/changeViewDefinitionAdminApi';

export interface ChangeViewDefinitionAdminState {
  definitions: ChangeViewDefinitionListItem[];
  selectedDefinition: ChangeViewDefinitionDetail | null;
  loading: boolean;
  saving: boolean;
  previewing: boolean;
  error: string | null;
}

const initialState: ChangeViewDefinitionAdminState = {
  definitions: [],
  selectedDefinition: null,
  loading: false,
  saving: false,
  previewing: false,
  error: null,
};

const changeViewDefinitionAdminSlice = createSlice({
  name: 'changeViewDefinitionAdmin',
  initialState,
  reducers: {
    // --- Fetch Definitions ---
    fetchCvDefinitionsRequest(state, _action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
    },
    fetchCvDefinitionsSuccess(
      state,
      action: PayloadAction<ChangeViewDefinitionListItem[]>
    ) {
      state.definitions = action.payload;
      state.loading = false;
    },
    fetchCvDefinitionsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },

    // --- Fetch Definition Detail ---
    fetchCvDefinitionDetailRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.loading = true;
      state.error = null;
    },
    fetchCvDefinitionDetailSuccess(
      state,
      action: PayloadAction<ChangeViewDefinitionDetail>
    ) {
      state.selectedDefinition = action.payload;
      state.loading = false;
    },
    fetchCvDefinitionDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },

    // --- Create Definition ---
    createCvDefinitionRequest(
      state,
      _action: PayloadAction<{
        scenarioTypeCode: string;
        templateKey: string;
        definition: string;
      }>
    ) {
      state.saving = true;
      state.error = null;
    },
    createCvDefinitionSuccess(state) {
      state.saving = false;
    },
    createCvDefinitionFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.saving = false;
    },

    // --- Activate Definition ---
    activateCvDefinitionRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.error = null;
    },
    activateCvDefinitionSuccess(_state) {
      // no-op: saga re-fetches the list
    },
    activateCvDefinitionFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },

    // --- Deactivate Definition ---
    deactivateCvDefinitionRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.error = null;
    },
    deactivateCvDefinitionSuccess(_state) {
      // no-op: saga re-fetches the list
    },
    deactivateCvDefinitionFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },

    // --- Fetch Preview ---
    fetchCvPreviewRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; definition: string }>
    ) {
      state.previewing = true;
      state.error = null;
    },
    fetchCvPreviewSuccess(state, _action: PayloadAction<unknown>) {
      state.previewing = false;
    },
    fetchCvPreviewFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.previewing = false;
    },

    // --- Fetch Preview Data (sample change data) ---
    fetchCvPreviewDataRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string }>
    ) {
      state.previewing = true;
      state.error = null;
    },
    fetchCvPreviewDataSuccess(state, _action: PayloadAction<Record<string, unknown>>) {
      state.previewing = false;
    },
    fetchCvPreviewDataFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.previewing = false;
    },

    // --- Local Selection ---
    selectCvDefinition(
      state,
      action: PayloadAction<ChangeViewDefinitionDetail | null>
    ) {
      state.selectedDefinition = action.payload;
    },
    clearSelectedCvDefinition(state) {
      state.selectedDefinition = null;
    },
  },
});

export const {
  fetchCvDefinitionsRequest,
  fetchCvDefinitionsSuccess,
  fetchCvDefinitionsFailure,
  fetchCvDefinitionDetailRequest,
  fetchCvDefinitionDetailSuccess,
  fetchCvDefinitionDetailFailure,
  createCvDefinitionRequest,
  createCvDefinitionSuccess,
  createCvDefinitionFailure,
  activateCvDefinitionRequest,
  activateCvDefinitionSuccess,
  activateCvDefinitionFailure,
  deactivateCvDefinitionRequest,
  deactivateCvDefinitionSuccess,
  deactivateCvDefinitionFailure,
  fetchCvPreviewRequest,
  fetchCvPreviewSuccess,
  fetchCvPreviewFailure,
  fetchCvPreviewDataRequest,
  fetchCvPreviewDataSuccess,
  fetchCvPreviewDataFailure,
  selectCvDefinition,
  clearSelectedCvDefinition,
} = changeViewDefinitionAdminSlice.actions;

export default changeViewDefinitionAdminSlice.reducer;
