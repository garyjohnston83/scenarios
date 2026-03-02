import { getWorkflowStateLabel, getImpactLabel, getRunStatusLabel, getEventTypeLabel } from '../labelMappings';

describe('labelMappings', () => {
  it('getWorkflowStateLabel maps known enum values to friendly labels', () => {
    expect(getWorkflowStateLabel('SIGNOFF_IN_PROGRESS')).toBe('Sign-off In Progress');
    expect(getWorkflowStateLabel('DRAFT')).toBe('Draft');
    expect(getWorkflowStateLabel('IMPACT_PENDING')).toBe('Impact Pending');
    expect(getWorkflowStateLabel('IMPACT_AVAILABLE')).toBe('Impact Available');
    expect(getWorkflowStateLabel('IMPACT_EXPIRED')).toBe('Impact Expired');
    expect(getWorkflowStateLabel('SIGNED_OFF')).toBe('Signed-off');
    expect(getWorkflowStateLabel('PROMOTED')).toBe('Promoted');
    expect(getWorkflowStateLabel('REJECTED')).toBe('Rejected');
  });

  it('getImpactLabel maps known enum values to friendly labels and returns raw value for unknown enums', () => {
    expect(getImpactLabel('NONE')).toBe('None');
    expect(getImpactLabel('MINIMAL')).toBe('Minimal');
    expect(getImpactLabel('MODERATE')).toBe('Moderate');
    expect(getImpactLabel('SIGNIFICANT')).toBe('Significant');
    expect(getImpactLabel('UNKNOWN_VALUE')).toBe('UNKNOWN_VALUE');
  });

  it('getRunStatusLabel maps known run status values to friendly labels', () => {
    expect(getRunStatusLabel('SUCCEEDED')).toBe('Succeeded');
    expect(getRunStatusLabel('FAILED')).toBe('Failed');
    expect(getRunStatusLabel('RUNNING')).toBe('Running');
  });

  it('getRunStatusLabel returns raw value for unknown run status keys', () => {
    expect(getRunStatusLabel('CANCELLED')).toBe('CANCELLED');
    expect(getRunStatusLabel('PENDING')).toBe('PENDING');
  });

  // ========================================================================
  // Increment 9 gap tests: getEventTypeLabel for new system event types
  // ========================================================================

  it('getEventTypeLabel maps the 3 new system event type labels correctly', () => {
    expect(getEventTypeLabel('IMPACT_DATA_REFRESHED')).toBe('Impact data refreshed');
    expect(getEventTypeLabel('IMPACT_INVALIDATED')).toBe('Impact invalidated');
    expect(getEventTypeLabel('PROMOTION_COMPLETED')).toBe('Promotion completed');
  });

  it('getEventTypeLabel maps existing event type labels correctly', () => {
    expect(getEventTypeLabel('SIGNOFF_STARTED')).toBe('Sign-off started');
    expect(getEventTypeLabel('SIGNOFF_APPROVAL_RECORDED')).toBe('Approval recorded');
    expect(getEventTypeLabel('SIGNOFF_COMPLETED')).toBe('Sign-off completed');
    expect(getEventTypeLabel('SCENARIO_RECALLED')).toBe('Scenario recalled');
    expect(getEventTypeLabel('SCENARIO_REJECTED')).toBe('Scenario rejected');
  });

  it('getEventTypeLabel returns raw value for unknown event type keys', () => {
    expect(getEventTypeLabel('SOME_FUTURE_EVENT')).toBe('SOME_FUTURE_EVENT');
  });
});
