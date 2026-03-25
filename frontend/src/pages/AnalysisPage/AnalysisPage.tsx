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
  selectReportSummaries,
  selectReportSummariesError,
  selectReportDetails,
  selectActiveTab,
  setActiveTab,
  fetchReportDetailRequest,
} from '../../store/analysisSlice';
import { setLhsCollapsed } from '../../store/scenariosSlice';
import { resolveInitialTab } from '../../utils/normalizeTab';
import type { TabDefinition } from '../../components/AnalysisTabs/AnalysisTabs';
import { normalizeMode } from '../../utils/normalizeMode';
import { AnalysisHeader } from '../../components/AnalysisHeader';
import { AnalysisTabs } from '../../components/AnalysisTabs';
import { DirectChangesAnalysisView } from '../../components/DirectChangesAnalysisView';
import { DirectChangesDeltaView } from '../../components/DirectChangesDeltaView';
import { ExternalRedirectView } from '../../components/ExternalRedirectView';
import { ReportRenderer } from '../../components/ReportRenderer';
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
  failedHeading: {
    color: tokens.colorPaletteRedForeground1,
    fontWeight: tokens.fontWeightSemibold as unknown as string,
  },
  failedNote: {
    color: tokens.colorNeutralForeground3,
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
  const reportSummaries = useAppSelector(selectReportSummaries);
  const reportSummariesError = useAppSelector(selectReportSummariesError);
  const reportDetails = useAppSelector(selectReportDetails);
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

    // Skip tab resolution when ExternalRedirectView will render instead
    const tabParam = searchParams.get('initial-tab');
    const dcModeVal = scenarioType?.directChangesMode
      ? normalizeMode(scenarioType.directChangesMode)
      : null;
    const impactModeVal = scenarioType?.impactDataMode
      ? normalizeMode(scenarioType.impactDataMode)
      : null;
    if (tabParam === 'impact-reports' && impactModeVal === 'EXTERNAL') {
      return;
    }
    if (dcModeVal === 'EXTERNAL' && tabParam !== 'impact-reports') {
      return;
    }

    const directChangesAvailable =
      !!scenarioType?.directChangesMode &&
      normalizeMode(scenarioType.directChangesMode) === 'INTERNAL';

    const resolved = resolveInitialTab(
      searchParams.get('initial-tab'),
      directChangesAvailable,
      reportSummaries ?? []
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
    reportSummaries,
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

  // EXTERNAL detection: redirect to external system only when the requested
  // tab's mode is EXTERNAL. This allows mixed-mode scenarios (e.g. MARKET_DATA
  // with directChangesMode=EXTERNAL but impactDataMode=INTERNAL).
  const initialTabParam = searchParams.get('initial-tab');
  const dcMode = scenarioType?.directChangesMode
    ? normalizeMode(scenarioType.directChangesMode)
    : null;
  const impactMode = scenarioType?.impactDataMode
    ? normalizeMode(scenarioType.impactDataMode)
    : null;

  if (
    initialTabParam === 'impact-reports' &&
    impactMode === 'EXTERNAL'
  ) {
    const impactCtaUrl = summaryCards?.impactSummary?.cta?.url ?? null;
    return <ExternalRedirectView url={impactCtaUrl} scenarioId={id} />;
  }

  if (
    dcMode === 'EXTERNAL' &&
    initialTabParam !== 'impact-reports'
  ) {
    const externalUrl = summaryCards?.changesSummary?.cta?.url ?? null;
    return <ExternalRedirectView url={externalUrl} scenarioId={id} />;
  }

  // Build dynamic tab list
  const directChangesMode = scenarioType?.directChangesMode
    ? normalizeMode(scenarioType.directChangesMode)
    : null;

  const tabs: TabDefinition[] = [];

  if (directChangesMode === 'INTERNAL') {
    tabs.push({ id: 'direct-changes', label: 'Direct Changes' });
  }

  if (reportSummaries && reportSummaries.length > 0) {
    for (const summary of reportSummaries) {
      tabs.push({
        id: `report-${summary.id}`,
        label: summary.reportName,
      });
    }
  }

  // Determine current tab content
  const renderTabContent = () => {
    if (!activeTab) {
      return null;
    }

    // Report summaries error state -- only show when viewing a report tab
    if (reportSummariesError && activeTab.startsWith('report-')) {
      return (
        <div className={fluentStyles.errorBanner}>
          <Text className={fluentStyles.errorText} size={400}>
            {reportSummariesError}
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
      if (scenarioType?.directChangesInternalRenderMode === 'DELTA_BY_UNIQUE_ID') {
        return <DirectChangesDeltaView />;
      }
      return <DirectChangesAnalysisView />;
    }

    if (activeTab.startsWith('report-')) {
      const reportId = activeTab.replace('report-', '');
      const detailState = reportDetails[reportId];
      const matchingSummary = reportSummaries?.find(
        (s) => s.id === reportId
      );

      // Detail not yet fetched -- eager loading in the saga handles the
      // initial fetch, show spinner in the meantime
      if (!detailState) {
        return (
          <div className={styles.centered}>
            <Spinner size="medium" label="Loading report..." />
          </div>
        );
      }

      // Loading state
      if (detailState.loading) {
        return (
          <div className={styles.centered}>
            <Spinner size="medium" label="Loading report..." />
          </div>
        );
      }

      // Network/API error state with retry
      if (detailState.error) {
        return (
          <div className={fluentStyles.errorBanner}>
            <Text className={fluentStyles.errorText} size={400}>
              {detailState.error}
            </Text>
            <Button
              appearance="outline"
              onClick={() =>
                dispatch(fetchReportDetailRequest({ scenarioId: id, reportId }))
              }
            >
              Retry
            </Button>
          </div>
        );
      }

      // FAILED report state -- check summary status
      if (matchingSummary?.status === 'FAILED') {
        return (
          <div className={fluentStyles.errorBanner}>
            <Text size={500} className={fluentStyles.failedHeading}>
              Report Generation Failed
            </Text>
            {detailState.errorMessage && (
              <Text size={400}>
                {detailState.errorMessage}
              </Text>
            )}
            <Text size={300} className={fluentStyles.failedNote}>
              This report could not be generated
            </Text>
          </div>
        );
      }

      // Null renderedReport on non-FAILED report
      if (!detailState.data) {
        return (
          <div className={styles.centered}>
            <Text className={fluentStyles.emptyText} size={400}>
              Report data unavailable
            </Text>
          </div>
        );
      }

      // Render the report
      return <ReportRenderer renderedReport={detailState.data} />;
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
