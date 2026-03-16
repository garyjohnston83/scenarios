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

  // Collect explicit widths; columns without width get auto-sized
  const colEntries: Array<{ width?: string }> = [];
  rowColumns.forEach((rc) => {
    colEntries.push({ width: rc.width || undefined });
  });
  columnGroups.forEach((group) => {
    group.columns.forEach((col) => {
      colEntries.push({ width: col.width || undefined });
    });
  });

  const allHaveWidth = colEntries.length > 0 && colEntries.every((e) => !!e.width);
  // If all columns have explicit widths, table width = sum of those widths (fixed layout).
  // If any column has no width, table = 100% with auto layout so columns size to content.
  const tableStyle: React.CSSProperties = allHaveWidth
    ? { width: colEntries.reduce((sum, e) => sum + parseInt(e.width!, 10), 0) + 'px', tableLayout: 'fixed' }
    : { width: '100%', tableLayout: 'auto' };

  return (
    <div className={styles.tableBlockContainer} data-testid={`table-block-${block.tableKey}`}>
      <div className={styles.tableWrapper}>
        <table className={styles.table} style={tableStyle}>
          <colgroup>
            {colEntries.map((e, i) =>
              e.width
                ? <col key={i} style={{ width: e.width, minWidth: e.width }} />
                : <col key={i} />
            )}
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
