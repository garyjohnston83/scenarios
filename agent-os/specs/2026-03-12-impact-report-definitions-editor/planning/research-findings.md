# Research Findings: Impact Report Definitions Editor (Increment 4)

## 1. Existing ReportDefinition Entity and Persistence

### Entity: `ReportDefinition.java`
- Path: `model-logic-service/src/main/java/com/prototypes/scenarios/entity/ReportDefinition.java`
- Fields: `id` (UUID PK), `scenarioTypeCode` (varchar 50, FK), `reportKey` (varchar 100), `version` (int), `definition` (text/JSONB), `isActive` (boolean), `createdAt`, `updatedAt`
- The `definition` column stores the full JSON report definition as text (mapped as `columnDefinition = "text"` in JPA, but backed by JSONB in PostgreSQL per Liquibase changeset 028)
- **Important**: There is no `@Column(columnDefinition = "jsonb")` or `@Type` annotation on the definition field -- it's stored as plain `text` in JPA but as `JSONB` in PostgreSQL (H2 uses `CLOB`)

### Repository: `ReportDefinitionRepository.java`
- Key queries: `findAllByIsActiveTrue()`, `findAllByScenarioTypeCodeAndIsActiveTrue()`, `findFirstByReportKeyAndIsActiveTrueOrderByVersionDesc()`, `findAllByReportKeyOrderByVersionDesc()`, `findMaxVersion()` (JPQL), `countByScenarioTypeCodeAndIsActiveTrue()`
- Versioning is per (scenarioTypeCode, reportKey) pair -- `findMaxVersion` returns the max version for a specific combo

### Service: `ReportDefinitionService.java`
- Injects: `ReportDefinitionRepository`, `ReportDefinitionValidationService`, `ScenarioTypeRepository`, `ObjectMapper`
- `createDefinition()`: validates JSON via `ReportDefinitionValidationService`, validates scenarioTypeCode exists, computes next version via `findMaxVersion + 1`, saves with retry on `DataIntegrityViolationException`
- `deactivateDefinition()`: sets `isActive = false`, updates timestamp, saves
- **Key behavior**: New definitions are always created with `isActive = true`. There is NO `activateDefinition` method currently -- only create (auto-active) and deactivate
- The `CreateReportDefinitionRequestDto` accepts: `scenarioTypeCode`, `reportKey`, `definition` (raw JSON string)

### Validation: `ReportDefinitionValidationService.java`
- Validates JSON structure: `schema_version` (must be "1.0"), `report_key` (pattern `[a-z0-9_]+`), `scenario_type` (pattern `[A-Z0-9_]+`), `display_name` (required), `sections` (non-empty array)
- Section validation: `key` (required), `title` (required), `order` (int >= 1), `metrics` (non-empty array)
- Metric validation: `key`, `label`, `source_field`, `format` (one of: number, currency, percentage, text)
- **Gap identified**: Validation only validates `sections[].metrics[]` format (the old/simple schema) but does NOT validate `sections[].contentBlocks[]` format (the newer format with table/text blocks). The `ImpactReportSnapshotGenerator` handles BOTH formats at runtime, but the validation service only checks the `metrics[]` shape.

### Controller: `ReportDefinitionController.java`
- Routes under `/report-definitions` (NOT under `/admin/scenario-types`)
- Endpoints: `GET /report-definitions?scenarioType=`, `GET /report-definitions/{reportKey}`, `GET /report-definitions/{reportKey}/versions`, `POST /report-definitions`, `POST /report-definitions/{id}/deactivate`
- These routes are NOT nested under `/admin/scenario-types/{code}` -- they exist as standalone routes.

### Liquibase: Changeset 028
- Table: `report_definition` with JSONB column (PostgreSQL) / CLOB (H2) via property substitution `${jsonColumnType}`
- Unique constraint: `(scenario_type_code, report_key, version)`
- Lookup index on `(scenario_type_code, report_key, is_active)`
- GIN index on `definition` column (PostgreSQL only)

### DTO: `ReportDefinitionDto`
- Record: `id`, `scenarioTypeCode`, `reportKey`, `version`, `definition`, `isActive`, `createdAt`, `updatedAt`
- The `definition` field is a raw JSON String in the DTO -- no parsed/typed representation

## 2. Report Definition JSON Schema (Two Formats)

### Format A: Simple/Legacy (metrics-only, used in seed data 029)
```json
{
  "schema_version": "1.0",
  "report_key": "sa_capital_summary",
  "scenario_type": "FRTB_SA",
  "display_name": "SA Capital Charge Summary",
  "description": "...",
  "sections": [
    {
      "key": "delta_sensitivity",
      "title": "Delta Sensitivity",
      "order": 1,
      "metrics": [
        {
          "key": "girr_delta",
          "label": "GIRR Delta",
          "unit": "USD",
          "source_field": "risk_charges.girr.delta",
          "format": "currency",
          "formatRules": [...]
        }
      ]
    }
  ],
  "metadata": { "author": "system", "tags": [...] }
}
```

### Format B: Complex/New (contentBlocks with table/text/metric blocks, used in changesets 033-035)
```json
{
  "schema_version": "1.0",
  "report_key": "market_risk_summary",
  "scenario_type": "MARKET_DATA",
  "display_name": "FX Impact Analysis Report on Average Moves",
  "description": "...",
  "sections": [
    {
      "key": "legal_entity_division",
      "title": "Legal Entity / Division (Average Moves)",
      "order": 1,
      "contentBlocks": [
        {
          "blockType": "table",
          "key": "le_div_table",
          "label": "Legal Entity / Division",
          "rowColumns": [
            { "key": "entity", "header": "Legal Entity / Division (Average Moves)" }
          ],
          "columnGroups": [
            {
              "groupLabel": "",
              "columns": [{ "key": "impact", "header": "Impact" }]
            },
            {
              "groupLabel": "Group 1 day 99% Internal & Regulatory VaR",
              "columns": [
                { "key": "int_var_1d", "header": "Internal Diff %" },
                { "key": "reg_var_1d", "header": "Regulatory Diff %" }
              ]
            }
          ],
          "rows": [
            {
              "rowId": "le_total",
              "cells": {
                "entity": { "value": "Alpha Holdings Group" },
                "int_var_1d": { "value": "1.24%", "formatToken": "positive" }
              }
            }
          ]
        }
      ]
    }
  ],
  "metadata": { "author": "scenarios-team", "tags": [...] }
}
```

### Key Schema Observations:
- Both formats coexist and the `ImpactReportSnapshotGenerator` handles both (`metrics[]` or `contentBlocks[]`)
- `contentBlocks` support three `blockType` values: `metric`, `text`, `table`
- Tables have complex nested structure: `rowColumns`, `columnGroups` (with `groupLabel` and nested `columns`), and `rows` (with `rowId` and `cells` map)
- Cells can have `formatToken` values: `positive`, `warning`, `negative`

## 3. Frontend Report Rendering Pipeline

### Component Hierarchy:
- `ReportRenderer` -> sorts sections -> `SectionRenderer` per section
- `SectionRenderer` -> sorts contentBlocks -> dispatches by `blockType`:
  - `metric` -> `MetricBlockRenderer`
  - `text` -> `TextBlockRenderer`
  - `table` -> `TableBlockRenderer`

### TypeScript Types (`types/renderedReport.ts`):
- `RenderedReport`: top-level (reportKey, reportName, definitionVersion, generatedAt, scenarioId, scenarioName, scenarioTypeCode, sections[])
- `ReportSection`: sectionKey, sectionTitle, order, contentBlocks[]
- `ContentBlock`: discriminated union of `MetricBlock | TextBlock | TableBlock`
- `MetricBlock`: productionValue, scenarioValue, deltaValue, deltaPct, formattedValues, formatToken
- `TextBlock`: textKey, content
- `TableBlock`: tableKey, label, columnLayout (rowColumns + columnGroups), rows[]
- `ColumnLayout`: rowColumns (RowColumnDef[]), columnGroups (ColumnGroup[])
- `ColumnGroup`: groupLabel, columns (ColumnDef[])
- `TableRow`: rowId, cells (Record<string, TableCell>)
- `TableCell`: value, formatToken?

### Key Rendering Notes:
- `RenderedReport` is the **output** of the generation engine, NOT the raw definition
- The raw definition has `metrics[]` or `contentBlocks[]`; the rendered report always has `contentBlocks[]`
- The editor operates on the **definition** (input) format, not the rendered (output) format

## 4. Current Impact Reports Tab State

### `ReadOnlySummaryTab.tsx`:
- Currently shows "Deployment Managed" badge + count of active report definitions (e.g., "3 active report definitions")
- Uses `detail.activeReportDefinitionCount` from `ScenarioTypeAdminDetailDto`
- This tab will be replaced by the full editor

### `ScenarioTypeWorkspacePage.tsx`:
- The `impact-reports` case currently falls through to `ReadOnlySummaryTab`
- Tab definition: `{ id: 'impact-reports', label: 'Impact Reports', classification: 'deployment' }`

### `ScenarioTypeAdminDetailDto`:
- Already includes `activeReportDefinitionCount` (long)
- Does NOT include the full list of report definitions -- that would need a separate fetch

## 5. Existing Controller Endpoints for Report Definitions

### Current `ReportDefinitionController` provides:
- `GET /report-definitions?scenarioType=` -- list active definitions (optionally filtered)
- `GET /report-definitions/{reportKey}` -- get latest active by reportKey
- `GET /report-definitions/{reportKey}/versions` -- all versions for a reportKey
- `POST /report-definitions` -- create new definition (with validation)
- `POST /report-definitions/{id}/deactivate` -- deactivate by id

### Missing operations identified for the editor:
- No `GET` by ID (only by reportKey)
- No activate endpoint (reactivate a deactivated definition)
- No listing of ALL definitions (active + inactive) per scenario type
- No admin-scoped endpoints under `/admin/scenario-types/{code}/...`

## 6. Frontend Infrastructure

### No existing JSON editor library:
- No Monaco editor, CodeMirror, or similar installed in `package.json`
- Monaco Editor (`@monaco-editor/react`) will be introduced as a new dependency

### Existing SplitPaneLayout:
- Uses `react-resizable-panels` (PanelGroup, Panel, PanelResizeHandle)
- Could be referenced for split editor/preview layout patterns
- Currently tied to Redux state for LHS collapse behavior

### Frontend Patterns:
- Fluent UI components throughout (Button, Tab, TabList, Dialog, Card, Input, Switch, SpinButton, Dropdown)
- CSS Modules for component styling (`.module.scss` files)
- Redux Toolkit slices + Redux Saga for state management
- Axios-based API layer in `services/`

## 7. Finalized Architecture Decisions

1. **Endpoint structure**: DECIDED -- New admin-scoped endpoints under `/admin/scenario-types/{code}/impact-report-definitions`. Existing `/report-definitions` controller remains separate for the non-admin domain.

2. **List scope**: DECIDED -- Show ALL definitions/versions (active + inactive) per scenario type.

3. **Activate behavior**: DECIDED -- Activation automatically deactivates the currently active version of the same report key (single-active-per-report-key rule, matching the Data Template pattern from increment 2).

4. **Validation scope**: DECIDED -- Extend `ReportDefinitionValidationService` to cover full `contentBlocks[]` schema including table blocks, nested columnGroups, column layout, rows/cells, and conditional formatting rules.

5. **JSON editor**: DECIDED -- Use Monaco Editor (`@monaco-editor/react`).

6. **Preview approach**: DECIDED -- Both: client-side structural preview as baseline, plus backend/data-driven preview where practical.

7. **Structured editor depth**: DECIDED -- Deep structured editing including individual content block details (table layout, column groups, formatting), not just top-level fields and section shells.
