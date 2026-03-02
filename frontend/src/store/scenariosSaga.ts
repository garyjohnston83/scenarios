import { call, put, takeLatest } from 'redux-saga/effects';
import { fetchScenarioList, fetchScenarioDetail, postMessage, postEvent, combineScenarios } from '../services/scenarioApi';
import {
  fetchScenarioListRequest,
  fetchScenarioListSuccess,
  fetchScenarioListFailure,
  fetchScenarioDetailRequest,
  fetchScenarioDetailSuccess,
  fetchScenarioDetailFailure,
  postMessageRequest,
  postMessageSuccess,
  postMessageFailure,
  postEventRequest,
  postEventSuccess,
  postEventFailure,
  combineScenariosRequest,
  combineScenariosSuccess,
  combineScenariosFailure,
} from './scenariosSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ScenarioListItem, ScenarioDetail, MessageData, CombineScenariosRequest } from './scenariosSlice';

function* handleFetchScenarioList() {
  try {
    const items: ScenarioListItem[] = yield call(fetchScenarioList);
    yield put(fetchScenarioListSuccess(items));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch scenarios';
    yield put(fetchScenarioListFailure(message));
  }
}

export function* handleFetchScenarioDetail(action: PayloadAction<string>) {
  try {
    const detail: ScenarioDetail = yield call(fetchScenarioDetail, action.payload);
    yield put(fetchScenarioDetailSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch scenario detail';
    yield put(fetchScenarioDetailFailure(message));
  }
}

export function* handlePostMessage(action: PayloadAction<{ scenarioId: string; text: string }>) {
  try {
    const message: MessageData = yield call(
      postMessage,
      action.payload.scenarioId,
      action.payload.text
    );
    yield put(postMessageSuccess(message));
    // Re-fetch scenario detail so the new MESSAGE_POSTED event appears in the activity stream
    yield put(fetchScenarioDetailRequest(action.payload.scenarioId));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to post message';
    yield put(postMessageFailure(message));
  }
}

function* handlePostEvent(action: PayloadAction<{ scenarioId: string; type: string; message?: string }>) {
  try {
    yield call(postEvent, action.payload.scenarioId, action.payload.type, action.payload.message);
    yield put(postEventSuccess());
    yield put(fetchScenarioDetailRequest(action.payload.scenarioId));
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    const errorMessage =
      err.response?.data?.message || 'Failed to process event';
    yield put(postEventFailure(errorMessage));
  }
}

export function* watchFetchScenarioList() {
  yield takeLatest(fetchScenarioListRequest.type, handleFetchScenarioList);
}

export function* watchFetchScenarioDetail() {
  yield takeLatest(fetchScenarioDetailRequest.type, handleFetchScenarioDetail);
}

export function* watchPostMessage() {
  yield takeLatest(postMessageRequest.type, handlePostMessage);
}

export function* watchPostEvent() {
  yield takeLatest(postEventRequest.type, handlePostEvent);
}

function* handleCombineScenarios(action: PayloadAction<CombineScenariosRequest>) {
  try {
    const result: ScenarioListItem = yield call(combineScenarios, action.payload);
    yield put(combineScenariosSuccess(result));
    yield put(fetchScenarioListRequest());
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    const errorMessage =
      err.response?.data?.message || 'Failed to combine scenarios';
    yield put(combineScenariosFailure(errorMessage));
  }
}

export function* watchCombineScenarios() {
  yield takeLatest(combineScenariosRequest.type, handleCombineScenarios);
}
