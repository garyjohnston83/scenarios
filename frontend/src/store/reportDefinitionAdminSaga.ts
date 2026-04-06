import { call, put, takeLatest } from 'redux-saga/effects';
import {
  fetchReportDefinitions,
  fetchReportDefinitionDetail,
  createReportDefinition,
  deleteReportDefinition,
  activateReportDefinition,
  deactivateReportDefinition,
  updateSampleData as updateSampleDataApi,
} from '../services/reportDefinitionAdminApi';
import type {
  ImpactReportDefinitionListItem,
  ImpactReportDefinitionDetail,
} from '../services/reportDefinitionAdminApi';
import {
  fetchDefinitionsRequest,
  fetchDefinitionsSuccess,
  fetchDefinitionsFailure,
  fetchDefinitionDetailRequest,
  fetchDefinitionDetailSuccess,
  fetchDefinitionDetailFailure,
  createDefinitionRequest,
  createDefinitionSuccess,
  createDefinitionFailure,
  deleteDefinitionRequest,
  deleteDefinitionSuccess,
  deleteDefinitionFailure,
  activateDefinitionRequest,
  activateDefinitionSuccess,
  activateDefinitionFailure,
  deactivateDefinitionRequest,
  deactivateDefinitionSuccess,
  deactivateDefinitionFailure,
  updateSampleDataRequest,
  updateSampleDataSuccess,
  updateSampleDataFailure,
} from './reportDefinitionAdminSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../utils/logger';

const logger = createLogger('saga:reportDefinitionAdmin');

function* handleFetchDefinitions(action: PayloadAction<string>) {
  logger.debug('handleFetchDefinitions started', { scenarioTypeCode: action.payload });
  try {
    const definitions: ImpactReportDefinitionListItem[] = yield call(
      fetchReportDefinitions,
      action.payload
    );
    logger.info('handleFetchDefinitions succeeded', { scenarioTypeCode: action.payload, count: definitions.length });
    yield put(fetchDefinitionsSuccess(definitions));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch definitions';
    logger.error('handleFetchDefinitions failed', { error: message, scenarioTypeCode: action.payload });
    yield put(fetchDefinitionsFailure(message));
  }
}

function* handleFetchDefinitionDetail(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleFetchDefinitionDetail started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    const detail: ImpactReportDefinitionDetail = yield call(
      fetchReportDefinitionDetail,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    logger.info('handleFetchDefinitionDetail succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(fetchDefinitionDetailSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch definition detail';
    logger.error('handleFetchDefinitionDetail failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(fetchDefinitionDetailFailure(message));
  }
}

function* handleCreateDefinition(
  action: PayloadAction<{
    scenarioTypeCode: string;
    reportKey: string;
    definition: string;
    sampleData?: string;
  }>
) {
  logger.debug('handleCreateDefinition started', { scenarioTypeCode: action.payload.scenarioTypeCode, reportKey: action.payload.reportKey });
  try {
    const created: ImpactReportDefinitionDetail = yield call(
      createReportDefinition,
      action.payload.scenarioTypeCode,
      {
        reportKey: action.payload.reportKey,
        definition: action.payload.definition,
        sampleData: action.payload.sampleData,
      }
    );
    logger.info('handleCreateDefinition succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: created.id });
    yield put(createDefinitionSuccess());
    yield put(fetchDefinitionsRequest(action.payload.scenarioTypeCode));
    yield put(
      fetchDefinitionDetailRequest({
        scenarioTypeCode: action.payload.scenarioTypeCode,
        id: created.id,
      })
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create definition';
    logger.error('handleCreateDefinition failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode });
    yield put(createDefinitionFailure(message));
  }
}

function* handleDeleteDefinition(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleDeleteDefinition started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    yield call(
      deleteReportDefinition,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    logger.info('handleDeleteDefinition succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(deleteDefinitionSuccess());
    yield put(fetchDefinitionsRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete definition';
    logger.error('handleDeleteDefinition failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(deleteDefinitionFailure(message));
  }
}

function* handleActivateDefinition(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleActivateDefinition started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    yield call(
      activateReportDefinition,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    logger.info('handleActivateDefinition succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(activateDefinitionSuccess());
    yield put(fetchDefinitionsRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to activate definition';
    logger.error('handleActivateDefinition failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(activateDefinitionFailure(message));
  }
}

function* handleDeactivateDefinition(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleDeactivateDefinition started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    yield call(
      deactivateReportDefinition,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    logger.info('handleDeactivateDefinition succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(deactivateDefinitionSuccess());
    yield put(fetchDefinitionsRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to deactivate definition';
    logger.error('handleDeactivateDefinition failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(deactivateDefinitionFailure(message));
  }
}

function* handleUpdateSampleData(
  action: PayloadAction<{
    scenarioTypeCode: string;
    id: string;
    sampleData: string;
  }>
) {
  logger.debug('handleUpdateSampleData started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    yield call(
      updateSampleDataApi,
      action.payload.scenarioTypeCode,
      action.payload.id,
      action.payload.sampleData
    );
    logger.info('handleUpdateSampleData succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(updateSampleDataSuccess(action.payload.sampleData));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update sample data';
    logger.error('handleUpdateSampleData failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(updateSampleDataFailure(message));
  }
}

export function* watchFetchDefinitions() {
  yield takeLatest(fetchDefinitionsRequest.type, handleFetchDefinitions);
}

export function* watchFetchDefinitionDetail() {
  yield takeLatest(
    fetchDefinitionDetailRequest.type,
    handleFetchDefinitionDetail
  );
}

export function* watchCreateDefinition() {
  yield takeLatest(createDefinitionRequest.type, handleCreateDefinition);
}

export function* watchDeleteDefinition() {
  yield takeLatest(deleteDefinitionRequest.type, handleDeleteDefinition);
}

export function* watchActivateDefinition() {
  yield takeLatest(activateDefinitionRequest.type, handleActivateDefinition);
}

export function* watchDeactivateDefinition() {
  yield takeLatest(deactivateDefinitionRequest.type, handleDeactivateDefinition);
}

export function* watchUpdateSampleData() {
  yield takeLatest(updateSampleDataRequest.type, handleUpdateSampleData);
}
