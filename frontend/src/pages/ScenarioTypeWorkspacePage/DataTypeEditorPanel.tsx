import {
  Input,
  Textarea,
  Select,
  SpinButton,
  Checkbox,
} from '@fluentui/react-components';
import type { SpinButtonChangeEvent, SpinButtonOnChangeData } from '@fluentui/react-components';
import { ColumnDefinitionsEditor } from './ColumnDefinitionsEditor';
import type { ColumnDefinition } from './ColumnDefinitionsEditor';
import type { DeltaDataType, DeltaColumnDefinition } from './ChangeViewStructuredEditorPanel';
import styles from './DataTypeEditorPanel.module.scss';

export interface DataTypeEditorPanelProps {
  dataType: DeltaDataType | null;
  onChange: (dataType: DeltaDataType) => void;
  validationErrors?: Record<string, string>;
  columnValidationErrors?: Record<number, Record<string, string>>;
}

/**
 * Maps ColumnDefinition[] (from ColumnDefinitionsEditor) to DeltaColumnDefinition[]
 * (used by the parent DeltaDataType).
 */
function toColumnDefinitions(cols: ColumnDefinition[]): DeltaColumnDefinition[] {
  return cols.map((c) => ({
    dataAttribute: c.dataAttribute,
    type: c.type,
    display: c.display,
    isEntityId: c.isEntityId || undefined,
  }));
}

/**
 * Maps DeltaColumnDefinition[] to ColumnDefinition[] for the ColumnDefinitionsEditor.
 */
function fromColumnDefinitions(cols: DeltaColumnDefinition[]): ColumnDefinition[] {
  return cols.map((c) => ({
    dataAttribute: c.dataAttribute,
    display: c.display,
    type: c.type,
    isEntityId: c.isEntityId ?? false,
  }));
}

export const DataTypeEditorPanel: React.FC<DataTypeEditorPanelProps> = ({
  dataType,
  onChange,
  validationErrors,
  columnValidationErrors,
}) => {
  if (!dataType) {
    return (
      <div className={styles.container} data-testid="dt-editor-panel">
        <div className={styles.placeholder} data-testid="dt-editor-placeholder">
          Select a data type from the list above to edit.
        </div>
      </div>
    );
  }

  const getFieldError = (field: string): string | undefined => {
    return validationErrors?.[field];
  };

  const handleFieldChange = (field: keyof DeltaDataType, value: unknown) => {
    onChange({ ...dataType, [field]: value });
  };

  const handleRowThresholdChange = (
    _e: SpinButtonChangeEvent,
    data: SpinButtonOnChangeData
  ) => {
    const newValue = data.value != null ? Math.max(1, data.value) : undefined;
    onChange({ ...dataType, rowThreshold: newValue });
  };

  const handleSortAttributeChange = (value: string) => {
    onChange({
      ...dataType,
      sortOrdering: {
        ...(dataType.sortOrdering || { dataAttribute: '', direction: 'ASC' }),
        dataAttribute: value,
      },
    });
  };

  const handleSortDirectionChange = (value: string) => {
    onChange({
      ...dataType,
      sortOrdering: {
        ...(dataType.sortOrdering || { dataAttribute: '', direction: 'ASC' }),
        direction: value,
      },
    });
  };

  const handleColumnDefinitionsChange = (columns: ColumnDefinition[]) => {
    onChange({ ...dataType, columnDefinitions: toColumnDefinitions(columns) });
  };

  const dataTypeIdError = getFieldError('dataTypeId');
  const dataTypeTitleError = getFieldError('dataTypeTitle');
  const headerTemplateError = getFieldError('headerSummaryTextTemplate');
  const rowThresholdError = getFieldError('rowThreshold');
  const overflowMessageError = getFieldError('overflowMessage');
  const sortDataAttributeError = getFieldError('sortOrdering.dataAttribute');
  const sortDirectionError = getFieldError('sortOrdering.direction');

  const hasRowThreshold = dataType.rowThreshold != null && dataType.rowThreshold > 0;

  return (
    <div className={styles.container} data-testid="dt-editor-panel">
      {/* Metadata section */}
      <div className={styles.metadataSection}>
        <div className={styles.sectionTitle}>Data Type Properties</div>
        <div className={styles.metadataFields}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label htmlFor="dt-dataTypeId-input" className={styles.fieldLabel}>Data Type ID</label>
              <Input
                id="dt-dataTypeId-input"
                value={dataType.dataTypeId}
                onChange={(_e, data) => handleFieldChange('dataTypeId', data.value)}
                className={dataTypeIdError ? styles.invalidInput : undefined}
                data-testid="dt-dataTypeId-input"
              />
              {dataTypeIdError && (
                <span className={styles.validationError} data-testid="dt-dataTypeId-error">
                  {dataTypeIdError}
                </span>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="dt-dataTypeTitle-input" className={styles.fieldLabel}>Title</label>
              <Input
                id="dt-dataTypeTitle-input"
                value={dataType.dataTypeTitle}
                onChange={(_e, data) => handleFieldChange('dataTypeTitle', data.value)}
                className={dataTypeTitleError ? styles.invalidInput : undefined}
                data-testid="dt-dataTypeTitle-input"
              />
              {dataTypeTitleError && (
                <span className={styles.validationError} data-testid="dt-dataTypeTitle-error">
                  {dataTypeTitleError}
                </span>
              )}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroupWide}>
              <label htmlFor="dt-headerSummaryTextTemplate-textarea" className={styles.fieldLabel}>
                Header Summary Text Template
              </label>
              <Textarea
                id="dt-headerSummaryTextTemplate-textarea"
                value={dataType.headerSummaryTextTemplate || ''}
                onChange={(_e, data) =>
                  handleFieldChange('headerSummaryTextTemplate', data.value)
                }
                className={headerTemplateError ? styles.invalidInput : undefined}
                resize="vertical"
                data-testid="dt-headerSummaryTextTemplate-textarea"
              />
              {headerTemplateError && (
                <span className={styles.validationError} data-testid="dt-headerSummaryTextTemplate-error">
                  {headerTemplateError}
                </span>
              )}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroupSmall}>
              <label htmlFor="dt-rowThreshold-input" className={styles.fieldLabel}>Row Threshold</label>
              <SpinButton
                id="dt-rowThreshold-input"
                value={dataType.rowThreshold ?? 0}
                min={0}
                onChange={handleRowThresholdChange}
                className={rowThresholdError ? styles.invalidInput : undefined}
                data-testid="dt-rowThreshold-input"
              />
              {rowThresholdError && (
                <span className={styles.validationError} data-testid="dt-rowThreshold-error">
                  {rowThresholdError}
                </span>
              )}
            </div>

            {hasRowThreshold && (
              <div className={styles.fieldGroup}>
                <label htmlFor="dt-overflowMessage-input" className={styles.fieldLabel}>Overflow Message</label>
                <Input
                  id="dt-overflowMessage-input"
                  value={dataType.overflowMessage || ''}
                  onChange={(_e, data) =>
                    handleFieldChange('overflowMessage', data.value)
                  }
                  className={overflowMessageError ? styles.invalidInput : undefined}
                  data-testid="dt-overflowMessage-input"
                />
                {overflowMessageError && (
                  <span className={styles.validationError} data-testid="dt-overflowMessage-error">
                    {overflowMessageError}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <Checkbox
                label="Group by Entity ID column (second-level accordion)"
                checked={dataType.groupByEntityIdColumn ?? false}
                onChange={(_e, data) =>
                  handleFieldChange('groupByEntityIdColumn', data.checked === true)
                }
                data-testid="dt-groupByEntityIdColumn-checkbox"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={styles.sectionDivider} />

      {/* Sort Ordering section */}
      <div className={styles.sortOrderingSection}>
        <div className={styles.sectionTitle}>Sort Ordering</div>
        <div className={styles.fieldRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor="dt-sortDataAttribute-select" className={styles.fieldLabel}>
              Sort By Column
            </label>
            <Select
              id="dt-sortDataAttribute-select"
              value={dataType.sortOrdering?.dataAttribute || ''}
              onChange={(_e, data) => handleSortAttributeChange(data.value)}
              className={sortDataAttributeError ? styles.invalidInput : undefined}
              data-testid="dt-sortDataAttribute-select"
            >
              <option value="">-- Select Column --</option>
              {dataType.columnDefinitions.map((col) => (
                <option key={col.dataAttribute} value={col.dataAttribute}>
                  {col.display || col.dataAttribute}
                </option>
              ))}
            </Select>
            {sortDataAttributeError && (
              <span className={styles.validationError} data-testid="dt-sortDataAttribute-error">
                {sortDataAttributeError}
              </span>
            )}
          </div>

          <div className={styles.fieldGroupSmall}>
            <label htmlFor="dt-sortDirection-select" className={styles.fieldLabel}>Direction</label>
            <Select
              id="dt-sortDirection-select"
              value={dataType.sortOrdering?.direction || 'ASC'}
              onChange={(_e, data) => handleSortDirectionChange(data.value)}
              className={sortDirectionError ? styles.invalidInput : undefined}
              data-testid="dt-sortDirection-select"
            >
              <option value="ASC">ASC</option>
              <option value="DESC">DESC</option>
            </Select>
            {sortDirectionError && (
              <span className={styles.validationError} data-testid="dt-sortDirection-error">
                {sortDirectionError}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={styles.sectionDivider} />

      {/* Column Definitions section */}
      <div className={styles.columnDefinitionsSection}>
        <ColumnDefinitionsEditor
          columns={fromColumnDefinitions(dataType.columnDefinitions)}
          onChange={handleColumnDefinitionsChange}
          validationErrors={columnValidationErrors}
        />
      </div>
    </div>
  );
};
