import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Spinner,
  Text,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  fetchAnalysisDataRequest,
  clearAnalysisState,
  selectAnalysisHeader,
  selectAnalysisLoading,
  selectImpactReports,
  selectImpactReportsError,
  selectActiveTab,
  setActiveTab,
} from '../../store/analysisSlice';
import { setLhsCollapsed } from '../../store/scenariosSlice';
import { resolveInitialTab } from '../../utils/normalizeTab';
import type { TabDefinition } from '../../components/AnalysisTabs/AnalysisTabs';
import { normalizeMode } from '../../utils/normalizeMode';
import { AnalysisHeader } from '../../components/AnalysisHeader';
import { AnalysisTabs } from '../../components/AnalysisTabs';
import { DirectChangesAnalysisView } from '../../components/DirectChangesAnalysisView';
import { ImpactReportAnalysisView } from '../../components/ImpactReportAnalysisView';
import { ExternalRedirectView } from '../../components/ExternalRedirectView';
import styles from './AnalysisPage.module.scss';

const useFluentStyles = makeStyles({
  errorText: {
    color: tokens.colorPaletteRedForeground1,
  },
  emptyText: {
    color: tokens.colorNeutralForeground3,
  },
  errorBanner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '24px',
  },
});

export const AnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const fluentStyles = useFluentStyles();

  const { scenarioName, workflowState, scenarioType, summaryCards } =
    useAppSelector(selectAnalysisHeader);
  const isLoading = useAppSelector(selectAnalysisLoading);
  const headerLoading = useAppSelector((state) => state.analysis.headerLoading);
  const headerError = useAppSelector((state) => state.analysis.headerError);
  const impactReports = useAppSelector(selectImpactReports);
  const impactReportsError = useAppSelector(selectImpactReportsError);
  const activeTab = useAppSelector(selectActiveTab);

  // Dispatch data fetch and collapse LHS on mount; clear state on unmount
  useEffect(() => {
    if (id) {
      dispatch(fetchAnalysisDataRequest(id));
      dispatch(setLhsCollapsed(true));
    }

    return () => {
      dispatch(clearAnalysisState());
    };
  }, [id, dispatch]);

  // Resolve initial tab after data has loaded
  useEffect(() => {
    if (!id || headerLoading || headerError || activeTab !== null) {
      return;
    }

    // Skip tab resolution when EXTERNAL modes will render ExternalRedirectView
    const dcMode = scenarioType?.directChangesMode
      ? normalizeMode(scenarioType.directChangesMode)
      : null;
    if (dcMode === 'EXTERNAL') {
      return;
    }
    const impactMode = scenarioType?.impactDataMode
      ? normalizeMode(scenarioType.impactDataMode)
      : null;
    if (
      searchParams.get('initial-tab') === 'impact-reports' &&
      impactMode === 'EXTERNAL'
    ) {
      return;
    }

    const directChangesAvailable =
      !!scenarioType?.directChangesMode &&
      normalizeMode(scenarioType.directChangesMode) === 'INTERNAL';

    const resolved = resolveInitialTab(
      searchParams.get('initial-tab'),
      directChangesAvailable,
      impactReports ?? []
    );

    if (resolved !== null) {
      dispatch(setActiveTab(resolved));
    } else {
      // No tabs available -- navigate back to governance
      navigate(`/scenarios/${id}`, { replace: true });
    }
  }, [
    id,
    headerLoading,
    headerError,
    activeTab,
    scenarioType,
    impactReports,
    searchParams,
    dispatch,
    navigate,
  ]);

  const handleTabSelect = (tabId: string) => {
    dispatch(setActiveTab(tabId));
  };

  // Missing scenario ID
  if (!id) {
    return (
      <div className={styles.analysisContainer}>
        <div className={styles.centered}>
          <Text className={fluentStyles.errorText} size={400}>
            Scenario not found
          </Text>
          <Button
            appearance="outline"
            onClick={() => navigate('/scenarios')}
            style={{ marginTop: 12 }}
          >
            Back to scenarios
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (headerError) {
    return (
      <div className={styles.analysisContainer}>
        <div className={styles.centered}>
          <Text className={fluentStyles.errorText} size={400}>
            Scenario not found
          </Text>
          <Button
            appearance="outline"
            onClick={() => navigate('/scenarios')}
            style={{ marginTop: 12 }}
          >
            Back to scenarios
          </Button>
        </div>
      </div>
    );
  }

  // Loading state (only show full-page spinner when no data yet)
  if (isLoading && !scenarioName && !scenarioType) {
    return (
      <div className={styles.analysisContainer}>
        <div className={styles.centered}>
          <Spinner size="medium" label="Loading analysis..." />
        </div>
      </div>
    );
  }

  // EXTERNAL detection for direct changes: redirect to external system
  if (
    scenarioType?.directChangesMode &&
    normalizeMode(scenarioType.directChangesMode) === 'EXTERNAL'
  ) {
    const externalUrl = summaryCards?.changesSummary?.cta?.url ?? null;
    return <ExternalRedirectView url={externalUrl} scenarioId={id} />;
  }

  // EXTERNAL detection for impact reports deep-link (D6)
  // Only triggers when initial-tab is specifically 'impact-reports' and impactDataMode is EXTERNAL
  const initialTabParam = searchParams.get('initial-tab');
  if (
    initialTabParam === 'impact-reports' &&
    scenarioType?.impactDataMode &&
    normalizeMode(scenarioType.impactDataMode) === 'EXTERNAL'
  ) {
    const impactCtaUrl = summaryCards?.impactSummary?.cta?.url ?? null;
    return <ExternalRedirectView url={impactCtaUrl} scenarioId={id} />;
  }

  // Build dynamic tab list
  const directChangesMode = scenarioType?.directChangesMode
    ? normalizeMode(scenarioType.directChangesMode)
    : null;

  const tabs: TabDefinition[] = [];

  if (directChangesMode === 'INTERNAL') {
    tabs.push({ id: 'direct-changes', label: 'Direct Changes' });
  }

  if (impactReports && impactReports.length > 0) {
    for (const report of impactReports) {
      tabs.push({
        id: `impact-${report.impactRunId}`,
        label: report.name,
      });
    }
  }

  // Determine current tab content
  const renderTabContent = () => {
    if (!activeTab) {
      return null;
    }

    // Impact reports error state (D8) -- only show when viewing an impact tab
    if (impactReportsError && activeTab.startsWith('impact-')) {
      return (
        <div className={fluentStyles.errorBanner}>
          <Text className={fluentStyles.errorText} size={400}>
            {impactReportsError}
          </Text>
          <Button
            appearance="outline"
            onClick={() => dispatch(fetchAnalysisDataRequest(id))}
          >
            Retry
          </Button>
        </div>
      );
    }

    if (activeTab === 'direct-changes') {
      return <DirectChangesAnalysisView />;
    }

    if (activeTab.startsWith('impact-')) {
      const impactRunId = activeTab.replace('impact-', '');
      const matchingReport = impactReports?.find(
        (r) => r.impactRunId === impactRunId
      );

      if (matchingReport) {
        return <ImpactReportAnalysisView report={matchingReport} />;
      }

      return null;
    }

    return null;
  };

  // Normal (INTERNAL) rendering
  return (
    <div className={styles.analysisContainer}>
      <AnalysisHeader
        scenarioId={id}
        scenarioName={scenarioName}
        workflowState={workflowState}
      />

      <AnalysisTabs
        tabs={tabs}
        selectedTab={activeTab ?? ''}
        onTabSelect={handleTabSelect}
      />

      <div className={styles.tabContent}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AnalysisPage;
