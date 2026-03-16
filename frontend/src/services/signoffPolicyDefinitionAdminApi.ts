import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:9090';

export interface SignoffPolicyDefinitionListItem {
  id: string;
  scenarioTypeCode: string;
  policyKey: string;
  displayName: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RuleSummary {
  ruleKey: string;
  ruleName: string;
  conditionSummary: string;
  effectSummary: string;
}

export interface SignoffPolicyDefinitionDetail extends SignoffPolicyDefinitionListItem {
  definition: string;
  schemaVersion: string;
  ruleSummaries: RuleSummary[];
}

export interface CreateSignoffPolicyDefinitionRequest {
  policyKey: string;
  definition: string;
}

export interface FactTypeCatalogEntry {
  key: string;
  label: string;
  operators: string[];
  valueType: string;
  enumValues?: { key: string; label: string }[];
}

export interface RoleCatalogEntry {
  key: string;
  label: string;
}

export async function fetchSignoffPolicyDefinitions(
  scenarioTypeCode: string
): Promise<SignoffPolicyDefinitionListItem[]> {
  const response = await axios.get<SignoffPolicyDefinitionListItem[]>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/signoff-policy-definitions`
  );
  return response.data;
}

export async function fetchSignoffPolicyDefinitionDetail(
  scenarioTypeCode: string,
  id: string
): Promise<SignoffPolicyDefinitionDetail> {
  const response = await axios.get<SignoffPolicyDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/signoff-policy-definitions/${id}`
  );
  return response.data;
}

export async function createSignoffPolicyDefinition(
  scenarioTypeCode: string,
  body: CreateSignoffPolicyDefinitionRequest
): Promise<SignoffPolicyDefinitionDetail> {
  const response = await axios.post<SignoffPolicyDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/signoff-policy-definitions`,
    body
  );
  return response.data;
}

export async function activateSignoffPolicyDefinition(
  scenarioTypeCode: string,
  id: string
): Promise<SignoffPolicyDefinitionDetail> {
  const response = await axios.post<SignoffPolicyDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/signoff-policy-definitions/${id}/activate`
  );
  return response.data;
}

export async function deactivateSignoffPolicyDefinition(
  scenarioTypeCode: string,
  id: string
): Promise<SignoffPolicyDefinitionDetail> {
  const response = await axios.post<SignoffPolicyDefinitionDetail>(
    `${API_BASE_URL}/admin/scenario-types/${scenarioTypeCode}/signoff-policy-definitions/${id}/deactivate`
  );
  return response.data;
}

export async function fetchFactTypeCatalog(): Promise<FactTypeCatalogEntry[]> {
  const response = await axios.get<FactTypeCatalogEntry[]>(
    `${API_BASE_URL}/admin/signoff-rules/fact-types`
  );
  return response.data;
}

export async function fetchRoleCatalog(): Promise<RoleCatalogEntry[]> {
  const response = await axios.get<RoleCatalogEntry[]>(
    `${API_BASE_URL}/admin/signoff-rules/roles`
  );
  return response.data;
}
