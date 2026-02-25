import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Text,
  Button,
  Dropdown,
  Option,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchScenarioListRequest,
  setSortOption,
  setWorkflowStateFilter,
} from '../../store/scenariosSlice';
import type { ScenarioListItem } from '../../store/scenariosSlice';
import { formatDate } from '../../utils/formatDate';
import { CombineScenariosDialog } from '../CombineScenariosDialog';
import styles from './ScenarioListPane.module.scss';

const useFluentStyles = makeStyles({
  header: {
    color: tokens.colorNeutralForeground1,
  },
  emptyState: {
    color: tokens.colorNeutralForeground3,
  },
});

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

export const ScenarioListPane: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { id: selectedId } = useParams<{ id: string }>();
  const fluentStyles = useFluentStyles();
  const [combineDialogOpen, setCombineDialogOpen] = useState(false);

  const items = useAppSelector((state) => state.scenarios.items);
  const listLoading = useAppSelector((state) => state.scenarios.listLoading);
  const listError = useAppSelector((state) => state.scenarios.listError);
  const sortOption = useAppSelector((state) => state.scenarios.sortOption);
  const workflowStateFilter = useAppSelector(
    (state) => state.scenarios.workflowStateFilter
  );

  useEffect(() => {
    dispatch(fetchScenarioListRequest());
  }, [dispatch]);

  const filteredAndSortedItems = useMemo(
    () => applySortAndFilter(items, sortOption, workflowStateFilter),
    [items, sortOption, workflowStateFilter]
  );

  const distinctWorkflowStates = useMemo(() => {
    const states = new Set(items.map((item) => item.workflowState));
    return Array.from(states).sort();
  }, [items]);

  if (listLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Text
            className={fluentStyles.header}
            size={400}
            weight="semibold"
          >
            Scenarios
          </Text>
          <Button
            appearance="subtle"
            icon={<AddRegular />}
            size="small"
            onClick={() => setCombineDialogOpen(true)}
          />
        </div>
        <Text size={300}>Loading...</Text>
        <CombineScenariosDialog
          open={combineDialogOpen}
          onClose={() => setCombineDialogOpen(false)}
        />
      </div>
    );
  }

  if (listError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Text
            className={fluentStyles.header}
            size={400}
            weight="semibold"
          >
            Scenarios
          </Text>
          <Button
            appearance="subtle"
            icon={<AddRegular />}
            size="small"
            onClick={() => setCombineDialogOpen(true)}
          />
        </div>
        <div className={styles.errorState}>
          <Text size={300}>{listError}</Text>
          <Button
            appearance="outline"
            onClick={() => dispatch(fetchScenarioListRequest())}
            style={{ marginTop: 8 }}
          >
            Retry
          </Button>
        </div>
        <CombineScenariosDialog
          open={combineDialogOpen}
          onClose={() => setCombineDialogOpen(false)}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Text
            className={fluentStyles.header}
            size={400}
            weight="semibold"
          >
            Scenarios
          </Text>
          <Button
            appearance="subtle"
            icon={<AddRegular />}
            size="small"
            onClick={() => setCombineDialogOpen(true)}
          />
        </div>
        <Text className={`${styles.emptyState} ${fluentStyles.emptyState}`} size={300}>
          No scenarios
        </Text>
        <CombineScenariosDialog
          open={combineDialogOpen}
          onClose={() => setCombineDialogOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text
          className={fluentStyles.header}
          size={400}
          weight="semibold"
        >
          Scenarios
        </Text>
        <Button
          appearance="subtle"
          icon={<AddRegular />}
          size="small"
          onClick={() => setCombineDialogOpen(true)}
        />
      </div>

      <div className={styles.toolbar}>
        <Dropdown
          placeholder="Sort by"
          value={getSortLabel(sortOption)}
          selectedOptions={[sortOption]}
          onOptionSelect={(_ev, data) => {
            if (data.optionValue) {
              dispatch(setSortOption(data.optionValue));
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
          selectedOptions={workflowStateFilter}
          onOptionSelect={(_ev, data) => {
            dispatch(setWorkflowStateFilter(data.selectedOptions));
          }}
        >
          {distinctWorkflowStates.map((state) => (
            <Option key={state} value={state}>
              {state}
            </Option>
          ))}
        </Dropdown>
      </div>

      <div>
        {filteredAndSortedItems.map((item) => (
          <div
            key={item.id}
            className={`${styles.listItem} ${
              item.id === selectedId ? styles.listItemActive : ''
            }`}
            onClick={() => navigate(`/scenarios/${item.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigate(`/scenarios/${item.id}`);
              }
            }}
          >
            <div className={styles.scenarioNameRow}>
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
              <span className={styles.scenarioName}>{item.name}</span>
            </div>
            <div className={styles.scenarioMeta}>
              <span className={styles.badge}>{item.workflowState}</span>
              <span>{formatDate(item.updatedAt)}</span>
            </div>
          </div>
        ))}
      </div>
      <CombineScenariosDialog
        open={combineDialogOpen}
        onClose={() => setCombineDialogOpen(false)}
      />
    </div>
  );
};

export default ScenarioListPane;
