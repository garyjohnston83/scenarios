import axios from 'axios';
import type { ScenarioListItem, ScenarioDetail, MessageData } from '../store/scenariosSlice';
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

export async function fetchScenarioGridSections(
  id: string,
  expandSections: string
): Promise<Partial<ScenarioDetail>> {
  const response = await axios.get<Partial<ScenarioDetail>>(
    `${API_BASE_URL}/scenarios/${id}?expand=${expandSections}`
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
