import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DataTemplateDto } from '../services/dataTemplateApi';

export interface DataTemplateState {
  templates: DataTemplateDto[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
}

const initialState: DataTemplateState = {
  templates: [],
  loading: false,
  uploading: false,
  error: null,
};

const dataTemplateSlice = createSlice({
  name: 'dataTemplate',
  initialState,
  reducers: {
    fetchTemplatesRequest(state, _action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
    },
    fetchTemplatesSuccess(state, action: PayloadAction<DataTemplateDto[]>) {
      state.templates = action.payload;
      state.loading = false;
    },
    fetchTemplatesFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    uploadTemplateRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; name: string; file: File }>
    ) {
      state.uploading = true;
      state.error = null;
    },
    uploadTemplateSuccess(state) {
      state.uploading = false;
    },
    uploadTemplateFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.uploading = false;
    },
    activateTemplateRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.error = null;
    },
    activateTemplateSuccess(_state) {
      // no-op: saga re-fetches the list
    },
    activateTemplateFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    deactivateTemplateRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.error = null;
    },
    deactivateTemplateSuccess(_state) {
      // no-op: saga re-fetches the list
    },
    deactivateTemplateFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
  },
});

export const {
  fetchTemplatesRequest,
  fetchTemplatesSuccess,
  fetchTemplatesFailure,
  uploadTemplateRequest,
  uploadTemplateSuccess,
  uploadTemplateFailure,
  activateTemplateRequest,
  activateTemplateSuccess,
  activateTemplateFailure,
  deactivateTemplateRequest,
  deactivateTemplateSuccess,
  deactivateTemplateFailure,
} = dataTemplateSlice.actions;

export default dataTemplateSlice.reducer;
