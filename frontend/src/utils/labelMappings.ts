export const workflowStateLabels: Record<string, string> = {
  DRAFT: 'Draft',
  IMPACT_PENDING: 'Impact Pending',
  IMPACT_AVAILABLE: 'Impact Available',
  IMPACT_EXPIRED: 'Impact Expired',
  SIGNOFF_IN_PROGRESS: 'Sign-off In Progress',
  SIGNED_OFF: 'Signed-off',
  PROMOTED: 'Promoted',
  REJECTED: 'Rejected',
};

export const impactLabels: Record<string, string> = {
  NONE: 'None',
  MINIMAL: 'Minimal',
  MODERATE: 'Moderate',
  SIGNIFICANT: 'Significant',
};

export const runStatusLabels: Record<string, string> = {
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  RUNNING: 'Running',
};

export const eventTypeLabels: Record<string, string> = {
  SIGNOFF_STARTED: 'Sign-off started',
  SIGNOFF_APPROVAL_RECORDED: 'Approval recorded',
  SIGNOFF_COMPLETED: 'Sign-off completed',
  SCENARIO_RECALLED: 'Scenario recalled',
  SCENARIO_REJECTED: 'Scenario rejected',
  IMPACT_DATA_REFRESHED: 'Impact data refreshed',
  IMPACT_INVALIDATED: 'Impact invalidated',
  PROMOTION_COMPLETED: 'Promotion completed',
};

export function getWorkflowStateLabel(value: string): string {
  return workflowStateLabels[value] ?? value;
}

export function getImpactLabel(value: string): string {
  return impactLabels[value] ?? value;
}

export function getRunStatusLabel(value: string): string {
  return runStatusLabels[value] ?? value;
}

export function getEventTypeLabel(eventType: string): string {
  return eventTypeLabels[eventType] ?? eventType;
}
