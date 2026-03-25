import {
  Button,
} from '@fluentui/react-components';
import {
  Delete24Regular,
  Add24Regular,
  ArrowUp24Regular,
  ArrowDown24Regular,
} from '@fluentui/react-icons';
import type { DeltaDataType } from './ChangeViewStructuredEditorPanel';
import styles from './DataTypeList.module.scss';

export interface DataTypeListProps {
  dataTypes: DeltaDataType[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}

export const DataTypeList: React.FC<DataTypeListProps> = ({
  dataTypes,
  selectedIndex,
  onSelect,
  onAdd,
  onDelete,
  onMove,
}) => {
  return (
    <div className={styles.container} data-testid="dt-list">
      {/* Header with Add button */}
      <div className={styles.rulesHeader}>
        <span className={styles.rulesTitle}>
          Data Types ({dataTypes.length})
        </span>
        <Button
          appearance="outline"
          size="small"
          icon={<Add24Regular />}
          onClick={onAdd}
          data-testid="dt-add-button"
        >
          Add Data Type
        </Button>
      </div>

      {dataTypes.length === 0 ? (
        <div className={styles.emptyState} data-testid="dt-empty-state">
          No data types defined. Click &quot;Add Data Type&quot; to create one.
        </div>
      ) : (
        <table className={styles.rulesTable} data-testid="dt-list-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Data Type ID</th>
              <th>Columns</th>
              <th>Row Threshold</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dataTypes.map((dt, idx) => (
              <tr
                key={`${dt.dataTypeId}-${idx}`}
                className={`${styles.ruleRow} ${
                  selectedIndex === idx ? styles.ruleRowSelected : ''
                }`}
                onClick={() => onSelect(idx)}
                data-testid={`dt-row-${idx}`}
              >
                <td>{dt.dataTypeTitle}</td>
                <td>{dt.dataTypeId}</td>
                <td>{dt.columnDefinitions.length}</td>
                <td>{dt.rowThreshold != null ? dt.rowThreshold : '-'}</td>
                <td>
                  <div className={styles.ruleActions}>
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<ArrowUp24Regular />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(idx, 'up');
                      }}
                      disabled={idx === 0}
                      title="Move up"
                      data-testid={`dt-move-up-${idx}`}
                    />
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<ArrowDown24Regular />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(idx, 'down');
                      }}
                      disabled={idx === dataTypes.length - 1}
                      title="Move down"
                      data-testid={`dt-move-down-${idx}`}
                    />
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<Delete24Regular />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(idx);
                      }}
                      title="Delete data type"
                      data-testid={`dt-delete-${idx}`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
