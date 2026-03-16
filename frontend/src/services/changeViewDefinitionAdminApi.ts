import axios from 'axios';
import type { RenderedReport } from '../types/renderedReport';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:9090';

export interface ChangeViewDefinitionListItem {
  id: string;
  scenarioTypeCode: string;
  templateKey: string;
  displayName: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeViewDefinitionDetail extends ChangeViewDefinitionListItem {
  definition: string;
  schemaVersion: string;
}

export interface CreateChangeViewDefinitionRequest {
  templateKey: string;
  definition: string;
}

export async function fetchChangeViewDefinitions(
  scenarioTypeCode: string
): Promise<ChangeViewDefinitionListItem[]> {
  const response = await axios.get<ChangeViewDefinitionListItem[]>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/change-view-definitions`
  );
  return response.data;
}

export async function fetchChangeViewDefinitionDetail(
  scenarioTypeCode: string,
  id: string
): Promise<ChangeViewDefinitionDetail> {
  const response = await axios.get<ChangeViewDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/change-view-definitions/${id}`
  );
  return response.data;
}

export async function createChangeViewDefinition(
  scenarioTypeCode: string,
  body: CreateChangeViewDefinitionRequest
): Promise<ChangeViewDefinitionDetail> {
  const response = await axios.post<ChangeViewDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/change-view-definitions`,
    body
  );
  return response.data;
}

export async function activateChangeViewDefinition(
  scenarioTypeCode: string,
  id: string
): Promise<ChangeViewDefinitionDetail> {
  const response = await axios.post<ChangeViewDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/change-view-definitions/${id}/activate`
  );
  return response.data;
}

export async function deactivateChangeViewDefinition(
  scenarioTypeCode: string,
  id: string
): Promise<ChangeViewDefinitionDetail> {
  const response = await axios.post<ChangeViewDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/change-view-definitions/${id}/deactivate`
  );
  return response.data;
}

export async function fetchChangeViewPreview(
  scenarioTypeCode: string,
  definition: string
): Promise<RenderedReport> {
  const response = await axios.post(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/change-view-definitions/preview`,
    definition,
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
}

export async function fetchChangeViewPreviewData(
  scenarioTypeCode: string
): Promise<Record<string, unknown>> {
  const response = await axios.get(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/change-view-definitions/change-view-preview-data`
  );
  return response.data;
}
