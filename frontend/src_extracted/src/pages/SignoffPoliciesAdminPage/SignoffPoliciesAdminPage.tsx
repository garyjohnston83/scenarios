import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  Switch,
  Dropdown,
  Option,
  SpinButton,
} from '@fluentui/react-components';
import type { SpinButtonChangeEvent, SpinButtonOnChangeData } from '@fluentui/react-components';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  fetchPoliciesRequest,
  createPolicyRequest,
  updatePolicyRequest,
} from '../../store/adminSlice';
import type { SignoffPolicyDto } from '../../services/adminApi';
import { formatDate } from '../../utils/formatDate';
import styles from './SignoffPoliciesAdminPage.module.scss';

const SCENARIO_TYPE_OPTIONS = ['MARKET_DATA', 'RISK_FACTOR', 'FRTB_SA'];

interface PolicyFormState {
  name: string;
  scenarioTypeCode: string;
  requiredApproverCount: number;
  priority: number;
  isEnabled: boolean;
}

const emptyForm: PolicyFormState = {
  name: '',
  scenarioTypeCode: 'MARKET_DATA',
  requiredApproverCount: 2,
  priority: 1,
  isEnabled: true,
};

export const SignoffPoliciesAdminPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const policies = useAppSelector((state) => state.admin.policies);
  const loading = useAppSelector((state) => state.admin.loading);
  const saving = useAppSelector((state) => state.admin.saving);
  const error = useAppSelector((state) => state.admin.error);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SignoffPolicyDto | null>(null);
  const [formState, setFormState] = useState<PolicyFormState>(emptyForm);

  useEffect(() => {
    dispatch(fetchPoliciesRequest());
  }, [dispatch]);

  const handleOpenCreate = () => {
    setFormState(emptyForm);
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (policy: SignoffPolicyDto) => {
    setEditingPolicy(policy);
    setFormState({
      name: policy.name,
      scenarioTypeCode: policy.scenarioTypeCode,
      requiredApproverCount: policy.requiredApproverCount,
      priority: policy.priority,
      isEnabled: policy.isEnabled,
    });
    setEditDialogOpen(true);
  };

  const handleCreateSubmit = () => {
    dispatch(
      createPolicyRequest({
        name: formState.name,
        scenarioTypeCode: formState.scenarioTypeCode,
        requiredApproverCount: formState.requiredApproverCount,
        isEnabled: formState.isEnabled,
        priority: formState.priority,
      })
    );
    setCreateDialogOpen(false);
  };

  const handleEditSubmit = () => {
    if (editingPolicy) {
      dispatch(
        updatePolicyRequest({
          id: editingPolicy.id,
          body: {
            name: formState.name,
            requiredApproverCount: formState.requiredApproverCount,
            isEnabled: formState.isEnabled,
            priority: formState.priority,
          },
        })
      );
    }
    setEditDialogOpen(false);
    setEditingPolicy(null);
  };

  const handleToggleEnabled = (policy: SignoffPolicyDto) => {
    dispatch(
      updatePolicyRequest({
        id: policy.id,
        body: {
          name: policy.name,
          requiredApproverCount: policy.requiredApproverCount,
          isEnabled: !policy.isEnabled,
          priority: policy.priority,
        },
      })
    );
  };

  const renderFormFields = (isEdit: boolean) => (
    <>
      <div className={styles.dialogField}>
        <label htmlFor="policy-name" className={styles.dialogFieldLabel}>Name</label>
        <Input
          id="policy-name"
          value={formState.name}
          onChange={(_e, data) =>
            setFormState((prev) => ({ ...prev, name: data.value }))
          }
          placeholder="Policy name"
        />
      </div>
      <div className={styles.dialogField}>
        <label htmlFor="policy-scenario-type" className={styles.dialogFieldLabel}>Scenario Type</label>
        <Dropdown
          id="policy-scenario-type"
          value={formState.scenarioTypeCode}
          selectedOptions={[formState.scenarioTypeCode]}
          onOptionSelect={(_e, data) =>
            setFormState((prev) => ({
              ...prev,
              scenarioTypeCode: data.optionValue ?? prev.scenarioTypeCode,
            }))
          }
          disabled={isEdit}
        >
          {SCENARIO_TYPE_OPTIONS.map((opt) => (
            <Option key={opt} value={opt}>
              {opt}
            </Option>
          ))}
        </Dropdown>
      </div>
      <div className={styles.dialogField}>
        <label htmlFor="policy-approver-count" className={styles.dialogFieldLabel}>Required Approver Count</label>
        <SpinButton
          id="policy-approver-count"
          value={formState.requiredApproverCount}
          min={1}
          max={99}
          onChange={(_e: SpinButtonChangeEvent, data: SpinButtonOnChangeData) =>
            setFormState((prev) => ({
              ...prev,
              requiredApproverCount: data.value ?? prev.requiredApproverCount,
            }))
          }
        />
      </div>
      <div className={styles.dialogField}>
        <label htmlFor="policy-priority" className={styles.dialogFieldLabel}>Priority</label>
        <SpinButton
          id="policy-priority"
          value={formState.priority}
          min={1}
          max={99}
          onChange={(_e: SpinButtonChangeEvent, data: SpinButtonOnChangeData) =>
            setFormState((prev) => ({
              ...prev,
              priority: data.value ?? prev.priority,
            }))
          }
        />
      </div>
      <div className={styles.dialogField}>
        <label htmlFor="policy-enabled" className={styles.dialogFieldLabel}>Enabled</label>
        <Switch
          id="policy-enabled"
          checked={formState.isEnabled}
          onChange={(_e, data) =>
            setFormState((prev) => ({ ...prev, isEnabled: data.checked }))
          }
        />
      </div>
    </>
  );

  return (
    <div className={styles.pageContainer} data-testid="signoff-policies-admin-page">
      <span className={styles.pageTitle}>Signoff Policies</span>

      {error && <span className={styles.errorText}>{error}</span>}

      <div className={styles.toolbar}>
        <Button appearance="primary" onClick={handleOpenCreate}>
          Create Policy
        </Button>
      </div>

      {loading && <span className={styles.loadingText}>Loading...</span>}

      <div className={styles.tableContainer}>
        <table className={styles.table} data-testid="policies-table">
          <thead className={styles.tableHeader}>
            <tr>
              <th className={styles.tableHeaderCell}>Name</th>
              <th className={styles.tableHeaderCell}>Scenario Type</th>
              <th className={styles.tableHeaderCell}>Required Approvers</th>
              <th className={styles.tableHeaderCell}>Priority</th>
              <th className={styles.tableHeaderCell}>Enabled</th>
              <th className={styles.tableHeaderCell}>Updated At</th>
              <th className={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.id} className={styles.tableRow} data-testid={`policy-row-${policy.id}`}>
                <td className={styles.tableCell}>{policy.name}</td>
                <td className={styles.tableCell}>{policy.scenarioTypeCode}</td>
                <td className={styles.tableCell}>{policy.requiredApproverCount}</td>
                <td className={styles.tableCell}>{policy.priority}</td>
                <td className={styles.tableCell}>
                  <Switch
                    checked={policy.isEnabled}
                    onChange={() => handleToggleEnabled(policy)}
                    aria-label={`Toggle enabled for ${policy.name}`}
                  />
                </td>
                <td className={styles.tableCell}>
                  {formatDate(policy.updatedAt)}
                </td>
                <td className={styles.tableCell}>
                  <div className={styles.actionsCell}>
                    <Button
                      appearance="outline"
                      size="small"
                      onClick={() => handleOpenEdit(policy)}
                    >
                      Edit
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Policy Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(_event, data) => {
          setCreateDialogOpen(data.open);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Create Signoff Policy</DialogTitle>
            <DialogContent>
              {renderFormFields(false)}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                disabled={!formState.name.trim() || saving}
                onClick={handleCreateSubmit}
              >
                Create
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Edit Policy Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(_event, data) => {
          setEditDialogOpen(data.open);
          if (!data.open) {
            setEditingPolicy(null);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Edit Signoff Policy</DialogTitle>
            <DialogContent>
              {renderFormFields(true)}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                disabled={!formState.name.trim() || saving}
                onClick={handleEditSubmit}
              >
                Save
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default SignoffPoliciesAdminPage;
