import { useState, useEffect } from 'react';
import {
  Input,
  Switch,
  SpinButton,
  Button,
} from '@fluentui/react-components';
import type { SpinButtonChangeEvent, SpinButtonOnChangeData } from '@fluentui/react-components';
import { useAppDispatch } from '../../store/hooks';
import { updateScenarioTypeRequest } from '../../store/scenarioTypeAdminSlice';
import type { ScenarioTypeAdminDetailDto } from '../../services/scenarioTypeAdminApi';
import styles from './GeneralTabContent.module.scss';

interface GeneralTabContentProps {
  detail: ScenarioTypeAdminDetailDto;
  saving: boolean;
}

interface FormState {
  name: string;
  icon: string;
  isEnabled: boolean;
  sortOrder: number | null;
}

export const GeneralTabContent: React.FC<GeneralTabContentProps> = ({ detail, saving }) => {
  const dispatch = useAppDispatch();

  const [formState, setFormState] = useState<FormState>({
    name: detail.name,
    icon: detail.icon,
    isEnabled: detail.isEnabled,
    sortOrder: detail.sortOrder,
  });

  // Re-initialize form when detail prop changes (e.g., after save success)
  useEffect(() => {
    setFormState({
      name: detail.name,
      icon: detail.icon,
      isEnabled: detail.isEnabled,
      sortOrder: detail.sortOrder,
    });
  }, [detail]);

  const handleSave = () => {
    dispatch(
      updateScenarioTypeRequest({
        code: detail.code,
        body: {
          name: formState.name,
          icon: formState.icon,
          isEnabled: formState.isEnabled,
          sortOrder: formState.sortOrder,
        },
      })
    );
  };

  const isSaveDisabled = !formState.name.trim() || saving;

  return (
    <div className={styles.formContainer} data-testid="general-tab-content">
      <div className={styles.dialogField}>
        <label htmlFor="general-code" className={styles.dialogFieldLabel}>Code</label>
        <span id="general-code" className={styles.readOnlyValue} data-testid="general-code">{detail.code}</span>
      </div>

      <div className={styles.dialogField}>
        <label htmlFor="general-name" className={styles.dialogFieldLabel}>Name</label>
        <Input
          id="general-name"
          value={formState.name}
          onChange={(_e, data) =>
            setFormState((prev) => ({ ...prev, name: data.value }))
          }
          required
        />
      </div>

      <div className={styles.dialogField}>
        <label htmlFor="general-icon" className={styles.dialogFieldLabel}>Icon</label>
        <Input
          id="general-icon"
          value={formState.icon}
          onChange={(_e, data) =>
            setFormState((prev) => ({ ...prev, icon: data.value }))
          }
        />
      </div>

      <div className={styles.dialogField}>
        <label htmlFor="general-enabled" className={styles.dialogFieldLabel}>Enabled</label>
        <Switch
          id="general-enabled"
          checked={formState.isEnabled}
          onChange={(_e, data) =>
            setFormState((prev) => ({ ...prev, isEnabled: data.checked }))
          }
        />
      </div>

      <div className={styles.dialogField}>
        <label htmlFor="general-sort-order" className={styles.dialogFieldLabel}>Sort Order</label>
        <SpinButton
          id="general-sort-order"
          value={formState.sortOrder ?? 0}
          min={0}
          onChange={(_e: SpinButtonChangeEvent, data: SpinButtonOnChangeData) =>
            setFormState((prev) => ({
              ...prev,
              sortOrder: data.value ?? null,
            }))
          }
        />
      </div>

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

export default GeneralTabContent;
