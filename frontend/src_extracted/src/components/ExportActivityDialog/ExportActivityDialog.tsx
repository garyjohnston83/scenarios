import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Dropdown,
  Option,
  Spinner,
} from '@fluentui/react-components';
import * as XLSX from 'xlsx';
import { useAppSelector } from '../../store/hooks';
import type { ScenarioListItem } from '../../store/scenariosSlice';
import { fetchScenarioDetail } from '../../services/scenarioApi';
import { getWorkflowStateLabel } from '../../utils/labelMappings';
import { formatDate } from '../../utils/formatDate';
import styles from './ExportActivityDialog.module.scss';

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

function truncateTabName(name: string, maxLen = 31): string {
  return name.length > maxLen ? name.substring(0, maxLen) : name;
}

function deduplicateTabNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  return names.map((name) => {
    const count = counts.get(name) ?? 0;
    counts.set(name, count + 1);
    if (count === 0) return name;
    const suffix = ` (${count})`;
    return truncateTabName(name.substring(0, 31 - suffix.length) + suffix);
  });
}

interface ExportActivityDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ExportActivityDialog: React.FC<ExportActivityDialogProps> = ({
  open,
  onClose,
}) => {
  const items = useAppSelector((state) => state.scenarios.items);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState('updatedAt-desc');
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const distinctWorkflowStates = useMemo(() => {
    const states = new Set(items.map((item) => item.workflowState));
    return Array.from(states).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return applySortAndFilter(items, sortOption, stateFilter);
  }, [items, sortOption, stateFilter]);

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);

    try {
      const selectedScenarioIds = [...selectedIds];
      const details = await Promise.all(
        selectedScenarioIds.map((id) => fetchScenarioDetail(id))
      );

      const wb = XLSX.utils.book_new();

      const rawTabNames = details.map((d) => truncateTabName(d.name));
      const tabNames = deduplicateTabNames(rawTabNames);

      details.forEach((detail, idx) => {
        const rows = detail.events?.rows ?? [];
        const sheetData = [
          ['Type', 'Date/Time', 'Author', 'Details', 'Status Transition'],
          ...rows.map((row) => [
            row.bucketType,
            formatDate(row.occurredAt),
            row.authorDisplayName,
            row.details,
            row.statusTransition ?? '',
          ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, tabNames[idx]);
      });

      XLSX.writeFile(wb, 'Scenario_Activity_Export.xlsx');

      setSelectedIds(new Set());
      setSortOption('updatedAt-desc');
      setStateFilter([]);
      onClose();
    } catch (err) {
      setExportError('Failed to export activity data. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [selectedIds, onClose]);

  const handleCancel = useCallback(() => {
    setSelectedIds(new Set());
    setSortOption('updatedAt-desc');
    setStateFilter([]);
    setExportError(null);
    onClose();
  }, [onClose]);

  const exportDisabled = selectedIds.size === 0 || exporting;

  return (
    <Dialog
      open={open}
      onOpenChange={(_event, data) => {
        if (!data.open) handleCancel();
      }}
    >
      <DialogSurface className={styles.dialogSurface}>
        <DialogBody>
          <DialogTitle>Export Activity</DialogTitle>
          <DialogContent>
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

                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
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

            {exportError && (
              <div className={styles.errorMessage}>{exportError}</div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              disabled={exportDisabled}
              onClick={handleExport}
              icon={exporting ? <Spinner size="tiny" /> : undefined}
            >
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
