import { useState, useEffect } from 'react';
import {
  Input,
  Button,
  Select,
} from '@fluentui/react-components';
import { useAppDispatch } from '../../store/hooks';
import { updateNavigationViewModeRequest } from '../../store/scenarioTypeAdminSlice';
import type { ScenarioTypeAdminDetailDto } from '../../services/scenarioTypeAdminApi';
import styles from './NavigationViewModeTabContent.module.scss';

interface NavigationViewModeTabContentProps {
  detail: ScenarioTypeAdminDetailDto;
  saving: boolean;
}

interface FormState {
  directChangesMode: string;
  impactDataMode: string;
  directChangesExternalUrlTemplate: string;
  impactExternalUrlTemplate: string;
  directChangesInternalRenderMode: string;
}

export const NavigationViewModeTabContent: React.FC<NavigationViewModeTabContentProps> = ({ detail, saving }) => {
  const dispatch = useAppDispatch();

  const [formState, setFormState] = useState<FormState>({
    directChangesMode: detail.directChangesMode,
    impactDataMode: detail.impactDataMode,
    directChangesExternalUrlTemplate: detail.directChangesExternalUrlTemplate ?? '',
    impactExternalUrlTemplate: detail.impactExternalUrlTemplate ?? '',
    directChangesInternalRenderMode: detail.directChangesInternalRenderMode ?? 'FULL_DATA_CHANGES',
  });

  // Re-initialize form when detail prop changes (e.g., after save success)
  useEffect(() => {
    setFormState({
      directChangesMode: detail.directChangesMode,
      impactDataMode: detail.impactDataMode,
      directChangesExternalUrlTemplate: detail.directChangesExternalUrlTemplate ?? '',
      impactExternalUrlTemplate: detail.impactExternalUrlTemplate ?? '',
      directChangesInternalRenderMode: detail.directChangesInternalRenderMode ?? 'FULL_DATA_CHANGES',
    });
  }, [detail]);

  const handleSave = () => {
    dispatch(
      updateNavigationViewModeRequest({
        code: detail.code,
        body: {
          directChangesMode: formState.directChangesMode,
          impactDataMode: formState.impactDataMode,
          directChangesExternalUrlTemplate: formState.directChangesExternalUrlTemplate || null,
          impactExternalUrlTemplate: formState.impactExternalUrlTemplate || null,
          directChangesInternalRenderMode: formState.directChangesInternalRenderMode || null,
        },
      })
    );
  };

  const isSaveDisabled =
    saving ||
    (formState.directChangesMode === 'EXTERNAL' && !formState.directChangesExternalUrlTemplate.trim()) ||
    (formState.impactDataMode === 'EXTERNAL' && !formState.impactExternalUrlTemplate.trim());

  return (
    <div className={styles.formContainer} data-testid="navigation-view-mode-tab-content">
      <div className={styles.badgeContainer}>
        <span className={`${styles.badge} ${styles.badgeDeployment}`}>
          Deployment Managed
        </span>
        <div className={styles.helperText}>
          These settings are editable here and also managed via deployment configuration.
        </div>
      </div>

      <div className={styles.sectionTitle}>Direct Changes</div>

      <div className={styles.dialogField}>
        <label htmlFor="direct-changes-mode" className={styles.dialogFieldLabel}>Mode</label>
        <Select
          id="direct-changes-mode"
          value={formState.directChangesMode}
          onChange={(_e, data) =>
            setFormState((prev) => ({ ...prev, directChangesMode: data.value }))
          }
        >
          <option value="INTERNAL">INTERNAL</option>
          <option value="EXTERNAL">EXTERNAL</option>
        </Select>
      </div>

      {formState.directChangesMode === 'EXTERNAL' && (
        <div className={styles.dialogField}>
          <label htmlFor="direct-changes-url-template" className={styles.dialogFieldLabel}>URL Template</label>
          <Input
            id="direct-changes-url-template"
            value={formState.directChangesExternalUrlTemplate}
            onChange={(_e, data) =>
              setFormState((prev) => ({ ...prev, directChangesExternalUrlTemplate: data.value }))
            }
          />
          <div className={styles.helperText}>
            {'Supported placeholders: ${scenarioId}, ${scenarioTypeCode} (active); ${scenarioName}, ${impactRunId} (reserved, future)'}
          </div>
        </div>
      )}

      {formState.directChangesMode === 'INTERNAL' && (
        <div className={styles.dialogField} data-testid="direct-changes-internal-render-mode-field">
          <label htmlFor="direct-changes-internal-render-mode" className={styles.dialogFieldLabel}>Internal Render Mode</label>
          <Select
            id="direct-changes-internal-render-mode"
            value={formState.directChangesInternalRenderMode}
            onChange={(_e, data) =>
              setFormState((prev) => ({ ...prev, directChangesInternalRenderMode: data.value }))
            }
            data-testid="direct-changes-internal-render-mode-select"
          >
            <option value="FULL_DATA_CHANGES">FULL_DATA_CHANGES</option>
            <option value="DELTA_BY_UNIQUE_ID">DELTA_BY_UNIQUE_ID</option>
          </Select>
          <div className={styles.helperText}>
            {formState.directChangesInternalRenderMode === 'DELTA_BY_UNIQUE_ID'
              ? 'Shows grouped change summaries per configured data type, with optional section-header external links if provided by the runtime payload.'
              : 'Shows the uploaded change data in the existing full grid format.'}
          </div>
        </div>
      )}

      <div className={styles.sectionTitle}>Impact Reports</div>

      <div className={styles.dialogField}>
        <label htmlFor="impact-data-mode" className={styles.dialogFieldLabel}>Mode</label>
        <Select
          id="impact-data-mode"
          value={formState.impactDataMode}
          onChange={(_e, data) =>
            setFormState((prev) => ({ ...prev, impactDataMode: data.value }))
          }
        >
          <option value="INTERNAL">INTERNAL</option>
          <option value="EXTERNAL">EXTERNAL</option>
        </Select>
      </div>

      {formState.impactDataMode === 'EXTERNAL' && (
        <div className={styles.dialogField}>
          <label htmlFor="impact-url-template" className={styles.dialogFieldLabel}>URL Template</label>
          <Input
            id="impact-url-template"
            value={formState.impactExternalUrlTemplate}
            onChange={(_e, data) =>
              setFormState((prev) => ({ ...prev, impactExternalUrlTemplate: data.value }))
            }
          />
          <div className={styles.helperText}>
            {'Supported placeholders: ${scenarioId}, ${scenarioTypeCode} (active); ${scenarioName}, ${impactRunId} (reserved, future)'}
          </div>
        </div>
      )}

      <div className={styles.formActions}>
        <Button
          appearance="primary"
          disabled={isSaveDisabled}
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default NavigationViewModeTabContent;
