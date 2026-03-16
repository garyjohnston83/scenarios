import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ScenarioTypeAdminDto,
  ScenarioTypeAdminDetailDto,
  UpdateScenarioTypeRequest,
  UpdateNavigationViewModeRequest,
} from '../services/scenarioTypeAdminApi';

export interface ScenarioTypeAdminState {
  scenarioTypes: ScenarioTypeAdminDto[];
  selectedDetail: ScenarioTypeAdminDetailDto | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: ScenarioTypeAdminState = {
  scenarioTypes: [],
  selectedDetail: null,
  loading: false,
  saving: false,
  error: null,
};

const scenarioTypeAdminSlice = createSlice({
  name: 'scenarioTypeAdmin',
  initialState,
  reducers: {
    fetchScenarioTypesRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchScenarioTypesSuccess(state, action: PayloadAction<ScenarioTypeAdminDto[]>) {
      state.scenarioTypes = action.payload;
      state.loading = false;
    },
    fetchScenarioTypesFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    fetchScenarioTypeDetailRequest(state, _action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
    },
    fetchScenarioTypeDetailSuccess(state, action: PayloadAction<ScenarioTypeAdminDetailDto>) {
      state.selectedDetail = action.payload;
      state.loading = false;
    },
    fetchScenarioTypeDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    updateScenarioTypeRequest(
      state,
      _action: PayloadAction<{ code: string; body: UpdateScenarioTypeRequest }>
    ) {
      state.saving = true;
      state.error = null;
    },
    updateScenarioTypeSuccess(state, action: PayloadAction<ScenarioTypeAdminDetailDto>) {
      state.selectedDetail = action.payload;
      state.saving = false;
    },
    updateScenarioTypeFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.saving = false;
    },
    updateNavigationViewModeRequest(
      state,
      _action: PayloadAction<{ code: string; body: UpdateNavigationViewModeRequest }>
    ) {
      state.saving = true;
      state.error = null;
    },
    updateNavigationViewModeSuccess(state, action: PayloadAction<ScenarioTypeAdminDetailDto>) {
      state.selectedDetail = action.payload;
      state.saving = false;
    },
    updateNavigationViewModeFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.saving = false;
    },
  },
});

export const {
  fetchScenarioTypesRequest,
  fetchScenarioTypesSuccess,
  fetchScenarioTypesFailure,
  fetchScenarioTypeDetailRequest,
  fetchScenarioTypeDetailSuccess,
  fetchScenarioTypeDetailFailure,
  updateScenarioTypeRequest,
  updateScenarioTypeSuccess,
  updateScenarioTypeFailure,
  updateNavigationViewModeRequest,
  updateNavigationViewModeSuccess,
  updateNavigationViewModeFailure,
} = scenarioTypeAdminSlice.actions;

export default scenarioTypeAdminSlice.reducer;
