import { call, put, takeLatest } from 'redux-saga/effects';
import {
  fetchSignoffPolicyDefinitions,
  fetchSignoffPolicyDefinitionDetail,
  createSignoffPolicyDefinition,
  activateSignoffPolicyDefinition,
  deactivateSignoffPolicyDefinition,
  fetchFactTypeCatalog,
  fetchRoleCatalog,
} from '../services/signoffPolicyDefinitionAdminApi';
import type {
  SignoffPolicyDefinitionListItem,
  SignoffPolicyDefinitionDetail,
  FactTypeCatalogEntry,
  RoleCatalogEntry,
} from '../services/signoffPolicyDefinitionAdminApi';
import {
  fetchSpDefinitionsRequest,
  fetchSpDefinitionsSuccess,
  fetchSpDefinitionsFailure,
  fetchSpDefinitionDetailRequest,
  fetchSpDefinitionDetailSuccess,
  fetchSpDefinitionDetailFailure,
  createSpDefinitionRequest,
  createSpDefinitionSuccess,
  createSpDefinitionFailure,
  activateSpDefinitionRequest,
  activateSpDefinitionSuccess,
  activateSpDefinitionFailure,
  deactivateSpDefinitionRequest,
  deactivateSpDefinitionSuccess,
  deactivateSpDefinitionFailure,
  fetchFactTypesRequest,
  fetchFactTypesSuccess,
  fetchFactTypesFailure,
  fetchRolesRequest,
  fetchRolesSuccess,
  fetchRolesFailure,
} from './signoffPolicyDefinitionAdminSlice';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createLogger } from '../utils/logger';

const logger = createLogger('saga:signoffPolicyDefinitionAdmin');

function* handleFetchSpDefinitions(action: PayloadAction<string>) {
  logger.debug('handleFetchSpDefinitions started', { scenarioTypeCode: action.payload });
  try {
    const definitions: SignoffPolicyDefinitionListItem[] = yield call(
      fetchSignoffPolicyDefinitions,
      action.payload
    );
    logger.info('handleFetchSpDefinitions succeeded', { scenarioTypeCode: action.payload, count: definitions.length });
    yield put(fetchSpDefinitionsSuccess(definitions));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch definitions';
    logger.error('handleFetchSpDefinitions failed', { error: message, scenarioTypeCode: action.payload });
    yield put(fetchSpDefinitionsFailure(message));
  }
}

function* handleFetchSpDefinitionDetail(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleFetchSpDefinitionDetail started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    const detail: SignoffPolicyDefinitionDetail = yield call(
      fetchSignoffPolicyDefinitionDetail,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    logger.info('handleFetchSpDefinitionDetail succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(fetchSpDefinitionDetailSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch definition detail';
    logger.error('handleFetchSpDefinitionDetail failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(fetchSpDefinitionDetailFailure(message));
  }
}

function* handleCreateSpDefinition(
  action: PayloadAction<{
    scenarioTypeCode: string;
    policyKey: string;
    definition: string;
  }>
) {
  logger.debug('handleCreateSpDefinition started', { scenarioTypeCode: action.payload.scenarioTypeCode, policyKey: action.payload.policyKey });
  try {
    const created: SignoffPolicyDefinitionDetail = yield call(
      createSignoffPolicyDefinition,
      action.payload.scenarioTypeCode,
      {
        policyKey: action.payload.policyKey,
        definition: action.payload.definition,
      }
    );
    logger.info('handleCreateSpDefinition succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: created.id });
    yield put(createSpDefinitionSuccess());
    yield put(fetchSpDefinitionsRequest(action.payload.scenarioTypeCode));
    yield put(
      fetchSpDefinitionDetailRequest({
        scenarioTypeCode: action.payload.scenarioTypeCode,
        id: created.id,
      })
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create definition';
    logger.error('handleCreateSpDefinition failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode });
    yield put(createSpDefinitionFailure(message));
  }
}

function* handleActivateSpDefinition(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleActivateSpDefinition started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    yield call(
      activateSignoffPolicyDefinition,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    logger.info('handleActivateSpDefinition succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(activateSpDefinitionSuccess());
    yield put(fetchSpDefinitionsRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to activate definition';
    logger.error('handleActivateSpDefinition failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(activateSpDefinitionFailure(message));
  }
}

function* handleDeactivateSpDefinition(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  logger.debug('handleDeactivateSpDefinition started', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
  try {
    yield call(
      deactivateSignoffPolicyDefinition,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    logger.info('handleDeactivateSpDefinition succeeded', { scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(deactivateSpDefinitionSuccess());
    yield put(fetchSpDefinitionsRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to deactivate definition';
    logger.error('handleDeactivateSpDefinition failed', { error: message, scenarioTypeCode: action.payload.scenarioTypeCode, id: action.payload.id });
    yield put(deactivateSpDefinitionFailure(message));
  }
}

function* handleFetchFactTypes() {
  logger.debug('handleFetchFactTypes started');
  try {
    const factTypes: FactTypeCatalogEntry[] = yield call(fetchFactTypeCatalog);
    logger.info('handleFetchFactTypes succeeded', { count: factTypes.length });
    yield put(fetchFactTypesSuccess(factTypes));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch fact types';
    logger.error('handleFetchFactTypes failed', { error: message });
    yield put(fetchFactTypesFailure(message));
  }
}

function* handleFetchRoles() {
  logger.debug('handleFetchRoles started');
  try {
    const roles: RoleCatalogEntry[] = yield call(fetchRoleCatalog);
    logger.info('handleFetchRoles succeeded', { count: roles.length });
    yield put(fetchRolesSuccess(roles));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch roles';
    logger.error('handleFetchRoles failed', { error: message });
    yield put(fetchRolesFailure(message));
  }
}

export function* watchFetchSpDefinitions() {
  yield takeLatest(fetchSpDefinitionsRequest.type, handleFetchSpDefinitions);
}

export function* watchFetchSpDefinitionDetail() {
  yield takeLatest(
    fetchSpDefinitionDetailRequest.type,
    handleFetchSpDefinitionDetail
  );
}

export function* watchCreateSpDefinition() {
  yield takeLatest(createSpDefinitionRequest.type, handleCreateSpDefinition);
}

export function* watchActivateSpDefinition() {
  yield takeLatest(
    activateSpDefinitionRequest.type,
    handleActivateSpDefinition
  );
}

export function* watchDeactivateSpDefinition() {
  yield takeLatest(
    deactivateSpDefinitionRequest.type,
    handleDeactivateSpDefinition
  );
}

export function* watchFetchFactTypes() {
  yield takeLatest(fetchFactTypesRequest.type, handleFetchFactTypes);
}

export function* watchFetchRoles() {
  yield takeLatest(fetchRolesRequest.type, handleFetchRoles);
}
