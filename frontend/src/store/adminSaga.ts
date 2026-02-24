import { call, put, takeLatest } from 'redux-saga/effects';
import {
  fetchSignoffPolicies,
  createSignoffPolicy,
  updateSignoffPolicy,
} from '../services/adminApi';
import type {
  SignoffPolicyDto,
  CreateSignoffPolicyRequest,
  UpdateSignoffPolicyRequest,
} from '../services/adminApi';
import {
  fetchPoliciesRequest,
  fetchPoliciesSuccess,
  fetchPoliciesFailure,
  createPolicyRequest,
  createPolicySuccess,
  createPolicyFailure,
  updatePolicyRequest,
  updatePolicySuccess,
  updatePolicyFailure,
} from './adminSlice';
import type { PayloadAction } from '@reduxjs/toolkit';

function* handleFetchPolicies() {
  try {
    const policies: SignoffPolicyDto[] = yield call(fetchSignoffPolicies);
    yield put(fetchPoliciesSuccess(policies));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch policies';
    yield put(fetchPoliciesFailure(message));
  }
}

function* handleCreatePolicy(
  action: PayloadAction<CreateSignoffPolicyRequest>
) {
  try {
    const policy: SignoffPolicyDto = yield call(
      createSignoffPolicy,
      action.payload
    );
    yield put(createPolicySuccess(policy));
    yield put(fetchPoliciesRequest());
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create policy';
    yield put(createPolicyFailure(message));
  }
}

function* handleUpdatePolicy(
  action: PayloadAction<{ id: string; body: UpdateSignoffPolicyRequest }>
) {
  try {
    const policy: SignoffPolicyDto = yield call(
      updateSignoffPolicy,
      action.payload.id,
      action.payload.body
    );
    yield put(updatePolicySuccess(policy));
    yield put(fetchPoliciesRequest());
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update policy';
    yield put(updatePolicyFailure(message));
  }
}

export function* watchFetchPolicies() {
  yield takeLatest(fetchPoliciesRequest.type, handleFetchPolicies);
}

export function* watchCreatePolicy() {
  yield takeLatest(createPolicyRequest.type, handleCreatePolicy);
}

export function* watchUpdatePolicy() {
  yield takeLatest(updatePolicyRequest.type, handleUpdatePolicy);
}
