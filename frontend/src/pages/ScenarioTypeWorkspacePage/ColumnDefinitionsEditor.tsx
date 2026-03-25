import { useCallback } from 'react';
import {
  Button,
  Input,
  Select,
  Checkbox,
} from '@fluentui/react-components';
import type { CheckboxOnChangeData } from '@fluentui/react-components';
import {
  Delete24Regular,
  Add24Regular,
  ArrowUp24Regular,
  ArrowDown24Regular,
} from '@fluentui/react-icons';
import styles from './ColumnDefinitionsEditor.module.scss';

/** Shape of a single column definition within a dataType. */
export interface ColumnDefinition {
  dataAttribute: string;
  display: string;
  type: string;
  isEntityId: boolean;
}

export interface ColumnDefinitionsEditorProps {
  columns: ColumnDefinition[];
  onChange: (columns: ColumnDefinition[]) => void;
  readOnly?: boolean;
  validationErrors?: Record<number, Record<string, string>>;
}

const COLUMN_TYPE_OPTIONS = ['string', 'number', 'date', 'boolean'];

const DEFAULT_COLUMN: ColumnDefinition = {
  dataAttribute: '',
  display: '',
  type: 'string',
  isEntityId: false,
};

export const ColumnDefinitionsEditor: React.FC<ColumnDefinitionsEditorProps> = ({
  columns,
  onChange,
  readOnly = false,
  validationErrors,
}) => {
  const handleAddColumn = useCallback(() => {
    const updated = [...columns, { ...DEFAULT_COLUMN }];
    onChange(updated);
  }, [columns, onChange]);

  const handleDeleteColumn = useCallback(
    (colIdx: number) => {
      const updated = columns.filter((_, i) => i !== colIdx);
      onChange(updated);
    },
    [columns, onChange]
  );

  const handleMoveColumn = useCallback(
    (colIdx: number, direction: 'up' | 'down') => {
      const updated = [...columns];
      const targetIdx = direction === 'up' ? colIdx - 1 : colIdx + 1;
      if (targetIdx < 0 || targetIdx >= updated.length) return;

      // Swap
      [updated[colIdx], updated[targetIdx]] = [updated[targetIdx], updated[colIdx]];
      onChange(updated);
    },
    [columns, onChange]
  );

  const handleFieldChange = useCallback(
    (colIdx: number, field: keyof ColumnDefinition, value: string | boolean) => {
      const updated = [...columns];
      updated[colIdx] = { ...updated[colIdx], [field]: value };

      // isEntityId radio-like constraint: when checking a column's isEntityId,
      // uncheck all other columns' isEntityId within the same dataType
      if (field === 'isEntityId' && value === true) {
        for (let i = 0; i < updated.length; i++) {
          if (i !== colIdx) {
            updated[i] = { ...updated[i], isEntityId: false };
          }
        }
      }

      onChange(updated);
    },
    [columns, onChange]
  );

  const getFieldError = (colIdx: number, field: string): string | undefined => {
    return validationErrors?.[colIdx]?.[field];
  };

  return (
    <div className={styles.container} data-testid="column-definitions-editor">
      <div className={styles.header}>
        <span className={styles.title}>Column Definitions</span>
        {!readOnly && (
          <Button
            appearance="subtle"
            size="small"
            icon={<Add24Regular />}
            onClick={handleAddColumn}
            data-testid="col-add-button"
          >
            Add Column
          </Button>
        )}
      </div>

      {columns.length === 0 ? (
        <div className={styles.emptyState} data-testid="col-empty-state">
          No columns defined. Click &quot;Add Column&quot; to add one.
        </div>
      ) : (
        <table className={styles.columnsTable} data-testid="col-table">
          <thead>
            <tr>
              <th>Data Attribute</th>
              <th>Display</th>
              <th>Type</th>
              <th>Entity ID</th>
              {!readOnly && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {columns.map((col, colIdx) => {
              const daError = getFieldError(colIdx, 'dataAttribute');
              const displayError = getFieldError(colIdx, 'display');
              const typeError = getFieldError(colIdx, 'type');
              const entityIdError = getFieldError(colIdx, 'isEntityId');

              return (
                <tr key={colIdx} data-testid={`col-row-${colIdx}`}>
                  <td>
                    <div className={styles.fieldCell}>
                      <Input
                        size="small"
                        value={col.dataAttribute}
                        onChange={(_e, data) =>
                          handleFieldChange(colIdx, 'dataAttribute', data.value)
                        }
                        className={daError ? styles.invalidInput : undefined}
                        disabled={readOnly}
                        data-testid={`col-dataAttribute-${colIdx}`}
                      />
                      {daError && (
                        <span className={styles.validationError} data-testid={`col-dataAttribute-error-${colIdx}`}>
                          {daError}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.fieldCell}>
                      <Input
                        size="small"
                        value={col.display}
                        onChange={(_e, data) =>
                          handleFieldChange(colIdx, 'display', data.value)
                        }
                        className={displayError ? styles.invalidInput : undefined}
                        disabled={readOnly}
                        data-testid={`col-display-${colIdx}`}
                      />
                      {displayError && (
                        <span className={styles.validationError} data-testid={`col-display-error-${colIdx}`}>
                          {displayError}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.fieldCell}>
                      <Select
                        size="small"
                        value={col.type}
                        onChange={(_e, data) =>
                          handleFieldChange(colIdx, 'type', data.value)
                        }
                        className={typeError ? styles.invalidInput : undefined}
                        disabled={readOnly}
                        data-testid={`col-type-${colIdx}`}
                      >
                        {COLUMN_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </Select>
                      {typeError && (
                        <span className={styles.validationError} data-testid={`col-type-error-${colIdx}`}>
                          {typeError}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.fieldCell}>
                      <Checkbox
                        checked={col.isEntityId}
                        onChange={(_e: React.ChangeEvent<HTMLInputElement>, data: CheckboxOnChangeData) =>
                          handleFieldChange(colIdx, 'isEntityId', !!data.checked)
                        }
                        disabled={readOnly}
                        data-testid={`col-isEntityId-${colIdx}`}
                      />
                      {entityIdError && (
                        <span className={styles.validationError} data-testid={`col-isEntityId-error-${colIdx}`}>
                          {entityIdError}
                        </span>
                      )}
                    </div>
                  </td>
                  {!readOnly && (
                    <td>
                      <div className={styles.columnActions}>
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<ArrowUp24Regular />}
                          onClick={() => handleMoveColumn(colIdx, 'up')}
                          disabled={colIdx === 0}
                          title="Move up"
                          data-testid={`col-move-up-${colIdx}`}
                        />
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<ArrowDown24Regular />}
                          onClick={() => handleMoveColumn(colIdx, 'down')}
                          disabled={colIdx === columns.length - 1}
                          title="Move down"
                          data-testid={`col-move-down-${colIdx}`}
                        />
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<Delete24Regular />}
                          onClick={() => handleDeleteColumn(colIdx)}
                          title="Delete column"
                          data-testid={`col-delete-${colIdx}`}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
