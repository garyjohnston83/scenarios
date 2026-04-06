import { call, put, takeLatest } from 'redux-saga/effects';
import {
  fetchScenarioTypes,
  fetchScenarioTypeDetail,
  updateScenarioType,
  updateNavigationViewMode,
} from '../services/scenarioTypeAdminApi';
import type {
  ScenarioTypeAdminDto,
  ScenarioTypeAdminDetailDto,
  UpdateScenarioTypeRequest,
  UpdateNavigationViewModeRequest,
} from '../services/scenarioTypeAdminApi';
import {
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
} from './scenarioTypeAdminSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../utils/logger';

const logger = createLogger('saga:scenarioTypeAdmin');

function* handleFetchScenarioTypes() {
  logger.debug('handleFetchScenarioTypes started');
  try {
    const scenarioTypes: ScenarioTypeAdminDto[] = yield call(fetchScenarioTypes);
    logger.info('handleFetchScenarioTypes succeeded', { count: scenarioTypes.length });
    yield put(fetchScenarioTypesSuccess(scenarioTypes));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch scenario types';
    logger.error('handleFetchScenarioTypes failed', { error: message });
    yield put(fetchScenarioTypesFailure(message));
  }
}

function* handleFetchScenarioTypeDetail(
  action: PayloadAction<string>
) {
  logger.debug('handleFetchScenarioTypeDetail started', { code: action.payload });
  try {
    const detail: ScenarioTypeAdminDetailDto = yield call(
      fetchScenarioTypeDetail,
      action.payload
    );
    logger.info('handleFetchScenarioTypeDetail succeeded', { code: action.payload });
    yield put(fetchScenarioTypeDetailSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch scenario type detail';
    logger.error('handleFetchScenarioTypeDetail failed', { error: message, code: action.payload });
    yield put(fetchScenarioTypeDetailFailure(message));
  }
}

function* handleUpdateScenarioType(
  action: PayloadAction<{ code: string; body: UpdateScenarioTypeRequest }>
) {
  logger.debug('handleUpdateScenarioType started', { code: action.payload.code });
  try {
    const detail: ScenarioTypeAdminDetailDto = yield call(
      updateScenarioType,
      action.payload.code,
      action.payload.body
    );
    logger.info('handleUpdateScenarioType succeeded', { code: action.payload.code });
    yield put(updateScenarioTypeSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update scenario type';
    logger.error('handleUpdateScenarioType failed', { error: message, code: action.payload.code });
    yield put(updateScenarioTypeFailure(message));
  }
}

function* handleUpdateNavigationViewMode(
  action: PayloadAction<{ code: string; body: UpdateNavigationViewModeRequest }>
) {
  logger.debug('handleUpdateNavigationViewMode started', { code: action.payload.code });
  try {
    const detail: ScenarioTypeAdminDetailDto = yield call(
      updateNavigationViewMode,
      action.payload.code,
      action.payload.body
    );
    logger.info('handleUpdateNavigationViewMode succeeded', { code: action.payload.code });
    yield put(updateNavigationViewModeSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update navigation view mode';
    logger.error('handleUpdateNavigationViewMode failed', { error: message, code: action.payload.code });
    yield put(updateNavigationViewModeFailure(message));
  }
}

export function* watchFetchScenarioTypes() {
  yield takeLatest(fetchScenarioTypesRequest.type, handleFetchScenarioTypes);
}

export function* watchFetchScenarioTypeDetail() {
  yield takeLatest(fetchScenarioTypeDetailRequest.type, handleFetchScenarioTypeDetail);
}

export function* watchUpdateScenarioType() {
  yield takeLatest(updateScenarioTypeRequest.type, handleUpdateScenarioType);
}

export function* watchUpdateNavigationViewMode() {
  yield takeLatest(updateNavigationViewModeRequest.type, handleUpdateNavigationViewMode);
}
