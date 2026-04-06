import apiClient from './axiosInstance';

export interface SignoffPolicyDto {
  id: string;
  scenarioTypeCode: string;
  name: string;
  requiredApproverCount: number;
  isEnabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSignoffPolicyRequest {
  name: string;
  scenarioTypeCode: string;
  requiredApproverCount: number;
  isEnabled: boolean;
  priority: number;
}

export interface UpdateSignoffPolicyRequest {
  name: string;
  requiredApproverCount: number;
  isEnabled: boolean;
  priority: number;
}

export async function fetchSignoffPolicies(): Promise<SignoffPolicyDto[]> {
  const response = await apiClient.get<SignoffPolicyDto[]>(
    `/admin/signoff-policies`
  );
  return response.data;
}

export async function createSignoffPolicy(
  body: CreateSignoffPolicyRequest
): Promise<SignoffPolicyDto> {
  const response = await apiClient.post<SignoffPolicyDto>(
    `/admin/signoff-policies`,
    body
  );
  return response.data;
}

export async function updateSignoffPolicy(
  id: string,
  body: UpdateSignoffPolicyRequest
): Promise<SignoffPolicyDto> {
  const response = await apiClient.put<SignoffPolicyDto>(
    `/admin/signoff-policies/${id}`,
    body
  );
  return response.data;
}
