import { call, put, takeLatest } from 'redux-saga/effects';
import {
  fetchDataTemplates,
  uploadDataTemplate,
  activateDataTemplate,
  deactivateDataTemplate,
} from '../services/dataTemplateApi';
import type { DataTemplateDto } from '../services/dataTemplateApi';
import {
  fetchTemplatesRequest,
  fetchTemplatesSuccess,
  fetchTemplatesFailure,
  uploadTemplateRequest,
  uploadTemplateSuccess,
  uploadTemplateFailure,
  activateTemplateRequest,
  activateTemplateSuccess,
  activateTemplateFailure,
  deactivateTemplateRequest,
  deactivateTemplateSuccess,
  deactivateTemplateFailure,
} from './dataTemplateSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../utils/logger';

const logger = createLogger('saga:dataTemplate');

function* handleFetchTemplates(action: PayloadAction<string>) {
  logger.debug('handleFetchTemplates started', { scenarioTypeCode: action.payload });
  try {
    const templates: DataTemplateDto[] = yield call(fetchDataTemplates, action.payload);
    logger.info('handleFetchTemplates succeeded', { scenarioTypeCode: action.payload, count: templates.length });
    yield put(fetchTemplatesSuccess(templates));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch templates';
    logger.error('handleFetchTemplates failed', { error: message, scenarioTypeCode: action.payload });
    yield put(fetchTemplatesFailure(message));
  }
}

function* handleUploadTemplate(
  action: PayloadAction<{ scenarioTypeCode: string; name: string; file: File }>
) {
  logger.debug('handleUploadTemplate started', { scenarioTypeCode: action.payload.scenarioTypeCode, name: action.payload.name });
  try {
    yield call(uploadDataTemplate, action.payload.scenarioTypeCode, action.payload.name, action.payload.file);
    logger.info('handleUploadTemplate succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, name: action.payload.name });
    yield put(uploadTemplateSuccess());
    yield put(fetchTemplatesRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to upload template';
    logger.error('handleUploadTemplate failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode });
    yield put(uploadTemplateFailure(message));
  }
}

function* handleActivateTemplate(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleActivateTemplate started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    yield call(activateDataTemplate, action.payload.scenarioTypeCode, action.payload.id);
    logger.info('handleActivateTemplate succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(activateTemplateSuccess());
    yield put(fetchTemplatesRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to activate template';
    logger.error('handleActivateTemplate failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(activateTemplateFailure(message));
  }
}

function* handleDeactivateTemplate(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleDeactivateTemplate started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    yield call(deactivateDataTemplate, action.payload.scenarioTypeCode, action.payload.id);
    logger.info('handleDeactivateTemplate succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(deactivateTemplateSuccess());
    yield put(fetchTemplatesRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to deactivate template';
    logger.error('handleDeactivateTemplate failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(deactivateTemplateFailure(message));
  }
}

export function* watchFetchTemplates() {
  yield takeLatest(fetchTemplatesRequest.type, handleFetchTemplates);
}

export function* watchUploadTemplate() {
  yield takeLatest(uploadTemplateRequest.type, handleUploadTemplate);
}

export function* watchActivateTemplate() {
  yield takeLatest(activateTemplateRequest.type, handleActivateTemplate);
}

export function* watchDeactivateTemplate() {
  yield takeLatest(deactivateTemplateRequest.type, handleDeactivateTemplate);
}
