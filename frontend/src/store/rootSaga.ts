import { all, fork } from 'redux-saga/effects';
import { watchFetchScenarioList, watchFetchScenarioDetail, watchPostMessage, watchPostEvent } from './scenariosSaga';
import { watchFetchPolicies, watchCreatePolicy, watchUpdatePolicy } from './adminSaga';

export default function* rootSaga() {
  yield all([fork(watchFetchScenarioList), fork(watchFetchScenarioDetail), fork(watchPostMessage), fork(watchPostEvent), fork(watchFetchPolicies), fork(watchCreatePolicy), fork(watchUpdatePolicy)]);
}
