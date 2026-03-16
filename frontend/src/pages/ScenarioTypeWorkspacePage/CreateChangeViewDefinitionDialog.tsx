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
import { createCvDefinitionRequest } from '../../store/changeViewDefinitionAdminSlice';
import styles from './CreateChangeViewDefinitionDialog.module.scss';

interface CreateChangeViewDefinitionDialogProps {
  open: boolean;
  onDismiss: () => void;
  scenarioTypeCode: string;
}

const TEMPLATE_KEY_PATTERN = /^[a-z0-9_]+$/;

function buildSkeletonTemplate(scenarioTypeCode: string, templateKey: string): string {
  const skeleton = {
    schema_version: '1.0',
    template_key: templateKey || 'new_template',
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
            blockType: 'text',
            key: 'text_1',
            content: 'Enter text content here.',
          },
          {
            blockType: 'table',
            key: 'table_1',
            label: 'Sample Table',
            rowColumns: [
              { key: 'row_id', header: 'Row ID' },
            ],
            columnGroups: [
              {
                groupLabel: 'Values',
                columns: [
                  { key: 'value_1', header: 'Value 1' },
                ],
              },
            ],
            rows: [],
          },
        ],
      },
    ],
  };
  return JSON.stringify(skeleton, null, 2);
}

export const CreateChangeViewDefinitionDialog: React.FC<CreateChangeViewDefinitionDialogProps> = ({
  open,
  onDismiss,
  scenarioTypeCode,
}) => {
  const dispatch = useAppDispatch();
  const saving = useAppSelector((state) => state.changeViewDefinitionAdmin.saving);
  const error = useAppSelector((state) => state.changeViewDefinitionAdmin.error);

  const [templateKey, setTemplateKey] = useState('');
  const [definitionJson, setDefinitionJson] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  // Initialize template when dialog opens
  useEffect(() => {
    if (open) {
      setTemplateKey('');
      setDefinitionJson(buildSkeletonTemplate(scenarioTypeCode, ''));
      setKeyError(null);
    }
  }, [open, scenarioTypeCode]);

  // Update the template when template key changes
  const handleTemplateKeyChange = useCallback(
    (_e: unknown, data: { value: string }) => {
      const value = data.value;
      setTemplateKey(value);

      if (value === '') {
        setKeyError(null);
      } else if (!TEMPLATE_KEY_PATTERN.test(value)) {
        setKeyError('Template key must contain only lowercase letters, numbers, and underscores');
      } else {
        setKeyError(null);
      }

      // Update the template JSON with the new template key
      try {
        const parsed = JSON.parse(definitionJson);
        parsed.template_key = value || 'new_template';
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
    !templateKey.trim() ||
    !TEMPLATE_KEY_PATTERN.test(templateKey) ||
    saving;

  const handleSubmit = () => {
    dispatch(
      createCvDefinitionRequest({
        scenarioTypeCode,
        templateKey,
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
          <DialogTitle>Create New Change View Definition</DialogTitle>
          <DialogContent>
            <div className={styles.dialogField}>
              <label htmlFor="create-template-key" className={styles.dialogFieldLabel}>
                Template Key
              </label>
              <Input
                id="create-template-key"
                value={templateKey}
                onChange={handleTemplateKeyChange}
                placeholder="e.g., direct_changes_summary"
                data-testid="create-template-key-input"
              />
              <span className={styles.helperText}>
                Must match pattern: [a-z0-9_]+
              </span>
              {keyError && (
                <span className={styles.validationError} data-testid="template-key-error">
                  {keyError}
                </span>
              )}
            </div>

            <div className={styles.dialogField}>
              <label htmlFor="create-cv-scenario-type" className={styles.dialogFieldLabel}>
                Scenario Type
              </label>
              <Input
                id="create-cv-scenario-type"
                value={scenarioTypeCode}
                readOnly
                data-testid="create-cv-scenario-type-input"
              />
            </div>

            <div className={styles.dialogField}>
              <label htmlFor="create-cv-definition-json" className={styles.dialogFieldLabel}>
                Initial Definition JSON
              </label>
              <Textarea
                id="create-cv-definition-json"
                value={definitionJson}
                onChange={(_e, data) => setDefinitionJson(data.value)}
                resize="vertical"
                className={styles.jsonTextarea}
                data-testid="create-cv-definition-json-textarea"
              />
            </div>

            {error && (
              <span className={styles.errorText} data-testid="create-cv-dialog-error">
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
              data-testid="create-cv-definition-submit"
            >
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default CreateChangeViewDefinitionDialog;
