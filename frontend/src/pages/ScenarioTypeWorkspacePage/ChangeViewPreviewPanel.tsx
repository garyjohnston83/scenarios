import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Spinner, TabList, Tab } from '@fluentui/react-components';
import { ArrowClockwise24Regular } from '@fluentui/react-icons';
import type { SelectionEvents, TabValue } from '@fluentui/react-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCvPreviewRequest } from '../../store/changeViewDefinitionAdminSlice';
import { ReportRenderer } from '../../components/ReportRenderer';
import { fetchChangeViewPreview } from '../../services/changeViewDefinitionAdminApi';
import { DeltaPreviewRenderer } from './DeltaPreviewRenderer';
import type {
  RenderedReport,
  ReportSection,
  ContentBlock,
  TextBlock,
  TableBlock,
  ColumnLayout,
  RowColumnDef,
  ColumnGroup,
  ColumnDef,
  TableRow,
  TableCell,
} from '../../types/renderedReport';
import type {
  DirectChangesDataSectionFe,
  DirectChangesColumnDefinitionFe,
} from '../../types/directChanges';
import styles from './ChangeViewPreviewPanel.module.scss';

interface ChangeViewPreviewPanelProps {
  definitionJson: string;
  scenarioTypeCode: string;
}

// ---------------------------------------------------------------------------
// Client-side structural preview builder
// ---------------------------------------------------------------------------

/**
 * Parse definition JSON and build a mock RenderedReport with placeholder values.
 * Only handles contentBlocks[] with 'text' and 'table' block types.
 * Maps template_key to reportKey for ReportRenderer compatibility.
 */
export function buildStructuralPreview(jsonStr: string): RenderedReport | null {
  let def: Record<string, unknown>;
  try {
    def = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  const sections: ReportSection[] = [];
  const defSections = (def.sections as Array<Record<string, unknown>>) || [];

  defSections.forEach((sec, secIdx) => {
    const sectionKey = (sec.key as string) || `section_${secIdx}`;
    const sectionTitle = (sec.title as string) || sectionKey;
    const order = (sec.order as number) ?? secIdx + 1;
    const contentBlocks: ContentBlock[] = [];

    // Only handle contentBlocks[] format (no legacy metrics[] support)
    const rawBlocks = sec.contentBlocks as Array<Record<string, unknown>> | undefined;

    if (rawBlocks && Array.isArray(rawBlocks)) {
      rawBlocks.forEach((block, blockIdx) => {
        const blockType = block.blockType as string;
        switch (blockType) {
          case 'text':
            contentBlocks.push(buildTextBlock(block, blockIdx));
            break;
          case 'table':
            contentBlocks.push(buildTableBlock(block, blockIdx));
            break;
          default:
            // Skip metric blocks and any other unknown block types
            break;
        }
      });
    }
    // No legacy metrics[] handling

    sections.push({
      sectionKey,
      sectionTitle,
      order,
      contentBlocks,
    });
  });

  return {
    reportKey: (def.template_key as string) || 'preview',
    reportName: (def.display_name as string) || 'Preview Change View',
    definitionVersion: 0,
    generatedAt: new Date().toISOString(),
    scenarioId: 'preview',
    scenarioName: 'Preview Scenario',
    scenarioTypeCode: (def.scenario_type as string) || '',
    sections,
  };
}

function buildTextBlock(raw: Record<string, unknown>, order: number): TextBlock {
  return {
    blockType: 'text',
    order,
    textKey: (raw.key as string) || `text_${order}`,
    content: (raw.content as string) || '',
  };
}

function buildTableBlock(raw: Record<string, unknown>, order: number): TableBlock {
  // rowColumns
  const rawRowCols = (raw.rowColumns as Array<Record<string, string>>) || [];
  const rowColumns: RowColumnDef[] = rawRowCols.map((rc) => ({
    key: rc.key || '',
    header: rc.header || '',
  }));

  // columnGroups
  const rawGroups = (raw.columnGroups as Array<Record<string, unknown>>) || [];
  const columnGroups: ColumnGroup[] = rawGroups.map((g) => {
    const cols = (g.columns as Array<Record<string, string>>) || [];
    const columns: ColumnDef[] = cols.map((c) => ({
      key: c.key || '',
      header: c.header || '',
    }));
    return {
      groupLabel: (g.groupLabel as string) || '',
      columns,
    };
  });

  const columnLayout: ColumnLayout = { rowColumns, columnGroups };

  // rows
  const rawRows = (raw.rows as Array<Record<string, unknown>>) || [];
  const rows: TableRow[] = rawRows.map((r, rowIdx) => {
    const rowId = (r.rowId as string) || `row_${rowIdx}`;
    const rawCells = (r.cells as Record<string, Record<string, string>>) || {};
    const cells: Record<string, TableCell> = {};
    Object.entries(rawCells).forEach(([cellKey, cellVal]) => {
      if (cellVal && typeof cellVal === 'object') {
        cells[cellKey] = {
          value: cellVal.value ?? 'Sample',
          formatToken: cellVal.formatToken,
        };
      } else {
        cells[cellKey] = { value: 'Sample' };
      }
    });
    return { rowId, cells };
  });

  // If no rows defined, create one sample row
  if (rows.length === 0 && (rowColumns.length > 0 || columnGroups.length > 0)) {
    const sampleCells: Record<string, TableCell> = {};
    rowColumns.forEach((rc) => {
      sampleCells[rc.key] = { value: 'Sample' };
    });
    columnGroups.forEach((g) => {
      g.columns.forEach((c) => {
        sampleCells[c.key] = { value: 'Sample' };
      });
    });
    rows.push({ rowId: 'sample_row', cells: sampleCells });
  }

  return {
    blockType: 'table',
    order,
    tableKey: (raw.key as string) || `table_${order}`,
    label: (raw.label as string) || '(no label)',
    columnLayout,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Client-side DELTA_BY_UNIQUE_ID preview builder (Task 7.2)
// ---------------------------------------------------------------------------

/** Mock number values used for number-type columns. */
const MOCK_NUMBERS = [123.45, 456.78, 789.01, 234.56, 567.89];

/** Mock date values used for date-type columns. */
const MOCK_DATES = ['2026-01-15', '2026-02-20', '2026-03-10', '2026-04-05', '2026-05-18'];

/**
 * Parse a DELTA_BY_UNIQUE_ID definition JSON and build an array of
 * DirectChangesDataSectionFe with mock data for preview purposes.
 *
 * For each dataType, generates 3-5 mock rows with type-appropriate values:
 * - String columns: "Value_1", "Value_2", etc.; entityId string columns: "Entity_1", etc.
 * - Number columns: 123.45, 456.78, 789.01, etc.
 * - Date columns: ISO date strings like "2026-01-15", etc.
 * - Boolean columns: alternating true, false
 *
 * Fills headerSummaryTextTemplate placeholders with mock counts.
 */
export function buildDeltaPreview(jsonStr: string): DirectChangesDataSectionFe[] | null {
  let def: Record<string, unknown>;
  try {
    def = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  // Check renderMode
  if (def.renderMode !== 'DELTA_BY_UNIQUE_ID') {
    return null;
  }

  const dataTypes = def.dataTypes as Array<Record<string, unknown>> | undefined;
  if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
    return null;
  }

  const sections: DirectChangesDataSectionFe[] = [];

  for (const dt of dataTypes) {
    const dataTypeId = (dt.dataTypeId as string) || 'unknown';
    const columnDefs = (dt.columnDefinitions as Array<Record<string, unknown>>) || [];
    const headerTemplate = (dt.headerSummaryTextTemplate as string) || '';

    // Build column definitions for the section
    const columnDefinitions: DirectChangesColumnDefinitionFe[] = columnDefs.map((col) => ({
      dataAttribute: (col.dataAttribute as string) || '',
      type: (col.type as string) || 'string',
      display: (col.display as string) || '',
      isEntityId: col.isEntityId === true,
    }));

    // Generate 3-5 mock rows (using 4 as the default count)
    const rowCount = 4;
    const rows: Record<string, unknown>[] = [];

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const row: Record<string, unknown> = {};
      const valueCounter = rowIdx + 1;

      for (const col of columnDefinitions) {
        const colType = col.type;
        const isEntityId = col.isEntityId === true;

        switch (colType) {
          case 'string':
            if (isEntityId) {
              row[col.dataAttribute] = `Entity_${valueCounter}`;
            } else {
              row[col.dataAttribute] = `Value_${valueCounter}`;
            }
            break;
          case 'number':
            row[col.dataAttribute] = MOCK_NUMBERS[rowIdx % MOCK_NUMBERS.length];
            break;
          case 'date':
            row[col.dataAttribute] = MOCK_DATES[rowIdx % MOCK_DATES.length];
            break;
          case 'boolean':
            row[col.dataAttribute] = rowIdx % 2 === 0;
            break;
          default:
            row[col.dataAttribute] = `Value_${valueCounter}`;
            break;
        }
      }

      rows.push(row);
    }

    // Compute mock counts for header placeholder replacement
    const changedValuesCount = rowCount;

    // Count unique entity values (from the entityId column)
    const entityIdCol = columnDefinitions.find((c) => c.isEntityId === true);
    let changedEntitiesCount = rowCount;
    if (entityIdCol) {
      const uniqueEntities = new Set(rows.map((r) => String(r[entityIdCol.dataAttribute])));
      changedEntitiesCount = uniqueEntities.size;
    }

    // Fill headerSummaryTextTemplate placeholders
    let header = headerTemplate;
    header = header.replace(/\$\{changedValuesCount\}/g, String(changedValuesCount));
    header = header.replace(/\$\{changedEntitiesCount\}/g, String(changedEntitiesCount));

    // If no template was provided, use a default header
    if (!header) {
      header = `${changedValuesCount} changes in ${dataTypeId}`;
    }

    sections.push({
      dataType: dataTypeId,
      header,
      externalLink: null,
      totalDataChanges: changedValuesCount,
      renderState: 'ROWS',
      columnDefinitions,
      data: rows,
    });
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Extract renderMode from definition JSON
// ---------------------------------------------------------------------------
function extractRenderMode(jsonStr: string): string | null {
  try {
    const parsed = JSON.parse(jsonStr);
    return parsed.renderMode || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Extract definition display name and version from JSON
// ---------------------------------------------------------------------------
function extractDefinitionMeta(jsonStr: string): { displayName: string; version: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      displayName: parsed.display_name || parsed.template_key || 'Untitled',
      version: parsed.schema_version || '?',
    };
  } catch {
    return { displayName: 'Untitled', version: '?' };
  }
}

// ---------------------------------------------------------------------------
// ChangeViewPreviewPanel component
// ---------------------------------------------------------------------------

export const ChangeViewPreviewPanel: React.FC<ChangeViewPreviewPanelProps> = ({
  definitionJson,
  scenarioTypeCode,
}) => {
  const dispatch = useAppDispatch();
  const previewing = useAppSelector((state) => state.changeViewDefinitionAdmin.previewing);

  // Preview mode: structural (client-side) or data-driven (backend)
  const [previewMode, setPreviewMode] = useState<'structural' | 'data-driven'>('structural');

  // The rendered report for display (FULL_DATA_CHANGES mode)
  const [renderedReport, setRenderedReport] = useState<RenderedReport | null>(null);

  // Delta preview sections (DELTA_BY_UNIQUE_ID mode)
  const [deltaPreviewSections, setDeltaPreviewSections] = useState<DirectChangesDataSectionFe[] | null>(null);

  // Errors
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Track whether a backend fetch is in-flight locally (to show loading even when toggling)
  const [backendLoading, setBackendLoading] = useState(false);

  // Ref for debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -----------------------------------------------------------------------
  // Client-side structural preview (debounced) -- handles both
  // FULL_DATA_CHANGES and DELTA_BY_UNIQUE_ID modes (Task 7.5)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (previewMode !== 'structural') return;

    if (!definitionJson || definitionJson.trim() === '') {
      setRenderedReport(null);
      setDeltaPreviewSections(null);
      setPreviewError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        // Detect renderMode to decide which preview builder to use
        const renderMode = extractRenderMode(definitionJson);

        if (renderMode === 'DELTA_BY_UNIQUE_ID') {
          // Use delta preview builder
          const sections = buildDeltaPreview(definitionJson);
          if (sections && sections.length > 0) {
            setDeltaPreviewSections(sections);
            setRenderedReport(null);
            setPreviewError(null);
          } else {
            setDeltaPreviewSections(null);
            setRenderedReport(null);
            setPreviewError('Unable to build delta preview from definition JSON.');
          }
        } else {
          // Use structural preview builder (existing FULL_DATA_CHANGES path)
          const report = buildStructuralPreview(definitionJson);
          if (report) {
            setRenderedReport(report);
            setDeltaPreviewSections(null);
            setPreviewError(null);
          } else {
            setRenderedReport(null);
            setDeltaPreviewSections(null);
            setPreviewError('Unable to parse definition JSON for preview.');
          }
        }
      } catch (err) {
        setRenderedReport(null);
        setDeltaPreviewSections(null);
        setPreviewError(
          err instanceof Error ? err.message : 'Error building structural preview.'
        );
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [definitionJson, previewMode]);

  // -----------------------------------------------------------------------
  // Backend data-driven preview
  // -----------------------------------------------------------------------
  const fetchBackendPreview = useCallback(async () => {
    if (!definitionJson || definitionJson.trim() === '') {
      setRenderedReport(null);
      setPreviewError(null);
      return;
    }

    setBackendLoading(true);
    setPreviewError(null);

    try {
      // Dispatch to Redux so the slice tracks previewing state
      dispatch(fetchCvPreviewRequest({ scenarioTypeCode, definition: definitionJson }));

      // Also call directly to get the result
      const result = await fetchChangeViewPreview(scenarioTypeCode, definitionJson);
      const report = result as RenderedReport;
      if (report && report.sections) {
        setRenderedReport(report);
        setPreviewError(null);
      } else {
        setRenderedReport(null);
        setPreviewError('Backend returned an unexpected preview format.');
      }
    } catch (err) {
      setRenderedReport(null);
      setPreviewError(
        err instanceof Error ? err.message : 'Failed to fetch data-driven preview.'
      );
    } finally {
      setBackendLoading(false);
    }
  }, [definitionJson, scenarioTypeCode, dispatch]);

  // When switching to data-driven mode, or when definitionJson changes in data-driven mode,
  // trigger a debounced backend fetch.
  useEffect(() => {
    if (previewMode !== 'data-driven') return;

    if (!definitionJson || definitionJson.trim() === '') {
      setRenderedReport(null);
      setPreviewError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchBackendPreview();
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitionJson, previewMode]);

  // -----------------------------------------------------------------------
  // Refresh button handler
  // -----------------------------------------------------------------------
  const handleRefresh = useCallback(() => {
    if (previewMode === 'structural') {
      if (!definitionJson || definitionJson.trim() === '') return;
      try {
        const renderMode = extractRenderMode(definitionJson);

        if (renderMode === 'DELTA_BY_UNIQUE_ID') {
          const sections = buildDeltaPreview(definitionJson);
          if (sections && sections.length > 0) {
            setDeltaPreviewSections(sections);
            setRenderedReport(null);
            setPreviewError(null);
          } else {
            setDeltaPreviewSections(null);
            setRenderedReport(null);
            setPreviewError('Unable to build delta preview from definition JSON.');
          }
        } else {
          const report = buildStructuralPreview(definitionJson);
          if (report) {
            setRenderedReport(report);
            setDeltaPreviewSections(null);
            setPreviewError(null);
          } else {
            setRenderedReport(null);
            setDeltaPreviewSections(null);
            setPreviewError('Unable to parse definition JSON for preview.');
          }
        }
      } catch (err) {
        setRenderedReport(null);
        setDeltaPreviewSections(null);
        setPreviewError(
          err instanceof Error ? err.message : 'Error building structural preview.'
        );
      }
    } else {
      fetchBackendPreview();
    }
  }, [previewMode, definitionJson, fetchBackendPreview]);

  // -----------------------------------------------------------------------
  // Mode toggle handler
  // -----------------------------------------------------------------------
  const handleModeChange = (_event: SelectionEvents, data: { value: TabValue }) => {
    const newMode = data.value as 'structural' | 'data-driven';
    setPreviewMode(newMode);
    // Clear current state so it rebuilds on the new mode
    setRenderedReport(null);
    setDeltaPreviewSections(null);
    setPreviewError(null);
  };

  // -----------------------------------------------------------------------
  // Empty state: no definition JSON loaded
  // -----------------------------------------------------------------------
  if (!definitionJson || definitionJson.trim() === '') {
    return (
      <div className={styles.container} data-testid="cv-preview-panel">
        <div className={styles.header}>
          <span className={styles.headerTitle}>Preview</span>
        </div>
        <div className={styles.emptyState} data-testid="cv-preview-empty-state">
          Select a definition to preview
        </div>
      </div>
    );
  }

  const meta = extractDefinitionMeta(definitionJson);
  const isLoading = backendLoading || previewing;
  const hasContent = renderedReport || deltaPreviewSections;

  return (
    <div className={styles.container} data-testid="cv-preview-panel">
      {/* Preview header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>Preview</span>
        <span className={styles.headerMeta}>
          {meta.displayName} (v{meta.version})
        </span>
      </div>

      {/* Toolbar: mode toggle + refresh */}
      <div className={styles.toolbar}>
        <TabList
          selectedValue={previewMode}
          onTabSelect={handleModeChange}
          size="small"
          data-testid="cv-preview-mode-tabs"
        >
          <Tab value="structural" data-testid="cv-structural-preview-tab">Structural</Tab>
          <Tab value="data-driven" data-testid="cv-data-driven-preview-tab">Data-Driven</Tab>
        </TabList>

        <Button
          appearance="subtle"
          size="small"
          icon={<ArrowClockwise24Regular />}
          onClick={handleRefresh}
          disabled={isLoading}
          data-testid="cv-refresh-preview-button"
        >
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {previewError && (
        <div className={styles.errorBanner} data-testid="cv-preview-error">
          {previewError}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className={styles.loadingContainer} data-testid="cv-preview-loading">
          <Spinner size="small" label="Generating preview..." />
        </div>
      )}

      {/* Delta preview (DELTA_BY_UNIQUE_ID mode) */}
      {!isLoading && deltaPreviewSections && (
        <div className={styles.previewContent} data-testid="cv-preview-content">
          <DeltaPreviewRenderer sections={deltaPreviewSections} />
        </div>
      )}

      {/* Rendered report (FULL_DATA_CHANGES mode) */}
      {!isLoading && renderedReport && !deltaPreviewSections && (
        <div className={styles.previewContent} data-testid="cv-preview-content">
          <ReportRenderer renderedReport={renderedReport} />
        </div>
      )}

      {/* No content yet (not an error, just hasn't loaded) */}
      {!isLoading && !hasContent && !previewError && (
        <div className={styles.emptyState} data-testid="cv-preview-no-content">
          Preview will appear here once the definition is parsed.
        </div>
      )}
    </div>
  );
};

export default ChangeViewPreviewPanel;
