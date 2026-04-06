import apiClient from './axiosInstance';
import type { AxiosResponse } from 'axios';

export interface DataTemplateDto {
  id: string;
  scenarioTypeCode: string;
  version: number;
  name: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchDataTemplates(
  scenarioTypeCode: string
): Promise<DataTemplateDto[]> {
  const response = await apiClient.get<DataTemplateDto[]>(
    `/admin/scenario-types/${scenarioTypeCode}/data-templates`
  );
  return response.data;
}

export async function uploadDataTemplate(
  scenarioTypeCode: string,
  name: string,
  file: File
): Promise<DataTemplateDto> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);
  const response = await apiClient.post<DataTemplateDto>(
    `/admin/scenario-types/${scenarioTypeCode}/data-templates/upload`,
    formData
  );
  return response.data;
}

export async function activateDataTemplate(
  scenarioTypeCode: string,
  id: string
): Promise<DataTemplateDto> {
  const response = await apiClient.post<DataTemplateDto>(
    `/admin/scenario-types/${scenarioTypeCode}/data-templates/${id}/activate`
  );
  return response.data;
}

export async function deactivateDataTemplate(
  scenarioTypeCode: string,
  id: string
): Promise<DataTemplateDto> {
  const response = await apiClient.post<DataTemplateDto>(
    `/admin/scenario-types/${scenarioTypeCode}/data-templates/${id}/deactivate`
  );
  return response.data;
}

export async function downloadDataTemplate(
  scenarioTypeCode: string,
  id: string
): Promise<AxiosResponse<Blob>> {
  const response = await apiClient.get<Blob>(
    `/admin/scenario-types/${scenarioTypeCode}/data-templates/${id}/download`,
    { responseType: 'blob' }
  );
  return response;
}
