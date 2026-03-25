import { parseDeltaDefinition } from './ChangeViewStructuredEditorPanel';
import type { DeltaDefinitionState, DeltaDataType } from './ChangeViewStructuredEditorPanel';
import styles from './DeltaByUniqueIdReadOnlyView.module.scss';

export interface DeltaByUniqueIdReadOnlyViewProps {
  /** The definition JSON string to parse and display in read-only mode. */
  definition: string;
}

/**
 * Read-only presentation component for DELTA_BY_UNIQUE_ID definitions.
 *
 * Renders all definition-level properties and per-dataType fields as label-value
 * pairs, and column definitions as a read-only table per dataType.
 *
 * This is a pure presentation component -- no inputs or editable controls.
 * Used when viewing a definition that is active/locked or when the user
 * does not have edit permissions.
 */
export const DeltaByUniqueIdReadOnlyView: React.FC<DeltaByUniqueIdReadOnlyViewProps> = ({
  definition,
}) => {
  const defState: DeltaDefinitionState | null = parseDeltaDefinition(definition);

  if (!defState) {
    return (
      <div className={styles.container} data-testid="delta-readonly-view">
        <div className={styles.emptyState}>Unable to parse definition JSON.</div>
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="delta-readonly-view">
      {/* Definition-level properties */}
      <div className={styles.sectionCard} data-testid="delta-readonly-definition-properties">
        <div className={styles.sectionTitle}>Definition Properties</div>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Template Key</span>
            <span className={styles.readOnlyValue} data-testid="delta-readonly-template-key">
              {defState.template_key}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Scenario Type</span>
            <span className={styles.readOnlyValue} data-testid="delta-readonly-scenario-type">
              {defState.scenario_type}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Schema Version</span>
            <span className={styles.readOnlyValue} data-testid="delta-readonly-schema-version">
              {defState.schema_version}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Display Name</span>
            <span className={styles.readOnlyValue} data-testid="delta-readonly-display-name">
              {defState.display_name}
            </span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Description</span>
            <span className={styles.readOnlyValue} data-testid="delta-readonly-description">
              {defState.description}
            </span>
          </div>
        </div>
      </div>

      {/* Per-dataType sections */}
      {defState.dataTypes.map((dt: DeltaDataType, idx: number) => (
        <div
          key={`${dt.dataTypeId}-${idx}`}
          className={styles.sectionCard}
          data-testid={`delta-readonly-datatype-${idx}`}
        >
          <div className={styles.sectionTitle}>
            Data Type: {dt.dataTypeTitle || dt.dataTypeId || `#${idx + 1}`}
          </div>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Data Type ID</span>
              <span className={styles.readOnlyValue} data-testid={`delta-readonly-dt-${idx}-dataTypeId`}>
                {dt.dataTypeId}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Title</span>
              <span className={styles.readOnlyValue} data-testid={`delta-readonly-dt-${idx}-dataTypeTitle`}>
                {dt.dataTypeTitle}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Header Summary Text Template</span>
              <span className={styles.readOnlyValue} data-testid={`delta-readonly-dt-${idx}-headerSummaryTextTemplate`}>
                {dt.headerSummaryTextTemplate || '-'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Row Threshold</span>
              <span className={styles.readOnlyValue} data-testid={`delta-readonly-dt-${idx}-rowThreshold`}>
                {dt.rowThreshold != null ? dt.rowThreshold : '-'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Overflow Message</span>
              <span className={styles.readOnlyValue} data-testid={`delta-readonly-dt-${idx}-overflowMessage`}>
                {dt.overflowMessage || '-'}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Sort Ordering</span>
              <span className={styles.readOnlyValue} data-testid={`delta-readonly-dt-${idx}-sortOrdering`}>
                {dt.sortOrdering
                  ? `${dt.sortOrdering.dataAttribute} (${dt.sortOrdering.direction})`
                  : '-'}
              </span>
            </div>
          </div>

          {/* Column Definitions table */}
          {dt.columnDefinitions && dt.columnDefinitions.length > 0 && (
            <div className={styles.columnDefinitionsSection}>
              <div className={styles.columnDefinitionsTitle}>Column Definitions</div>
              <table className={styles.columnTable} data-testid={`delta-readonly-dt-${idx}-columns-table`}>
                <thead>
                  <tr>
                    <th>Data Attribute</th>
                    <th>Display</th>
                    <th>Type</th>
                    <th>Is Entity ID</th>
                  </tr>
                </thead>
                <tbody>
                  {dt.columnDefinitions.map((col, colIdx) => (
                    <tr key={`${col.dataAttribute}-${colIdx}`} data-testid={`delta-readonly-dt-${idx}-col-${colIdx}`}>
                      <td>{col.dataAttribute}</td>
                      <td>{col.display}</td>
                      <td>{col.type}</td>
                      <td>{col.isEntityId ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DeltaByUniqueIdReadOnlyView;
