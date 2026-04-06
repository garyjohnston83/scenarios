import apiClient from './axiosInstance';
import type { ScenarioListItem, ScenarioDetail, MessageData, CombineScenariosRequest, DirectChangesData, ScenarioTypeData, SummaryCardsData, DirectChangesRuntimeResponse } from '../store/scenariosSlice';
import type { ImpactReportSummaryFe, ImpactReportDetailFe } from '../types/renderedReport';
import { CURRENT_USER_ID } from '../constants/user';

export async function fetchScenarioList(): Promise<ScenarioListItem[]> {
  const response = await apiClient.get<ScenarioListItem[]>(
    `/scenarios`
  );
  return response.data;
}

export async function fetchScenarioDetail(
  id: string
): Promise<ScenarioDetail> {
  const response = await apiClient.get<ScenarioDetail>(
    `/scenarios/${id}?expand=header,summaryCards,events`
  );
  return response.data;
}

export async function postMessage(
  scenarioId: string,
  text: string
): Promise<MessageData> {
  const response = await apiClient.post<MessageData>(
    `/scenarios/${scenarioId}/messages`,
    { text },
    { headers: { "X-Actor-Id": CURRENT_USER_ID } }
  );
  return response.data;
}

export async function postEvent(
  scenarioId: string,
  type: string,
  message?: string
): Promise<void> {
  const body: { type: string; message?: string } = { type };
  if (message !== undefined) {
    body.message = message;
  }
  await apiClient.post(
    `/scenarios/${scenarioId}/events`,
    body,
    { headers: { "X-Actor-Id": CURRENT_USER_ID } }
  );
}

export async function combineScenarios(
  request: CombineScenariosRequest
): Promise<ScenarioListItem> {
  const response = await apiClient.post<ScenarioListItem>(
    `/scenarios/combine`,
    request,
    { headers: { "X-Actor-Id": CURRENT_USER_ID } }
  );
  return response.data;
}

export async function fetchDirectChanges(id: string): Promise<DirectChangesData> {
  const response = await apiClient.get<{ directChanges: DirectChangesData }>(
    `/scenarios/${id}?expand=directChanges`
  );
  return response.data.directChanges;
}

export async function fetchAnalysisHeader(id: string): Promise<{
  name: string;
  workflowState: string;
  scenarioType: ScenarioTypeData | null;
  summaryCards: SummaryCardsData | null;
}> {
  const response = await apiClient.get(
    `/scenarios/${id}?expand=header,summaryCards`
  );
  return {
    name: response.data.name,
    workflowState: response.data.header?.workflowState ?? '',
    scenarioType: response.data.header?.scenarioType ?? null,
    summaryCards: response.data.summaryCards ?? null,
  };
}

export async function fetchImpactReportSummaries(
  scenarioId: string
): Promise<ImpactReportSummaryFe[]> {
  const response = await apiClient.get<ImpactReportSummaryFe[]>(
    `/scenarios/${scenarioId}/impact-reports`
  );
  return response.data;
}

export async function fetchImpactReportDetail(
  scenarioId: string,
  reportId: string
): Promise<ImpactReportDetailFe> {
  const response = await apiClient.get<ImpactReportDetailFe>(
    `/scenarios/${scenarioId}/impact-reports/${reportId}`
  );
  return response.data;
}

export async function getDirectChangesView(
  scenarioId: string
): Promise<DirectChangesRuntimeResponse> {
  const response = await apiClient.get<DirectChangesRuntimeResponse>(
    `/scenarios/${scenarioId}/direct-changes`
  );
  return response.data;
}
