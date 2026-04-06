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
import { createLogger } from '../utils/logger';

const logger = createLogger('saga:analysis');

function* fetchAnalysisHeaderSaga(scenarioId: string) {
  logger.debug('fetchAnalysisHeaderSaga started', { scenarioId });
  try {
    const result: Awaited<ReturnType<typeof fetchAnalysisHeader>> = yield call(fetchAnalysisHeader, scenarioId);
    logger.info('fetchAnalysisHeaderSaga succeeded', { scenarioId });
    yield put(fetchAnalysisHeaderSuccess(result));
    return result;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch analysis header';
    logger.error('fetchAnalysisHeaderSaga failed', { error: message, scenarioId });
    yield put(fetchAnalysisHeaderFailure(message));
    return null;
  }
}

function* fetchDirectChangesSaga(scenarioId: string) {
  logger.debug('fetchDirectChangesSaga started', { scenarioId });
  try {
    const result: Awaited<ReturnType<typeof fetchDirectChanges>> = yield call(fetchDirectChanges, scenarioId);
    logger.info('fetchDirectChangesSaga succeeded', { scenarioId });
    yield put(fetchDirectChangesSuccess(result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch direct changes';
    logger.error('fetchDirectChangesSaga failed', { error: message, scenarioId });
    yield put(fetchDirectChangesFailure(message));
  }
}

function* fetchDirectChangesDeltaSaga(scenarioId: string) {
  logger.debug('fetchDirectChangesDeltaSaga started', { scenarioId });
  try {
    const result: Awaited<ReturnType<typeof getDirectChangesView>> = yield call(getDirectChangesView, scenarioId);
    logger.info('fetchDirectChangesDeltaSaga succeeded', { scenarioId });
    yield put(fetchDirectChangesDeltaSuccess(result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch direct changes delta';
    logger.error('fetchDirectChangesDeltaSaga failed', { error: message, scenarioId });
    yield put(fetchDirectChangesDeltaFailure(message));
  }
}

/**
 * Inner generator for fetching a single report detail.
 * Accepts raw parameters instead of a PayloadAction so it can be called
 * directly from within the saga flow (e.g., from the eager loading all([...]) block).
 */
function* fetchReportDetailInner(scenarioId: string, reportId: string) {
  logger.debug('fetchReportDetailInner started', { scenarioId, reportId });
  try {
    const detail: Awaited<ReturnType<typeof fetchImpactReportDetail>> = yield call(fetchImpactReportDetail, scenarioId, reportId);
    logger.info('fetchReportDetailInner succeeded', { scenarioId, reportId });
    yield put(fetchReportDetailSuccess({ reportId, detail }));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch report detail';
    logger.error('fetchReportDetailInner failed', { error: message, scenarioId, reportId });
    yield put(fetchReportDetailFailure({ reportId, error: message }));
  }
}

function* fetchImpactReportsSaga(scenarioId: string) {
  logger.debug('fetchImpactReportsSaga started', { scenarioId });
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
    logger.info('fetchImpactReportsSaga succeeded', { scenarioId, count: summaries.length });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch impact reports';
    logger.error('fetchImpactReportsSaga failed', { error: message, scenarioId });
    yield put(fetchReportSummariesFailure(message));
  }
}

function* handleFetchAnalysisData(action: PayloadAction<string>) {
  const scenarioId = action.payload;
  logger.debug('handleFetchAnalysisData started', { scenarioId });

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

  logger.info('handleFetchAnalysisData succeeded', { scenarioId });
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
