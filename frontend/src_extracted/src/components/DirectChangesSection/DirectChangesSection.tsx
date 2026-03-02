import type { DirectChangesData } from '../../store/scenariosSlice';
import { DataGridTable } from '../DataGridTable';
import styles from './DirectChangesSection.module.scss';

interface DirectChangesSectionProps {
  data: DirectChangesData;
}

export const DirectChangesSection: React.FC<DirectChangesSectionProps> = ({
  data,
}) => {
  return (
    <div className={styles.section}>
      <span className={styles.sectionHeading}>Direct Changes</span>
      {data.rows.length === 0 ? (
        <div className={styles.emptyState}>
          No direct changes data available
        </div>
      ) : (
        <DataGridTable columns={data.columns} rows={data.rows} />
      )}
    </div>
  );
};

export default DirectChangesSection;
