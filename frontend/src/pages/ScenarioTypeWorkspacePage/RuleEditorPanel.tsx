import {
  Input,
  Switch,
  SpinButton,
} from '@fluentui/react-components';
import type { SpinButtonChangeEvent, SpinButtonOnChangeData } from '@fluentui/react-components';
import type { FactTypeCatalogEntry, RoleCatalogEntry } from '../../services/signoffPolicyDefinitionAdminApi';
import { ConditionTreeBuilder } from './ConditionTreeBuilder';
import type { ConditionNode } from './ConditionTreeBuilder';
import { EffectEditor } from './EffectEditor';
import type { EffectState } from './EffectEditor';
import styles from './RuleEditorPanel.module.scss';

interface RuleState {
  rule_key: string;
  name: string;
  priority: number;
  is_enabled: boolean;
  condition: ConditionNode;
  effect: EffectState;
}

interface RuleEditorPanelProps {
  rule: RuleState | null;
  onChange: (updatedRule: RuleState) => void;
  factTypes: FactTypeCatalogEntry[];
  roles: RoleCatalogEntry[];
}

export const RuleEditorPanel: React.FC<RuleEditorPanelProps> = ({
  rule,
  onChange,
  factTypes,
  roles,
}) => {
  if (!rule) {
    return (
      <div className={styles.container} data-testid="rule-editor-panel">
        <div className={styles.placeholder} data-testid="sp-rule-editor-placeholder">
          Select a rule from the list above to edit.
        </div>
      </div>
    );
  }

  const ruleKeyValid = /^[a-z0-9_]*$/.test(rule.rule_key);

  const handleFieldChange = (field: keyof RuleState, value: unknown) => {
    onChange({ ...rule, [field]: value });
  };

  const handlePriorityChange = (
    _e: SpinButtonChangeEvent,
    data: SpinButtonOnChangeData
  ) => {
    const newPriority = data.value ?? 1;
    handleFieldChange('priority', Math.max(1, newPriority));
  };

  const handleConditionChange = (updatedCondition: ConditionNode) => {
    handleFieldChange('condition', updatedCondition);
  };

  const handleEffectChange = (updatedEffect: EffectState) => {
    handleFieldChange('effect', updatedEffect);
  };

  return (
    <div className={styles.container} data-testid="rule-editor-panel">
      {/* Rule metadata fields */}
      <div className={styles.metadataSection} data-testid="rule-metadata-section">
        <div className={styles.metadataTitle}>Rule Properties</div>
        <div className={styles.metadataFields}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label htmlFor="rule-key-input" className={styles.fieldLabel}>Rule Key</label>
              <Input
                id="rule-key-input"
                value={rule.rule_key}
                onChange={(_e, data) => handleFieldChange('rule_key', data.value)}
                className={!ruleKeyValid ? styles.invalidInput : undefined}
                data-testid="rule-key-input"
              />
              {!ruleKeyValid && (
                <span className={styles.validationError}>
                  Only lowercase letters, numbers, and underscores allowed
                </span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="rule-name-input" className={styles.fieldLabel}>Name</label>
              <Input
                id="rule-name-input"
                value={rule.name}
                onChange={(_e, data) => handleFieldChange('name', data.value)}
                data-testid="rule-name-input"
              />
            </div>

            <div className={styles.fieldGroupSmall}>
              <label htmlFor="rule-priority-input" className={styles.fieldLabel}>Priority</label>
              <SpinButton
                id="rule-priority-input"
                value={rule.priority}
                min={1}
                onChange={handlePriorityChange}
                data-testid="rule-priority-input"
              />
            </div>

            <div className={styles.fieldGroupSmall}>
              <label htmlFor="rule-enabled-toggle" className={styles.fieldLabel}>Enabled</label>
              <Switch
                id="rule-enabled-toggle"
                checked={rule.is_enabled}
                onChange={(_e, data) =>
                  handleFieldChange('is_enabled', data.checked)
                }
                data-testid="rule-enabled-toggle"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={styles.sectionDivider} />

      {/* Condition tree builder */}
      <div className={styles.conditionSection} data-testid="rule-condition-section">
        <div className={styles.sectionLabel}>Conditions</div>
        <ConditionTreeBuilder
          condition={rule.condition}
          onChange={handleConditionChange}
          factTypes={factTypes}
          depth={0}
          pathKey="root"
        />
      </div>

      {/* Divider */}
      <div className={styles.sectionDivider} />

      {/* Effect editor */}
      <div className={styles.effectSection} data-testid="rule-effect-section">
        <div className={styles.sectionLabel}>Effect</div>
        <EffectEditor
          effect={rule.effect}
          onChange={handleEffectChange}
          roles={roles}
        />
      </div>
    </div>
  );
};

export default RuleEditorPanel;
