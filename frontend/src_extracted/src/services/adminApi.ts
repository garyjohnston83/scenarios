import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:9090';

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
  const response = await axios.get<SignoffPolicyDto[]>(
    `${API_BASE_URL}/admin/signoff-policies`
  );
  return response.data;
}

export async function createSignoffPolicy(
  body: CreateSignoffPolicyRequest
): Promise<SignoffPolicyDto> {
  const response = await axios.post<SignoffPolicyDto>(
    `${API_BASE_URL}/admin/signoff-policies`,
    body
  );
  return response.data;
}

export async function updateSignoffPolicy(
  id: string,
  body: UpdateSignoffPolicyRequest
): Promise<SignoffPolicyDto> {
  const response = await axios.put<SignoffPolicyDto>(
    `${API_BASE_URL}/admin/signoff-policies/${id}`,
    body
  );
  return response.data;
}
