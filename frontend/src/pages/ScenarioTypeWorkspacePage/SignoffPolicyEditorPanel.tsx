import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Input,
  Textarea,
  TabList,
  Tab,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import type { SelectionEvents, TabValue } from '@fluentui/react-components';
import {
  Delete24Regular,
  Add24Regular,
  ArrowUp24Regular,
  ArrowDown24Regular,
} from '@fluentui/react-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createSpDefinitionRequest } from '../../store/signoffPolicyDefinitionAdminSlice';
import type { SignoffPolicyDefinitionDetail, FactTypeCatalogEntry, RoleCatalogEntry } from '../../services/signoffPolicyDefinitionAdminApi';
import { MonacoEditorPanel } from './MonacoEditorPanel';
import { RuleEditorPanel } from './RuleEditorPanel';
import styles from './SignoffPolicyEditorPanel.module.scss';

interface SignoffPolicyEditorPanelProps {
  definition: SignoffPolicyDefinitionDetail | null;
  onDefinitionChange: (json: string) => void;
  scenarioTypeCode: string;
  factTypes: FactTypeCatalogEntry[];
  roles: RoleCatalogEntry[];
}

// --- In-memory parsed definition types ---

interface ConditionNode {
  type: 'GROUP' | 'FACT';
  operator?: string; // AND | OR for GROUP; EQUALS, NOT_EQUALS, IN, etc. for FACT
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

function parseDefinition(jsonString: string): PolicyDefinitionState | null {
  try {
    const parsed = JSON.parse(jsonString);
    return {
      schema_version: parsed.schema_version || '1.0',
      policy_key: parsed.policy_key || '',
      scenario_type: parsed.scenario_type || '',
      display_name: parsed.display_name || '',
      description: parsed.description || '',
      resolution_strategy: parsed.resolution_strategy || 'STRICTEST_WINS',
      rules: (parsed.rules || []).map((r: Record<string, unknown>) => ({
        rule_key: (r.rule_key as string) || '',
        name: (r.name as string) || '',
        priority: (r.priority as number) || 1,
        is_enabled: r.is_enabled !== false,
        condition: (r.condition as ConditionNode) || { type: 'GROUP', operator: 'AND', children: [] },
        effect: (r.effect as EffectState) || {
          requiredApproverCount: 1,
          approvalMode: 'UNORDERED',
          approvers: [],
        },
      })),
    };
  } catch {
    return null;
  }
}

function serializeDefinition(state: PolicyDefinitionState): string {
  return JSON.stringify(state, null, 2);
}

function createDefaultRule(existingRulesCount: number): RuleState {
  return {
    rule_key: `new_rule_${existingRulesCount + 1}`,
    name: 'New Rule',
    priority: existingRulesCount + 1,
    is_enabled: true,
    condition: {
      type: 'GROUP',
      operator: 'AND',
      children: [],
    },
    effect: {
      requiredApproverCount: 1,
      approvalMode: 'UNORDERED',
      approvers: [],
    },
  };
}

export const SignoffPolicyEditorPanel: React.FC<SignoffPolicyEditorPanelProps> = ({
  definition,
  onDefinitionChange,
  scenarioTypeCode,
  factTypes,
  roles,
}) => {
  const dispatch = useAppDispatch();
  const saving = useAppSelector((state) => state.signoffPolicyDefinitionAdmin.saving);

  const [editorMode, setEditorMode] = useState<'structured' | 'json'>('structured');
  const [defState, setDefState] = useState<PolicyDefinitionState | null>(null);
  const [selectedRuleIndex, setSelectedRuleIndex] = useState<number | null>(null);

  // JSON editor state
  const [jsonEditorValue, setJsonEditorValue] = useState<string>('');
  const [jsonSyncError, setJsonSyncError] = useState<string | null>(null);

  // Track previous editor mode for transition logic
  const prevEditorModeRef = useRef<'structured' | 'json'>(editorMode);

  // Initialize from definition prop
  useEffect(() => {
    if (definition?.definition) {
      const parsed = parseDefinition(definition.definition);
      setDefState(parsed);
      setSelectedRuleIndex(null);
      setJsonSyncError(null);
      if (parsed) {
        setJsonEditorValue(serializeDefinition(parsed));
      } else {
        setJsonEditorValue(definition.definition);
      }
    } else {
      setDefState(null);
      setSelectedRuleIndex(null);
      setJsonEditorValue('');
      setJsonSyncError(null);
    }
  }, [definition]);

  // Propagate changes upward
  const updateState = useCallback(
    (newState: PolicyDefinitionState) => {
      setDefState(newState);
      onDefinitionChange(serializeDefinition(newState));
    },
    [onDefinitionChange]
  );

  // --- Save handler ---
  const handleSave = () => {
    if (!definition) return;

    let json: string;
    if (editorMode === 'json') {
      json = jsonEditorValue;
    } else {
      if (!defState) return;
      json = serializeDefinition(defState);
    }

    let policyKey: string;
    try {
      const parsed = JSON.parse(json);
      policyKey = parsed.policy_key || '';
    } catch {
      setJsonSyncError('Cannot save: the JSON is not valid.');
      return;
    }

    dispatch(
      createSpDefinitionRequest({
        scenarioTypeCode,
        policyKey,
        definition: json,
      })
    );
  };

  // --- Mode toggle handler ---
  const handleTabChange = (_event: SelectionEvents, data: { value: TabValue }) => {
    const newMode = data.value as 'structured' | 'json';
    const oldMode = prevEditorModeRef.current;

    if (newMode === oldMode) return;

    if (oldMode === 'structured' && newMode === 'json') {
      if (defState) {
        const serialized = serializeDefinition(defState);
        setJsonEditorValue(serialized);
      }
      setJsonSyncError(null);
      setEditorMode('json');
      prevEditorModeRef.current = 'json';
    } else if (oldMode === 'json' && newMode === 'structured') {
      try {
        const parsed = parseDefinition(jsonEditorValue);
        if (parsed === null) {
          setJsonSyncError('Invalid JSON: unable to parse. Please fix the JSON before switching to Structured mode.');
          return;
        }
        setDefState(parsed);
        onDefinitionChange(serializeDefinition(parsed));
        setJsonSyncError(null);
        setEditorMode('structured');
        prevEditorModeRef.current = 'structured';
      } catch {
        setJsonSyncError('Invalid JSON: unable to parse. Please fix the JSON before switching to Structured mode.');
      }
    }
  };

  // --- JSON editor change handler ---
  const handleJsonEditorChange = useCallback(
    (json: string) => {
      setJsonEditorValue(json);
      setJsonSyncError(null);
      onDefinitionChange(json);
    },
    [onDefinitionChange]
  );

  // --- Policy metadata field handlers ---
  const updateTopField = (field: string, value: string) => {
    if (!defState) return;
    updateState({ ...defState, [field]: value });
  };

  // --- Rules array handlers ---
  const handleAddRule = () => {
    if (!defState) return;
    const newRule = createDefaultRule(defState.rules.length);
    const newRules = [...defState.rules, newRule];
    updateState({ ...defState, rules: newRules });
    // Auto-select the new rule
    setSelectedRuleIndex(newRules.length - 1);
  };

  const handleRemoveRule = (ruleIdx: number) => {
    if (!defState) return;
    const rules = [...defState.rules];
    rules.splice(ruleIdx, 1);
    updateState({ ...defState, rules });
    // Adjust selection
    if (selectedRuleIndex === ruleIdx) {
      setSelectedRuleIndex(null);
    } else if (selectedRuleIndex !== null && selectedRuleIndex > ruleIdx) {
      setSelectedRuleIndex(selectedRuleIndex - 1);
    }
  };

  const handleMoveRule = (ruleIdx: number, direction: 'up' | 'down') => {
    if (!defState) return;
    const rules = [...defState.rules];
    const targetIdx = direction === 'up' ? ruleIdx - 1 : ruleIdx + 1;
    if (targetIdx < 0 || targetIdx >= rules.length) return;

    // Swap
    [rules[ruleIdx], rules[targetIdx]] = [rules[targetIdx], rules[ruleIdx]];
    updateState({ ...defState, rules });

    // Update selection to follow the moved rule
    if (selectedRuleIndex === ruleIdx) {
      setSelectedRuleIndex(targetIdx);
    } else if (selectedRuleIndex === targetIdx) {
      setSelectedRuleIndex(ruleIdx);
    }
  };

  const handleSelectRule = (ruleIdx: number) => {
    setSelectedRuleIndex(ruleIdx);
  };

  const handleDuplicateRule = (ruleIdx: number) => {
    if (!defState) return;
    const rules = [...defState.rules];
    const original = rules[ruleIdx];
    const duplicate: RuleState = {
      ...JSON.parse(JSON.stringify(original)),
      rule_key: `${original.rule_key}_copy`,
      name: `${original.name} (Copy)`,
    };
    rules.splice(ruleIdx + 1, 0, duplicate);
    updateState({ ...defState, rules });
    setSelectedRuleIndex(ruleIdx + 1);
  };

  // --- Rule editor change handler ---
  const handleRuleChange = useCallback(
    (updatedRule: RuleState) => {
      if (!defState || selectedRuleIndex === null) return;
      const rules = [...defState.rules];
      rules[selectedRuleIndex] = updatedRule;
      updateState({ ...defState, rules });
    },
    [defState, selectedRuleIndex, updateState]
  );

  // --- Empty / no definition states ---
  if (!definition) {
    return (
      <div className={styles.container} data-testid="sp-editor-panel">
        <div className={styles.emptyState}>
          Select a definition to edit, or create a new one.
        </div>
      </div>
    );
  }

  if (!defState && editorMode === 'structured') {
    return (
      <div className={styles.container} data-testid="sp-editor-panel">
        <div className={styles.emptyState}>
          Unable to parse definition JSON.
        </div>
      </div>
    );
  }

  const selectedRule =
    selectedRuleIndex !== null && defState?.rules[selectedRuleIndex]
      ? defState.rules[selectedRuleIndex]
      : null;

  return (
    <div className={styles.container} data-testid="sp-editor-panel">
      {/* Toolbar: Save and Mode Toggle */}
      <div className={styles.toolbar}>
        <Button
          appearance="primary"
          size="small"
          disabled={saving}
          onClick={handleSave}
          data-testid="sp-save-definition-button"
        >
          {saving ? 'Saving...' : 'Save (New Version)'}
        </Button>

        <TabList
          selectedValue={editorMode}
          onTabSelect={handleTabChange}
          size="small"
          data-testid="sp-editor-mode-tabs"
        >
          <Tab value="structured" data-testid="sp-structured-mode-tab">Structured</Tab>
          <Tab value="json" data-testid="sp-json-mode-tab">JSON</Tab>
        </TabList>
      </div>

      {/* JSON sync error message */}
      {jsonSyncError && (
        <MessageBar intent="error" data-testid="sp-json-sync-error">
          <MessageBarBody>{jsonSyncError}</MessageBarBody>
        </MessageBar>
      )}

      {editorMode === 'structured' && defState ? (
        <div className={styles.innerSplit}>
          {/* Top Section: Policy metadata + rules list */}
          <div className={styles.topSection} data-testid="sp-top-section">
            {/* Policy metadata fields */}
            <div className={styles.metadataCard}>
              <div className={styles.metadataTitle}>Policy Properties</div>
              <div className={styles.fieldGrid}>
                <div className={styles.fieldRow}>
                  <div className={styles.fieldSmall}>
                    <label htmlFor="sp-policy-key" className={styles.fieldLabel}>Policy Key</label>
                    <span id="sp-policy-key" className={styles.readOnlyValue} data-testid="sp-policy-key">
                      {defState.policy_key}
                    </span>
                  </div>
                  <div className={styles.fieldSmall}>
                    <label htmlFor="sp-scenario-type" className={styles.fieldLabel}>Scenario Type</label>
                    <span id="sp-scenario-type" className={styles.readOnlyValue} data-testid="sp-scenario-type">
                      {defState.scenario_type}
                    </span>
                  </div>
                  <div className={styles.fieldSmall}>
                    <label htmlFor="sp-schema-version" className={styles.fieldLabel}>Schema Version</label>
                    <span id="sp-schema-version" className={styles.readOnlyValue} data-testid="sp-schema-version">
                      {defState.schema_version}
                    </span>
                  </div>
                  <div className={styles.fieldSmall}>
                    <label htmlFor="sp-resolution-strategy" className={styles.fieldLabel}>Resolution Strategy</label>
                    <span id="sp-resolution-strategy" className={styles.readOnlyValue} data-testid="sp-resolution-strategy">
                      {defState.resolution_strategy}
                    </span>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="sp-display-name-input" className={styles.fieldLabel}>Display Name</label>
                    <Input
                      id="sp-display-name-input"
                      value={defState.display_name}
                      onChange={(_e, data) =>
                        updateTopField('display_name', data.value)
                      }
                      data-testid="sp-display-name-input"
                    />
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="sp-description-textarea" className={styles.fieldLabel}>Description</label>
                    <Textarea
                      id="sp-description-textarea"
                      value={defState.description || ''}
                      onChange={(_e, data) =>
                        updateTopField('description', data.value)
                      }
                      resize="vertical"
                      data-testid="sp-description-textarea"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rules list */}
            <div className={styles.rulesHeader}>
              <span className={styles.rulesTitle}>
                Rules ({defState.rules.length})
              </span>
              <Button
                appearance="outline"
                size="small"
                icon={<Add24Regular />}
                onClick={handleAddRule}
                data-testid="sp-add-rule-button"
              >
                Add Rule
              </Button>
            </div>

            {defState.rules.length === 0 ? (
              <div className={styles.emptyState}>
                No rules defined. Click &quot;Add Rule&quot; to create one.
              </div>
            ) : (
              <table className={styles.rulesTable} data-testid="sp-rules-table">
                <thead>
                  <tr>
                    <th>Rule Key</th>
                    <th>Name</th>
                    <th>Priority</th>
                    <th>Enabled</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {defState.rules.map((rule, ruleIdx) => (
                    <tr
                      key={`${rule.rule_key}-${ruleIdx}`}
                      className={`${styles.ruleRow} ${
                        selectedRuleIndex === ruleIdx ? styles.ruleRowSelected : ''
                      }`}
                      onClick={() => handleSelectRule(ruleIdx)}
                      data-testid={`sp-rule-row-${ruleIdx}`}
                    >
                      <td>{rule.rule_key}</td>
                      <td>{rule.name}</td>
                      <td>{rule.priority}</td>
                      <td>
                        <span
                          className={`${styles.enabledBadge} ${
                            rule.is_enabled
                              ? styles.enabledBadgeActive
                              : styles.enabledBadgeInactive
                          }`}
                        >
                          {rule.is_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.ruleActions}>
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowUp24Regular />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveRule(ruleIdx, 'up');
                            }}
                            disabled={ruleIdx === 0}
                            title="Move up"
                            data-testid={`sp-move-rule-up-${ruleIdx}`}
                          />
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<ArrowDown24Regular />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveRule(ruleIdx, 'down');
                            }}
                            disabled={ruleIdx === defState.rules.length - 1}
                            title="Move down"
                            data-testid={`sp-move-rule-down-${ruleIdx}`}
                          />
                          <Button
                            appearance="subtle"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateRule(ruleIdx);
                            }}
                            title="Duplicate rule"
                            data-testid={`sp-duplicate-rule-${ruleIdx}`}
                          >
                            Dup
                          </Button>
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Delete24Regular />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveRule(ruleIdx);
                            }}
                            title="Remove rule"
                            data-testid={`sp-remove-rule-${ruleIdx}`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Section: Selected rule editor */}
          <div className={styles.bottomSection} data-testid="sp-bottom-section">
            <div className={styles.sectionLabel}>Rule Editor</div>
            <RuleEditorPanel
              rule={selectedRule}
              onChange={handleRuleChange}
              factTypes={factTypes}
              roles={roles}
            />
          </div>
        </div>
      ) : editorMode === 'json' ? (
        <MonacoEditorPanel
          definitionJson={jsonEditorValue}
          onChange={handleJsonEditorChange}
        />
      ) : null}
    </div>
  );
};

export default SignoffPolicyEditorPanel;
