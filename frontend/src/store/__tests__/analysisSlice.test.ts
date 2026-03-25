import analysisReducer, {
  AnalysisState,
  fetchAnalysisDataRequest,
  fetchAnalysisHeaderSuccess,
  fetchAnalysisHeaderFailure,
  fetchDirectChangesSuccess,
  fetchDirectChangesFailure,
  fetchReportSummariesSuccess,
  fetchReportSummariesFailure,
  setActiveTab,
  clearAnalysisState,
  selectDirectChanges,
  selectDirectChangesLoading,
  selectDirectChangesError,
  selectAnalysisHeader,
  selectAnalysisLoading,
  selectReportSummaries,
  selectReportSummariesLoading,
  selectReportSummariesError,
  selectActiveTab,
} from '../analysisSlice';
import type { DirectChangesData, ScenarioTypeData, SummaryCardsData } from '../scenariosSlice';
import type { ImpactReportSummaryFe } from '../../types/renderedReport';
import type { RootState } from '../store';

describe('analysisSlice', () => {
  const initialState: AnalysisState = {
    scenarioId: null,
    scenarioName: null,
    workflowState: null,
    scenarioType: null,
    summaryCards: null,
    directChanges: null,
    directChangesLoading: false,
    directChangesError: null,
    directChangesDeltaData: null,
    directChangesDeltaLoading: false,
    directChangesDeltaError: null,
    headerLoading: false,
    headerError: null,
    reportSummaries: null,
    reportSummariesLoading: false,
    reportSummariesError: null,
    reportDetails: {},
    activeTab: null,
  };

  it('has correct initial state defaults', () => {
    const state = analysisReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual(initialState);
  });

  describe('fetchAnalysisDataRequest', () => {
    it('sets scenarioId from payload', () => {
      const state = analysisReducer(initialState, fetchAnalysisDataRequest('sc-123'));
      expect(state.scenarioId).toBe('sc-123');
    });

    it('sets headerLoading and directChangesLoading to true', () => {
      const state = analysisReducer(initialState, fetchAnalysisDataRequest('sc-123'));
      expect(state.headerLoading).toBe(true);
      expect(state.directChangesLoading).toBe(true);
    });

    it('clears error states', () => {
      const prevState: AnalysisState = {
        ...initialState,
        headerError: 'previous header error',
        directChangesError: 'previous dc error',
        reportSummariesError: 'previous impact error',
      };
      const state = analysisReducer(prevState, fetchAnalysisDataRequest('sc-123'));
      expect(state.headerError).toBeNull();
      expect(state.directChangesError).toBeNull();
      expect(state.reportSummariesError).toBeNull();
    });

    it('resets data fields to null', () => {
      const prevState: AnalysisState = {
        ...initialState,
        scenarioName: 'Old Name',
        workflowState: 'SIGNED_OFF',
        scenarioType: { code: 'FRTB_SA', name: 'FRTB SA', icon: 'Shield', directChangesMode: 'INTERNAL', impactDataMode: 'INTERNAL' },
        summaryCards: { changesSummary: { changesTotal: 1, changesDirect: 1, changesIndirect: 0 }, impactSummary: { impact: 'LOW', lastRunAt: null, latestRunStatus: null, exceptionsCount: null } },
        directChanges: { columns: ['col1'], rows: [] },
        reportSummaries: [{ id: 'r1', scenarioId: 'sc-1', reportKey: 'key', reportName: 'Run 1', generatedAt: '2026-01-01', status: 'GENERATED' }],
        activeTab: 'direct-changes',
      };
      const state = analysisReducer(prevState, fetchAnalysisDataRequest('sc-456'));
      expect(state.scenarioName).toBeNull();
      expect(state.workflowState).toBeNull();
      expect(state.scenarioType).toBeNull();
      expect(state.summaryCards).toBeNull();
      expect(state.directChanges).toBeNull();
    });

    it('resets report summaries state', () => {
      const prevState: AnalysisState = {
        ...initialState,
        reportSummaries: [{ id: 'r1', scenarioId: 'sc-1', reportKey: 'key', reportName: 'Run 1', generatedAt: '2026-01-01', status: 'GENERATED' }],
        reportSummariesLoading: false,
        reportSummariesError: 'old error',
        reportDetails: { 'r1': { loading: false, data: null, error: null } },
        activeTab: 'report-r1',
      };
      const state = analysisReducer(prevState, fetchAnalysisDataRequest('sc-789'));
      expect(state.reportSummaries).toBeNull();
      expect(state.reportSummariesLoading).toBe(true);
      expect(state.reportSummariesError).toBeNull();
      expect(state.reportDetails).toEqual({});
      expect(state.activeTab).toBeNull();
    });
  });

  describe('fetchAnalysisHeaderSuccess', () => {
    it('stores header data from payload', () => {
      const scenarioType: ScenarioTypeData = {
        code: 'FRTB_SA',
        name: 'FRTB SA',
        icon: 'ShieldTask',
        directChangesMode: 'INTERNAL',
        impactDataMode: 'INTERNAL',
      };
      const summaryCards: SummaryCardsData = {
        changesSummary: { changesTotal: 10, changesDirect: 5, changesIndirect: 5 },
        impactSummary: { impact: 'HIGH', lastRunAt: '2026-01-14T12:00:00Z', latestRunStatus: 'COMPLETED', exceptionsCount: 0 },
      };
      const prevState: AnalysisState = { ...initialState, headerLoading: true };
      const state = analysisReducer(
        prevState,
        fetchAnalysisHeaderSuccess({
          name: 'Test Scenario',
          workflowState: 'IMPACT_AVAILABLE',
          scenarioType,
          summaryCards,
        })
      );
      expect(state.scenarioName).toBe('Test Scenario');
      expect(state.workflowState).toBe('IMPACT_AVAILABLE');
      expect(state.scenarioType).toEqual(scenarioType);
      expect(state.summaryCards).toEqual(summaryCards);
    });

    it('sets headerLoading to false', () => {
      const prevState: AnalysisState = { ...initialState, headerLoading: true };
      const state = analysisReducer(
        prevState,
        fetchAnalysisHeaderSuccess({
          name: 'Test',
          workflowState: 'DRAFT',
          scenarioType: null,
          summaryCards: null,
        })
      );
      expect(state.headerLoading).toBe(false);
    });
  });

  describe('fetchAnalysisHeaderFailure', () => {
    it('stores the error message', () => {
      const prevState: AnalysisState = { ...initialState, headerLoading: true };
      const state = analysisReducer(prevState, fetchAnalysisHeaderFailure('Network error'));
      expect(state.headerError).toBe('Network error');
    });

    it('sets headerLoading to false', () => {
      const prevState: AnalysisState = { ...initialState, headerLoading: true };
      const state = analysisReducer(prevState, fetchAnalysisHeaderFailure('Network error'));
      expect(state.headerLoading).toBe(false);
    });
  });

  describe('fetchDirectChangesSuccess', () => {
    it('stores direct changes data from payload', () => {
      const directChanges: DirectChangesData = {
        columns: ['col1', 'col2'],
        rows: [{ rowId: 'r1', payload: { col1: 'a', col2: 'b' } }],
      };
      const prevState: AnalysisState = { ...initialState, directChangesLoading: true };
      const state = analysisReducer(prevState, fetchDirectChangesSuccess(directChanges));
      expect(state.directChanges).toEqual(directChanges);
    });

    it('sets directChangesLoading to false', () => {
      const prevState: AnalysisState = { ...initialState, directChangesLoading: true };
      const state = analysisReducer(
        prevState,
        fetchDirectChangesSuccess({ columns: [], rows: [] })
      );
      expect(state.directChangesLoading).toBe(false);
    });
  });

  describe('fetchDirectChangesFailure', () => {
    it('stores the error message', () => {
      const prevState: AnalysisState = { ...initialState, directChangesLoading: true };
      const state = analysisReducer(prevState, fetchDirectChangesFailure('Server error'));
      expect(state.directChangesError).toBe('Server error');
    });

    it('sets directChangesLoading to false', () => {
      const prevState: AnalysisState = { ...initialState, directChangesLoading: true };
      const state = analysisReducer(prevState, fetchDirectChangesFailure('Server error'));
      expect(state.directChangesLoading).toBe(false);
    });
  });

  // ========== Report Summaries reducers ==========

  describe('fetchReportSummariesSuccess', () => {
    it('stores report summaries from payload', () => {
      const summaries: ImpactReportSummaryFe[] = [
        {
          id: 'r1',
          scenarioId: 'sc-1',
          reportKey: 'market_risk_summary',
          reportName: 'Market Risk Summary',
          generatedAt: '2026-02-19T14:00:00',
          status: 'GENERATED',
        },
      ];
      const prevState: AnalysisState = { ...initialState, reportSummariesLoading: true };
      const state = analysisReducer(prevState, fetchReportSummariesSuccess(summaries));
      expect(state.reportSummaries).toEqual(summaries);
    });

    it('sets reportSummariesLoading to false', () => {
      const prevState: AnalysisState = { ...initialState, reportSummariesLoading: true };
      const state = analysisReducer(prevState, fetchReportSummariesSuccess([]));
      expect(state.reportSummariesLoading).toBe(false);
    });
  });

  describe('fetchReportSummariesFailure', () => {
    it('stores the error message', () => {
      const prevState: AnalysisState = { ...initialState, reportSummariesLoading: true };
      const state = analysisReducer(prevState, fetchReportSummariesFailure('Impact fetch failed'));
      expect(state.reportSummariesError).toBe('Impact fetch failed');
    });

    it('sets reportSummariesLoading to false', () => {
      const prevState: AnalysisState = { ...initialState, reportSummariesLoading: true };
      const state = analysisReducer(prevState, fetchReportSummariesFailure('Impact fetch failed'));
      expect(state.reportSummariesLoading).toBe(false);
    });
  });

  describe('setActiveTab', () => {
    it('stores the tab value', () => {
      const state = analysisReducer(initialState, setActiveTab('direct-changes'));
      expect(state.activeTab).toBe('direct-changes');
    });

    it('stores a report tab value', () => {
      const state = analysisReducer(initialState, setActiveTab('report-abc-123'));
      expect(state.activeTab).toBe('report-abc-123');
    });
  });

  describe('clearAnalysisState', () => {
    it('resets to initial state including report summaries and details fields', () => {
      const dirtyState: AnalysisState = {
        scenarioId: 'sc-999',
        scenarioName: 'Some Scenario',
        workflowState: 'SIGNED_OFF',
        scenarioType: { code: 'X', name: 'X', icon: 'X', directChangesMode: 'EXTERNAL', impactDataMode: 'EXTERNAL' },
        summaryCards: { changesSummary: { changesTotal: 1, changesDirect: 1, changesIndirect: 0 }, impactSummary: { impact: 'LOW', lastRunAt: null, latestRunStatus: null, exceptionsCount: null } },
        directChanges: { columns: ['a'], rows: [] },
        directChangesLoading: true,
        directChangesError: 'some error',
        directChangesDeltaData: { dataChanged: [] },
        directChangesDeltaLoading: true,
        directChangesDeltaError: 'delta error',
        headerLoading: true,
        headerError: 'header error',
        reportSummaries: [{ id: 'r1', scenarioId: 'sc-1', reportKey: 'key', reportName: 'Run 1', generatedAt: '2026-01-01', status: 'GENERATED' }],
        reportSummariesLoading: true,
        reportSummariesError: 'impact error',
        reportDetails: { 'r1': { loading: false, data: null, error: null } },
        activeTab: 'report-r1',
      };
      const state = analysisReducer(dirtyState, clearAnalysisState());
      expect(state).toEqual(initialState);
    });

    it('resets report summaries and details to initial values', () => {
      const dirtyState: AnalysisState = {
        ...initialState,
        reportSummaries: [{ id: 'r1', scenarioId: 'sc-1', reportKey: 'key', reportName: 'Run 1', generatedAt: '2026-01-01', status: 'GENERATED' }],
        reportSummariesLoading: true,
        reportSummariesError: 'error',
        reportDetails: { 'r1': { loading: false, data: null, error: 'err' } },
        activeTab: 'direct-changes',
      };
      const state = analysisReducer(dirtyState, clearAnalysisState());
      expect(state.reportSummaries).toBeNull();
      expect(state.reportSummariesLoading).toBe(false);
      expect(state.reportSummariesError).toBeNull();
      expect(state.reportDetails).toEqual({});
      expect(state.activeTab).toBeNull();
    });
  });

  describe('selectors', () => {
    const mockDirectChanges: DirectChangesData = {
      columns: ['col1'],
      rows: [{ rowId: 'r1', payload: { col1: 'val' } }],
    };

    const mockScenarioType: ScenarioTypeData = {
      code: 'FRTB_SA',
      name: 'FRTB SA',
      icon: 'ShieldTask',
      directChangesMode: 'INTERNAL',
      impactDataMode: 'INTERNAL',
    };

    const mockSummaryCards: SummaryCardsData = {
      changesSummary: { changesTotal: 5, changesDirect: 3, changesIndirect: 2 },
      impactSummary: { impact: 'MODERATE', lastRunAt: null, latestRunStatus: null, exceptionsCount: null },
    };

    const mockReportSummaries: ImpactReportSummaryFe[] = [
      {
        id: 'run-abc',
        scenarioId: 'sc-100',
        reportKey: 'market_risk_summary',
        reportName: 'Market Risk Summary',
        generatedAt: '2026-02-19T14:00:00',
        status: 'GENERATED',
      },
    ];

    const populatedState: AnalysisState = {
      scenarioId: 'sc-100',
      scenarioName: 'Test Scenario',
      workflowState: 'IMPACT_AVAILABLE',
      scenarioType: mockScenarioType,
      summaryCards: mockSummaryCards,
      directChanges: mockDirectChanges,
      directChangesLoading: false,
      directChangesError: null,
      directChangesDeltaData: null,
      directChangesDeltaLoading: false,
      directChangesDeltaError: null,
      headerLoading: false,
      headerError: null,
      reportSummaries: mockReportSummaries,
      reportSummariesLoading: false,
      reportSummariesError: null,
      reportDetails: {},
      activeTab: 'direct-changes',
    };

    // Build a minimal mock RootState with just the analysis slice
    const mockRootState = { analysis: populatedState } as RootState;

    it('selectDirectChanges returns the directChanges data', () => {
      expect(selectDirectChanges(mockRootState)).toEqual(mockDirectChanges);
    });

    it('selectDirectChangesLoading returns the loading flag', () => {
      expect(selectDirectChangesLoading(mockRootState)).toBe(false);

      const loadingState = { analysis: { ...populatedState, directChangesLoading: true } } as RootState;
      expect(selectDirectChangesLoading(loadingState)).toBe(true);
    });

    it('selectDirectChangesError returns the error value', () => {
      expect(selectDirectChangesError(mockRootState)).toBeNull();

      const errorState = { analysis: { ...populatedState, directChangesError: 'fail' } } as RootState;
      expect(selectDirectChangesError(errorState)).toBe('fail');
    });

    it('selectAnalysisHeader returns header fields', () => {
      const header = selectAnalysisHeader(mockRootState);
      expect(header).toEqual({
        scenarioId: 'sc-100',
        scenarioName: 'Test Scenario',
        workflowState: 'IMPACT_AVAILABLE',
        scenarioType: mockScenarioType,
        summaryCards: mockSummaryCards,
      });
    });

    it('selectAnalysisLoading returns true when headerLoading is true', () => {
      const state = { analysis: { ...populatedState, headerLoading: true } } as RootState;
      expect(selectAnalysisLoading(state)).toBe(true);
    });

    it('selectAnalysisLoading returns true when directChangesLoading is true', () => {
      const state = { analysis: { ...populatedState, directChangesLoading: true } } as RootState;
      expect(selectAnalysisLoading(state)).toBe(true);
    });

    it('selectAnalysisLoading returns true when reportSummariesLoading is true', () => {
      const state = { analysis: { ...populatedState, reportSummariesLoading: true } } as RootState;
      expect(selectAnalysisLoading(state)).toBe(true);
    });

    it('selectAnalysisLoading returns false when all loading flags are false', () => {
      expect(selectAnalysisLoading(mockRootState)).toBe(false);
    });

    // Report summaries selectors

    it('selectReportSummaries returns the reportSummaries data', () => {
      expect(selectReportSummaries(mockRootState)).toEqual(mockReportSummaries);
    });

    it('selectReportSummaries returns null when not loaded', () => {
      const state = { analysis: { ...populatedState, reportSummaries: null } } as RootState;
      expect(selectReportSummaries(state)).toBeNull();
    });

    it('selectReportSummariesLoading returns the loading flag', () => {
      expect(selectReportSummariesLoading(mockRootState)).toBe(false);

      const loadingState = { analysis: { ...populatedState, reportSummariesLoading: true } } as RootState;
      expect(selectReportSummariesLoading(loadingState)).toBe(true);
    });

    it('selectReportSummariesError returns the error value', () => {
      expect(selectReportSummariesError(mockRootState)).toBeNull();

      const errorState = { analysis: { ...populatedState, reportSummariesError: 'impact fail' } } as RootState;
      expect(selectReportSummariesError(errorState)).toBe('impact fail');
    });

    it('selectActiveTab returns the activeTab value', () => {
      expect(selectActiveTab(mockRootState)).toBe('direct-changes');
    });

    it('selectActiveTab returns null when no tab is active', () => {
      const state = { analysis: { ...populatedState, activeTab: null } } as RootState;
      expect(selectActiveTab(state)).toBeNull();
    });
  });
});
