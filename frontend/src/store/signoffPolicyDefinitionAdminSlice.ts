import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  SignoffPolicyDefinitionListItem,
  SignoffPolicyDefinitionDetail,
  FactTypeCatalogEntry,
  RoleCatalogEntry,
} from '../services/signoffPolicyDefinitionAdminApi';

export interface SignoffPolicyDefinitionAdminState {
  definitions: SignoffPolicyDefinitionListItem[];
  selectedDefinition: SignoffPolicyDefinitionDetail | null;
  factTypes: FactTypeCatalogEntry[];
  roles: RoleCatalogEntry[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: SignoffPolicyDefinitionAdminState = {
  definitions: [],
  selectedDefinition: null,
  factTypes: [],
  roles: [],
  loading: false,
  saving: false,
  error: null,
};

const signoffPolicyDefinitionAdminSlice = createSlice({
  name: 'signoffPolicyDefinitionAdmin',
  initialState,
  reducers: {
    // --- Fetch Definitions ---
    fetchSpDefinitionsRequest(state, _action: PayloadAction<string>) {
      state.loading = true;
      state.error = null;
    },
    fetchSpDefinitionsSuccess(
      state,
      action: PayloadAction<SignoffPolicyDefinitionListItem[]>
    ) {
      state.definitions = action.payload;
      state.loading = false;
    },
    fetchSpDefinitionsFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },

    // --- Fetch Definition Detail ---
    fetchSpDefinitionDetailRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.loading = true;
      state.error = null;
    },
    fetchSpDefinitionDetailSuccess(
      state,
      action: PayloadAction<SignoffPolicyDefinitionDetail>
    ) {
      state.selectedDefinition = action.payload;
      state.loading = false;
    },
    fetchSpDefinitionDetailFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },

    // --- Create Definition ---
    createSpDefinitionRequest(
      state,
      _action: PayloadAction<{
        scenarioTypeCode: string;
        policyKey: string;
        definition: string;
      }>
    ) {
      state.saving = true;
      state.error = null;
    },
    createSpDefinitionSuccess(state) {
      state.saving = false;
    },
    createSpDefinitionFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.saving = false;
    },

    // --- Activate Definition ---
    activateSpDefinitionRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.error = null;
    },
    activateSpDefinitionSuccess(_state) {
      // no-op: saga re-fetches the list
    },
    activateSpDefinitionFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },

    // --- Deactivate Definition ---
    deactivateSpDefinitionRequest(
      state,
      _action: PayloadAction<{ scenarioTypeCode: string; id: string }>
    ) {
      state.error = null;
    },
    deactivateSpDefinitionSuccess(_state) {
      // no-op: saga re-fetches the list
    },
    deactivateSpDefinitionFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },

    // --- Fetch Fact Types Catalog ---
    fetchFactTypesRequest(state) {
      state.error = null;
    },
    fetchFactTypesSuccess(
      state,
      action: PayloadAction<FactTypeCatalogEntry[]>
    ) {
      state.factTypes = action.payload;
    },
    fetchFactTypesFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },

    // --- Fetch Roles Catalog ---
    fetchRolesRequest(state) {
      state.error = null;
    },
    fetchRolesSuccess(state, action: PayloadAction<RoleCatalogEntry[]>) {
      state.roles = action.payload;
    },
    fetchRolesFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },

    // --- Local Selection ---
    selectSpDefinition(
      state,
      action: PayloadAction<SignoffPolicyDefinitionDetail | null>
    ) {
      state.selectedDefinition = action.payload;
    },
    clearSelectedSpDefinition(state) {
      state.selectedDefinition = null;
    },
  },
});

export const {
  fetchSpDefinitionsRequest,
  fetchSpDefinitionsSuccess,
  fetchSpDefinitionsFailure,
  fetchSpDefinitionDetailRequest,
  fetchSpDefinitionDetailSuccess,
  fetchSpDefinitionDetailFailure,
  createSpDefinitionRequest,
  createSpDefinitionSuccess,
  createSpDefinitionFailure,
  activateSpDefinitionRequest,
  activateSpDefinitionSuccess,
  activateSpDefinitionFailure,
  deactivateSpDefinitionRequest,
  deactivateSpDefinitionSuccess,
  deactivateSpDefinitionFailure,
  fetchFactTypesRequest,
  fetchFactTypesSuccess,
  fetchFactTypesFailure,
  fetchRolesRequest,
  fetchRolesSuccess,
  fetchRolesFailure,
  selectSpDefinition,
  clearSelectedSpDefinition,
} = signoffPolicyDefinitionAdminSlice.actions;

export default signoffPolicyDefinitionAdminSlice.reducer;
