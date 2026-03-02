import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Dropdown,
  Option,
} from '@fluentui/react-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { combineScenariosRequest } from '../../store/scenariosSlice';
import type { ScenarioListItem } from '../../store/scenariosSlice';
import { getWorkflowStateLabel } from '../../utils/labelMappings';
import { formatDate } from '../../utils/formatDate';
import styles from './CombineScenariosDialog.module.scss';

const sortOptions: { label: string; value: string }[] = [
  { label: 'Updated (Newest)', value: 'updatedAt-desc' },
  { label: 'Updated (Oldest)', value: 'updatedAt-asc' },
  { label: 'Name (A-Z)', value: 'name-asc' },
  { label: 'Name (Z-A)', value: 'name-desc' },
];

function getSortLabel(value: string): string {
  const found = sortOptions.find((o) => o.value === value);
  return found ? found.label : 'Updated (Newest)';
}

function applySortAndFilter(
  items: ScenarioListItem[],
  sortOption: string,
  workflowStateFilter: string[]
): ScenarioListItem[] {
  let filtered = items;
  if (workflowStateFilter.length > 0) {
    filtered = items.filter((item) =>
      workflowStateFilter.includes(item.workflowState)
    );
  }

  const sorted = [...filtered].sort((a, b) => {
    switch (sortOption) {
      case 'updatedAt-asc':
        return a.updatedAt.localeCompare(b.updatedAt);
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'updatedAt-desc':
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });

  return sorted;
}

interface CombineScenariosDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CombineScenariosDialog: React.FC<CombineScenariosDialogProps> = ({
  open,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.scenarios.items);
  const combinePosting = useAppSelector((state) => state.scenarios.combinePosting);
  const combinePostError = useAppSelector((state) => state.scenarios.combinePostError);

  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState('updatedAt-desc');
  const [stateFilter, setStateFilter] = useState<string[]>([]);

  // Determine locked type from first selection
  const lockedType = useMemo(() => {
    if (selectedIds.size === 0) return null;
    const firstSelectedId = [...selectedIds][0];
    const first = items.find((item) => item.id === firstSelectedId);
    return first?.scenarioTypeCode ?? null;
  }, [selectedIds, items]);

  const distinctWorkflowStates = useMemo(() => {
    const states = new Set(items.map((item) => item.workflowState));
    return Array.from(states).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return applySortAndFilter(items, sortOption, stateFilter);
  }, [items, sortOption, stateFilter]);

  const handleToggle = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    []
  );

  const handleCreate = useCallback(() => {
    if (!lockedType) return;
    dispatch(
      combineScenariosRequest({
        name: name.trim(),
        scenarioTypeCode: lockedType,
        sourceScenarioIds: [...selectedIds],
      })
    );
    // Reset and close on next success (handled via useEffect or optimistically)
    setName('');
    setSelectedIds(new Set());
    setSortOption('updatedAt-desc');
    setStateFilter([]);
    onClose();
  }, [dispatch, name, lockedType, selectedIds, onClose]);

  const handleCancel = useCallback(() => {
    setName('');
    setSelectedIds(new Set());
    setSortOption('updatedAt-desc');
    setStateFilter([]);
    onClose();
  }, [onClose]);

  const createDisabled =
    !name.trim() || selectedIds.size < 2 || combinePosting;

  const showValidation = selectedIds.size === 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(_event, data) => {
        if (!data.open) handleCancel();
      }}
    >
      <DialogSurface className={styles.dialogSurface}>
        <DialogBody>
          <DialogTitle>Combine Scenarios</DialogTitle>
          <DialogContent>
            <Input
              className={styles.nameInput}
              placeholder="New scenario name"
              value={name}
              onChange={(_e, data) => setName(data.value)}
            />

            <div className={styles.filterRow}>
              <Dropdown
                placeholder="Sort by"
                value={getSortLabel(sortOption)}
                selectedOptions={[sortOption]}
                onOptionSelect={(_ev, data) => {
                  if (data.optionValue) {
                    setSortOption(data.optionValue);
                  }
                }}
              >
                {sortOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Dropdown>

              <Dropdown
                placeholder="Filter by state"
                multiselect
                selectedOptions={stateFilter}
                onOptionSelect={(_ev, data) => {
                  setStateFilter(data.selectedOptions);
                }}
              >
                {distinctWorkflowStates.map((state) => (
                  <Option key={state} value={state}>
                    {getWorkflowStateLabel(state)}
                  </Option>
                ))}
              </Dropdown>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Type</th>
                    <th>Name</th>
                    <th>State</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const isDifferentType =
                      lockedType !== null &&
                      item.scenarioTypeCode !== lockedType &&
                      !isSelected;

                    return (
                      <tr
                        key={item.id}
                        className={isDifferentType ? styles.disabled : undefined}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDifferentType}
                            onChange={() => handleToggle(item.id)}
                          />
                        </td>
                        <td>
                          {item.scenarioTypeCode && (
                            <span
                              className={`${styles.typeBadge} ${
                                item.scenarioTypeCode === 'FRTB_SA'
                                  ? styles.typeBadgeSA
                                  : item.scenarioTypeCode === 'RISK_FACTOR'
                                    ? styles.typeBadgeRF
                                    : styles.typeBadgeMD
                              }`}
                            >
                              {item.scenarioTypeCode === 'FRTB_SA'
                                ? 'SA'
                                : item.scenarioTypeCode === 'RISK_FACTOR'
                                  ? 'RF'
                                  : 'MD'}
                            </span>
                          )}
                        </td>
                        <td>{item.name}</td>
                        <td>
                          <span className={styles.stateBadge}>
                            {getWorkflowStateLabel(item.workflowState)}
                          </span>
                        </td>
                        <td>{formatDate(item.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {showValidation && (
              <div className={styles.validationMessage}>
                Select at least 2 scenarios to combine.
              </div>
            )}

            {combinePostError && (
              <div className={styles.errorMessage}>{combinePostError}</div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={createDisabled}
              onClick={handleCreate}
            >
              Create
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
