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

function* handleFetchSpDefinitions(action: PayloadAction<string>) {
  try {
    const definitions: SignoffPolicyDefinitionListItem[] = yield call(
      fetchSignoffPolicyDefinitions,
      action.payload
    );
    yield put(fetchSpDefinitionsSuccess(definitions));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch definitions';
    yield put(fetchSpDefinitionsFailure(message));
  }
}

function* handleFetchSpDefinitionDetail(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  try {
    const detail: SignoffPolicyDefinitionDetail = yield call(
      fetchSignoffPolicyDefinitionDetail,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    yield put(fetchSpDefinitionDetailSuccess(detail));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch definition detail';
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
  try {
    const created: SignoffPolicyDefinitionDetail = yield call(
      createSignoffPolicyDefinition,
      action.payload.scenarioTypeCode,
      {
        policyKey: action.payload.policyKey,
        definition: action.payload.definition,
      }
    );
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
    yield put(createSpDefinitionFailure(message));
  }
}

function* handleActivateSpDefinition(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  try {
    yield call(
      activateSignoffPolicyDefinition,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    yield put(activateSpDefinitionSuccess());
    yield put(fetchSpDefinitionsRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to activate definition';
    yield put(activateSpDefinitionFailure(message));
  }
}

function* handleDeactivateSpDefinition(
  action: PayloadAction<{ scenarioTypeCode: string; id: string }>
) {
  try {
    yield call(
      deactivateSignoffPolicyDefinition,
      action.payload.scenarioTypeCode,
      action.payload.id
    );
    yield put(deactivateSpDefinitionSuccess());
    yield put(fetchSpDefinitionsRequest(action.payload.scenarioTypeCode));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to deactivate definition';
    yield put(deactivateSpDefinitionFailure(message));
  }
}

function* handleFetchFactTypes() {
  try {
    const factTypes: FactTypeCatalogEntry[] = yield call(fetchFactTypeCatalog);
    yield put(fetchFactTypesSuccess(factTypes));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch fact types';
    yield put(fetchFactTypesFailure(message));
  }
}

function* handleFetchRoles() {
  try {
    const roles: RoleCatalogEntry[] = yield call(fetchRoleCatalog);
    yield put(fetchRolesSuccess(roles));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch roles';
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
