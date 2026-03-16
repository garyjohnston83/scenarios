import { all, fork } from 'redux-saga/effects';
import { watchFetchScenarioList, watchFetchScenarioDetail, watchPostMessage, watchPostEvent, watchCombineScenarios } from './scenariosSaga';
import { watchFetchPolicies, watchCreatePolicy, watchUpdatePolicy } from './adminSaga';
import { watchFetchAnalysisData, watchFetchReportDetail } from './analysisSaga';
import { watchFetchScenarioTypes, watchFetchScenarioTypeDetail, watchUpdateScenarioType, watchUpdateNavigationViewMode } from './scenarioTypeAdminSaga';
import { watchFetchTemplates, watchUploadTemplate, watchActivateTemplate, watchDeactivateTemplate } from './dataTemplateSaga';
import { watchFetchDefinitions, watchFetchDefinitionDetail, watchCreateDefinition, watchDeleteDefinition, watchActivateDefinition, watchDeactivateDefinition, watchUpdateSampleData } from './reportDefinitionAdminSaga';
import { watchFetchCvDefinitions, watchFetchCvDefinitionDetail, watchCreateCvDefinition, watchActivateCvDefinition, watchDeactivateCvDefinition, watchFetchCvPreview, watchFetchCvPreviewData } from './changeViewDefinitionAdminSaga';
import { watchFetchSpDefinitions, watchFetchSpDefinitionDetail, watchCreateSpDefinition, watchActivateSpDefinition, watchDeactivateSpDefinition, watchFetchFactTypes, watchFetchRoles } from './signoffPolicyDefinitionAdminSaga';

export default function* rootSaga() {
  yield all([fork(watchFetchScenarioList), fork(watchFetchScenarioDetail), fork(watchPostMessage), fork(watchPostEvent), fork(watchCombineScenarios), fork(watchFetchPolicies), fork(watchCreatePolicy), fork(watchUpdatePolicy), fork(watchFetchAnalysisData), fork(watchFetchReportDetail), fork(watchFetchScenarioTypes), fork(watchFetchScenarioTypeDetail), fork(watchUpdateScenarioType), fork(watchUpdateNavigationViewMode), fork(watchFetchTemplates), fork(watchUploadTemplate), fork(watchActivateTemplate), fork(watchDeactivateTemplate), fork(watchFetchDefinitions), fork(watchFetchDefinitionDetail), fork(watchCreateDefinition), fork(watchDeleteDefinition), fork(watchActivateDefinition), fork(watchDeactivateDefinition), fork(watchUpdateSampleData), fork(watchFetchCvDefinitions), fork(watchFetchCvDefinitionDetail), fork(watchCreateCvDefinition), fork(watchActivateCvDefinition), fork(watchDeactivateCvDefinition), fork(watchFetchCvPreview), fork(watchFetchCvPreviewData), fork(watchFetchSpDefinitions), fork(watchFetchSpDefinitionDetail), fork(watchCreateSpDefinition), fork(watchActivateSpDefinition), fork(watchDeactivateSpDefinition), fork(watchFetchFactTypes), fork(watchFetchRoles)]);
}
