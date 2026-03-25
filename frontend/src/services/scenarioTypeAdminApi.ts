import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:9090';

export interface ScenarioTypeAdminDto {
  code: string;
  name: string;
  icon: string;
  directChangesMode: string;
  impactDataMode: string;
  directChangesInternalRenderMode: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface ScenarioTypeAdminDetailDto {
  code: string;
  name: string;
  icon: string;
  directChangesMode: string;
  impactDataMode: string;
  directChangesExternalUrlTemplate: string | null;
  impactExternalUrlTemplate: string | null;
  directChangesInternalRenderMode: string;
  isEnabled: boolean;
  sortOrder: number;
  activeReportDefinitionCount: number;
  activeSignoffPolicyCount: number;
  activeChangeViewDefinitionCount: number;
  activeSignoffPolicyDefinitionCount: number;
}

export interface UpdateScenarioTypeRequest {
  name: string;
  icon: string;
  isEnabled: boolean;
  sortOrder: number | null;
}

export interface UpdateNavigationViewModeRequest {
  directChangesMode: string;
  impactDataMode: string;
  directChangesExternalUrlTemplate: string | null;
  impactExternalUrlTemplate: string | null;
  directChangesInternalRenderMode: string | null;
}

export interface ImpactExecutionSummaryDto {
  providerRegistered: boolean;
  providerName: string | null;
  providerClassName: string | null;
}

export async function fetchScenarioTypes(): Promise<ScenarioTypeAdminDto[]> {
  const response = await axios.get<ScenarioTypeAdminDto[]>(
    `${API_BASE_URL}/admin/scenario-types`
  );
  return response.data;
}

export async function fetchScenarioTypeDetail(
  code: string
): Promise<ScenarioTypeAdminDetailDto> {
  const response = await axios.get<ScenarioTypeAdminDetailDto>(
    `${API_BASE_URL}/admin/scenario-types/${code}`
  );
  return response.data;
}

export async function updateScenarioType(
  code: string,
  body: UpdateScenarioTypeRequest
): Promise<ScenarioTypeAdminDetailDto> {
  const response = await axios.put<ScenarioTypeAdminDetailDto>(
    `${API_BASE_URL}/admin/scenario-types/${code}`,
    body
  );
  return response.data;
}

export async function updateNavigationViewMode(
  code: string,
  body: UpdateNavigationViewModeRequest
): Promise<ScenarioTypeAdminDetailDto> {
  const response = await axios.put<ScenarioTypeAdminDetailDto>(
    `${API_BASE_URL}/admin/scenario-types/${code}/navigation-view-mode`,
    body
  );
  return response.data;
}

export async function fetchImpactExecutionSummary(
  code: string
): Promise<ImpactExecutionSummaryDto> {
  const response = await axios.get<ImpactExecutionSummaryDto>(
    `${API_BASE_URL}/admin/scenario-types/${code}/impact-execution-summary`
  );
  return response.data;
}
