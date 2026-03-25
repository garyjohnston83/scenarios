import { Spinner, Text, makeStyles, tokens, Accordion } from '@fluentui/react-components';
import { useAppSelector } from '../../store/hooks';
import {
  selectDirectChangesDeltaData,
  selectDirectChangesDeltaLoading,
  selectDirectChangesDeltaError,
} from '../../store/analysisSlice';
import { DirectChangesSectionAccordion } from '../DirectChangesSectionAccordion';
import styles from './DirectChangesDeltaView.module.scss';

const useFluentStyles = makeStyles({
  errorText: {
    color: tokens.colorPaletteRedForeground1,
  },
  emptyText: {
    color: tokens.colorNeutralForeground3,
  },
});

export const DirectChangesDeltaView: React.FC = () => {
  const fluentStyles = useFluentStyles();

  const deltaData = useAppSelector(selectDirectChangesDeltaData);
  const deltaLoading = useAppSelector(selectDirectChangesDeltaLoading);
  const deltaError = useAppSelector(selectDirectChangesDeltaError);

  if (deltaLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.centered}>
          <Spinner size="medium" label="Loading direct changes..." />
        </div>
      </div>
    );
  }

  if (deltaError) {
    return (
      <div className={styles.container}>
        <div className={styles.centered}>
          <Text className={fluentStyles.errorText} size={400}>
            {deltaError}
          </Text>
        </div>
      </div>
    );
  }

  if (!deltaData || deltaData.dataChanged.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.centered}>
          <Text className={fluentStyles.emptyText} size={400}>
            No direct changes to display
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.accordionWrapper}>
        <Accordion multiple collapsible>
          {deltaData.dataChanged.map((section) => (
            <DirectChangesSectionAccordion
              key={section.dataType}
              section={section}
              value={section.dataType}
            />
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default DirectChangesDeltaView;
