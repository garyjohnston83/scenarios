import { call, put, takeLatest, takeEvery, all } from 'redux-saga/effects';
import { fetchDirectChanges, fetchAnalysisHeader, fetchImpactReportSummaries, fetchImpactReportDetail, getDirectChangesView } from '../services/scenarioApi';
import {
  fetchAnalysisDataRequest,
  fetchAnalysisHeaderSuccess,
  fetchAnalysisHeaderFailure,
  fetchDirectChangesSuccess,
  fetchDirectChangesFailure,
  fetchDirectChangesDeltaSuccess,
  fetchDirectChangesDeltaFailure,
  fetchReportSummariesSuccess,
  fetchReportSummariesFailure,
  fetchReportDetailRequest,
  fetchReportDetailSuccess,
  fetchReportDetailFailure,
} from './analysisSlice';
import type { PayloadAction } from '@reduxjs/toolkit';

function* fetchAnalysisHeaderSaga(scenarioId: string) {
  try {
    const result: Awaited<ReturnType<typeof fetchAnalysisHeader>> = yield call(fetchAnalysisHeader, scenarioId);
    yield put(fetchAnalysisHeaderSuccess(result));
    return result;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch analysis header';
    yield put(fetchAnalysisHeaderFailure(message));
    return null;
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

function* fetchDirectChangesDeltaSaga(scenarioId: string) {
  try {
    const result: Awaited<ReturnType<typeof getDirectChangesView>> = yield call(getDirectChangesView, scenarioId);
    yield put(fetchDirectChangesDeltaSuccess(result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch direct changes delta';
    yield put(fetchDirectChangesDeltaFailure(message));
  }
}

/**
 * Inner generator for fetching a single report detail.
 * Accepts raw parameters instead of a PayloadAction so it can be called
 * directly from within the saga flow (e.g., from the eager loading all([...]) block).
 */
function* fetchReportDetailInner(scenarioId: string, reportId: string) {
  try {
    const detail: Awaited<ReturnType<typeof fetchImpactReportDetail>> = yield call(fetchImpactReportDetail, scenarioId, reportId);
    yield put(fetchReportDetailSuccess({ reportId, detail }));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch report detail';
    yield put(fetchReportDetailFailure({ reportId, error: message }));
  }
}

function* fetchImpactReportsSaga(scenarioId: string) {
  try {
    const summaries: Awaited<ReturnType<typeof fetchImpactReportSummaries>> = yield call(fetchImpactReportSummaries, scenarioId);
    yield put(fetchReportSummariesSuccess(summaries));

    // Eager detail loading: fetch details for all summaries in parallel
    if (summaries.length > 0) {
      // Dispatch fetchReportDetailRequest for each summary to set Redux loading state immediately
      for (const summary of summaries) {
        yield put(fetchReportDetailRequest({ scenarioId, reportId: summary.id }));
      }

      // Fetch all details in parallel using all([...]) with call() effects
      yield all(
        summaries.map((summary) =>
          call(fetchReportDetailInner, scenarioId, summary.id)
        )
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch impact reports';
    yield put(fetchReportSummariesFailure(message));
  }
}

function* handleFetchAnalysisData(action: PayloadAction<string>) {
  const scenarioId = action.payload;

  // Step 1: Fetch header FIRST to determine the render mode for direct changes
  const headerResult: Awaited<ReturnType<typeof fetchAnalysisHeader>> | null = yield call(fetchAnalysisHeaderSaga, scenarioId);

  // Step 2: Read directChangesInternalRenderMode from the header result
  const renderMode = headerResult?.scenarioType?.directChangesInternalRenderMode;

  // Step 3: Branch direct changes fetch based on render mode, run in parallel with report summaries
  const directChangesFetch = renderMode === 'DELTA_BY_UNIQUE_ID'
    ? call(fetchDirectChangesDeltaSaga, scenarioId)
    : call(fetchDirectChangesSaga, scenarioId);

  yield all([
    directChangesFetch,
    call(fetchImpactReportsSaga, scenarioId),
  ]);
}

export function* fetchReportDetailSaga(action: PayloadAction<{ scenarioId: string; reportId: string }>) {
  yield* fetchReportDetailInner(action.payload.scenarioId, action.payload.reportId);
}

export function* watchFetchAnalysisData() {
  yield takeLatest(fetchAnalysisDataRequest.type, handleFetchAnalysisData);
}

export function* watchFetchReportDetail() {
  yield takeEvery(fetchReportDetailRequest.type, fetchReportDetailSaga);
}
