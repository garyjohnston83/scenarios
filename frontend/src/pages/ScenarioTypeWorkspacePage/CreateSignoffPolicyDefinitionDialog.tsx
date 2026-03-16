import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogTrigger,
  Input,
  Textarea,
} from '@fluentui/react-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createSpDefinitionRequest } from '../../store/signoffPolicyDefinitionAdminSlice';
import styles from './CreateSignoffPolicyDefinitionDialog.module.scss';

interface CreateSignoffPolicyDefinitionDialogProps {
  open: boolean;
  onDismiss: () => void;
  scenarioTypeCode: string;
}

const POLICY_KEY_PATTERN = /^[a-z0-9_]+$/;

function buildSkeletonTemplate(scenarioTypeCode: string, policyKey: string): string {
  const skeleton = {
    schema_version: '1.0',
    policy_key: policyKey || 'new_policy',
    scenario_type: scenarioTypeCode,
    display_name: '',
    resolution_strategy: 'STRICTEST_WINS',
    rules: [] as object[],
  };
  return JSON.stringify(skeleton, null, 2);
}

export const CreateSignoffPolicyDefinitionDialog: React.FC<CreateSignoffPolicyDefinitionDialogProps> = ({
  open,
  onDismiss,
  scenarioTypeCode,
}) => {
  const dispatch = useAppDispatch();
  const saving = useAppSelector((state) => state.signoffPolicyDefinitionAdmin.saving);
  const error = useAppSelector((state) => state.signoffPolicyDefinitionAdmin.error);

  const [policyKey, setPolicyKey] = useState('');
  const [definitionJson, setDefinitionJson] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  // Initialize template when dialog opens
  useEffect(() => {
    if (open) {
      setPolicyKey('');
      setDefinitionJson(buildSkeletonTemplate(scenarioTypeCode, ''));
      setKeyError(null);
    }
  }, [open, scenarioTypeCode]);

  // Update the template when policy key changes
  const handlePolicyKeyChange = useCallback(
    (_e: unknown, data: { value: string }) => {
      const value = data.value;
      setPolicyKey(value);

      if (value === '') {
        setKeyError(null);
      } else if (!POLICY_KEY_PATTERN.test(value)) {
        setKeyError('Policy key must contain only lowercase letters, numbers, and underscores');
      } else {
        setKeyError(null);
      }

      // Update the template JSON with the new policy key
      try {
        const parsed = JSON.parse(definitionJson);
        parsed.policy_key = value || 'new_policy';
        setDefinitionJson(JSON.stringify(parsed, null, 2));
      } catch {
        // If JSON is invalid, just update the key
      }
    },
    [definitionJson]
  );

  // Detect successful save via Redux state change (saving transitions from true to false without error)
  const [wasSaving, setWasSaving] = useState(false);

  useEffect(() => {
    if (saving) {
      setWasSaving(true);
    } else if (wasSaving && !saving && !error) {
      // Save completed successfully
      setWasSaving(false);
      onDismiss();
    } else if (wasSaving && !saving && error) {
      setWasSaving(false);
    }
  }, [saving, wasSaving, error, onDismiss]);

  const isSubmitDisabled =
    !policyKey.trim() ||
    !POLICY_KEY_PATTERN.test(policyKey) ||
    saving;

  const handleSubmit = () => {
    dispatch(
      createSpDefinitionRequest({
        scenarioTypeCode,
        policyKey,
        definition: definitionJson,
      })
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(_event, data) => {
        if (!data.open) {
          onDismiss();
        }
      }}
    >
      <DialogSurface className={styles.dialogSurface}>
        <DialogBody>
          <DialogTitle>Create New Signoff Policy Definition</DialogTitle>
          <DialogContent>
            <div className={styles.dialogField}>
              <label htmlFor="create-policy-key" className={styles.dialogFieldLabel}>
                Policy Key
              </label>
              <Input
                id="create-policy-key"
                value={policyKey}
                onChange={handlePolicyKeyChange}
                placeholder="e.g., desk_signoff_policy"
                data-testid="create-policy-key-input"
              />
              <span className={styles.helperText}>
                Must match pattern: [a-z0-9_]+
              </span>
              {keyError && (
                <span className={styles.validationError} data-testid="policy-key-error">
                  {keyError}
                </span>
              )}
            </div>

            <div className={styles.dialogField}>
              <label htmlFor="create-sp-scenario-type" className={styles.dialogFieldLabel}>
                Scenario Type
              </label>
              <Input
                id="create-sp-scenario-type"
                value={scenarioTypeCode}
                readOnly
                data-testid="create-sp-scenario-type-input"
              />
            </div>

            <div className={styles.dialogField}>
              <label htmlFor="create-sp-definition-json" className={styles.dialogFieldLabel}>
                Initial Definition JSON
              </label>
              <Textarea
                id="create-sp-definition-json"
                value={definitionJson}
                onChange={(_e, data) => setDefinitionJson(data.value)}
                resize="vertical"
                className={styles.jsonTextarea}
                data-testid="create-sp-definition-json-textarea"
              />
            </div>

            {error && (
              <span className={styles.errorText} data-testid="create-sp-dialog-error">
                {error}
              </span>
            )}
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            <Button
              appearance="primary"
              disabled={isSubmitDisabled}
              onClick={handleSubmit}
              data-testid="create-sp-definition-submit"
            >
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default CreateSignoffPolicyDefinitionDialog;
