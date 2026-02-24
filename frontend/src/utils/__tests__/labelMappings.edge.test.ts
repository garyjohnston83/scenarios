import { getWorkflowStateLabel, getImpactLabel } from '../labelMappings';

describe('labelMappings fallback behavior', () => {
  it('returns raw value for an unknown workflow state', () => {
    expect(getWorkflowStateLabel('SOME_FUTURE_STATE')).toBe('SOME_FUTURE_STATE');
  });

  it('returns raw value for an unknown impact value', () => {
    expect(getImpactLabel('CRITICAL')).toBe('CRITICAL');
  });
});
