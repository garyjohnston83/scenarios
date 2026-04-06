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
import { createLogger } from '../utils/logger';

const logger = createLogger('saga:admin');

function* handleFetchPolicies() {
  logger.debug('handleFetchPolicies started');
  try {
    const policies: SignoffPolicyDto[] = yield call(fetchSignoffPolicies);
    logger.info('handleFetchPolicies succeeded', { count: policies.length });
    yield put(fetchPoliciesSuccess(policies));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch policies';
    logger.error('handleFetchPolicies failed', { error: message });
    yield put(fetchPoliciesFailure(message));
  }
}

function* handleCreatePolicy(
  action: PayloadAction<CreateSignoffPolicyRequest>
) {
  logger.debug('handleCreatePolicy started', { name: action.payload.name });
  try {
    const policy: SignoffPolicyDto = yield call(
      createSignoffPolicy,
      action.payload
    );
    logger.info('handleCreatePolicy succeeded', { id: policy.id });
    yield put(createPolicySuccess(policy));
    yield put(fetchPoliciesRequest());
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create policy';
    logger.error('handleCreatePolicy failed', { error: message });
    yield put(createPolicyFailure(message));
  }
}

function* handleUpdatePolicy(
  action: PayloadAction<{ id: string; body: UpdateSignoffPolicyRequest }>
) {
  logger.debug('handleUpdatePolicy started', { id: action.payload.id });
  try {
    const policy: SignoffPolicyDto = yield call(
      updateSignoffPolicy,
      action.payload.id,
      action.payload.body
    );
    logger.info('handleUpdatePolicy succeeded', { id: action.payload.id });
    yield put(updatePolicySuccess(policy));
    yield put(fetchPoliciesRequest());
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update policy';
    logger.error('handleUpdatePolicy failed', { error: message, id: action.payload.id });
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
