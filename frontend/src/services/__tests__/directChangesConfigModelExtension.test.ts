import type {
  ScenarioTypeAdminDetailDto,
  UpdateNavigationViewModeRequest,
} from '../scenarioTypeAdminApi';
import type {
  ChangeViewDefinitionListItem,
  ChangeViewDefinitionDetail,
} from '../changeViewDefinitionAdminApi';

describe('Direct Changes Config Model Extension -- TypeScript Interface Tests', () => {

  it('ScenarioTypeAdminDetailDto includes directChangesInternalRenderMode field', () => {
    const dto: ScenarioTypeAdminDetailDto = {
      code: 'FRTB_SA',
      name: 'FRTB SA',
      icon: 'ChartMultiple',
      directChangesMode: 'INTERNAL',
      impactDataMode: 'INTERNAL',
      directChangesExternalUrlTemplate: null,
      impactExternalUrlTemplate: null,
      directChangesInternalRenderMode: 'FULL_DATA_CHANGES',
      isEnabled: true,
      sortOrder: 1,
      activeReportDefinitionCount: 2,
      activeSignoffPolicyCount: 1,
      activeChangeViewDefinitionCount: 1,
      activeSignoffPolicyDefinitionCount: 1,
    };

    expect(dto.directChangesInternalRenderMode).toBe('FULL_DATA_CHANGES');
  });

  it('UpdateNavigationViewModeRequest includes directChangesInternalRenderMode field', () => {
    const request: UpdateNavigationViewModeRequest = {
      directChangesMode: 'INTERNAL',
      impactDataMode: 'INTERNAL',
      directChangesExternalUrlTemplate: null,
      impactExternalUrlTemplate: null,
      directChangesInternalRenderMode: 'DELTA_BY_UNIQUE_ID',
    };

    expect(request.directChangesInternalRenderMode).toBe('DELTA_BY_UNIQUE_ID');

    // Also verify null is accepted
    const requestWithNull: UpdateNavigationViewModeRequest = {
      directChangesMode: 'EXTERNAL',
      impactDataMode: 'EXTERNAL',
      directChangesExternalUrlTemplate: 'https://example.com',
      impactExternalUrlTemplate: null,
      directChangesInternalRenderMode: null,
    };

    expect(requestWithNull.directChangesInternalRenderMode).toBeNull();
  });

  it('ChangeViewDefinitionListItem and ChangeViewDefinitionDetail include renderMode field', () => {
    const listItem: ChangeViewDefinitionListItem = {
      id: 'def-1',
      scenarioTypeCode: 'FRTB_SA',
      templateKey: 'direct_changes_summary',
      displayName: 'Direct Changes Summary',
      renderMode: 'DELTA_BY_UNIQUE_ID',
      version: 1,
      isActive: true,
      createdAt: '2026-03-24T10:00:00Z',
      updatedAt: '2026-03-24T10:00:00Z',
    };

    expect(listItem.renderMode).toBe('DELTA_BY_UNIQUE_ID');

    // Detail extends ListItem, so renderMode is inherited
    const detail: ChangeViewDefinitionDetail = {
      id: 'def-2',
      scenarioTypeCode: 'FRTB_SA',
      templateKey: 'full_changes_view',
      displayName: 'Full Changes View',
      renderMode: null,
      version: 2,
      isActive: false,
      createdAt: '2026-03-24T10:00:00Z',
      updatedAt: '2026-03-24T10:00:00Z',
      definition: '{}',
      schemaVersion: '1.0',
    };

    expect(detail.renderMode).toBeNull();
  });
});
