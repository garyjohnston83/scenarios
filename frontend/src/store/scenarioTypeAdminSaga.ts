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

function* handleFetchScenarioTypes() {
  try {
    const scenarioTypes: ScenarioTypeAdminDto[] = yield call(fetchScenarioTypes);
    yield put(fetchScenarioTypesSuccess(scenarioTypes));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch scenario types';
    yield put(fetchScenarioTypesFailure(message));
  }
}

function* handleFetchScenarioTypeDetail(
  action: PayloadAction<string>
) {
  try {
    const detail: ScenarioTypeAdminDetailDto = yield call(
      fetchScenarioTypeDetail,
      action.payload
    );
    yield put(fetchScenarioTypeDetailSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch scenario type detail';
    yield put(fetchScenarioTypeDetailFailure(message));
  }
}

function* handleUpdateScenarioType(
  action: PayloadAction<{ code: string; body: UpdateScenarioTypeRequest }>
) {
  try {
    const detail: ScenarioTypeAdminDetailDto = yield call(
      updateScenarioType,
      action.payload.code,
      action.payload.body
    );
    yield put(updateScenarioTypeSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update scenario type';
    yield put(updateScenarioTypeFailure(message));
  }
}

function* handleUpdateNavigationViewMode(
  action: PayloadAction<{ code: string; body: UpdateNavigationViewModeRequest }>
) {
  try {
    const detail: ScenarioTypeAdminDetailDto = yield call(
      updateNavigationViewMode,
      action.payload.code,
      action.payload.body
    );
    yield put(updateNavigationViewModeSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update navigation view mode';
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
