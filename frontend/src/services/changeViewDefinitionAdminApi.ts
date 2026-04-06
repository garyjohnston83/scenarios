import apiClient from './axiosInstance';
import type { RenderedReport } from '../types/renderedReport';

export interface ChangeViewDefinitionListItem {
  id: string;
  scenarioTypeCode: string;
  templateKey: string;
  displayName: string;
  renderMode: string | null;
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
  const response = await apiClient.get<ChangeViewDefinitionListItem[]>(
    `/admin/scenario-types/${scenarioTypeCode}/change-view-definitions`
  );
  return response.data;
}

export async function fetchChangeViewDefinitionDetail(
  scenarioTypeCode: string,
  id: string
): Promise<ChangeViewDefinitionDetail> {
  const response = await apiClient.get<ChangeViewDefinitionDetail>(
    `/admin/scenario-types/${scenarioTypeCode}/change-view-definitions/${id}`
  );
  return response.data;
}

export async function createChangeViewDefinition(
  scenarioTypeCode: string,
  body: CreateChangeViewDefinitionRequest
): Promise<ChangeViewDefinitionDetail> {
  const response = await apiClient.post<ChangeViewDefinitionDetail>(
    `/admin/scenario-types/${scenarioTypeCode}/change-view-definitions`,
    body
  );
  return response.data;
}

export async function activateChangeViewDefinition(
  scenarioTypeCode: string,
  id: string
): Promise<ChangeViewDefinitionDetail> {
  const response = await apiClient.post<ChangeViewDefinitionDetail>(
    `/admin/scenario-types/${scenarioTypeCode}/change-view-definitions/${id}/activate`
  );
  return response.data;
}

export async function deactivateChangeViewDefinition(
  scenarioTypeCode: string,
  id: string
): Promise<ChangeViewDefinitionDetail> {
  const response = await apiClient.post<ChangeViewDefinitionDetail>(
    `/admin/scenario-types/${scenarioTypeCode}/change-view-definitions/${id}/deactivate`
  );
  return response.data;
}

export async function fetchChangeViewPreview(
  scenarioTypeCode: string,
  definition: string
): Promise<RenderedReport> {
  const response = await apiClient.post(
    `/admin/scenario-types/${scenarioTypeCode}/change-view-definitions/preview`,
    definition,
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
}

export async function fetchChangeViewPreviewData(
  scenarioTypeCode: string
): Promise<Record<string, unknown>> {
  const response = await apiClient.get(
    `/admin/scenario-types/${scenarioTypeCode}/change-view-definitions/change-view-preview-data`
  );
  return response.data;
}
