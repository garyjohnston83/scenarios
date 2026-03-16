import {
  Button,
  Select,
  SpinButton,
} from '@fluentui/react-components';
import type { SpinButtonChangeEvent, SpinButtonOnChangeData } from '@fluentui/react-components';
import { Delete24Regular, Add24Regular } from '@fluentui/react-icons';
import type { RoleCatalogEntry } from '../../services/signoffPolicyDefinitionAdminApi';
import styles from './EffectEditor.module.scss';

export interface ApproverEntry {
  type: string;
  roleKey: string;
}

export interface EffectState {
  requiredApproverCount: number;
  approvalMode: string;
  approvers: ApproverEntry[];
}

interface EffectEditorProps {
  effect: EffectState;
  onChange: (updatedEffect: EffectState) => void;
  roles: RoleCatalogEntry[];
}

export const EffectEditor: React.FC<EffectEditorProps> = ({
  effect,
  onChange,
  roles,
}) => {
  const approvers = effect.approvers || [];

  const handleApproverCountChange = (
    _e: SpinButtonChangeEvent,
    data: SpinButtonOnChangeData
  ) => {
    const newCount = data.value ?? 1;
    onChange({ ...effect, requiredApproverCount: Math.max(1, newCount) });
  };

  const handleApprovalModeChange = (newMode: string) => {
    onChange({ ...effect, approvalMode: newMode });
  };

  const handleAddApprover = () => {
    const newApprover: ApproverEntry = {
      type: 'FIXED_ROLE',
      roleKey: '',
    };
    onChange({
      ...effect,
      approvers: [...approvers, newApprover],
    });
  };

  const handleUpdateApproverType = (idx: number, newType: string) => {
    const updated = [...approvers];
    updated[idx] = { ...updated[idx], type: newType };
    onChange({ ...effect, approvers: updated });
  };

  const handleUpdateApproverRole = (idx: number, newRoleKey: string) => {
    const updated = [...approvers];
    updated[idx] = { ...updated[idx], roleKey: newRoleKey };
    onChange({ ...effect, approvers: updated });
  };

  const handleRemoveApprover = (idx: number) => {
    const updated = [...approvers];
    updated.splice(idx, 1);
    onChange({ ...effect, approvers: updated });
  };

  // Build summary text
  const roleLabels = approvers
    .filter((a) => a.roleKey)
    .map((a) => {
      const found = roles.find((r) => r.key === a.roleKey);
      return found ? found.label : a.roleKey;
    });
  const summaryText =
    approvers.length > 0 && roleLabels.length > 0
      ? `Requires ${effect.requiredApproverCount} approval(s) (${effect.approvalMode}) from ${roleLabels.join(', ')}`
      : `Requires ${effect.requiredApproverCount} approval(s) (${effect.approvalMode})`;

  return (
    <div className={styles.container} data-testid="effect-editor">
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Approval Requirements</span>
      </div>

      {/* Top fields row */}
      <div className={styles.topFields}>
        <div className={styles.fieldGroup}>
          <label htmlFor="effect-approver-count" className={styles.fieldLabel}>Required Approvals</label>
          <SpinButton
            id="effect-approver-count"
            value={effect.requiredApproverCount}
            min={1}
            onChange={handleApproverCountChange}
            data-testid="effect-approver-count"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="effect-approval-mode" className={styles.fieldLabel}>Approval Mode</label>
          <Select
            id="effect-approval-mode"
            value={effect.approvalMode || 'UNORDERED'}
            onChange={(_e, data) => handleApprovalModeChange(data.value)}
            data-testid="effect-approval-mode"
          >
            <option value="UNORDERED">UNORDERED</option>
            <option value="SEQUENTIAL">SEQUENTIAL</option>
          </Select>
        </div>
      </div>

      {/* Approvers list */}
      <div className={styles.approversSection}>
        <div className={styles.approversHeader}>
          <span className={styles.approversTitle}>
            Approvers ({approvers.length})
          </span>
          <Button
            appearance="subtle"
            size="small"
            icon={<Add24Regular />}
            onClick={handleAddApprover}
            data-testid="add-approver-button"
          >
            Add Approver
          </Button>
        </div>

        {approvers.length === 0 ? (
          <div className={styles.emptyApprovers} data-testid="empty-approvers">
            No approvers defined. Click &quot;Add Approver&quot; to add one.
          </div>
        ) : (
          approvers.map((approver, idx) => (
            <div
              key={idx}
              className={styles.approverRow}
              data-testid={`approver-row-${idx}`}
            >
              <div className={styles.approverField}>
                <label htmlFor={`approver-type-${idx}`} className={styles.approverFieldLabel}>Type</label>
                <Select
                  id={`approver-type-${idx}`}
                  value={approver.type || 'FIXED_ROLE'}
                  onChange={(_e, data) =>
                    handleUpdateApproverType(idx, data.value)
                  }
                  data-testid={`approver-type-${idx}`}
                >
                  <option value="FIXED_ROLE">FIXED_ROLE</option>
                  <option value="DYNAMIC_ROLE">DYNAMIC_ROLE</option>
                </Select>
              </div>

              <div className={styles.approverField}>
                <label htmlFor={`approver-role-${idx}`} className={styles.approverFieldLabel}>Role</label>
                <Select
                  id={`approver-role-${idx}`}
                  value={approver.roleKey || ''}
                  onChange={(_e, data) =>
                    handleUpdateApproverRole(idx, data.value)
                  }
                  data-testid={`approver-role-${idx}`}
                >
                  <option value="">-- Select Role --</option>
                  {roles.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label}
                    </option>
                  ))}
                </Select>
              </div>

              <Button
                appearance="subtle"
                size="small"
                icon={<Delete24Regular />}
                onClick={() => handleRemoveApprover(idx)}
                title="Remove approver"
                data-testid={`remove-approver-${idx}`}
              />
            </div>
          ))
        )}
      </div>

      {/* Summary text */}
      <div className={styles.summaryBar} data-testid="effect-summary">
        {summaryText}
      </div>
    </div>
  );
};

export default EffectEditor;
