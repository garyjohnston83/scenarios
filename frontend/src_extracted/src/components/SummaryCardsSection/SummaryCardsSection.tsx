import { Card, Link } from '@fluentui/react-components';
import { ArrowRightRegular } from '@fluentui/react-icons';
import { SummaryCardsData } from '../../store/scenariosSlice';
import { formatDate } from '../../utils/formatDate';
import { getImpactLabel, getRunStatusLabel } from '../../utils/labelMappings';
import styles from './SummaryCardsSection.module.scss';

const EM_DASH = '\u2014';

interface SummaryCardsSectionProps {
  data: SummaryCardsData;
}

export const SummaryCardsSection: React.FC<SummaryCardsSectionProps> = ({
  data,
}) => {
  const { changesSummary, impactSummary } = data;

  const formatNullableDate = (value: string | null): string => {
    if (value === null) return EM_DASH;
    return formatDate(value);
  };

  const formatNullableString = (
    value: string | null,
    labelFn?: (v: string) => string
  ): string => {
    if (value === null) return EM_DASH;
    return labelFn ? labelFn(value) : value;
  };

  const formatExceptionsCount = (value: number | null): string => {
    if (value === null) return EM_DASH;
    return String(value);
  };

  return (
    <div className={styles.cardsContainer}>
      <Card className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardBody}>
            <span className={styles.cardTitle}>Changes Summary</span>
            <div className={styles.fieldsGrid}>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Total Changes</span>
                <span className={styles.fieldValue}>
                  {changesSummary.changesTotal}
                </span>
              </div>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Direct</span>
                <span className={styles.fieldValue}>
                  {changesSummary.changesDirect}
                </span>
              </div>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Indirect</span>
                <span className={styles.fieldValue}>
                  {changesSummary.changesIndirect}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.ctaContainer}>
            {changesSummary.cta ? (
              <Link
                href={changesSummary.cta.url}
                target="_blank"
                rel="noopener noreferrer"
                appearance="subtle"
              >
                {changesSummary.cta.label}
                <ArrowRightRegular />
              </Link>
            ) : (
              <span>{EM_DASH}</span>
            )}
          </div>
        </div>
      </Card>

      <Card className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.cardBody}>
            <span className={styles.cardTitle}>Impact Summary</span>
            <div className={styles.fieldsGrid}>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Impact</span>
                <span className={styles.fieldValue}>
                  {getImpactLabel(impactSummary.impact)}
                </span>
              </div>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Last Run</span>
                <span className={styles.fieldValue}>
                  {formatNullableDate(impactSummary.lastRunAt)}
                </span>
              </div>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Run Status</span>
                <span className={styles.fieldValue}>
                  {formatNullableString(
                    impactSummary.latestRunStatus,
                    getRunStatusLabel
                  )}
                </span>
              </div>
              <div className={styles.fieldItem}>
                <span className={styles.fieldLabel}>Exceptions</span>
                <span className={styles.fieldValue}>
                  {formatExceptionsCount(impactSummary.exceptionsCount)}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.ctaContainer}>
            {impactSummary.cta ? (
              <Link
                href={impactSummary.cta.url}
                target="_blank"
                rel="noopener noreferrer"
                appearance="subtle"
              >
                {impactSummary.cta.label}
                <ArrowRightRegular />
              </Link>
            ) : (
              <span>{EM_DASH}</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SummaryCardsSection;
