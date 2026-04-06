import { call, put, takeLatest } from 'redux-saga/effects';
import {
  fetchChangeViewDefinitions,
  fetchChangeViewDefinitionDetail,
  createChangeViewDefinition,
  activateChangeViewDefinition,
  deactivateChangeViewDefinition,
  fetchChangeViewPreview,
  fetchChangeViewPreviewData,
} from '../services/changeViewDefinitionAdminApi';
import type {
  ChangeViewDefinitionListItem,
  ChangeViewDefinitionDetail,
} from '../services/changeViewDefinitionAdminApi';
import {
  fetchCvDefinitionsRequest,
  fetchCvDefinitionsSuccess,
  fetchCvDefinitionsFailure,
  fetchCvDefinitionDetailRequest,
  fetchCvDefinitionDetailSuccess,
  fetchCvDefinitionDetailFailure,
  createCvDefinitionRequest,
  createCvDefinitionSuccess,
  createCvDefinitionFailure,
  activateCvDefinitionRequest,
  activateCvDefinitionSuccess,
  activateCvDefinitionFailure,
  deactivateCvDefinitionRequest,
  deactivateCvDefinitionSuccess,
  deactivateCvDefinitionFailure,
  fetchCvPreviewRequest,
  fetchCvPreviewSuccess,
  fetchCvPreviewFailure,
  fetchCvPreviewDataRequest,
  fetchCvPreviewDataSuccess,
  fetchCvPreviewDataFailure,
} from './changeViewDefinitionAdminSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../utils/logger';

const logger = createLogger('saga:changeViewDefinitionAdmin');

function* handleFetchCvDefinitions(action: PayloadAction<string>) {
  logger.debug('handleFetchCvDefinitions started', { scenarioTypeCode: action.payload });
  try {
    const definitions: ChangeViewDefinitionListItem[] = yield call(
      fetchChangeViewDefinitions,
      action.payload
    );
    logger.info('handleFetchCvDefinitions succeeded', { scenarioTypeCode: action.payload, count: definitions.length });
    yield put(fetchCvDefinitionsSuccess(definitions));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch definitions';
    logger.error('handleFetchCvDefinitions failed', { error: message, scenarioTypeCode: action.payload });
    yield put(fetchCvDefinitionsFailure(message));
  }
}

function* handleFetchCvDefinitionDetail(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleFetchCvDefinitionDetail started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    const detail: ChangeViewDefinitionDetail = yield call(
      fetchChangeViewDefinitionDetail,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    logger.info('handleFetchCvDefinitionDetail succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(fetchCvDefinitionDetailSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch definition detail';
    logger.error('handleFetchCvDefinitionDetail failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(fetchCvDefinitionDetailFailure(message));
  }
}

function* handleCreateCvDefinition(
  action: PayloadAction<{
    scenarioTypeCode: string;
    templateKey: string;
    definition: string;
  }>
) {
  logger.debug('handleCreateCvDefinition started', { scenarioTypeCode: action.payload.scenarioTypeCode, templateKey: action.payload.templateKey });
  try {
    const created: ChangeViewDefinitionDetail = yield call(
      createChangeViewDefinition,
      action.payload.scenarioTypeCode,
      {
        templateKey: action.payload.templateKey,
        definition: action.payload.definition,
      }
    );
    logger.info('handleCreateCvDefinition succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: created.id });
    yield put(createCvDefinitionSuccess());
    yield put(fetchCvDefinitionsRequest(action.payload.scenarioTypeCode));
    yield put(
      fetchCvDefinitionDetailRequest({
        scenarioTypeCode: action.payload.scenarioTypeCode,
        id: created.id,
      })
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create definition';
    logger.error('handleCreateCvDefinition failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode });
    yield put(createCvDefinitionFailure(message));
  }
}

function* handleActivateCvDefinition(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleActivateCvDefinition started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    yield call(
      activateChangeViewDefinition,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    logger.info('handleActivateCvDefinition succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(activateCvDefinitionSuccess());
    yield put(fetchCvDefinitionsRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to activate definition';
    logger.error('handleActivateCvDefinition failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(activateCvDefinitionFailure(message));
  }
}

function* handleDeactivateCvDefinition(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleDeactivateCvDefinition started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    yield call(
      deactivateChangeViewDefinition,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    logger.info('handleDeactivateCvDefinition succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(deactivateCvDefinitionSuccess());
    yield put(fetchCvDefinitionsRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to deactivate definition';
    logger.error('handleDeactivateCvDefinition failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(deactivateCvDefinitionFailure(message));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleFetchCvPreview(
  action: PayloadAction<{ scenarioTypeCode: string; definition: string }>
) {
  logger.debug('handleFetchCvPreview started', { scenarioTypeCode: action.payload.scenarioTypeCode });
  try {
    const preview: unknown = yield call(
      fetchChangeViewPreview,
      action.payload.scenarioTypeCode,
      action.payload.definition
    );
    logger.info('handleFetchCvPreview succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode });
    yield put(fetchCvPreviewSuccess(preview));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch preview';
    logger.error('handleFetchCvPreview failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode });
    yield put(fetchCvPreviewFailure(message));
  }
}

function* handleFetchCvPreviewData(
  action: PayloadAction<{ scenarioTypeCode: string }>
) {
  logger.debug('handleFetchCvPreviewData started', { scenarioTypeCode: action.payload.scenarioTypeCode });
  try {
    const previewData: Record<string, unknown> = yield call(
      fetchChangeViewPreviewData,
      action.payload.scenarioTypeCode
    );
    logger.info('handleFetchCvPreviewData succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode });
    yield put(fetchCvPreviewDataSuccess(previewData));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch preview data';
    logger.error('handleFetchCvPreviewData failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode });
    yield put(fetchCvPreviewDataFailure(message));
  }
}

export function* watchFetchCvDefinitions() {
  yield takeLatest(fetchCvDefinitionsRequest.type, handleFetchCvDefinitions);
}

export function* watchFetchCvDefinitionDetail() {
  yield takeLatest(
    fetchCvDefinitionDetailRequest.type,
    handleFetchCvDefinitionDetail
  );
}

export function* watchCreateCvDefinition() {
  yield takeLatest(createCvDefinitionRequest.type, handleCreateCvDefinition);
}

export function* watchActivateCvDefinition() {
  yield takeLatest(
    activateCvDefinitionRequest.type,
    handleActivateCvDefinition
  );
}

export function* watchDeactivateCvDefinition() {
  yield takeLatest(
    deactivateCvDefinitionRequest.type,
    handleDeactivateCvDefinition
  );
}

export function* watchFetchCvPreview() {
  yield takeLatest(fetchCvPreviewRequest.type, handleFetchCvPreview);
}

export function* watchFetchCvPreviewData() {
  yield takeLatest(fetchCvPreviewDataRequest.type, handleFetchCvPreviewData);
}
