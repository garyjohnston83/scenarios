import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Input,
  Textarea,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { DataTypeList } from './DataTypeList';
import { DataTypeEditorPanel } from './DataTypeEditorPanel';
import { validateDeltaDefinition } from './deltaValidation';
import type { ValidationResult } from './deltaValidation';
import { parseDeltaDefinition } from './ChangeViewStructuredEditorPanel';
import type { DeltaDefinitionState, DeltaDataType } from './ChangeViewStructuredEditorPanel';
import styles from './DeltaByUniqueIdEditorPanel.module.scss';

export interface DeltaByUniqueIdEditorPanelProps {
  /** The definition JSON string to parse and edit. */
  definition: string;
  /** Callback invoked with the serialized JSON when any field changes. */
  onDefinitionChange: (json: string) => void;
  /** When true, the editor is in read-only mode. */
  readOnly?: boolean;
}

/**
 * Creates a default empty dataType for adding to the definition.
 */
function createDefaultDataType(): DeltaDataType {
  return {
    dataTypeId: '',
    dataTypeTitle: '',
    headerSummaryTextTemplate: '',
    columnDefinitions: [],
    sortOrdering: undefined,
    rowThreshold: undefined,
    overflowMessage: undefined,
  };
}

/**
 * Serializes a DeltaDefinitionState to a JSON string.
 */
function serializeDeltaDefinition(state: DeltaDefinitionState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Container component for structured editing of DELTA_BY_UNIQUE_ID definitions.
 *
 * Renders:
 * - Top section: definition-level metadata (read-only labels + editable fields)
 * - Master-detail layout: DataTypeList (top) + DataTypeEditorPanel (bottom)
 * - Aggregate validation MessageBar at the top when errors exist
 *
 * Follows the SignoffPolicyEditorPanel master-detail pattern with
 * innerSplit/topSection/bottomSection layout and the ChangeViewStructuredEditorPanel
 * updateState pattern for change propagation.
 */
export const DeltaByUniqueIdEditorPanel: React.FC<DeltaByUniqueIdEditorPanelProps> = ({
  definition,
  onDefinitionChange,
  readOnly = false,
}) => {
  // Parse definition JSON into local state on mount
  const [defState, setDefState] = useState<DeltaDefinitionState | null>(() => {
    return parseDeltaDefinition(definition);
  });

  // Selected dataType index (matching selectedRuleIndex pattern)
  const [selectedDataTypeIndex, setSelectedDataTypeIndex] = useState<number | null>(null);

  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-parse when the definition prop changes externally
  useEffect(() => {
    const parsed = parseDeltaDefinition(definition);
    setDefState(parsed);
    setSelectedDataTypeIndex(null);
  }, [definition]);

  // ---- State management and change propagation (Task 5.3) ----

  /**
   * Updates the local definition state and propagates the serialized JSON upward.
   * Matches the ChangeViewStructuredEditorPanel updateState pattern.
   */
  const updateState = useCallback(
    (newState: DeltaDefinitionState) => {
      setDefState(newState);
      onDefinitionChange(serializeDeltaDefinition(newState));
    },
    [onDefinitionChange]
  );

  // ---- Debounced validation (Task 5.4) ----

  useEffect(() => {
    if (!defState) {
      setValidationResult(null);
      return;
    }

    // Clear any existing debounce timer
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    // Schedule validation after ~300ms debounce
    validationTimerRef.current = setTimeout(() => {
      const result = validateDeltaDefinition(defState);
      setValidationResult(result);
    }, 300);

    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [defState]);

  // ---- Definition-level field handlers ----

  const handleTopFieldChange = (field: string, value: string) => {
    if (!defState) return;
    updateState({ ...defState, [field]: value });
  };

  // ---- DataType array handlers (Task 5.3) ----

  /**
   * Adds a new default dataType and auto-selects it.
   * Matches the handleAddRule pattern from SignoffPolicyEditorPanel.
   */
  const handleAddDataType = () => {
    if (!defState) return;
    const newDataType = createDefaultDataType();
    const newDataTypes = [...defState.dataTypes, newDataType];
    updateState({ ...defState, dataTypes: newDataTypes });
    // Auto-select the new dataType
    setSelectedDataTypeIndex(newDataTypes.length - 1);
  };

  /**
   * Removes a dataType and adjusts selectedDataTypeIndex.
   * Matches the handleRemoveRule pattern from SignoffPolicyEditorPanel (lines 264-274).
   */
  const handleDeleteDataType = (index: number) => {
    if (!defState) return;
    const dataTypes = [...defState.dataTypes];
    dataTypes.splice(index, 1);
    updateState({ ...defState, dataTypes });

    // Adjust selection
    if (selectedDataTypeIndex === index) {
      setSelectedDataTypeIndex(null);
    } else if (selectedDataTypeIndex !== null && selectedDataTypeIndex > index) {
      setSelectedDataTypeIndex(selectedDataTypeIndex - 1);
    }
  };

  /**
   * Swaps a dataType with its neighbor and follows the selection.
   * Matches the handleMoveRule pattern from SignoffPolicyEditorPanel (lines 277-293).
   */
  const handleMoveDataType = (index: number, direction: 'up' | 'down') => {
    if (!defState) return;
    const dataTypes = [...defState.dataTypes];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= dataTypes.length) return;

    // Swap
    [dataTypes[index], dataTypes[targetIdx]] = [dataTypes[targetIdx], dataTypes[index]];
    updateState({ ...defState, dataTypes });

    // Update selection to follow the moved dataType
    if (selectedDataTypeIndex === index) {
      setSelectedDataTypeIndex(targetIdx);
    } else if (selectedDataTypeIndex === targetIdx) {
      setSelectedDataTypeIndex(index);
    }
  };

  /**
   * Updates the dataType at selectedDataTypeIndex in the array.
   */
  const handleDataTypeChange = useCallback(
    (updatedDataType: DeltaDataType) => {
      if (!defState || selectedDataTypeIndex === null) return;
      const dataTypes = [...defState.dataTypes];
      dataTypes[selectedDataTypeIndex] = updatedDataType;
      updateState({ ...defState, dataTypes });
    },
    [defState, selectedDataTypeIndex, updateState]
  );

  // ---- Render ----

  if (!defState) {
    return (
      <div data-testid="delta-editor-panel">
        <div>Unable to parse definition JSON.</div>
      </div>
    );
  }

  const selectedDataType =
    selectedDataTypeIndex !== null && defState.dataTypes[selectedDataTypeIndex]
      ? defState.dataTypes[selectedDataTypeIndex]
      : null;

  // Compute per-dataType and per-column validation errors for the selected dataType
  const currentDataTypeValidationErrors =
    selectedDataTypeIndex !== null && validationResult?.dataTypeErrors[selectedDataTypeIndex]
      ? validationResult.dataTypeErrors[selectedDataTypeIndex]
      : undefined;

  const currentColumnValidationErrors =
    selectedDataTypeIndex !== null && validationResult?.columnErrors[selectedDataTypeIndex]
      ? validationResult.columnErrors[selectedDataTypeIndex]
      : undefined;

  // Compute aggregate error summary for the MessageBar
  const hasValidationErrors = validationResult && validationResult.errors.length > 0;
  const validationSummary = hasValidationErrors
    ? `${validationResult.errors.length} validation error${validationResult.errors.length > 1 ? 's' : ''} found: ${validationResult.errors.slice(0, 3).map((e) => e.message).join('; ')}${validationResult.errors.length > 3 ? ` ... and ${validationResult.errors.length - 3} more` : ''}`
    : '';

  return (
    <div data-testid="delta-editor-panel">
      {/* Aggregate validation MessageBar (Task 5.4) */}
      {hasValidationErrors && (
        <MessageBar intent="error" data-testid="delta-validation-messagebar">
          <MessageBarBody>{validationSummary}</MessageBarBody>
        </MessageBar>
      )}

      <div className={styles.innerSplit}>
        {/* Top Section: definition metadata + DataTypeList */}
        <div className={styles.topSection} data-testid="delta-top-section">
          {/* Definition Properties card */}
          <div className={styles.metadataCard}>
            <div className={styles.metadataTitle}>Definition Properties</div>
            <div className={styles.fieldGrid}>
              {/* Read-only fields row */}
              <div className={styles.fieldRow}>
                <div className={styles.fieldSmall}>
                  <label htmlFor="delta-template-key" className={styles.fieldLabel}>Template Key</label>
                  <span
                    id="delta-template-key"
                    className={styles.readOnlyValue}
                    data-testid="delta-template-key"
                  >
                    {defState.template_key}
                  </span>
                </div>
                <div className={styles.fieldSmall}>
                  <label htmlFor="delta-scenario-type" className={styles.fieldLabel}>Scenario Type</label>
                  <span
                    id="delta-scenario-type"
                    className={styles.readOnlyValue}
                    data-testid="delta-scenario-type"
                  >
                    {defState.scenario_type}
                  </span>
                </div>
                <div className={styles.fieldSmall}>
                  <label htmlFor="delta-schema-version" className={styles.fieldLabel}>Schema Version</label>
                  <span
                    id="delta-schema-version"
                    className={styles.readOnlyValue}
                    data-testid="delta-schema-version"
                  >
                    {defState.schema_version}
                  </span>
                </div>
              </div>

              {/* Editable fields */}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="delta-display-name-input" className={styles.fieldLabel}>Display Name</label>
                  <Input
                    id="delta-display-name-input"
                    value={defState.display_name}
                    onChange={(_e, data) =>
                      handleTopFieldChange('display_name', data.value)
                    }
                    readOnly={readOnly}
                    data-testid="delta-display-name-input"
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="delta-description-textarea" className={styles.fieldLabel}>Description</label>
                  <Textarea
                    id="delta-description-textarea"
                    value={defState.description}
                    onChange={(_e, data) =>
                      handleTopFieldChange('description', data.value)
                    }
                    readOnly={readOnly}
                    resize="vertical"
                    data-testid="delta-description-textarea"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DataTypeList */}
          <DataTypeList
            dataTypes={defState.dataTypes}
            selectedIndex={selectedDataTypeIndex}
            onSelect={setSelectedDataTypeIndex}
            onAdd={handleAddDataType}
            onDelete={handleDeleteDataType}
            onMove={handleMoveDataType}
          />
        </div>

        {/* Bottom Section: Selected dataType editor */}
        <div className={styles.bottomSection} data-testid="delta-bottom-section">
          <div className={styles.sectionLabel}>Data Type Editor</div>
          <DataTypeEditorPanel
            dataType={selectedDataType}
            onChange={handleDataTypeChange}
            validationErrors={currentDataTypeValidationErrors}
            columnValidationErrors={currentColumnValidationErrors}
          />
        </div>
      </div>
    </div>
  );
};

export default DeltaByUniqueIdEditorPanel;
