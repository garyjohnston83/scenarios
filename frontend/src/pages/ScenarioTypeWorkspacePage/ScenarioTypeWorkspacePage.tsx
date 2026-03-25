import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  TabList,
  Tab,
  SelectTabData,
  SelectTabEvent,
} from '@fluentui/react-components';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchScenarioTypeDetailRequest } from '../../store/scenarioTypeAdminSlice';
import { GeneralTabContent } from './GeneralTabContent';
import { DataTemplatesTabContent } from './DataTemplatesTabContent';
import { NavigationViewModeTabContent } from './NavigationViewModeTabContent';
import { ImpactExecutionTabContent } from './ImpactExecutionTabContent';
import { ImpactReportDefinitionsTab } from './ImpactReportDefinitionsTab';
import { ChangeViewDefinitionsTab } from './ChangeViewDefinitionsTab';
import { SignoffPolicyDefinitionsTab } from './SignoffPolicyDefinitionsTab';
import styles from './ScenarioTypeWorkspacePage.module.scss';

interface TabDefinition {
  id: string;
  label: string;
  classification?: 'runtime' | 'deployment';
}

const TAB_DEFINITIONS: TabDefinition[] = [
  { id: 'general', label: 'General' },
  { id: 'data-templates', label: 'Data Templates', classification: 'runtime' },
  { id: 'navigation-view-mode', label: 'Navigation & View Mode', classification: 'deployment' },
  { id: 'impact-execution', label: 'Impact Execution', classification: 'deployment' },
  { id: 'impact-reports', label: 'Impact Reports', classification: 'deployment' },
  { id: 'change-view', label: 'Change View', classification: 'deployment' },
  { id: 'signoff-rules', label: 'Sign-off Rules', classification: 'deployment' },
];

export const ScenarioTypeWorkspacePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const dispatch = useAppDispatch();

  const selectedDetail = useAppSelector((state) => state.scenarioTypeAdmin.selectedDetail);
  const loading = useAppSelector((state) => state.scenarioTypeAdmin.loading);
  const saving = useAppSelector((state) => state.scenarioTypeAdmin.saving);
  const error = useAppSelector((state) => state.scenarioTypeAdmin.error);

  const [selectedTab, setSelectedTab] = useState<string>('general');

  useEffect(() => {
    if (code) {
      dispatch(fetchScenarioTypeDetailRequest(code));
    }
  }, [code, dispatch]);

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    const value = data.value as string;
    setSelectedTab(value);
  };

  const renderClassificationBadge = (classification?: 'runtime' | 'deployment') => {
    if (!classification) {
      return null;
    }
    if (classification === 'runtime') {
      return (
        <span className={`${styles.badge} ${styles.badgeRuntime}`}>
          Runtime Editable
        </span>
      );
    }
    return (
      <span className={`${styles.badge} ${styles.badgeDeployment}`}>
        Deployment Managed
      </span>
    );
  };

  const renderTabContent = () => {
    if (!selectedDetail) {
      return null;
    }

    switch (selectedTab) {
      case 'general':
        return (
          <GeneralTabContent
            detail={selectedDetail}
            saving={saving}
          />
        );
      case 'data-templates':
        return (
          <DataTemplatesTabContent scenarioTypeCode={selectedDetail.code} />
        );
      case 'navigation-view-mode':
        return (
          <NavigationViewModeTabContent
            detail={selectedDetail}
            saving={saving}
          />
        );
      case 'impact-execution':
        return (
          <ImpactExecutionTabContent scenarioTypeCode={selectedDetail.code} />
        );
      case 'impact-reports':
        return (
          <ImpactReportDefinitionsTab scenarioTypeCode={selectedDetail.code} />
        );
      case 'change-view':
        return (
          <ChangeViewDefinitionsTab
            scenarioTypeCode={selectedDetail.code}
            directChangesMode={selectedDetail.directChangesMode}
            directChangesInternalRenderMode={selectedDetail.directChangesInternalRenderMode}
          />
        );
      case 'signoff-rules':
        return (
          <SignoffPolicyDefinitionsTab scenarioTypeCode={selectedDetail.code} />
        );
      default:
        return null;
    }
  };

  // Loading state
  if (loading && !selectedDetail) {
    return (
      <div className={styles.pageContainer} data-testid="scenario-type-workspace-page">
        <span className={styles.loadingText}>Loading...</span>
      </div>
    );
  }

  // Not found / error state
  if (error && (error.includes('404') || error.toLowerCase().includes('not found'))) {
    return (
      <div className={styles.pageContainer} data-testid="scenario-type-workspace-page">
        <div className={styles.notFoundMessage}>
          Scenario type not found
        </div>
      </div>
    );
  }

  if (!selectedDetail && !loading) {
    return (
      <div className={styles.pageContainer} data-testid="scenario-type-workspace-page">
        <div className={styles.notFoundMessage}>
          Scenario type not found
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer} data-testid="scenario-type-workspace-page">
      {error && <span className={styles.errorText}>{error}</span>}

      <div className={styles.pageHeader}>
        <span className={styles.pageName}>{selectedDetail?.name}</span>
        <span className={styles.pageCode}>Code: {selectedDetail?.code}</span>
        <span className={styles.pageIcon}>Icon: {selectedDetail?.icon}</span>
      </div>

      <div className={styles.tabsContainer}>
        <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
          {TAB_DEFINITIONS.map((tab) => (
            <Tab key={tab.id} value={tab.id}>
              {tab.label}
              {renderClassificationBadge(tab.classification)}
            </Tab>
          ))}
        </TabList>
      </div>

      <div className={styles.tabContent}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ScenarioTypeWorkspacePage;
