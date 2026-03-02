import { call, put, takeLatest, all } from 'redux-saga/effects';
import { fetchDirectChanges, fetchAnalysisHeader, fetchImpactData } from '../services/scenarioApi';
import {
  fetchAnalysisDataRequest,
  fetchAnalysisHeaderSuccess,
  fetchAnalysisHeaderFailure,
  fetchDirectChangesSuccess,
  fetchDirectChangesFailure,
  fetchImpactReportsSuccess,
  fetchImpactReportsFailure,
} from './analysisSlice';
import type { PayloadAction } from '@reduxjs/toolkit';

function* fetchAnalysisHeaderSaga(scenarioId: string) {
  try {
    const result: Awaited<ReturnType<typeof fetchAnalysisHeader>> = yield call(fetchAnalysisHeader, scenarioId);
    yield put(fetchAnalysisHeaderSuccess(result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch analysis header';
    yield put(fetchAnalysisHeaderFailure(message));
  }
}

function* fetchDirectChangesSaga(scenarioId: string) {
  try {
    const result: Awaited<ReturnType<typeof fetchDirectChanges>> = yield call(fetchDirectChanges, scenarioId);
    yield put(fetchDirectChangesSuccess(result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch direct changes';
    yield put(fetchDirectChangesFailure(message));
  }
}

function* fetchImpactReportsSaga(scenarioId: string) {
  try {
    const result: Awaited<ReturnType<typeof fetchImpactData>> = yield call(fetchImpactData, scenarioId);
    yield put(fetchImpactReportsSuccess(result.reports));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch impact reports';
    yield put(fetchImpactReportsFailure(message));
  }
}

function* handleFetchAnalysisData(action: PayloadAction<string>) {
  yield all([
    call(fetchAnalysisHeaderSaga, action.payload),
    call(fetchDirectChangesSaga, action.payload),
    call(fetchImpactReportsSaga, action.payload),
  ]);
}

export function* watchFetchAnalysisData() {
  yield takeLatest(fetchAnalysisDataRequest.type, handleFetchAnalysisData);
}
