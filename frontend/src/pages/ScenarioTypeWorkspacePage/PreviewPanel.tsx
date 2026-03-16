import { useState, useEffect, useRef } from 'react';
import { ReportRenderer } from '../../components/ReportRenderer';
import type {
  RenderedReport,
  ReportSection,
  ContentBlock,
  MetricBlock,
  TextBlock,
  TableBlock,
  ColumnLayout,
  RowColumnDef,
  ColumnGroup,
  ColumnDef,
  TableRow,
  TableCell,
} from '../../types/renderedReport';
import styles from './PreviewPanel.module.scss';

interface PreviewPanelProps {
  definitionJson: string;
  sampleData?: string;
}

// ---------------------------------------------------------------------------
// Sample data parsed type
// ---------------------------------------------------------------------------
interface ParsedSampleData {
  metrics?: Record<string, string>;
  tables?: Record<string, Array<Record<string, unknown>>>;
}

function parseSampleData(sampleDataStr?: string): ParsedSampleData | null {
  if (!sampleDataStr || sampleDataStr.trim() === '') return null;
  try {
    return JSON.parse(sampleDataStr) as ParsedSampleData;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Client-side preview builder
// ---------------------------------------------------------------------------

/**
 * Parse definition JSON and build a mock RenderedReport with placeholder values.
 * Handles both Format A (metrics[]) and Format B (contentBlocks[]).
 * Resolves values from sample data when available.
 */
function buildStructuralPreview(jsonStr: string, sampleDataStr?: string): RenderedReport | null {
  let def: Record<string, unknown>;
  try {
    def = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  const sampleData = parseSampleData(sampleDataStr);

  const sections: ReportSection[] = [];
  const defSections = (def.sections as Array<Record<string, unknown>>) || [];

  defSections.forEach((sec, secIdx) => {
    const sectionKey = (sec.key as string) || `section_${secIdx}`;
    const sectionTitle = (sec.title as string) || sectionKey;
    const order = (sec.order as number) ?? secIdx + 1;
    const contentBlocks: ContentBlock[] = [];

    // Format B: contentBlocks[]
    const rawBlocks = sec.contentBlocks as Array<Record<string, unknown>> | undefined;
    // Format A: metrics[]
    const rawMetrics = sec.metrics as Array<Record<string, unknown>> | undefined;

    if (rawBlocks && Array.isArray(rawBlocks)) {
      rawBlocks.forEach((block, blockIdx) => {
        const blockType = block.blockType as string;
        switch (blockType) {
          case 'metric':
            contentBlocks.push(buildMetricBlock(block, blockIdx, sampleData));
            break;
          case 'text':
            contentBlocks.push(buildTextBlock(block, blockIdx));
            break;
          case 'table':
            contentBlocks.push(buildTableBlock(block, blockIdx, sampleData));
            break;
          default:
            // Unknown block type -- skip
            break;
        }
      });
    } else if (rawMetrics && Array.isArray(rawMetrics)) {
      // Format A: convert metrics[] to MetricBlock content blocks
      rawMetrics.forEach((metric, metricIdx) => {
        contentBlocks.push(buildMetricBlock(metric, metricIdx, sampleData));
      });
    }

    sections.push({
      sectionKey,
      sectionTitle,
      order,
      contentBlocks,
    });
  });

  return {
    reportKey: (def.report_key as string) || 'preview',
    reportName: (def.display_name as string) || 'Preview Report',
    definitionVersion: 0,
    generatedAt: new Date().toISOString(),
    scenarioId: 'preview',
    scenarioName: 'Preview Scenario',
    scenarioTypeCode: (def.scenario_type as string) || '',
    sections,
  };
}

function buildMetricBlock(raw: Record<string, unknown>, order: number, sampleData: ParsedSampleData | null): MetricBlock {
  const sourceField = (raw.source_field as string) || '';

  // Resolve value from sample data
  let resolvedValue = 'N/A';
  if (sampleData?.metrics && sourceField && sourceField in sampleData.metrics) {
    resolvedValue = sampleData.metrics[sourceField];
  }

  return {
    blockType: 'metric',
    order,
    metricKey: (raw.key as string) || `metric_${order}`,
    label: (raw.label as string) || '(no label)',
    sourceField,
    format: (raw.format as string) || 'text',
    unit: (raw.unit as string) || null,
    productionValue: resolvedValue,
    scenarioValue: resolvedValue,
    deltaValue: 'N/A',
    deltaPct: 'N/A',
    formattedProductionValue: resolvedValue,
    formattedScenarioValue: resolvedValue,
    formattedDelta: 'N/A',
    formatToken: 'neutral',
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

function buildTableBlock(raw: Record<string, unknown>, order: number, sampleData: ParsedSampleData | null): TableBlock {
  const tableKey = (raw.key as string) || `table_${order}`;

  // rowColumns
  const rawRowCols = (raw.rowColumns as Array<Record<string, string>>) || [];
  const rowColumns: RowColumnDef[] = rawRowCols.map((rc) => ({
    key: rc.key || '',
    header: rc.header || '',
    ...(rc.width ? { width: rc.width } : {}),
  }));

  // columnGroups
  const rawGroups = (raw.columnGroups as Array<Record<string, unknown>>) || [];
  const columnGroups: ColumnGroup[] = rawGroups.map((g) => {
    const cols = (g.columns as Array<Record<string, string>>) || [];
    const columns: ColumnDef[] = cols.map((c) => ({
      key: c.key || '',
      header: c.header || '',
      ...(c.width ? { width: c.width } : {}),
    }));
    return {
      groupLabel: (g.groupLabel as string) || '',
      columns,
    };
  });

  const columnLayout: ColumnLayout = { rowColumns, columnGroups };

  // Get rows from sample data only — rows are not part of the template definition
  let rows: TableRow[] = [];

  if (sampleData?.tables && tableKey in sampleData.tables) {
    const sampleRows = sampleData.tables[tableKey];
    rows = sampleRows.map((sampleRow, rowIdx) => {
      const cells: Record<string, TableCell> = {};

      // Detect format: nested {rowId, cells: {...}} vs flat {colKey: value}
      const hasCellsProperty = sampleRow.cells && typeof sampleRow.cells === 'object' && !Array.isArray(sampleRow.cells);

      if (hasCellsProperty) {
        // Nested format: { rowId: "...", cells: { colKey: { value, formatToken } } }
        const cellsObj = sampleRow.cells as Record<string, unknown>;
        Object.entries(cellsObj).forEach(([cellKey, cellVal]) => {
          if (cellVal && typeof cellVal === 'object' && 'value' in (cellVal as Record<string, unknown>)) {
            const typedCell = cellVal as Record<string, string>;
            cells[cellKey] = {
              value: typedCell.value ?? 'Sample',
              formatToken: typedCell.formatToken,
            };
          } else {
            cells[cellKey] = { value: String(cellVal ?? 'Sample') };
          }
        });
        const rowId = (sampleRow.rowId as string) || `sample_row_${rowIdx}`;
        return { rowId, cells };
      } else {
        // Flat format: { colKey: value_or_cell_object, ... }
        Object.entries(sampleRow).forEach(([cellKey, cellVal]) => {
          if (cellVal && typeof cellVal === 'object' && 'value' in (cellVal as Record<string, unknown>)) {
            const typedCell = cellVal as Record<string, string>;
            cells[cellKey] = {
              value: typedCell.value ?? 'Sample',
              formatToken: typedCell.formatToken,
            };
          } else {
            cells[cellKey] = { value: String(cellVal ?? 'Sample') };
          }
        });
        return { rowId: `sample_row_${rowIdx}`, cells };
      }
    });
  }

  // If no rows at all, create one sample row
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
    tableKey,
    label: (raw.label as string) || '(no label)',
    columnLayout,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Extract definition display name and version from JSON
// ---------------------------------------------------------------------------
function extractDefinitionMeta(jsonStr: string): { displayName: string; version: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      displayName: parsed.display_name || parsed.report_key || 'Untitled',
      version: parsed.schema_version || '?',
    };
  } catch {
    return { displayName: 'Untitled', version: '?' };
  }
}

// ---------------------------------------------------------------------------
// PreviewPanel component
// ---------------------------------------------------------------------------

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  definitionJson,
  sampleData,
}) => {
  // The rendered report for display
  const [renderedReport, setRenderedReport] = useState<RenderedReport | null>(null);

  // Errors
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Ref for debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -----------------------------------------------------------------------
  // Rebuild preview when props change (triggered by save events)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!definitionJson || definitionJson.trim() === '') {
      setRenderedReport(null);
      setPreviewError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        const report = buildStructuralPreview(definitionJson, sampleData);
        if (report) {
          setRenderedReport(report);
          setPreviewError(null);
        } else {
          setRenderedReport(null);
          setPreviewError('Unable to parse definition JSON for preview.');
        }
      } catch (err) {
        setRenderedReport(null);
        setPreviewError(
          err instanceof Error ? err.message : 'Error building preview.'
        );
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [definitionJson, sampleData]);

  // -----------------------------------------------------------------------
  // Empty state: no definition JSON loaded
  // -----------------------------------------------------------------------
  if (!definitionJson || definitionJson.trim() === '') {
    return (
      <div className={styles.container} data-testid="preview-panel">
        <div className={styles.header}>
          <span className={styles.headerTitle}>Preview</span>
        </div>
        <div className={styles.emptyState} data-testid="preview-empty-state">
          Select a definition to preview
        </div>
      </div>
    );
  }

  const meta = extractDefinitionMeta(definitionJson);

  return (
    <div className={styles.container} data-testid="preview-panel">
      {/* Preview header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>Preview</span>
        <span className={styles.headerMeta}>
          {meta.displayName} (v{meta.version})
        </span>
      </div>

      {/* Error state */}
      {previewError && (
        <div className={styles.errorBanner} data-testid="preview-error">
          {previewError}
        </div>
      )}

      {/* Rendered report */}
      {renderedReport && (
        <div className={styles.previewContent} data-testid="preview-content">
          <ReportRenderer renderedReport={renderedReport} />
        </div>
      )}

      {/* No content yet (not an error, just hasn't loaded) */}
      {!renderedReport && !previewError && (
        <div className={styles.emptyState} data-testid="preview-no-content">
          Preview will appear here once the definition is parsed.
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
