import axios from 'axios';
import type { ScenarioListItem, ScenarioDetail, MessageData, CombineScenariosRequest, DirectChangesData, ScenarioTypeData, SummaryCardsData, ImpactDataResponse } from '../store/scenariosSlice';
import { CURRENT_USER_ID } from '../constants/user';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:9090';

export async function fetchScenarioList(): Promise<ScenarioListItem[]> {
  const response = await axios.get<ScenarioListItem[]>(
    `${API_BASE_URL}/scenarios`
  );
  return response.data;
}

export async function fetchScenarioDetail(
  id: string
): Promise<ScenarioDetail> {
  const response = await axios.get<ScenarioDetail>(
    `${API_BASE_URL}/scenarios/${id}?expand=header,summaryCards,events`
  );
  return response.data;
}

export async function postMessage(
  scenarioId: string,
  text: string
): Promise<MessageData> {
  const response = await axios.post<MessageData>(
    `${API_BASE_URL}/scenarios/${scenarioId}/messages`,
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
  await axios.post(
    `${API_BASE_URL}/scenarios/${scenarioId}/events`,
    body,
    { headers: { "X-Actor-Id": CURRENT_USER_ID } }
  );
}

export async function combineScenarios(
  request: CombineScenariosRequest
): Promise<ScenarioListItem> {
  const response = await axios.post<ScenarioListItem>(
    `${API_BASE_URL}/scenarios/combine`,
    request,
    { headers: { "X-Actor-Id": CURRENT_USER_ID } }
  );
  return response.data;
}

export async function fetchDirectChanges(id: string): Promise<DirectChangesData> {
  const response = await axios.get<{ directChanges: DirectChangesData }>(
    `${API_BASE_URL}/scenarios/${id}?expand=directChanges`
  );
  return response.data.directChanges;
}

export async function fetchImpactData(id: string): Promise<ImpactDataResponse> {
  const response = await axios.get<{ impactData: ImpactDataResponse }>(
    `${API_BASE_URL}/scenarios/${id}?expand=impactData`
  );
  return response.data.impactData;
}

export async function fetchAnalysisHeader(id: string): Promise<{
  name: string;
  workflowState: string;
  scenarioType: ScenarioTypeData | null;
  summaryCards: SummaryCardsData | null;
}> {
  const response = await axios.get(
    `${API_BASE_URL}/scenarios/${id}?expand=header,summaryCards`
  );
  return {
    name: response.data.name,
    workflowState: response.data.header?.workflowState ?? '',
    scenarioType: response.data.header?.scenarioType ?? null,
    summaryCards: response.data.summaryCards ?? null,
  };
}
