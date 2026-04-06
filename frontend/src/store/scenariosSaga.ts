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
import { createLogger } from '../utils/logger';

const logger = createLogger('saga:scenarios');

function* handleFetchScenarioList() {
  logger.debug('handleFetchScenarioList started');
  try {
    const items: ScenarioListItem[] = yield call(fetchScenarioList);
    logger.info('handleFetchScenarioList succeeded', { count: items.length });
    yield put(fetchScenarioListSuccess(items));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch scenarios';
    logger.error('handleFetchScenarioList failed', { error: message });
    yield put(fetchScenarioListFailure(message));
  }
}

export function* handleFetchScenarioDetail(action: PayloadAction<string>) {
  logger.debug('handleFetchScenarioDetail started', { scenarioId: action.payload });
  try {
    const detail: ScenarioDetail = yield call(fetchScenarioDetail, action.payload);
    logger.info('handleFetchScenarioDetail succeeded', { scenarioId: action.payload });
    yield put(fetchScenarioDetailSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch scenario detail';
    logger.error('handleFetchScenarioDetail failed', { error: message, scenarioId: action.payload });
    yield put(fetchScenarioDetailFailure(message));
  }
}

export function* handlePostMessage(action: PayloadAction<{ scenarioId: string; text: string }>) {
  logger.debug('handlePostMessage started', { scenarioId: action.payload.scenarioId });
  try {
    const message: MessageData = yield call(
      postMessage,
      action.payload.scenarioId,
      action.payload.text
    );
    logger.info('handlePostMessage succeeded', { scenarioId: action.payload.scenarioId });
    yield put(postMessageSuccess(message));
    // Re-fetch scenario detail so the new MESSAGE_POSTED event appears in the activity stream
    yield put(fetchScenarioDetailRequest(action.payload.scenarioId));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to post message';
    logger.error('handlePostMessage failed', { error: message, scenarioId: action.payload.scenarioId });
    yield put(postMessageFailure(message));
  }
}

function* handlePostEvent(action: PayloadAction<{ scenarioId: string; type: string; message?: string }>) {
  logger.debug('handlePostEvent started', { scenarioId: action.payload.scenarioId, type: action.payload.type });
  try {
    yield call(postEvent, action.payload.scenarioId, action.payload.type, action.payload.message);
    logger.info('handlePostEvent succeeded', { scenarioId: action.payload.scenarioId, type: action.payload.type });
    yield put(postEventSuccess());
    yield put(fetchScenarioDetailRequest(action.payload.scenarioId));
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    const errorMessage =
      err.response?.data?.message || 'Failed to process event';
    logger.error('handlePostEvent failed', { error: errorMessage, scenarioId: action.payload.scenarioId, type: action.payload.type });
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
  logger.debug('handleCombineScenarios started', { sourceScenarioIds: action.payload.sourceScenarioIds });
  try {
    const result: ScenarioListItem = yield call(combineScenarios, action.payload);
    logger.info('handleCombineScenarios succeeded', { sourceScenarioIds: action.payload.sourceScenarioIds });
    yield put(combineScenariosSuccess(result));
    yield put(fetchScenarioListRequest());
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    const errorMessage =
      err.response?.data?.message || 'Failed to combine scenarios';
    logger.error('handleCombineScenarios failed', { error: errorMessage, sourceScenarioIds: action.payload.sourceScenarioIds });
    yield put(combineScenariosFailure(errorMessage));
  }
}

export function* watchCombineScenarios() {
  yield takeLatest(combineScenariosRequest.type, handleCombineScenarios);
}
