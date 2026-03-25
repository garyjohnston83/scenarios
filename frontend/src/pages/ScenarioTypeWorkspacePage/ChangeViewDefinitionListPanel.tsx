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
  fetchCvDefinitionDetailRequest,
  activateCvDefinitionRequest,
  deactivateCvDefinitionRequest,
} from '../../store/changeViewDefinitionAdminSlice';
import type { ChangeViewDefinitionListItem } from '../../services/changeViewDefinitionAdminApi';
import { formatDate } from '../../utils/formatDate';
import { CreateChangeViewDefinitionDialog } from './CreateChangeViewDefinitionDialog';
import styles from './ChangeViewDefinitionListPanel.module.scss';

interface ChangeViewDefinitionListPanelProps {
  scenarioTypeCode: string;
  directChangesInternalRenderMode: string;
}

export const ChangeViewDefinitionListPanel: React.FC<ChangeViewDefinitionListPanelProps> = ({
  scenarioTypeCode,
  directChangesInternalRenderMode,
}) => {
  const dispatch = useAppDispatch();
  const definitions = useAppSelector(
    (state) => state.changeViewDefinitionAdmin.definitions
  );
  const loading = useAppSelector(
    (state) => state.changeViewDefinitionAdmin.loading
  );
  const error = useAppSelector(
    (state) => state.changeViewDefinitionAdmin.error
  );
  const selectedDefinition = useAppSelector(
    (state) => state.changeViewDefinitionAdmin.selectedDefinition
  );

  const [deactivatingDefinition, setDeactivatingDefinition] =
    useState<ChangeViewDefinitionListItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleRowClick = (definition: ChangeViewDefinitionListItem) => {
    dispatch(
      fetchCvDefinitionDetailRequest({
        scenarioTypeCode,
        id: definition.id,
      })
    );
  };

  const handleActivate = (
    e: React.MouseEvent,
    definition: ChangeViewDefinitionListItem
  ) => {
    e.stopPropagation();
    dispatch(
      activateCvDefinitionRequest({
        scenarioTypeCode,
        id: definition.id,
      })
    );
  };

  const handleDeactivateClick = (
    e: React.MouseEvent,
    definition: ChangeViewDefinitionListItem
  ) => {
    e.stopPropagation();
    setDeactivatingDefinition(definition);
  };

  const handleDeactivateConfirm = () => {
    if (deactivatingDefinition) {
      dispatch(
        deactivateCvDefinitionRequest({
          scenarioTypeCode,
          id: deactivatingDefinition.id,
        })
      );
      setDeactivatingDefinition(null);
    }
  };

  const getRowClassName = (definition: ChangeViewDefinitionListItem): string => {
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
    <div className={styles.container} data-testid="cv-definition-list-panel">
      {/* Toolbar with Create New button */}
      <div className={styles.toolbar}>
        <Button
          appearance="primary"
          size="small"
          onClick={() => setCreateDialogOpen(true)}
          data-testid="create-cv-definition-button"
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
          No change view definitions found. Create a new definition to get started.
        </span>
      )}

      {/* Definition list table */}
      {!loading && definitions.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.table} data-testid="cv-definitions-table">
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell}>Template Key</th>
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
                  data-testid={`cv-definition-row-${definition.id}`}
                >
                  <td className={styles.tableCell}>{definition.templateKey}</td>
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

      {/* Create Change View Definition Dialog */}
      <CreateChangeViewDefinitionDialog
        open={createDialogOpen}
        onDismiss={() => setCreateDialogOpen(false)}
        scenarioTypeCode={scenarioTypeCode}
        directChangesInternalRenderMode={directChangesInternalRenderMode}
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
            <DialogTitle>Deactivate Change View Definition</DialogTitle>
            <DialogContent>
              Are you sure you want to deactivate version{' '}
              {deactivatingDefinition?.version} of template key &quot;
              {deactivatingDefinition?.templateKey}&quot;? This template key will
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

export default ChangeViewDefinitionListPanel;
