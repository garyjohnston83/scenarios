import {
  Button,
  Input,
  Select,
} from '@fluentui/react-components';
import { Delete24Regular, Add24Regular } from '@fluentui/react-icons';
import styles from './MetricBlockEditor.module.scss';

interface FormatRule {
  min?: number | null;
  max?: number | null;
  token: string;
}

interface MetricBlock {
  blockType: string;
  key: string;
  label: string;
  unit?: string;
  source_field: string;
  format: string;
  formatRules?: FormatRule[];
}

interface MetricBlockEditorProps {
  block: MetricBlock;
  onChange: (updated: MetricBlock) => void;
  onRemove: () => void;
}

const FORMAT_OPTIONS = ['number', 'currency', 'percentage', 'text'];

export const MetricBlockEditor: React.FC<MetricBlockEditorProps> = ({
  block,
  onChange,
  onRemove,
}) => {
  const updateField = (field: string, value: string) => {
    onChange({ ...block, [field]: value });
  };

  const handleAddRule = () => {
    const rules = block.formatRules || [];
    onChange({
      ...block,
      formatRules: [...rules, { min: null, max: null, token: '' }],
    });
  };

  const handleUpdateRule = (index: number, field: string, value: string) => {
    const rules = [...(block.formatRules || [])];
    if (field === 'min' || field === 'max') {
      const numVal = value === '' ? null : Number(value);
      rules[index] = { ...rules[index], [field]: numVal };
    } else {
      rules[index] = { ...rules[index], [field]: value };
    }
    onChange({ ...block, formatRules: rules });
  };

  const handleRemoveRule = (index: number) => {
    const rules = [...(block.formatRules || [])];
    rules.splice(index, 1);
    onChange({ ...block, formatRules: rules });
  };

  const isKeyEmpty = !block.key?.trim();
  const isLabelEmpty = !block.label?.trim();
  const isSourceFieldEmpty = !block.source_field?.trim();

  return (
    <div className={styles.container} data-testid="metric-block-editor">
      <div className={styles.blockHeader}>
        <span className={styles.typeBadge}>Metric</span>
        <Button
          appearance="subtle"
          size="small"
          icon={<Delete24Regular />}
          onClick={onRemove}
          title="Remove block"
          data-testid="remove-metric-block"
        />
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="metric-key" className={styles.fieldLabel}>Key *</label>
          <Input
            id="metric-key"
            value={block.key || ''}
            onChange={(_e, data) => updateField('key', data.value)}
            className={isKeyEmpty ? styles.invalidInput : undefined}
            data-testid="metric-key-input"
          />
          {isKeyEmpty && (
            <span className={styles.validationError}>Key is required</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="metric-label" className={styles.fieldLabel}>Label *</label>
          <Input
            id="metric-label"
            value={block.label || ''}
            onChange={(_e, data) => updateField('label', data.value)}
            className={isLabelEmpty ? styles.invalidInput : undefined}
            data-testid="metric-label-input"
          />
          {isLabelEmpty && (
            <span className={styles.validationError}>Label is required</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="metric-unit" className={styles.fieldLabel}>Unit</label>
          <Input
            id="metric-unit"
            value={block.unit || ''}
            onChange={(_e, data) => updateField('unit', data.value)}
            data-testid="metric-unit-input"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="metric-source-field" className={styles.fieldLabel}>Source Field *</label>
          <Input
            id="metric-source-field"
            value={block.source_field || ''}
            onChange={(_e, data) => updateField('source_field', data.value)}
            className={isSourceFieldEmpty ? styles.invalidInput : undefined}
            data-testid="metric-source-field-input"
          />
          {isSourceFieldEmpty && (
            <span className={styles.validationError}>Source field is required</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="metric-format" className={styles.fieldLabel}>Format</label>
          <Select
            id="metric-format"
            value={block.format || 'number'}
            onChange={(_e, data) => updateField('format', data.value)}
            data-testid="metric-format-select"
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Format Rules sub-editor */}
      <div className={styles.rulesSection}>
        <div className={styles.rulesSectionHeader}>
          <span className={styles.rulesSectionTitle}>Format Rules</span>
          <Button
            appearance="subtle"
            size="small"
            icon={<Add24Regular />}
            onClick={handleAddRule}
            data-testid="add-format-rule"
          >
            Add Rule
          </Button>
        </div>

        {(block.formatRules || []).map((rule, ruleIdx) => (
          <div key={ruleIdx} className={styles.ruleRow} data-testid={`format-rule-${ruleIdx}`}>
            <div className={styles.ruleField}>
              <label htmlFor={`rule-min-${ruleIdx}`} className={styles.ruleFieldLabel}>Min</label>
              <Input
                id={`rule-min-${ruleIdx}`}
                type="number"
                value={rule.min !== null && rule.min !== undefined ? String(rule.min) : ''}
                onChange={(_e, data) => handleUpdateRule(ruleIdx, 'min', data.value)}
                data-testid={`rule-min-${ruleIdx}`}
              />
            </div>
            <div className={styles.ruleField}>
              <label htmlFor={`rule-max-${ruleIdx}`} className={styles.ruleFieldLabel}>Max</label>
              <Input
                id={`rule-max-${ruleIdx}`}
                type="number"
                value={rule.max !== null && rule.max !== undefined ? String(rule.max) : ''}
                onChange={(_e, data) => handleUpdateRule(ruleIdx, 'max', data.value)}
                data-testid={`rule-max-${ruleIdx}`}
              />
            </div>
            <div className={styles.ruleField}>
              <label htmlFor={`rule-token-${ruleIdx}`} className={styles.ruleFieldLabel}>Token *</label>
              <Input
                id={`rule-token-${ruleIdx}`}
                value={rule.token || ''}
                onChange={(_e, data) => handleUpdateRule(ruleIdx, 'token', data.value)}
                className={!rule.token?.trim() ? styles.invalidInput : undefined}
                data-testid={`rule-token-${ruleIdx}`}
              />
            </div>
            <Button
              appearance="subtle"
              size="small"
              icon={<Delete24Regular />}
              onClick={() => handleRemoveRule(ruleIdx)}
              title="Remove rule"
              data-testid={`remove-rule-${ruleIdx}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricBlockEditor;
