import {
  Button,
  Input,
  Select,
  TabList,
  Tab,
} from '@fluentui/react-components';
import type { SelectionEvents, TabValue } from '@fluentui/react-components';
import { Delete24Regular, Add24Regular } from '@fluentui/react-icons';
import type { FactTypeCatalogEntry } from '../../services/signoffPolicyDefinitionAdminApi';
import styles from './ConditionTreeBuilder.module.scss';

export interface ConditionNode {
  type: 'GROUP' | 'FACT';
  operator?: string; // AND | OR for GROUP; EQUALS, NOT_EQUALS, IN, etc. for FACT
  children?: ConditionNode[];
  factType?: string;
  value?: unknown;
}

interface ConditionTreeBuilderProps {
  condition: ConditionNode;
  onChange: (updatedCondition: ConditionNode) => void;
  factTypes: FactTypeCatalogEntry[];
  depth?: number;
  pathKey?: string;
  onRemove?: () => void;
}

export const ConditionTreeBuilder: React.FC<ConditionTreeBuilderProps> = ({
  condition,
  onChange,
  factTypes,
  depth = 0,
  pathKey = 'root',
  onRemove,
}) => {
  if (condition.type === 'GROUP') {
    return (
      <GroupNodeEditor
        condition={condition}
        onChange={onChange}
        factTypes={factTypes}
        depth={depth}
        pathKey={pathKey}
        onRemove={onRemove}
      />
    );
  }

  return (
    <FactNodeEditor
      condition={condition}
      onChange={onChange}
      factTypes={factTypes}
      pathKey={pathKey}
      onRemove={onRemove}
    />
  );
};

// --- GROUP node editor ---

interface GroupNodeEditorProps {
  condition: ConditionNode;
  onChange: (updatedCondition: ConditionNode) => void;
  factTypes: FactTypeCatalogEntry[];
  depth: number;
  pathKey: string;
  onRemove?: () => void;
}

const GroupNodeEditor: React.FC<GroupNodeEditorProps> = ({
  condition,
  onChange,
  factTypes,
  depth,
  pathKey,
  onRemove,
}) => {
  const children = condition.children || [];
  const groupOperator = condition.operator === 'OR' ? 'OR' : 'AND';

  const handleOperatorToggle = (_event: SelectionEvents, data: { value: TabValue }) => {
    const newOp = data.value as string;
    onChange({ ...condition, operator: newOp });
  };

  const handleAddCondition = () => {
    const newChild: ConditionNode = {
      type: 'FACT',
      factType: '',
      operator: '',
      value: '',
    };
    onChange({
      ...condition,
      children: [...children, newChild],
    });
  };

  const handleAddGroup = () => {
    const newChild: ConditionNode = {
      type: 'GROUP',
      operator: 'AND',
      children: [],
    };
    onChange({
      ...condition,
      children: [...children, newChild],
    });
  };

  const handleChildChange = (childIndex: number, updatedChild: ConditionNode) => {
    const updatedChildren = [...children];
    updatedChildren[childIndex] = updatedChild;
    onChange({ ...condition, children: updatedChildren });
  };

  const handleRemoveChild = (childIndex: number) => {
    const updatedChildren = [...children];
    updatedChildren.splice(childIndex, 1);
    onChange({ ...condition, children: updatedChildren });
  };

  const indentStyle = depth > 0 ? { marginLeft: `${depth * 20}px` } : undefined;

  return (
    <div
      className={`${styles.groupNode} ${depth > 0 ? styles.groupNodeNested : ''}`}
      style={indentStyle}
      data-testid={`condition-group-${pathKey}`}
    >
      {/* Group header with operator toggle */}
      <div className={styles.groupHeader}>
        <TabList
          selectedValue={groupOperator}
          onTabSelect={handleOperatorToggle}
          size="small"
          data-testid={`group-operator-toggle-${pathKey}`}
        >
          <Tab value="AND" data-testid={`group-and-tab-${pathKey}`}>ALL</Tab>
          <Tab value="OR" data-testid={`group-or-tab-${pathKey}`}>ANY</Tab>
        </TabList>

        <span className={styles.groupLabel}>
          {groupOperator === 'AND' ? 'All of the following' : 'Any of the following'}
        </span>

        <div className={styles.groupActions}>
          <Button
            appearance="subtle"
            size="small"
            icon={<Add24Regular />}
            onClick={handleAddCondition}
            data-testid={`add-condition-${pathKey}`}
          >
            Add Condition
          </Button>
          <Button
            appearance="subtle"
            size="small"
            icon={<Add24Regular />}
            onClick={handleAddGroup}
            data-testid={`add-group-${pathKey}`}
          >
            Add Group
          </Button>
          {onRemove && (
            <Button
              appearance="subtle"
              size="small"
              icon={<Delete24Regular />}
              onClick={onRemove}
              title="Remove group"
              data-testid={`remove-group-${pathKey}`}
            />
          )}
        </div>
      </div>

      {/* Children */}
      <div className={styles.groupChildren}>
        {children.length === 0 ? (
          <div className={styles.emptyChildren} data-testid={`empty-group-${pathKey}`}>
            No conditions. Click &quot;Add Condition&quot; or &quot;Add Group&quot; to start building.
          </div>
        ) : (
          children.map((child, childIdx) => {
            const childPathKey = `${pathKey}.children.${childIdx}`;
            return (
              <ConditionTreeBuilder
                key={childPathKey}
                condition={child}
                onChange={(updated) => handleChildChange(childIdx, updated)}
                factTypes={factTypes}
                depth={depth + 1}
                pathKey={childPathKey}
                onRemove={() => handleRemoveChild(childIdx)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

// --- FACT node editor ---

interface FactNodeEditorProps {
  condition: ConditionNode;
  onChange: (updatedCondition: ConditionNode) => void;
  factTypes: FactTypeCatalogEntry[];
  pathKey: string;
  onRemove?: () => void;
}

const FactNodeEditor: React.FC<FactNodeEditorProps> = ({
  condition,
  onChange,
  factTypes,
  pathKey,
  onRemove,
}) => {
  const selectedFactType = factTypes.find((ft) => ft.key === condition.factType);
  const availableOperators = selectedFactType?.operators || [];
  const valueType = selectedFactType?.valueType || 'string';
  const enumValues = selectedFactType?.enumValues || [];

  const handleFactTypeChange = (newFactType: string) => {
    const newFt = factTypes.find((ft) => ft.key === newFactType);
    const newOperators = newFt?.operators || [];
    // Reset operator if current one is not valid for the new fact type
    const currentOp = condition.operator || '';
    const newOperator = newOperators.includes(currentOp) ? currentOp : '';
    // Reset value when fact type changes
    onChange({
      ...condition,
      factType: newFactType,
      operator: newOperator,
      value: '',
    });
  };

  const handleOperatorChange = (newOperator: string) => {
    // If switching to/from IN operator, adjust value type
    const currentOp = condition.operator || '';
    let newValue = condition.value;
    if (newOperator === 'IN' && currentOp !== 'IN') {
      // Convert single value to array
      newValue = condition.value ? [condition.value] : [];
    } else if (newOperator !== 'IN' && currentOp === 'IN') {
      // Convert array to single value
      newValue = Array.isArray(condition.value) && condition.value.length > 0
        ? condition.value[0]
        : '';
    }
    onChange({ ...condition, operator: newOperator, value: newValue });
  };

  const handleValueChange = (newValue: unknown) => {
    onChange({ ...condition, value: newValue });
  };

  // Render value input based on valueType and operator
  const renderValueInput = () => {
    const currentOperator = condition.operator || '';

    // IN operator: multi-value input
    if (currentOperator === 'IN') {
      return renderMultiValueInput();
    }

    // Enum type: dropdown
    if (valueType === 'enum' && enumValues.length > 0) {
      return (
        <Select
          value={String(condition.value || '')}
          onChange={(_e, data) => handleValueChange(data.value)}
          data-testid={`fact-value-select-${pathKey}`}
        >
          <option value="">-- Select --</option>
          {enumValues.map((ev) => (
            <option key={ev.key} value={ev.key}>
              {ev.label}
            </option>
          ))}
        </Select>
      );
    }

    // Boolean type: dropdown with true/false
    if (valueType === 'boolean') {
      return (
        <Select
          value={String(condition.value ?? '')}
          onChange={(_e, data) => handleValueChange(data.value)}
          data-testid={`fact-value-boolean-${pathKey}`}
        >
          <option value="">-- Select --</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </Select>
      );
    }

    // String or number: text input
    return (
      <Input
        value={String(condition.value || '')}
        onChange={(_e, data) => handleValueChange(data.value)}
        placeholder="Value"
        type={valueType === 'number' ? 'number' : 'text'}
        data-testid={`fact-value-input-${pathKey}`}
      />
    );
  };

  // Multi-value input for IN operator
  const renderMultiValueInput = () => {
    const values: string[] = Array.isArray(condition.value)
      ? (condition.value as string[])
      : [];

    const handleAddValue = () => {
      handleValueChange([...values, '']);
    };

    const handleUpdateValue = (idx: number, val: string) => {
      const updated = [...values];
      updated[idx] = val;
      handleValueChange(updated);
    };

    const handleRemoveValue = (idx: number) => {
      const updated = [...values];
      updated.splice(idx, 1);
      handleValueChange(updated);
    };

    return (
      <div className={styles.multiValueContainer} data-testid={`fact-multi-value-${pathKey}`}>
        {values.map((v, idx) => (
          <div key={idx} className={styles.multiValueRow}>
            {valueType === 'enum' && enumValues.length > 0 ? (
              <Select
                value={v}
                onChange={(_e, data) => handleUpdateValue(idx, data.value)}
                data-testid={`fact-multi-value-select-${pathKey}-${idx}`}
              >
                <option value="">-- Select --</option>
                {enumValues.map((ev) => (
                  <option key={ev.key} value={ev.key}>
                    {ev.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={v}
                onChange={(_e, data) => handleUpdateValue(idx, data.value)}
                placeholder={`Value ${idx + 1}`}
                data-testid={`fact-multi-value-input-${pathKey}-${idx}`}
              />
            )}
            <Button
              appearance="subtle"
              size="small"
              icon={<Delete24Regular />}
              onClick={() => handleRemoveValue(idx)}
              title="Remove value"
              data-testid={`remove-multi-value-${pathKey}-${idx}`}
            />
          </div>
        ))}
        <Button
          appearance="subtle"
          size="small"
          icon={<Add24Regular />}
          onClick={handleAddValue}
          data-testid={`add-multi-value-${pathKey}`}
        >
          Add Value
        </Button>
      </div>
    );
  };

  return (
    <div className={styles.factNode} data-testid={`condition-fact-${pathKey}`}>
      {/* Fact type dropdown */}
      <div className={styles.factField}>
        <Select
          value={condition.factType || ''}
          onChange={(_e, data) => handleFactTypeChange(data.value)}
          data-testid={`fact-type-select-${pathKey}`}
        >
          <option value="">-- Fact Type --</option>
          {factTypes.map((ft) => (
            <option key={ft.key} value={ft.key}>
              {ft.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Operator dropdown */}
      <div className={styles.factField}>
        <Select
          value={condition.operator || ''}
          onChange={(_e, data) => handleOperatorChange(data.value)}
          disabled={!condition.factType}
          data-testid={`fact-operator-select-${pathKey}`}
        >
          <option value="">-- Operator --</option>
          {availableOperators.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </Select>
      </div>

      {/* Value input */}
      <div className={styles.factValueField}>
        {renderValueInput()}
      </div>

      {/* Remove button */}
      {onRemove && (
        <Button
          appearance="subtle"
          size="small"
          icon={<Delete24Regular />}
          onClick={onRemove}
          title="Remove condition"
          data-testid={`remove-fact-${pathKey}`}
        />
      )}
    </div>
  );
};

export default ConditionTreeBuilder;
