import { Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import { useAppSelector } from '../../store/hooks';
import { DataGridTable } from '../DataGridTable';
import styles from './DirectChangesAnalysisView.module.scss';

const useFluentStyles = makeStyles({
  errorText: {
    color: tokens.colorPaletteRedForeground1,
  },
  emptyText: {
    color: tokens.colorNeutralForeground3,
  },
});

export const DirectChangesAnalysisView: React.FC = () => {
  const fluentStyles = useFluentStyles();

  const directChanges = useAppSelector(
    (state) => state.analysis.directChanges
  );
  const directChangesLoading = useAppSelector(
    (state) => state.analysis.directChangesLoading
  );
  const directChangesError = useAppSelector(
    (state) => state.analysis.directChangesError
  );

  if (directChangesLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.centered}>
          <Spinner size="medium" label="Loading direct changes..." />
        </div>
      </div>
    );
  }

  if (directChangesError) {
    return (
      <div className={styles.container}>
        <div className={styles.centered}>
          <Text className={fluentStyles.errorText} size={400}>
            {directChangesError}
          </Text>
        </div>
      </div>
    );
  }

  if (!directChanges || directChanges.rows.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.centered}>
          <Text className={fluentStyles.emptyText} size={400}>
            No direct changes data available
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gridWrapper}>
        <DataGridTable
          columns={directChanges.columns}
          rows={directChanges.rows}
        />
      </div>
    </div>
  );
};

export default DirectChangesAnalysisView;
