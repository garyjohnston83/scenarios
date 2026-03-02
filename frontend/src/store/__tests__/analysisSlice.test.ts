import analysisReducer, {
  AnalysisState,
  fetchAnalysisDataRequest,
  fetchAnalysisHeaderSuccess,
  fetchAnalysisHeaderFailure,
  fetchDirectChangesSuccess,
  fetchDirectChangesFailure,
  fetchImpactReportsSuccess,
  fetchImpactReportsFailure,
  setActiveTab,
  clearAnalysisState,
  selectDirectChanges,
  selectDirectChangesLoading,
  selectDirectChangesError,
  selectAnalysisHeader,
  selectAnalysisLoading,
  selectImpactReports,
  selectImpactReportsLoading,
  selectImpactReportsError,
  selectActiveTab,
} from '../analysisSlice';
import type { DirectChangesData, ScenarioTypeData, SummaryCardsData, ImpactReportData } from '../scenariosSlice';
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
    headerLoading: false,
    headerError: null,
    impactReports: null,
    impactReportsLoading: false,
    impactReportsError: null,
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
        impactReportsError: 'previous impact error',
      };
      const state = analysisReducer(prevState, fetchAnalysisDataRequest('sc-123'));
      expect(state.headerError).toBeNull();
      expect(state.directChangesError).toBeNull();
      expect(state.impactReportsError).toBeNull();
    });

    it('resets data fields to null', () => {
      const prevState: AnalysisState = {
        ...initialState,
        scenarioName: 'Old Name',
        workflowState: 'SIGNED_OFF',
        scenarioType: { code: 'FRTB_SA', name: 'FRTB SA', icon: 'Shield', directChangesMode: 'INTERNAL', impactDataMode: 'INTERNAL' },
        summaryCards: { changesSummary: { changesTotal: 1, changesDirect: 1, changesIndirect: 0 }, impactSummary: { impact: 'LOW', lastRunAt: null, latestRunStatus: null, exceptionsCount: null } },
        directChanges: { columns: ['col1'], rows: [] },
        impactReports: [{ impactRunId: 'run-1', name: 'Run 1', createdAt: '2026-01-01', dataset: { columns: [], rows: [] }, compareCta: null }],
        activeTab: 'direct-changes',
      };
      const state = analysisReducer(prevState, fetchAnalysisDataRequest('sc-456'));
      expect(state.scenarioName).toBeNull();
      expect(state.workflowState).toBeNull();
      expect(state.scenarioType).toBeNull();
      expect(state.summaryCards).toBeNull();
      expect(state.directChanges).toBeNull();
    });

    it('resets impact reports state', () => {
      const prevState: AnalysisState = {
        ...initialState,
        impactReports: [{ impactRunId: 'run-1', name: 'Run 1', createdAt: '2026-01-01', dataset: { columns: [], rows: [] }, compareCta: null }],
        impactReportsLoading: false,
        impactReportsError: 'old error',
        activeTab: 'impact-run-1',
      };
      const state = analysisReducer(prevState, fetchAnalysisDataRequest('sc-789'));
      expect(state.impactReports).toBeNull();
      expect(state.impactReportsLoading).toBe(true);
      expect(state.impactReportsError).toBeNull();
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

  // ========== Task 7.2: Impact Reports reducers ==========

  describe('fetchImpactReportsSuccess', () => {
    it('stores impact reports from payload', () => {
      const reports: ImpactReportData[] = [
        {
          impactRunId: 'run-1',
          name: 'RUN-2026-0219-001',
          createdAt: '2026-02-19T14:00:00',
          dataset: {
            columns: ['Risk Class', 'Base Value'],
            rows: [{ rowId: 'r1', payload: { 'Risk Class': 'FX', 'Base Value': 100 } }],
          },
          compareCta: null,
        },
      ];
      const prevState: AnalysisState = { ...initialState, impactReportsLoading: true };
      const state = analysisReducer(prevState, fetchImpactReportsSuccess(reports));
      expect(state.impactReports).toEqual(reports);
    });

    it('sets impactReportsLoading to false', () => {
      const prevState: AnalysisState = { ...initialState, impactReportsLoading: true };
      const state = analysisReducer(prevState, fetchImpactReportsSuccess([]));
      expect(state.impactReportsLoading).toBe(false);
    });
  });

  describe('fetchImpactReportsFailure', () => {
    it('stores the error message', () => {
      const prevState: AnalysisState = { ...initialState, impactReportsLoading: true };
      const state = analysisReducer(prevState, fetchImpactReportsFailure('Impact fetch failed'));
      expect(state.impactReportsError).toBe('Impact fetch failed');
    });

    it('sets impactReportsLoading to false', () => {
      const prevState: AnalysisState = { ...initialState, impactReportsLoading: true };
      const state = analysisReducer(prevState, fetchImpactReportsFailure('Impact fetch failed'));
      expect(state.impactReportsLoading).toBe(false);
    });
  });

  describe('setActiveTab', () => {
    it('stores the tab value', () => {
      const state = analysisReducer(initialState, setActiveTab('direct-changes'));
      expect(state.activeTab).toBe('direct-changes');
    });

    it('stores an impact tab value', () => {
      const state = analysisReducer(initialState, setActiveTab('impact-abc-123'));
      expect(state.activeTab).toBe('impact-abc-123');
    });
  });

  describe('clearAnalysisState', () => {
    it('resets to initial state including impact reports fields', () => {
      const dirtyState: AnalysisState = {
        scenarioId: 'sc-999',
        scenarioName: 'Some Scenario',
        workflowState: 'SIGNED_OFF',
        scenarioType: { code: 'X', name: 'X', icon: 'X', directChangesMode: 'EXTERNAL', impactDataMode: 'EXTERNAL' },
        summaryCards: { changesSummary: { changesTotal: 1, changesDirect: 1, changesIndirect: 0 }, impactSummary: { impact: 'LOW', lastRunAt: null, latestRunStatus: null, exceptionsCount: null } },
        directChanges: { columns: ['a'], rows: [] },
        directChangesLoading: true,
        directChangesError: 'some error',
        headerLoading: true,
        headerError: 'header error',
        impactReports: [{ impactRunId: 'r1', name: 'Run 1', createdAt: '2026-01-01', dataset: { columns: [], rows: [] }, compareCta: null }],
        impactReportsLoading: true,
        impactReportsError: 'impact error',
        activeTab: 'impact-r1',
      };
      const state = analysisReducer(dirtyState, clearAnalysisState());
      expect(state).toEqual(initialState);
    });

    it('resets impact reports to null', () => {
      const dirtyState: AnalysisState = {
        ...initialState,
        impactReports: [{ impactRunId: 'r1', name: 'Run 1', createdAt: '2026-01-01', dataset: { columns: [], rows: [] }, compareCta: null }],
        impactReportsLoading: true,
        impactReportsError: 'error',
        activeTab: 'direct-changes',
      };
      const state = analysisReducer(dirtyState, clearAnalysisState());
      expect(state.impactReports).toBeNull();
      expect(state.impactReportsLoading).toBe(false);
      expect(state.impactReportsError).toBeNull();
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

    const mockImpactReports: ImpactReportData[] = [
      {
        impactRunId: 'run-abc',
        name: 'RUN-2026-0219-001',
        createdAt: '2026-02-19T14:00:00',
        dataset: { columns: ['Col1'], rows: [{ rowId: 'r1', payload: { Col1: 'v1' } }] },
        compareCta: null,
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
      headerLoading: false,
      headerError: null,
      impactReports: mockImpactReports,
      impactReportsLoading: false,
      impactReportsError: null,
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

    it('selectAnalysisLoading returns true when impactReportsLoading is true', () => {
      const state = { analysis: { ...populatedState, impactReportsLoading: true } } as RootState;
      expect(selectAnalysisLoading(state)).toBe(true);
    });

    it('selectAnalysisLoading returns false when all loading flags are false', () => {
      expect(selectAnalysisLoading(mockRootState)).toBe(false);
    });

    // Task 7.2: New selectors for impact reports

    it('selectImpactReports returns the impactReports data', () => {
      expect(selectImpactReports(mockRootState)).toEqual(mockImpactReports);
    });

    it('selectImpactReports returns null when not loaded', () => {
      const state = { analysis: { ...populatedState, impactReports: null } } as RootState;
      expect(selectImpactReports(state)).toBeNull();
    });

    it('selectImpactReportsLoading returns the loading flag', () => {
      expect(selectImpactReportsLoading(mockRootState)).toBe(false);

      const loadingState = { analysis: { ...populatedState, impactReportsLoading: true } } as RootState;
      expect(selectImpactReportsLoading(loadingState)).toBe(true);
    });

    it('selectImpactReportsError returns the error value', () => {
      expect(selectImpactReportsError(mockRootState)).toBeNull();

      const errorState = { analysis: { ...populatedState, impactReportsError: 'impact fail' } } as RootState;
      expect(selectImpactReportsError(errorState)).toBe('impact fail');
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
