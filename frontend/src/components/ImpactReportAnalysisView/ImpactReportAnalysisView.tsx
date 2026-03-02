import { Text, makeStyles, tokens } from '@fluentui/react-components';
import type { ImpactReportData } from '../../store/scenariosSlice';
import { DataGridTable } from '../DataGridTable';
import styles from './ImpactReportAnalysisView.module.scss';

const useFluentStyles = makeStyles({
  emptyText: {
    color: tokens.colorNeutralForeground3,
  },
});

interface ImpactReportAnalysisViewProps {
  report: ImpactReportData;
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const ImpactReportAnalysisView: React.FC<ImpactReportAnalysisViewProps> = ({
  report,
}) => {
  const fluentStyles = useFluentStyles();

  if (report.dataset.rows.length === 0) {
    return (
      <div className={styles.reportContainer}>
        <div className={styles.metadataStrip}>
          <Text className={styles.reportName} size={400} weight="semibold">
            {report.name}
          </Text>
          <Text className={styles.reportDate} size={300}>
            {formatDate(report.createdAt)}
          </Text>
        </div>
        <div className={styles.emptyState}>
          <Text className={fluentStyles.emptyText} size={400}>
            No impact data available for this report.
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reportContainer}>
      <div className={styles.metadataStrip}>
        <Text className={styles.reportName} size={400} weight="semibold">
          {report.name}
        </Text>
        <Text className={styles.reportDate} size={300}>
          {formatDate(report.createdAt)}
        </Text>
      </div>
      <div className={styles.tableContainer}>
        <DataGridTable
          columns={report.dataset.columns}
          rows={report.dataset.rows}
        />
      </div>
    </div>
  );
};

export default ImpactReportAnalysisView;
