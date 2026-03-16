import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogTrigger,
} from '@fluentui/react-components';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  fetchSpDefinitionDetailRequest,
  activateSpDefinitionRequest,
  deactivateSpDefinitionRequest,
} from '../../store/signoffPolicyDefinitionAdminSlice';
import type { SignoffPolicyDefinitionListItem } from '../../services/signoffPolicyDefinitionAdminApi';
import { formatDate } from '../../utils/formatDate';
import { CreateSignoffPolicyDefinitionDialog } from './CreateSignoffPolicyDefinitionDialog';
import styles from './SignoffPolicyDefinitionListPanel.module.scss';

interface SignoffPolicyDefinitionListPanelProps {
  scenarioTypeCode: string;
}

export const SignoffPolicyDefinitionListPanel: React.FC<SignoffPolicyDefinitionListPanelProps> = ({
  scenarioTypeCode,
}) => {
  const dispatch = useAppDispatch();
  const definitions = useAppSelector(
    (state) => state.signoffPolicyDefinitionAdmin.definitions
  );
  const loading = useAppSelector(
    (state) => state.signoffPolicyDefinitionAdmin.loading
  );
  const error = useAppSelector(
    (state) => state.signoffPolicyDefinitionAdmin.error
  );
  const selectedDefinition = useAppSelector(
    (state) => state.signoffPolicyDefinitionAdmin.selectedDefinition
  );

  const [deactivatingDefinition, setDeactivatingDefinition] =
    useState<SignoffPolicyDefinitionListItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleRowClick = (definition: SignoffPolicyDefinitionListItem) => {
    dispatch(
      fetchSpDefinitionDetailRequest({
        scenarioTypeCode,
        id: definition.id,
      })
    );
  };

  const handleActivate = (
    e: React.MouseEvent,
    definition: SignoffPolicyDefinitionListItem
  ) => {
    e.stopPropagation();
    dispatch(
      activateSpDefinitionRequest({
        scenarioTypeCode,
        id: definition.id,
      })
    );
  };

  const handleDeactivateClick = (
    e: React.MouseEvent,
    definition: SignoffPolicyDefinitionListItem
  ) => {
    e.stopPropagation();
    setDeactivatingDefinition(definition);
  };

  const handleDeactivateConfirm = () => {
    if (deactivatingDefinition) {
      dispatch(
        deactivateSpDefinitionRequest({
          scenarioTypeCode,
          id: deactivatingDefinition.id,
        })
      );
      setDeactivatingDefinition(null);
    }
  };

  const getRowClassName = (definition: SignoffPolicyDefinitionListItem): string => {
    const classes = [styles.tableRow];
    if (definition.isActive) {
      classes.push(styles.activeRow);
    }
    if (selectedDefinition && selectedDefinition.id === definition.id) {
      classes.push(styles.selectedRow);
    }
    return classes.join(' ');
  };

  return (
    <div className={styles.container} data-testid="sp-definition-list-panel">
      {/* Toolbar with Create New button */}
      <div className={styles.toolbar}>
        <Button
          appearance="primary"
          size="small"
          onClick={() => setCreateDialogOpen(true)}
          data-testid="create-sp-definition-button"
        >
          Create New
        </Button>
      </div>

      {/* Error display */}
      {error && <span className={styles.errorText}>{error}</span>}

      {/* Loading state */}
      {loading && <span className={styles.emptyState}>Loading...</span>}

      {/* Empty state */}
      {!loading && definitions.length === 0 && (
        <span className={styles.emptyState}>
          No signoff policy definitions found. Create a new definition to get started.
        </span>
      )}

      {/* Definition list table */}
      {!loading && definitions.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.table} data-testid="sp-definitions-table">
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell}>Policy Key</th>
                <th className={styles.tableHeaderCell}>Display Name</th>
                <th className={styles.tableHeaderCell}>Ver</th>
                <th className={styles.tableHeaderCell}>Status</th>
                <th className={styles.tableHeaderCell}>Created At</th>
                <th className={styles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {definitions.map((definition) => (
                <tr
                  key={definition.id}
                  className={getRowClassName(definition)}
                  onClick={() => handleRowClick(definition)}
                  data-testid={`sp-definition-row-${definition.id}`}
                >
                  <td className={styles.tableCell}>{definition.policyKey}</td>
                  <td className={styles.tableCell}>{definition.displayName}</td>
                  <td className={styles.tableCell}>{definition.version}</td>
                  <td className={styles.tableCell}>
                    {definition.isActive ? (
                      <span
                        className={`${styles.statusBadge} ${styles.statusActive}`}
                      >
                        Active
                      </span>
                    ) : (
                      <span
                        className={`${styles.statusBadge} ${styles.statusInactive}`}
                      >
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className={styles.tableCell}>
                    {formatDate(definition.createdAt)}
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.actionsCell}>
                      {definition.isActive ? (
                        <Button
                          appearance="subtle"
                          size="small"
                          onClick={(e) =>
                            handleDeactivateClick(e, definition)
                          }
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          appearance="subtle"
                          size="small"
                          onClick={(e) => handleActivate(e, definition)}
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Signoff Policy Definition Dialog */}
      <CreateSignoffPolicyDefinitionDialog
        open={createDialogOpen}
        onDismiss={() => setCreateDialogOpen(false)}
        scenarioTypeCode={scenarioTypeCode}
      />

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deactivatingDefinition !== null}
        onOpenChange={(_event, data) => {
          if (!data.open) {
            setDeactivatingDefinition(null);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Deactivate Signoff Policy Definition</DialogTitle>
            <DialogContent>
              Are you sure you want to deactivate version{' '}
              {deactivatingDefinition?.version} of policy key &quot;
              {deactivatingDefinition?.policyKey}&quot;? This policy key will
              have no active definition.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleDeactivateConfirm}>
                Deactivate
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default SignoffPolicyDefinitionListPanel;
