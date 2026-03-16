import { Card } from '@fluentui/react-components';
import type { ScenarioTypeAdminDetailDto } from '../../services/scenarioTypeAdminApi';
import styles from './ReadOnlySummaryTab.module.scss';

interface ReadOnlySummaryTabProps {
  tabId: string;
  detail: ScenarioTypeAdminDetailDto;
}

const renderBadge = () => {
  return (
    <div className={styles.badgeContainer}>
      <span className={`${styles.badge} ${styles.badgeDeployment}`}>
        Deployment Managed
      </span>
    </div>
  );
};

const renderImpactReports = (detail: ScenarioTypeAdminDetailDto) => {
  const count = detail.activeReportDefinitionCount;
  const label =
    count === 1
      ? '1 active report definition'
      : `${count} active report definitions`;

  return (
    <Card className={styles.card}>
      <div className={styles.cardContent}>
        <div className={styles.cardBody}>
          <div className={styles.fieldsGrid}>
            <div className={styles.fieldItem}>
              <span className={styles.fieldValue}>{label}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const renderTabContent = (tabId: string, detail: ScenarioTypeAdminDetailDto) => {
  switch (tabId) {
    case 'impact-reports':
      return renderImpactReports(detail);
    default:
      return null;
  }
};

export const ReadOnlySummaryTab: React.FC<ReadOnlySummaryTabProps> = ({
  tabId,
  detail,
}) => {
  return (
    <div className={styles.summaryContainer} data-testid={`summary-tab-${tabId}`}>
      {renderBadge()}
      {renderTabContent(tabId, detail)}
    </div>
  );
};

export default ReadOnlySummaryTab;
