import React from 'react';
import type { TableBlock } from '../../types/renderedReport';
import { getFormatTokenClass } from '../../utils/formatTokenStyles';
import styles from './TableBlockRenderer.module.scss';

interface TableBlockRendererProps {
  block: TableBlock;
}

export const TableBlockRenderer: React.FC<TableBlockRendererProps> = ({ block }) => {
  const { columnLayout, rows } = block;
  const { rowColumns, columnGroups } = columnLayout;
  const hasColumnGroups = columnGroups.length > 0;

  // Build fixed column widths: 300px first col, 75px Impact (empty groupLabel), 125px all others
  const colWidths: string[] = [];
  rowColumns.forEach((_, index) => {
    colWidths.push(index === 0 ? '300px' : '125px');
  });
  columnGroups.forEach((group) => {
    group.columns.forEach(() => {
      colWidths.push(group.groupLabel === '' ? '75px' : '150px');
    });
  });

  return (
    <div className={styles.tableBlockContainer} data-testid={`table-block-${block.tableKey}`}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={{ width: w, minWidth: w }} />
            ))}
          </colgroup>
          <thead>
            {hasColumnGroups ? (
              <>
                {/* Group header row */}
                <tr>
                  {rowColumns.map((rc) => (
                    <th key={rc.key} rowSpan={2} className={styles.rowColumnHeader}>
                      {rc.header}
                    </th>
                  ))}
                  {columnGroups.map((group) => (
                    <th
                      key={group.groupLabel}
                      colSpan={group.columns.length}
                      className={styles.groupHeader}
                    >
                      {group.groupLabel}
                    </th>
                  ))}
                </tr>
                {/* Column header row */}
                <tr>
                  {columnGroups.map((group) =>
                    group.columns.map((col) => (
                      <th key={col.key}>{col.header}</th>
                    ))
                  )}
                </tr>
              </>
            ) : (
              /* Single header row when no column groups */
              <tr>
                {rowColumns.map((rc) => (
                  <th key={rc.key} className={styles.rowColumnHeader}>{rc.header}</th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowId}>
                {rowColumns.map((rc) => {
                  const cell = row.cells[rc.key];
                  return <td key={rc.key}>{cell?.value ?? ''}</td>;
                })}
                {columnGroups.map((group) =>
                  group.columns.map((col) => {
                    const cell = row.cells[col.key];
                    const cellClass = cell?.formatToken
                      ? getFormatTokenClass(cell.formatToken)
                      : undefined;
                    return (
                      <td key={col.key} className={cellClass}>
                        {cell?.value ?? ''}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableBlockRenderer;
