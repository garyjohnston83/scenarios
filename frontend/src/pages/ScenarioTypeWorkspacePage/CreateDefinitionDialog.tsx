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
import { createDefinitionRequest } from '../../store/reportDefinitionAdminSlice';
import styles from './CreateDefinitionDialog.module.scss';

interface CreateDefinitionDialogProps {
  open: boolean;
  onDismiss: () => void;
  scenarioTypeCode: string;
}

const REPORT_KEY_PATTERN = /^[a-z0-9_]+$/;

function buildSkeletonTemplate(scenarioTypeCode: string, reportKey: string): string {
  const skeleton = {
    schema_version: '1.0',
    report_key: reportKey || 'new_report',
    scenario_type: scenarioTypeCode,
    display_name: '',
    description: '',
    metadata: {
      author: '',
      tags: [],
    },
    sections: [
      {
        key: 'section_1',
        title: 'Section 1',
        order: 1,
        contentBlocks: [
          {
            blockType: 'metric',
            key: 'metric_1',
            label: 'Sample Metric',
            source_field: 'field_name',
            format: 'number',
            unit: '',
          },
        ],
      },
    ],
  };
  return JSON.stringify(skeleton, null, 2);
}

export const CreateDefinitionDialog: React.FC<CreateDefinitionDialogProps> = ({
  open,
  onDismiss,
  scenarioTypeCode,
}) => {
  const dispatch = useAppDispatch();
  const saving = useAppSelector((state) => state.reportDefinitionAdmin.saving);

  const [reportKey, setReportKey] = useState('');
  const [definitionJson, setDefinitionJson] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  // Initialize template when dialog opens
  useEffect(() => {
    if (open) {
      setReportKey('');
      setDefinitionJson(buildSkeletonTemplate(scenarioTypeCode, ''));
      setKeyError(null);
    }
  }, [open, scenarioTypeCode]);

  // Update the template when report key changes
  const handleReportKeyChange = useCallback(
    (_e: unknown, data: { value: string }) => {
      const value = data.value;
      setReportKey(value);

      if (value === '') {
        setKeyError(null);
      } else if (!REPORT_KEY_PATTERN.test(value)) {
        setKeyError('Report key must contain only lowercase letters, numbers, and underscores');
      } else {
        setKeyError(null);
      }

      // Update the template JSON with the new report key
      try {
        const parsed = JSON.parse(definitionJson);
        parsed.report_key = value || 'new_report';
        setDefinitionJson(JSON.stringify(parsed, null, 2));
      } catch {
        // If JSON is invalid, just update the key
      }
    },
    [definitionJson]
  );

  // Detect successful save via Redux state change (saving transitions from true to false without error)
  const [wasSaving, setWasSaving] = useState(false);
  const error = useAppSelector((state) => state.reportDefinitionAdmin.error);

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
    !reportKey.trim() ||
    !REPORT_KEY_PATTERN.test(reportKey) ||
    saving;

  const handleSubmit = () => {
    dispatch(
      createDefinitionRequest({
        scenarioTypeCode,
        reportKey,
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
          <DialogTitle>Create New Report Definition</DialogTitle>
          <DialogContent>
            <div className={styles.dialogField}>
              <label htmlFor="create-report-key" className={styles.dialogFieldLabel}>
                Report Key
              </label>
              <Input
                id="create-report-key"
                value={reportKey}
                onChange={handleReportKeyChange}
                placeholder="e.g., market_risk_summary"
                data-testid="create-report-key-input"
              />
              {keyError && (
                <span className={styles.validationError} data-testid="report-key-error">
                  {keyError}
                </span>
              )}
            </div>

            <div className={styles.dialogField}>
              <label htmlFor="create-definition-json" className={styles.dialogFieldLabel}>
                Initial Definition JSON
              </label>
              <Textarea
                id="create-definition-json"
                value={definitionJson}
                onChange={(_e, data) => setDefinitionJson(data.value)}
                resize="vertical"
                className={styles.jsonTextarea}
                data-testid="create-definition-json-textarea"
              />
            </div>

            {error && (
              <span className={styles.errorText} data-testid="create-dialog-error">
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
              data-testid="create-definition-submit"
            >
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default CreateDefinitionDialog;
