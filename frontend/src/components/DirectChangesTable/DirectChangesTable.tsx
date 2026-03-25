import type { DirectChangesColumnDefinitionFe } from '../../types/directChanges';
import styles from './DirectChangesTable.module.scss';

interface DirectChangesTableProps {
  columnDefinitions: DirectChangesColumnDefinitionFe[];
  rows: Record<string, unknown>[];
}

export const DirectChangesTable: React.FC<DirectChangesTableProps> = ({
  columnDefinitions,
  rows,
}) => {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {columnDefinitions.map((col) => (
            <th key={col.dataAttribute}>{col.display}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columnDefinitions.map((col) => (
              <td key={col.dataAttribute}>
                {String(row[col.dataAttribute] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default DirectChangesTable;
