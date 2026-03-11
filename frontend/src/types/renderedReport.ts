// ============================================================================
// TypeScript types for the renderedReport JSON payload and frontend DTOs
// ============================================================================

// --- Rendered Report Structure ---

/** Top-level rendered report payload returned inside ImpactReportDetailFe */
export interface RenderedReport {
  reportKey: string;
  reportName: string;
  definitionVersion: number;
  generatedAt: string;
  scenarioId: string;
  scenarioName: string;
  scenarioTypeCode: string;
  sections: ReportSection[];
}

/** A section within a rendered report, containing ordered content blocks */
export interface ReportSection {
  sectionKey: string;
  sectionTitle: string;
  order: number;
  contentBlocks: ContentBlock[];
}

/** Discriminated union of content block types */
export type ContentBlock = MetricBlock | TextBlock | TableBlock;

/** A metric block displaying a single KPI with production/scenario comparison */
export interface MetricBlock {
  blockType: 'metric';
  order: number;
  metricKey: string;
  label: string;
  sourceField: string;
  format: string;
  unit: string | null;
  productionValue: number | string;
  scenarioValue: number | string;
  deltaValue: number | string;
  deltaPct: number | string;
  formattedProductionValue: string;
  formattedScenarioValue: string;
  formattedDelta: string;
  formatToken: string;
}

/** A text block displaying static content */
export interface TextBlock {
  blockType: 'text';
  order: number;
  textKey: string;
  content: string;
}

/** A table block with grouped column headers and row data */
export interface TableBlock {
  blockType: 'table';
  order: number;
  tableKey: string;
  label: string;
  columnLayout: ColumnLayout;
  rows: TableRow[];
}

/** Column layout defining row-identifying columns and grouped data columns */
export interface ColumnLayout {
  rowColumns: RowColumnDef[];
  columnGroups: ColumnGroup[];
}

/** A row-identifying column definition (e.g., "Risk Class", "Sub-bucket") */
export interface RowColumnDef {
  key: string;
  header: string;
}

/** A group header spanning its child columns (e.g., "Production", "Scenario", "Delta") */
export interface ColumnGroup {
  groupLabel: string;
  columns: ColumnDef[];
}

/** A single data column within a group */
export interface ColumnDef {
  key: string;
  header: string;
  formatToken?: string;
}

/** A row of data in a table block, keyed by column key */
export interface TableRow {
  rowId: string;
  cells: Record<string, TableCell>;
}

/** A single cell value with optional per-cell format token */
export interface TableCell {
  value: string;
  formatToken?: string;
}

// --- Frontend DTO Types ---

/** Summary of an impact report, used for tab construction */
export interface ImpactReportSummaryFe {
  id: string;
  scenarioId: string;
  reportKey: string;
  reportName: string;
  generatedAt: string;
  status: string;
}

/** Detail of an impact report, including the full rendered report payload */
export interface ImpactReportDetailFe {
  id: string;
  status: string;
  reportName: string;
  generatedAt: string;
  errorMessage: string | null;
  renderedReport: RenderedReport | null;
}

/** Per-report detail state for Redux caching */
export interface ReportDetailState {
  loading: boolean;
  data: RenderedReport | null;
  error: string | null;
  errorMessage: string | null;
}
