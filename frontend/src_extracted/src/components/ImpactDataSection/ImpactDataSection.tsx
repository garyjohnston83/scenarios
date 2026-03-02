import { Link } from '@fluentui/react-components';
import { ArrowRightRegular } from '@fluentui/react-icons';
import type { ImpactDataData } from '../../store/scenariosSlice';
import { DataGridTable } from '../DataGridTable';
import styles from './ImpactDataSection.module.scss';

interface ImpactDataSectionProps {
  data: ImpactDataData;
}

export const ImpactDataSection: React.FC<ImpactDataSectionProps> = ({
  data,
}) => {
  return (
    <div className={styles.section}>
      <span className={styles.sectionHeading}>Impact Data</span>
      {data.rows.length === 0 ? (
        <div className={styles.emptyState}>No impact data available</div>
      ) : (
        <DataGridTable columns={data.columns} rows={data.rows} />
      )}
      {data.compareCta && (
        <div className={styles.ctaContainer}>
          <Link
            href={data.compareCta.url}
            target="_blank"
            rel="noopener noreferrer"
            appearance="subtle"
          >
            {data.compareCta.label}
            <ArrowRightRegular />
          </Link>
        </div>
      )}
    </div>
  );
};

export default ImpactDataSection;
