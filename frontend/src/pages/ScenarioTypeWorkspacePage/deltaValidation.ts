import type { DeltaDefinitionState } from './ChangeViewStructuredEditorPanel';

/**
 * A single validation error with a human-readable message.
 */
export interface ValidationError {
  /** Path-style reference e.g. "dataTypes[0].dataTypeId" */
  path: string;
  /** Human-readable error message */
  message: string;
}

/**
 * Aggregate validation result.
 *
 * - `errors` -- flat list of all validation errors (for MessageBar summary).
 * - `dataTypeErrors` -- keyed by dataType index, then by field name, holds a single
 *   error message per field (for inline display in DataTypeEditorPanel).
 * - `columnErrors` -- keyed by dataType index, then by column index, then by field name
 *   (for inline display in ColumnDefinitionsEditor).
 */
export interface ValidationResult {
  errors: ValidationError[];
  dataTypeErrors: Record<number, Record<string, string>>;
  columnErrors: Record<number, Record<number, Record<string, string>>>;
}

/** Valid column type values. */
const VALID_COLUMN_TYPES = new Set(['string', 'number', 'date', 'boolean']);

/** Valid sort ordering directions. */
const VALID_SORT_DIRECTIONS = new Set(['ASC', 'DESC']);

/** Regex to extract placeholders like ${someValue} from a template string. */
const PLACEHOLDER_REGEX = /\$\{([^}]+)\}/g;

/** The only allowed placeholder names inside headerSummaryTextTemplate. */
const VALID_PLACEHOLDERS = new Set(['changedValuesCount', 'changedEntitiesCount']);

/**
 * Client-side validation for a DELTA_BY_UNIQUE_ID definition.
 *
 * Mirrors the rules from the backend
 * `ChangeViewDefinitionValidationService.validateDeltaByUniqueIdDefinition()`.
 */
export function validateDeltaDefinition(definition: DeltaDefinitionState): ValidationResult {
  const errors: ValidationError[] = [];
  const dataTypeErrors: Record<number, Record<string, string>> = {};
  const columnErrors: Record<number, Record<number, Record<string, string>>> = {};

  const dataTypes = definition.dataTypes;

  // Track all dataTypeIds for duplicate detection
  const allDataTypeIds = new Set<string>();

  for (let i = 0; i < dataTypes.length; i++) {
    const dt = dataTypes[i];
    const prefix = `dataTypes[${i}]`;
    const dtErrors: Record<string, string> = {};
    const dtColumnErrors: Record<number, Record<string, string>> = {};

    // ----------------------------------------------------------------
    // Per-dataType field validation
    // ----------------------------------------------------------------

    // dataTypeId: required, non-empty string, unique across all dataTypes
    if (!dt.dataTypeId || dt.dataTypeId.trim() === '') {
      const msg = `${prefix}.dataTypeId: must be a non-empty string`;
      errors.push({ path: `${prefix}.dataTypeId`, message: msg });
      dtErrors['dataTypeId'] = msg;
    } else if (allDataTypeIds.has(dt.dataTypeId)) {
      const msg = `Duplicate dataTypeId: '${dt.dataTypeId}'`;
      errors.push({ path: `${prefix}.dataTypeId`, message: msg });
      dtErrors['dataTypeId'] = msg;
    } else {
      allDataTypeIds.add(dt.dataTypeId);
    }

    // dataTypeTitle: required, non-empty string
    if (!dt.dataTypeTitle || dt.dataTypeTitle.trim() === '') {
      const msg = `${prefix}.dataTypeTitle: must be a non-empty string`;
      errors.push({ path: `${prefix}.dataTypeTitle`, message: msg });
      dtErrors['dataTypeTitle'] = msg;
    }

    // headerSummaryTextTemplate: only specific placeholders allowed
    if (dt.headerSummaryTextTemplate != null && dt.headerSummaryTextTemplate !== '') {
      const template = dt.headerSummaryTextTemplate;
      // Reset regex lastIndex since it has the global flag
      PLACEHOLDER_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = PLACEHOLDER_REGEX.exec(template)) !== null) {
        const placeholder = match[1];
        if (!VALID_PLACEHOLDERS.has(placeholder)) {
          const msg = `${prefix}.headerSummaryTextTemplate: invalid placeholder '\${${placeholder}}'; allowed placeholders are \${changedValuesCount} and \${changedEntitiesCount}`;
          errors.push({ path: `${prefix}.headerSummaryTextTemplate`, message: msg });
          dtErrors['headerSummaryTextTemplate'] = msg;
        }
      }
    }

    // columnDefinitions: required, non-empty array
    if (!dt.columnDefinitions || dt.columnDefinitions.length === 0) {
      const msg = `${prefix}.columnDefinitions: must be a non-empty array`;
      errors.push({ path: `${prefix}.columnDefinitions`, message: msg });
      dtErrors['columnDefinitions'] = msg;
    } else {
      // ----------------------------------------------------------------
      // Per-column validation
      // ----------------------------------------------------------------
      const dataAttributes = new Set<string>();
      let entityIdCount = 0;

      for (let j = 0; j < dt.columnDefinitions.length; j++) {
        const col = dt.columnDefinitions[j];
        const colPrefix = `${prefix}.columnDefinitions[${j}]`;
        const colErrors: Record<string, string> = {};

        // dataAttribute: required, non-empty, unique within the dataType
        if (!col.dataAttribute || col.dataAttribute.trim() === '') {
          const msg = `${colPrefix}.dataAttribute: must be a non-empty string`;
          errors.push({ path: `${colPrefix}.dataAttribute`, message: msg });
          colErrors['dataAttribute'] = msg;
        } else if (dataAttributes.has(col.dataAttribute)) {
          const msg = `${colPrefix}.dataAttribute: duplicate value '${col.dataAttribute}' within dataType${dt.dataTypeId ? ` '${dt.dataTypeId}'` : ''}`;
          errors.push({ path: `${colPrefix}.dataAttribute`, message: msg });
          colErrors['dataAttribute'] = msg;
        } else {
          dataAttributes.add(col.dataAttribute);
        }

        // type: required, must be one of string/number/date/boolean
        if (!col.type || col.type.trim() === '') {
          const msg = `${colPrefix}.type: must be a non-empty string`;
          errors.push({ path: `${colPrefix}.type`, message: msg });
          colErrors['type'] = msg;
        } else if (!VALID_COLUMN_TYPES.has(col.type)) {
          const msg = `${colPrefix}.type: must be one of [string, number, date, boolean], got '${col.type}'`;
          errors.push({ path: `${colPrefix}.type`, message: msg });
          colErrors['type'] = msg;
        }

        // display: required, non-empty
        if (!col.display || col.display.trim() === '') {
          const msg = `${colPrefix}.display: must be a non-empty string`;
          errors.push({ path: `${colPrefix}.display`, message: msg });
          colErrors['display'] = msg;
        }

        // Track isEntityId count
        if (col.isEntityId === true) {
          entityIdCount++;
        }

        if (Object.keys(colErrors).length > 0) {
          dtColumnErrors[j] = colErrors;
        }
      }

      // Exactly one column per dataType must have isEntityId: true
      if (entityIdCount === 0) {
        const msg = `${prefix}.columnDefinitions: exactly one column must have isEntityId: true`;
        errors.push({ path: `${prefix}.columnDefinitions.isEntityId`, message: msg });
        dtErrors['isEntityId'] = msg;
      } else if (entityIdCount > 1) {
        const msg = `${prefix}.columnDefinitions: exactly one column must have isEntityId: true, found ${entityIdCount}`;
        errors.push({ path: `${prefix}.columnDefinitions.isEntityId`, message: msg });
        dtErrors['isEntityId'] = msg;
      }

      // ----------------------------------------------------------------
      // Sort ordering validation
      // ----------------------------------------------------------------
      if (dt.sortOrdering) {
        // sortOrdering.dataAttribute must reference an existing columnDefinition
        if (!dt.sortOrdering.dataAttribute || dt.sortOrdering.dataAttribute.trim() === '') {
          const msg = `${prefix}.sortOrdering.dataAttribute: must be a non-empty string`;
          errors.push({ path: `${prefix}.sortOrdering.dataAttribute`, message: msg });
          dtErrors['sortOrdering.dataAttribute'] = msg;
        } else if (!dataAttributes.has(dt.sortOrdering.dataAttribute)) {
          const msg = `${prefix}.sortOrdering.dataAttribute: '${dt.sortOrdering.dataAttribute}' does not reference an existing columnDefinition`;
          errors.push({ path: `${prefix}.sortOrdering.dataAttribute`, message: msg });
          dtErrors['sortOrdering.dataAttribute'] = msg;
        }

        // sortOrdering.direction must be ASC or DESC
        if (!dt.sortOrdering.direction || dt.sortOrdering.direction.trim() === '') {
          const msg = `${prefix}.sortOrdering.direction: must be a non-empty string`;
          errors.push({ path: `${prefix}.sortOrdering.direction`, message: msg });
          dtErrors['sortOrdering.direction'] = msg;
        } else if (!VALID_SORT_DIRECTIONS.has(dt.sortOrdering.direction)) {
          const msg = `${prefix}.sortOrdering.direction: must be 'ASC' or 'DESC', got '${dt.sortOrdering.direction}'`;
          errors.push({ path: `${prefix}.sortOrdering.direction`, message: msg });
          dtErrors['sortOrdering.direction'] = msg;
        }
      }
    }

    // ----------------------------------------------------------------
    // rowThreshold / overflowMessage validation
    // ----------------------------------------------------------------
    if (dt.rowThreshold != null) {
      if (!Number.isInteger(dt.rowThreshold) || dt.rowThreshold < 1) {
        const msg = `${prefix}.rowThreshold: must be a positive integer`;
        errors.push({ path: `${prefix}.rowThreshold`, message: msg });
        dtErrors['rowThreshold'] = msg;
      } else {
        // overflowMessage required when rowThreshold is set
        if (!dt.overflowMessage || dt.overflowMessage.trim() === '') {
          const msg = `${prefix}.overflowMessage: required when rowThreshold is set`;
          errors.push({ path: `${prefix}.overflowMessage`, message: msg });
          dtErrors['overflowMessage'] = msg;
        }
      }
    }

    // Store accumulated errors for this dataType
    if (Object.keys(dtErrors).length > 0) {
      dataTypeErrors[i] = dtErrors;
    }
    if (Object.keys(dtColumnErrors).length > 0) {
      columnErrors[i] = dtColumnErrors;
    }
  }

  return { errors, dataTypeErrors, columnErrors };
}
