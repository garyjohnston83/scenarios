import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  SignoffPolicyDto,
  CreateSignoffPolicyRequest,
  UpdateSignoffPolicyRequest,
} from '../services/adminApi';

export interface AdminState {
  policies: SignoffPolicyDto[];
  loading: boolean;
  error: string | null;
  saving: boolean;
}

const initialState: AdminState = {
  policies: [],
  loading: false,
  error: null,
  saving: false,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    fetchPoliciesRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchPoliciesSuccess(state, action: PayloadAction<SignoffPolicyDto[]>) {
      state.policies = action.payload;
      state.loading = false;
    },
    fetchPoliciesFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    createPolicyRequest(state, _action: PayloadAction<CreateSignoffPolicyRequest>) {
      state.saving = true;
      state.error = null;
    },
    createPolicySuccess(state, action: PayloadAction<SignoffPolicyDto>) {
      state.policies.push(action.payload);
      state.saving = false;
    },
    createPolicyFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.saving = false;
    },
    updatePolicyRequest(
      state,
      _action: PayloadAction<{ id: string; body: UpdateSignoffPolicyRequest }>
    ) {
      state.saving = true;
      state.error = null;
    },
    updatePolicySuccess(state, action: PayloadAction<SignoffPolicyDto>) {
      const index = state.policies.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.policies[index] = action.payload;
      }
      state.saving = false;
    },
    updatePolicyFailure(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.saving = false;
    },
  },
});

export const {
  fetchPoliciesRequest,
  fetchPoliciesSuccess,
  fetchPoliciesFailure,
  createPolicyRequest,
  createPolicySuccess,
  createPolicyFailure,
  updatePolicyRequest,
  updatePolicySuccess,
  updatePolicyFailure,
} = adminSlice.actions;

export default adminSlice.reducer;
