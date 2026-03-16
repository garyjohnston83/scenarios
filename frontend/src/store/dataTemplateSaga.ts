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

function* handleFetchTemplates(action: PayloadAction<string>) {
  try {
    const templates: DataTemplateDto[] = yield call(fetchDataTemplates, action.payload);
    yield put(fetchTemplatesSuccess(templates));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch templates';
    yield put(fetchTemplatesFailure(message));
  }
}

function* handleUploadTemplate(
  action: PayloadAction<{ scenarioTypeCode: string; name: string; file: File }>
) {
  try {
    yield call(uploadDataTemplate, action.payload.scenarioTypeCode, action.payload.name, action.payload.file);
    yield put(uploadTemplateSuccess());
    yield put(fetchTemplatesRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to upload template';
    yield put(uploadTemplateFailure(message));
  }
}

function* handleActivateTemplate(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  try {
    yield call(activateDataTemplate, action.payload.scenarioTypeCode, action.payload.id);
    yield put(activateTemplateSuccess());
    yield put(fetchTemplatesRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to activate template';
    yield put(activateTemplateFailure(message));
  }
}

function* handleDeactivateTemplate(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  try {
    yield call(deactivateDataTemplate, action.payload.scenarioTypeCode, action.payload.id);
    yield put(deactivateTemplateSuccess());
    yield put(fetchTemplatesRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to deactivate template';
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
