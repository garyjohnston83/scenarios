# Research Findings: Navigation & View Mode Configuration + Impact Execution Read-Only Display

## 1. Current ScenarioType Entity State

**File:** `model-logic-service/src/main/java/com/prototypes/scenarios/entity/ScenarioType.java`

Current fields on `ScenarioType`:
- `code` (String, PK, varchar 50)
- `name` (String, varchar 255)
- `icon` (String, varchar 100)
- `directChangesMode` (String, varchar 50) -- values: "INTERNAL" or "EXTERNAL"
- `impactDataMode` (String, varchar 50) -- values: "INTERNAL" or "EXTERNAL"
- `isEnabled` (boolean)
- `sortOrder` (Integer)

**FINDING:** `directChangesExternalUrlTemplate` and `impactExternalUrlTemplate` fields do **NOT** exist yet. They will need to be added as new columns to the `scenario_type` table via a Liquibase changeset.

## 2. Current Scenario Type Seed Data

Three scenario types exist in the database:
- `MARKET_DATA`: directChangesMode=EXTERNAL, impactDataMode=INTERNAL (updated in changeset 032)
- `RISK_FACTOR`: directChangesMode=EXTERNAL, impactDataMode=EXTERNAL
- `FRTB_SA`: directChangesMode=INTERNAL, impactDataMode=INTERNAL (originally GRID, renamed in changeset 024)

Mode values were originally LINK_OUT/GRID, renamed to EXTERNAL/INTERNAL in changeset 024.

## 3. Current DTOs

**ScenarioTypeAdminDto** (list-level): code, name, icon, directChangesMode, impactDataMode, isEnabled, sortOrder

**ScenarioTypeAdminDetailDto** (detail-level): same as list + activeReportDefinitionCount, activeSignoffPolicyCount

**UpdateScenarioTypeRequest**: name, icon, isEnabled, sortOrder (does NOT include mode fields or URL templates)

**FINDING:** The detail DTO will need to be extended with the new URL template fields. A new update request DTO (or endpoint) will be needed for Navigation & View Mode saves.

## 4. Current Admin Controller Endpoints

- `GET /admin/scenario-types` -- returns list
- `GET /admin/scenario-types/{code}` -- returns detail
- `PUT /admin/scenario-types/{code}` -- updates General tab fields only

**FINDING:** A new endpoint `PUT /admin/scenario-types/{code}/navigation-view-mode` is proposed in the raw idea. This follows the pattern of separating tab-specific updates.

## 5. Current Admin Service

`ScenarioTypeAdminService` injects:
- ScenarioTypeRepository
- ReportDefinitionRepository (for count queries)
- SignoffPolicyRepository (for count queries)

The `toDetailDto()` method maps entity fields + report/policy counts. It will need extension to include URL templates.

## 6. Current Frontend Workspace Page

**ScenarioTypeWorkspacePage.tsx** renders 7 tabs. Currently:
- `general` -> `GeneralTabContent` (editable form)
- `data-templates` -> `DataTemplatesTabContent` (functional, increment 2)
- `navigation-view-mode`, `impact-execution`, `impact-reports`, `change-view`, `signoff-rules` -> `ReadOnlySummaryTab`

**ReadOnlySummaryTab.tsx** currently renders:
- `navigation-view-mode`: shows directChangesMode and impactDataMode as read-only labeled fields in a card with fieldsGrid layout
- `impact-execution`: shows placeholder text "Configured via deployment"

**FINDING:** The `navigation-view-mode` case will be replaced with a new editable tab component. The `impact-execution` case will be replaced with a richer read-only display.

## 7. GeneralTabContent Form Pattern

The form follows this pattern:
- Local `useState` for `FormState`
- `useEffect` to re-initialize from `detail` prop when it changes
- Fluent UI `Input`, `Switch`, `SpinButton` components
- CSS Module with `formContainer`, `dialogField`, `dialogFieldLabel`, `readOnlyValue`, `formActions` classes
- Save button dispatches `updateScenarioTypeRequest` action
- `isSaveDisabled` logic based on required field validation and `saving` prop

## 8. Frontend State Management Pattern

**scenarioTypeAdminSlice.ts**: state shape: `{ scenarioTypes, selectedDetail, loading, saving, error }`
- Action triplets: request/success/failure for fetch list, fetch detail, update

**scenarioTypeAdminSaga.ts**: `takeLatest` watchers, `call()` for API, `put()` for dispatch

**scenarioTypeAdminApi.ts**: axios-based, typed interfaces, functions returning `response.data`

**Registration**: reducer in `store.ts` under `scenarioTypeAdmin`, saga watchers in `rootSaga.ts` via `fork()`

## 9. Impact Execution - Existing Backend Patterns

**No dedicated "impact execution config" entity or table exists.** Impact execution is currently hardcoded/stub-based:

- `ReportDataProviderRegistry`: Maps scenario type codes to `ReportDataProvider` implementations (FRTB_SA, MARKET_DATA, RISK_FACTOR)
- `ImpactReportGenerationService`: Orchestrates report generation by querying active report definitions and delegating to `ImpactReportSnapshotGenerator`
- `ImpactReportSnapshotGenerator`: Uses `ReportDataProviderRegistry` to look up the data provider for a scenario type, then generates reports

**FINDING:** The "impact execution provider" concept maps directly to the `ReportDataProviderRegistry` and its registered `ReportDataProvider` implementations. The read-only display will be derived dynamically from this registry at runtime (confirmed by user -- Approach A).

## 10. ImpactRun Entity

`impact_run` table with: id, scenario_id (FK), run_ref, status, started_at, completed_at

This tracks individual impact run executions per scenario, NOT the config for how executions are triggered. The trigger config is currently implicit in the code.

## 11. Liquibase Patterns

**Adding columns to existing tables (changeset 004 pattern):**
```yaml
databaseChangeLog:
  - changeSet:
      id: 004-add-exceptions-count
      author: scenarios-team
      changes:
        - addColumn:
            tableName: scenario_summary
            columns:
              - column:
                  name: exceptions_count
                  type: int
```

**scenario_type table created in changeset 013.** Next changeset number would be `037-*`.

**db.changelog-master.yaml** includes all changesets 001-036 sequentially.

## 12. ExternalRedirectView Pattern

The `ExternalRedirectView` component shows how EXTERNAL mode works at the user-facing level:
- Takes a `url` prop and `scenarioId`
- Opens the URL in a new tab via `window.open`
- Handles popup blocked scenarios with fallback link

**FINDING:** This confirms that when `directChangesMode` or `impactDataMode` is EXTERNAL, the system needs a URL template to construct the external URL.

## 13. Mode Values and Their Meaning

From the `normalizeMode.ts` utility:
- `EXTERNAL` (formerly `LINK_OUT`): Navigate to an external system URL
- `INTERNAL` (formerly `GRID`): Show content inline within the Scenarios UI

When a mode is EXTERNAL, a URL template is needed to construct the link-out URL. When INTERNAL, the content is rendered natively.

## 14. Finalized Decisions (from user answers)

1. **Mode editability:** CONFIRMED -- `directChangesMode` and `impactDataMode` are editable on the Navigation & View Mode tab alongside the URL template fields.
2. **URL template visibility:** Hide or disable the URL template field when the corresponding mode is INTERNAL.
3. **URL template placeholders:** Use `${placeholder}` syntax (dollar-brace). Support/document: `${scenarioId}`, `${scenarioTypeCode}` now; reserve `${scenarioName}`, `${impactRunId}` for future use.
4. **URL template validation:** Accept any non-empty string; no structural validation in this increment.
5. **Impact Execution display:** Approach (A) -- derive dynamically from `ReportDataProviderRegistry` at runtime. No new DB fields for impact execution config.
6. **Tab classification badge:** Keep "Deployment Managed" badge. Add helper text clarifying it is editable in the deployment configuration tool.
7. **Seed data:** Populate default/example URL templates for existing EXTERNAL scenario types in a seed changeset.
8. **Additional out of scope:** Placeholder autocomplete, URL template test/preview, environment-specific config overrides, runtime switching behavior changes outside admin persistence.
