import { useState, useEffect } from 'react';
import { Card } from '@fluentui/react-components';
import { fetchImpactExecutionSummary } from '../../services/scenarioTypeAdminApi';
import type { ImpactExecutionSummaryDto } from '../../services/scenarioTypeAdminApi';
import styles from './ImpactExecutionTabContent.module.scss';

interface ImpactExecutionTabContentProps {
  scenarioTypeCode: string;
}

export const ImpactExecutionTabContent: React.FC<ImpactExecutionTabContentProps> = ({ scenarioTypeCode }) => {
  const [summary, setSummary] = useState<ImpactExecutionSummaryDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchImpactExecutionSummary(scenarioTypeCode);
        if (!cancelled) {
          setSummary(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to fetch impact execution summary';
          setError(message);
          setLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [scenarioTypeCode]);

  return (
    <div className={styles.summaryContainer} data-testid="impact-execution-tab-content">
      <div className={styles.badgeContainer}>
        <span className={`${styles.badge} ${styles.badgeDeployment}`}>
          Deployment Managed
        </span>
        <div className={styles.helperText}>
          Impact execution is managed via deployment configuration.
        </div>
      </div>

      {loading && (
        <span className={styles.loadingText}>Loading...</span>
      )}

      {error && (
        <span className={styles.errorText}>{error}</span>
      )}

      {!loading && !error && summary && (
        <Card className={styles.card}>
          <div className={styles.cardContent}>
            <div className={styles.cardBody}>
              <div className={styles.fieldsGrid}>
                <div className={styles.fieldItem}>
                  <span className={styles.fieldLabel}>Provider Registered</span>
                  <span className={styles.fieldValue}>{summary.providerRegistered ? 'Yes' : 'No'}</span>
                </div>
                <div className={styles.fieldItem}>
                  <span className={styles.fieldLabel}>Provider Name</span>
                  <span className={styles.fieldValue}>{summary.providerName || 'None'}</span>
                </div>
                <div className={styles.fieldItem}>
                  <span className={styles.fieldLabel}>Provider Class</span>
                  <span className={styles.fieldValue}>{summary.providerClassName || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImpactExecutionTabContent;
