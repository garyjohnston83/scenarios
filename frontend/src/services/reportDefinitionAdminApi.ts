import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:9090';

export interface ImpactReportDefinitionListItem {
  id: string;
  scenarioTypeCode: string;
  reportKey: string;
  displayName: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImpactReportDefinitionDetail extends ImpactReportDefinitionListItem {
  definition: string;
  schemaVersion: string;
  sampleData?: string;
}

export interface CreateImpactReportDefinitionRequest {
  reportKey: string;
  definition: string;
  sampleData?: string;
}

export async function fetchReportDefinitions(
  scenarioTypeCode: string
): Promise<ImpactReportDefinitionListItem[]> {
  const response = await axios.get<ImpactReportDefinitionListItem[]>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/impact-report-definitions`
  );
  return response.data;
}

export async function fetchReportDefinitionDetail(
  scenarioTypeCode: string,
  id: string
): Promise<ImpactReportDefinitionDetail> {
  const response = await axios.get<ImpactReportDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/impact-report-definitions/${id}`
  );
  return response.data;
}

export async function createReportDefinition(
  scenarioTypeCode: string,
  body: CreateImpactReportDefinitionRequest
): Promise<ImpactReportDefinitionDetail> {
  const response = await axios.post<ImpactReportDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/impact-report-definitions`,
    body
  );
  return response.data;
}

export async function activateReportDefinition(
  scenarioTypeCode: string,
  id: string
): Promise<ImpactReportDefinitionDetail> {
  const response = await axios.post<ImpactReportDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/impact-report-definitions/${id}/activate`
  );
  return response.data;
}

export async function deactivateReportDefinition(
  scenarioTypeCode: string,
  id: string
): Promise<ImpactReportDefinitionDetail> {
  const response = await axios.post<ImpactReportDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/impact-report-definitions/${id}/deactivate`
  );
  return response.data;
}

export async function deleteReportDefinition(
  scenarioTypeCode: string,
  id: string
): Promise<void> {
  await axios.delete(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/impact-report-definitions/${id}`
  );
}

export async function updateSampleData(
  scenarioTypeCode: string,
  id: string,
  sampleData: string
): Promise<void> {
  await axios.put(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/impact-report-definitions/${id}/sample-data`,
    { sampleData }
  );
}
