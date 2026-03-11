import { all, fork } from 'redux-saga/effects';
import { watchFetchScenarioList, watchFetchScenarioDetail, watchPostMessage, watchPostEvent, watchCombineScenarios } from './scenariosSaga';
import { watchFetchPolicies, watchCreatePolicy, watchUpdatePolicy } from './adminSaga';
import { watchFetchAnalysisData, watchFetchReportDetail } from './analysisSaga';

export default function* rootSaga() {
  yield all([fork(watchFetchScenarioList), fork(watchFetchScenarioDetail), fork(watchPostMessage), fork(watchPostEvent), fork(watchCombineScenarios), fork(watchFetchPolicies), fork(watchCreatePolicy), fork(watchUpdatePolicy), fork(watchFetchAnalysisData), fork(watchFetchReportDetail)]);
}
