import {
  Button,
  Input,
} from '@fluentui/react-components';
import { Delete24Regular, Add24Regular } from '@fluentui/react-icons';
import styles from './TableBlockEditor.module.scss';

interface ColumnDef {
  key: string;
  header: string;
  width?: string;
}

interface ColumnGroup {
  groupLabel: string;
  columns: ColumnDef[];
}

interface TableBlock {
  blockType: string;
  key: string;
  label: string;
  rowColumns: ColumnDef[];
  columnGroups: ColumnGroup[];
}

interface TableBlockEditorProps {
  block: TableBlock;
  onChange: (updated: TableBlock) => void;
  onRemove: () => void;
}

export const TableBlockEditor: React.FC<TableBlockEditorProps> = ({
  block,
  onChange,
  onRemove,
}) => {
  const isKeyEmpty = !block.key?.trim();
  const isLabelEmpty = !block.label?.trim();

  // --- Top-level fields ---
  const updateField = (field: string, value: string) => {
    onChange({ ...block, [field]: value });
  };

  // --- Row Columns ---
  const handleAddRowColumn = () => {
    const rowColumns = [...(block.rowColumns || [])];
    rowColumns.push({ key: '', header: '' });
    onChange({ ...block, rowColumns });
  };

  const handleUpdateRowColumn = (index: number, field: string, value: string) => {
    const rowColumns = [...(block.rowColumns || [])];
    rowColumns[index] = { ...rowColumns[index], [field]: value };
    onChange({ ...block, rowColumns });
  };

  const handleRemoveRowColumn = (index: number) => {
    const rowColumns = [...(block.rowColumns || [])];
    rowColumns.splice(index, 1);
    onChange({ ...block, rowColumns });
  };

  // --- Column Groups ---
  const handleAddColumnGroup = () => {
    const columnGroups = [...(block.columnGroups || [])];
    columnGroups.push({ groupLabel: '', columns: [{ key: '', header: '' }] });
    onChange({ ...block, columnGroups });
  };

  const handleUpdateColumnGroupLabel = (groupIdx: number, value: string) => {
    const columnGroups = [...(block.columnGroups || [])];
    columnGroups[groupIdx] = { ...columnGroups[groupIdx], groupLabel: value };
    onChange({ ...block, columnGroups });
  };

  const handleRemoveColumnGroup = (groupIdx: number) => {
    const columnGroups = [...(block.columnGroups || [])];
    columnGroups.splice(groupIdx, 1);
    onChange({ ...block, columnGroups });
  };

  const handleAddColumn = (groupIdx: number) => {
    const columnGroups = [...(block.columnGroups || [])];
    const group = { ...columnGroups[groupIdx] };
    group.columns = [...group.columns, { key: '', header: '' }];
    columnGroups[groupIdx] = group;
    onChange({ ...block, columnGroups });
  };

  const handleUpdateColumn = (
    groupIdx: number,
    colIdx: number,
    field: string,
    value: string
  ) => {
    const columnGroups = [...(block.columnGroups || [])];
    const group = { ...columnGroups[groupIdx] };
    const columns = [...group.columns];
    columns[colIdx] = { ...columns[colIdx], [field]: value };
    group.columns = columns;
    columnGroups[groupIdx] = group;
    onChange({ ...block, columnGroups });
  };

  const handleRemoveColumn = (groupIdx: number, colIdx: number) => {
    const columnGroups = [...(block.columnGroups || [])];
    const group = { ...columnGroups[groupIdx] };
    const columns = [...group.columns];
    columns.splice(colIdx, 1);
    group.columns = columns;
    columnGroups[groupIdx] = group;
    onChange({ ...block, columnGroups });
  };

  return (
    <div className={styles.container} data-testid="table-block-editor">
      <div className={styles.blockHeader}>
        <span className={styles.typeBadge}>Table</span>
        <Button
          appearance="subtle"
          size="small"
          icon={<Delete24Regular />}
          onClick={onRemove}
          title="Remove block"
          data-testid="remove-table-block"
        />
      </div>

      {/* Top-level fields */}
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="table-key" className={styles.fieldLabel}>Key *</label>
          <Input
            id="table-key"
            value={block.key || ''}
            onChange={(_e, data) => updateField('key', data.value)}
            className={isKeyEmpty ? styles.invalidInput : undefined}
            data-testid="table-key-input"
          />
          {isKeyEmpty && (
            <span className={styles.validationError}>Key is required</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="table-label" className={styles.fieldLabel}>Label *</label>
          <Input
            id="table-label"
            value={block.label || ''}
            onChange={(_e, data) => updateField('label', data.value)}
            className={isLabelEmpty ? styles.invalidInput : undefined}
            data-testid="table-label-input"
          />
          {isLabelEmpty && (
            <span className={styles.validationError}>Label is required</span>
          )}
        </div>
      </div>

      {/* Row Columns sub-editor */}
      <div className={styles.subSection}>
        <div className={styles.subSectionHeader}>
          <span className={styles.subSectionTitle}>Row Columns</span>
          <Button
            appearance="subtle"
            size="small"
            icon={<Add24Regular />}
            onClick={handleAddRowColumn}
            data-testid="add-row-column"
          >
            Add Row Column
          </Button>
        </div>
        {(block.rowColumns || []).map((rc, rcIdx) => (
          <div key={rcIdx} className={styles.inlineRow} data-testid={`row-column-${rcIdx}`}>
            <div className={styles.inlineField}>
              <label htmlFor={`row-col-key-${rcIdx}`} className={styles.inlineLabel}>Key</label>
              <Input
                id={`row-col-key-${rcIdx}`}
                value={rc.key || ''}
                onChange={(_e, data) =>
                  handleUpdateRowColumn(rcIdx, 'key', data.value)
                }
                data-testid={`row-col-key-${rcIdx}`}
              />
            </div>
            <div className={styles.inlineField}>
              <label htmlFor={`row-col-header-${rcIdx}`} className={styles.inlineLabel}>Header</label>
              <Input
                id={`row-col-header-${rcIdx}`}
                value={rc.header || ''}
                onChange={(_e, data) =>
                  handleUpdateRowColumn(rcIdx, 'header', data.value)
                }
                data-testid={`row-col-header-${rcIdx}`}
              />
            </div>
            <div className={styles.inlineField} style={{ maxWidth: '100px' }}>
              <label htmlFor={`row-col-width-${rcIdx}`} className={styles.inlineLabel}>Width</label>
              <Input
                id={`row-col-width-${rcIdx}`}
                value={rc.width || ''}
                placeholder="e.g. 300px"
                onChange={(_e, data) =>
                  handleUpdateRowColumn(rcIdx, 'width', data.value)
                }
                data-testid={`row-col-width-${rcIdx}`}
              />
            </div>
            <Button
              appearance="subtle"
              size="small"
              icon={<Delete24Regular />}
              onClick={() => handleRemoveRowColumn(rcIdx)}
              title="Remove row column"
              data-testid={`remove-row-col-${rcIdx}`}
            />
          </div>
        ))}
      </div>

      {/* Column Groups sub-editor */}
      <div className={styles.subSection}>
        <div className={styles.subSectionHeader}>
          <span className={styles.subSectionTitle}>Column Groups</span>
          <Button
            appearance="subtle"
            size="small"
            icon={<Add24Regular />}
            onClick={handleAddColumnGroup}
            data-testid="add-column-group"
          >
            Add Column Group
          </Button>
        </div>
        {(block.columnGroups || []).map((group, groupIdx) => (
          <div
            key={groupIdx}
            className={styles.columnGroupCard}
            data-testid={`column-group-${groupIdx}`}
          >
            <div className={styles.columnGroupHeader}>
              <div className={styles.inlineField}>
                <label htmlFor={`group-label-${groupIdx}`} className={styles.inlineLabel}>Group Label</label>
                <Input
                  id={`group-label-${groupIdx}`}
                  value={group.groupLabel || ''}
                  onChange={(_e, data) =>
                    handleUpdateColumnGroupLabel(groupIdx, data.value)
                  }
                  data-testid={`group-label-${groupIdx}`}
                />
              </div>
              <Button
                appearance="subtle"
                size="small"
                icon={<Delete24Regular />}
                onClick={() => handleRemoveColumnGroup(groupIdx)}
                title="Remove column group"
                data-testid={`remove-group-${groupIdx}`}
              />
            </div>

            <div className={styles.columnsContainer}>
              <div className={styles.columnsHeader}>
                <span className={styles.columnsTitle}>Columns</span>
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Add24Regular />}
                  onClick={() => handleAddColumn(groupIdx)}
                  data-testid={`add-column-${groupIdx}`}
                >
                  Add Column
                </Button>
              </div>
              {(group.columns || []).map((col, colIdx) => (
                <div
                  key={colIdx}
                  className={styles.inlineRow}
                  data-testid={`group-${groupIdx}-col-${colIdx}`}
                >
                  <div className={styles.inlineField}>
                    <label htmlFor={`group-${groupIdx}-col-key-${colIdx}`} className={styles.inlineLabel}>Key</label>
                    <Input
                      id={`group-${groupIdx}-col-key-${colIdx}`}
                      value={col.key || ''}
                      onChange={(_e, data) =>
                        handleUpdateColumn(groupIdx, colIdx, 'key', data.value)
                      }
                      data-testid={`group-${groupIdx}-col-key-${colIdx}`}
                    />
                  </div>
                  <div className={styles.inlineField}>
                    <label htmlFor={`group-${groupIdx}-col-header-${colIdx}`} className={styles.inlineLabel}>Header</label>
                    <Input
                      id={`group-${groupIdx}-col-header-${colIdx}`}
                      value={col.header || ''}
                      onChange={(_e, data) =>
                        handleUpdateColumn(
                          groupIdx,
                          colIdx,
                          'header',
                          data.value
                        )
                      }
                      data-testid={`group-${groupIdx}-col-header-${colIdx}`}
                    />
                  </div>
                  <div className={styles.inlineField} style={{ maxWidth: '100px' }}>
                    <label htmlFor={`group-${groupIdx}-col-width-${colIdx}`} className={styles.inlineLabel}>Width</label>
                    <Input
                      id={`group-${groupIdx}-col-width-${colIdx}`}
                      value={col.width || ''}
                      placeholder="e.g. 150px"
                      onChange={(_e, data) =>
                        handleUpdateColumn(
                          groupIdx,
                          colIdx,
                          'width',
                          data.value
                        )
                      }
                      data-testid={`group-${groupIdx}-col-width-${colIdx}`}
                    />
                  </div>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<Delete24Regular />}
                    onClick={() => handleRemoveColumn(groupIdx, colIdx)}
                    title="Remove column"
                    data-testid={`remove-group-${groupIdx}-col-${colIdx}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Note about table data */}
      <div className={styles.subSection}>
        <span className={styles.subSectionTitle}>Table Data</span>
        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
          {'Table rows are managed separately via the Sample Data tab. Switch to the "Sample Data" tab above to add or edit table row data for preview.'}
        </p>
      </div>
    </div>
  );
};

export default TableBlockEditor;
