/**
 * Client-side utilities for generating human-readable summaries
 * of signoff policy definitions, condition trees, and effect models.
 *
 * Used by SignoffPolicySummaryPanel to produce live-updating summaries
 * as the user edits in the center panel.
 */

// ---------------------------------------------------------------------------
// Types (mirrors the in-memory editor types from SignoffPolicyEditorPanel)
// ---------------------------------------------------------------------------

interface ConditionNode {
  type: 'GROUP' | 'FACT';
  operator?: string;
  children?: ConditionNode[];
  factType?: string;
  value?: unknown;
}

interface ApproverEntry {
  type: string;
  roleKey: string;
}

interface EffectState {
  requiredApproverCount: number;
  approvalMode: string;
  approvers: ApproverEntry[];
}

interface RuleState {
  rule_key: string;
  name: string;
  priority: number;
  is_enabled: boolean;
  condition: ConditionNode;
  effect: EffectState;
}

interface PolicyDefinitionState {
  schema_version: string;
  policy_key: string;
  scenario_type: string;
  display_name: string;
  description?: string;
  resolution_strategy: string;
  rules: RuleState[];
  [key: string]: unknown;
}

export interface ClientRuleSummary {
  ruleKey: string;
  ruleName: string;
  isEnabled: boolean;
  conditionSummary: string;
  effectSummary: string;
}

export interface PolicyHeaderInfo {
  displayName: string;
  description: string;
  schemaVersion: string;
  policyKey: string;
  scenarioType: string;
  resolutionStrategy: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Condition tree summary generation
// ---------------------------------------------------------------------------

/**
 * Recursively summarize a condition tree node to human-readable text.
 *
 * - GROUP with AND: "ALL of: [child1, child2, ...]"
 * - GROUP with OR:  "ANY of: [child1, child2, ...]"
 * - FACT: "{factType} {operator} {value}"
 */
export function summarizeCondition(node: ConditionNode): string {
  if (!node) return '(no condition)';

  if (node.type === 'GROUP') {
    const children = node.children || [];
    if (children.length === 0) {
      return node.operator === 'OR' ? 'ANY of: (empty)' : 'ALL of: (empty)';
    }

    const childSummaries = children.map((child) => summarizeCondition(child));
    const prefix = node.operator === 'OR' ? 'ANY of' : 'ALL of';

    if (childSummaries.length === 1) {
      return `${prefix}: [${childSummaries[0]}]`;
    }

    return `${prefix}: [${childSummaries.join(', ')}]`;
  }

  if (node.type === 'FACT') {
    const factType = node.factType || '(no fact type)';
    const operator = node.operator || '(no operator)';
    const value = formatValue(node.value);
    return `${factType} ${operator} ${value}`;
  }

  return '(unknown node)';
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '(no value)';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[${value.map((v) => String(v)).join(', ')}]`;
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Effect summary generation
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable summary of a rule's effect model.
 * Example: "Require 2 approval(s) (SEQUENTIAL) from SENIOR_RISK_MANAGER, HEAD_OF_DESK"
 */
export function summarizeEffect(effect: EffectState): string {
  if (!effect) return '(no effect)';

  const count = effect.requiredApproverCount ?? 1;
  const mode = effect.approvalMode || 'UNORDERED';
  const approvers = effect.approvers || [];

  const roleKeys = approvers
    .filter((a) => a.roleKey)
    .map((a) => a.roleKey);

  if (roleKeys.length > 0) {
    return `Require ${count} approval(s) (${mode}) from ${roleKeys.join(', ')}`;
  }

  return `Require ${count} approval(s) (${mode})`;
}

// ---------------------------------------------------------------------------
// Parse definition JSON and extract header info
// ---------------------------------------------------------------------------

export function extractPolicyHeader(jsonString: string): PolicyHeaderInfo | null {
  try {
    const parsed = JSON.parse(jsonString);
    return {
      displayName: parsed.display_name || '',
      description: parsed.description || '',
      schemaVersion: parsed.schema_version || '',
      policyKey: parsed.policy_key || '',
      scenarioType: parsed.scenario_type || '',
      resolutionStrategy: parsed.resolution_strategy || '',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generate client-side rule summaries from JSON
// ---------------------------------------------------------------------------

export function generateClientRuleSummaries(jsonString: string): ClientRuleSummary[] {
  let parsed: PolicyDefinitionState;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return [];
  }

  const rules = parsed.rules;
  if (!Array.isArray(rules)) return [];

  return rules.map((rule) => ({
    ruleKey: rule.rule_key || '(no key)',
    ruleName: rule.name || '(unnamed)',
    isEnabled: rule.is_enabled !== false,
    conditionSummary: summarizeCondition(
      rule.condition || { type: 'GROUP', operator: 'AND', children: [] }
    ),
    effectSummary: summarizeEffect(
      rule.effect || { requiredApproverCount: 1, approvalMode: 'UNORDERED', approvers: [] }
    ),
  }));
}

// ---------------------------------------------------------------------------
// Client-side structural validation (subset of backend validation)
// ---------------------------------------------------------------------------

export function validateDefinition(jsonString: string): ValidationResult {
  const errors: string[] = [];

  // 1. Check JSON is parseable
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : 'unable to parse'}`],
    };
  }

  // 2. Check required top-level fields
  if (!parsed.schema_version) {
    errors.push('Missing required field: schema_version');
  } else if (parsed.schema_version !== '1.0') {
    errors.push(`schema_version must be "1.0", found "${parsed.schema_version}"`);
  }

  if (!parsed.policy_key) {
    errors.push('Missing required field: policy_key');
  } else if (typeof parsed.policy_key === 'string' && !/^[a-z0-9_]+$/.test(parsed.policy_key)) {
    errors.push('policy_key must match pattern [a-z0-9_]+');
  }

  if (!parsed.display_name) {
    errors.push('Missing required field: display_name');
  }

  // 3. Check rules array
  if (!parsed.rules) {
    errors.push('Missing required field: rules');
  } else if (!Array.isArray(parsed.rules)) {
    errors.push('rules must be an array');
  } else if (parsed.rules.length === 0) {
    errors.push('rules array must not be empty');
  } else {
    // Validate each rule
    const ruleKeys = new Set<string>();
    (parsed.rules as Record<string, unknown>[]).forEach((rule, idx) => {
      const rulePrefix = `rules[${idx}]`;

      if (!rule.rule_key) {
        errors.push(`${rulePrefix}: missing rule_key`);
      } else {
        const rk = rule.rule_key as string;
        if (ruleKeys.has(rk)) {
          errors.push(`${rulePrefix}: duplicate rule_key "${rk}"`);
        }
        ruleKeys.add(rk);
      }

      if (!rule.name) {
        errors.push(`${rulePrefix}: missing name`);
      }

      // Basic condition check
      if (rule.condition) {
        validateConditionNode(rule.condition as ConditionNode, `${rulePrefix}.condition`, errors);
      }

      // Basic effect check
      if (rule.effect) {
        const effect = rule.effect as Record<string, unknown>;
        if (
          effect.requiredApproverCount !== undefined &&
          (typeof effect.requiredApproverCount !== 'number' || effect.requiredApproverCount < 1)
        ) {
          errors.push(`${rulePrefix}.effect: requiredApproverCount must be >= 1`);
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateConditionNode(
  node: ConditionNode,
  path: string,
  errors: string[]
): void {
  if (!node || !node.type) {
    errors.push(`${path}: missing type`);
    return;
  }

  if (node.type === 'GROUP') {
    if (!node.operator || (node.operator !== 'AND' && node.operator !== 'OR')) {
      errors.push(`${path}: GROUP must have operator "AND" or "OR"`);
    }
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child, idx) => {
        validateConditionNode(child, `${path}.children[${idx}]`, errors);
      });
    }
  } else if (node.type === 'FACT') {
    if (!node.factType) {
      errors.push(`${path}: FACT must have a factType`);
    }
    if (!node.operator) {
      errors.push(`${path}: FACT must have an operator`);
    }
  }
}
