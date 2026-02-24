import { useState, useMemo } from 'react';
import type { GridRowData } from '../../store/scenariosSlice';
import styles from './DataGridTable.module.scss';

interface DataGridTableProps {
  columns: string[];
  rows: GridRowData[];
}

export const DataGridTable: React.FC<DataGridTableProps> = ({
  columns,
  rows,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');

  const handleColumnClick = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const processedRows = useMemo(() => {
    let result = [...rows];

    // Filter
    if (filterText.trim()) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = row.payload[col];
          return String(value ?? '').toLowerCase().includes(lowerFilter);
        })
      );
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a.payload[sortColumn];
        const bVal = b.payload[sortColumn];

        const aNum = Number(aVal);
        const bNum = Number(bVal);
        const bothNumeric =
          !isNaN(aNum) &&
          !isNaN(bNum) &&
          aVal !== '' &&
          aVal !== null &&
          aVal !== undefined &&
          bVal !== '' &&
          bVal !== null &&
          bVal !== undefined;

        let comparison: number;
        if (bothNumeric) {
          comparison = aNum - bNum;
        } else {
          comparison = String(aVal ?? '').localeCompare(String(bVal ?? ''));
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [rows, columns, filterText, sortColumn, sortDirection]);

  return (
    <div className={styles.gridContainer}>
      <input
        className={styles.filterInput}
        type="text"
        placeholder="Filter rows..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        aria-label="Filter rows"
      />
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} onClick={() => handleColumnClick(col)}>
                {col}
                {sortColumn === col && (
                  <span className={styles.sortIndicator}>
                    {sortDirection === 'asc' ? '\u25B2' : '\u25BC'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processedRows.map((row) => (
            <tr key={row.rowId}>
              {columns.map((col) => (
                <td key={col}>{String(row.payload[col] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataGridTable;
