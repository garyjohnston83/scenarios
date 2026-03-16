# Research Findings: Data Templates Management (Increment 2)

## 1. Increment 1 Context (What Already Exists)

### ScenarioTypeWorkspacePage
- **Location**: `frontend/src/pages/ScenarioTypeWorkspacePage/ScenarioTypeWorkspacePage.tsx`
- 7 tabs defined in `TAB_DEFINITIONS` array, including `data-templates` tab with `classification: 'runtime'`
- Tab switching is local state (`useState`), renders content via a `switch` in `renderTabContent()`
- The `data-templates` case currently falls through to `ReadOnlySummaryTab`
- Page fetches detail via `fetchScenarioTypeDetailRequest(code)` on mount
- Uses `useParams` for `:code` URL param
- Redux state accessed: `scenarioTypeAdmin.selectedDetail`, `.loading`, `.saving`, `.error`

### ReadOnlySummaryTab (Current Data Templates Placeholder)
- **Location**: `frontend/src/pages/ScenarioTypeWorkspacePage/ReadOnlySummaryTab.tsx`
- For `data-templates` tab, renders a Fluent UI `Card` with text: "No templates configured"
- Shows "Runtime Editable" badge
- Uses `ReadOnlySummaryTab.module.scss` with card/fieldsGrid/fieldItem layout pattern

### GeneralTabContent
- Demonstrates the inline editable form pattern within the workspace page
- Uses local `FormState`, dispatches `updateScenarioTypeRequest` on save
- Uses Fluent UI `Input`, `Switch`, `SpinButton`, `Button`
- CSS classes: `dialogField`, `dialogFieldLabel`, `formContainer`, `formActions`

## 2. Backend Architecture

### ScenarioType Entity
- **Location**: `model-logic-service/src/main/java/com/prototypes/scenarios/entity/ScenarioType.java`
- JPA entity with `@Id` on `code` (varchar 50)
- Fields: `code`, `name`, `icon`, `directChangesMode`, `impactDataMode`, `isEnabled`, `sortOrder`
- No generated IDs -- uses String `code` as PK
- No `createdAt`/`updatedAt` timestamps on this entity (other entities like `SignoffPolicy` and `ReportDefinition` do have them)

### ScenarioTypeAdminController
- **Location**: `model-logic-service/src/main/java/com/prototypes/scenarios/controller/ScenarioTypeAdminController.java`
- `@RestController` (no `@RequestMapping` base path)
- Three endpoints: `GET /admin/scenario-types`, `GET /admin/scenario-types/{code}`, `PUT /admin/scenario-types/{code}`
- Delegates to `ScenarioTypeAdminService`, returns `ResponseEntity`
- **Key pattern**: No `@RequestBody` validation annotations -- validation is done in the service layer

### ScenarioTypeAdminService
- **Location**: `model-logic-service/src/main/java/com/prototypes/scenarios/service/ScenarioTypeAdminService.java`
- `@Service` with constructor injection
- Injects `ScenarioTypeRepository`, `ReportDefinitionRepository`, `SignoffPolicyRepository`
- `listAll()`: uses `findAllByOrderBySortOrderAsc()`
- `getDetail(code)`: fetches entity, queries counts, assembles detail DTO
- `update(code, request)`: validates name non-blank, applies fields, saves, returns detail DTO
- Uses `ResponseStatusException(NOT_FOUND)` for missing entities, `ResponseStatusException(BAD_REQUEST)` for validation
- Private `toDto()` and `toDetailDto()` helper methods

### AdminController (Signoff Policies)
- **Location**: `model-logic-service/src/main/java/com/prototypes/scenarios/controller/AdminController.java`
- Pattern: direct repository injection into controller (less layered than ScenarioTypeAdmin)
- GET/POST/PUT endpoints for signoff policies
- Uses `UUID.randomUUID()` for new entity IDs
- `LocalDateTime.now()` for timestamps
- `ResponseStatusException` for errors

### ReportDefinitionService
- **Location**: `model-logic-service/src/main/java/com/prototypes/scenarios/service/ReportDefinitionService.java`
- Best example of versioning pattern: computes `nextVersion = maxVersion + 1`
- Uses `findMaxVersion()` custom JPQL query
- Has retry logic for `DataIntegrityViolationException`
- `deactivateDefinition()`: sets `isActive = false`, saves, returns DTO
- Demonstrates the full service pattern this project follows

### Existing DTOs (Records)
- All DTOs are Java `record` types (immutable)
- `ScenarioTypeAdminDto`: list-level fields
- `ScenarioTypeAdminDetailDto`: extends with `activeReportDefinitionCount`, `activeSignoffPolicyCount`
- `UpdateScenarioTypeRequest`: mutable fields only

### Repository Patterns
- All repos extend `JpaRepository<Entity, IDType>`
- Spring Data derived query methods (e.g., `findAllByOrderBySortOrderAsc`, `countByScenarioTypeCodeAndIsEnabledTrue`)
- Custom `@Query` for complex queries (e.g., `findMaxVersion`)
- No custom implementations -- all interface-only

## 3. Frontend Architecture

### State Management Pattern
- **Slice**: `scenarioTypeAdminSlice.ts` -- Redux Toolkit `createSlice`
  - State shape: `{ scenarioTypes, selectedDetail, loading, saving, error }`
  - Action triplets: `request`/`success`/`failure` for each operation
  - `PayloadAction` typing on all actions
- **Saga**: `scenarioTypeAdminSaga.ts` -- `redux-saga`
  - `takeLatest` for each watcher
  - `call()` for API, `put()` for dispatch
  - Error handling: `error instanceof Error ? error.message : 'fallback'`
  - Three watchers exported as named generators
- **Root Saga**: `rootSaga.ts` -- uses `all([fork(...)])` pattern
- **Store**: `store.ts` -- `configureStore` with saga middleware

### API Layer Pattern
- **File**: `scenarioTypeAdminApi.ts`
- Uses `axios` with `API_BASE_URL` from env
- TypeScript interfaces matching backend DTOs
- Async functions returning `response.data`
- No interceptors, no custom error handling at API level

### Dialog/Modal Pattern
- **SignoffPoliciesAdminPage**: Uses Fluent UI `Dialog`/`DialogSurface`/`DialogBody`/`DialogTitle`/`DialogContent`/`DialogActions`
- `DialogTrigger` for cancel button
- Form state managed locally with `useState`
- Dialog open/close managed via boolean state

### Table Pattern
- HTML `<table>` with CSS Module classes (NOT Fluent UI DataGrid)
- Classes: `tableContainer`, `table`, `tableHeader`, `tableHeaderCell`, `tableRow`, `tableCell`, `actionsCell`
- Uses `Switch` inline for toggle actions
- `Button` with `appearance="outline" size="small"` for row actions

### File Export Pattern (ExportActivityDialog)
- Uses `xlsx` library (already in dependencies) for client-side XLSX generation
- `XLSX.writeFile(wb, filename)` for triggering download
- No backend download endpoint involved -- pure client-side generation
- Dialog pattern with loading state (`Spinner`)

### No Existing File Upload Patterns
- **IMPORTANT**: No multipart file upload exists anywhere in the codebase
- No `FormData` usage
- No `<input type="file">` components
- No backend `@RequestPart` or `MultipartFile` handlers
- This will be the FIRST file upload feature

### No Existing Blob/Binary Storage
- No BLOB/BYTEA columns in any existing table
- No binary storage patterns

## 4. Database / Liquibase

### Migration Approach
- **Liquibase** with YAML changesets
- Master changelog: `db/changelog/db.changelog-master.yaml` with `include` for each changeset file
- Changeset files numbered sequentially: `001-xxx.yaml`, `002-xxx.yaml`, ..., up to `035-xxx.yaml`
- Next changeset number: **036**

### Changeset Pattern
- `id`: descriptive name with prefix number (e.g., `028-create-report-definition-table`)
- `author`: `scenarios-team`
- Multiple logical changesets per file allowed (e.g., table creation + unique constraint + index in one file)
- Uses Liquibase `property` for DB-specific types (e.g., `JSONB` for PostgreSQL, `CLOB` for others)
- `preConditions` with `onFail: MARK_RAN` and `dbms` filter for PostgreSQL-specific SQL

### Schema Conventions
- UUIDs for entity IDs (except `ScenarioType` which uses `code` varchar)
- `is_active` / `is_enabled` boolean columns
- `created_at` / `updated_at` timestamps (`LocalDateTime`)
- Foreign keys: `fk_<table>_<referenced_table>` naming
- Indexes: `idx_<table>_<purpose>` naming
- `scenario_type_code` varchar(50) FK pattern used by `report_definition`, `signoff_policy`

### H2 Compatibility
- H2 is test-scoped dependency in `pom.xml`
- Liquibase uses `dbms` conditions to handle PostgreSQL-specific features (GIN indexes) with `MARK_RAN` fallback
- `property` substitution handles JSONB vs CLOB difference
- **For BYTEA**: will need `property` substitution (BYTEA for PostgreSQL, BLOB for H2)

## 5. Technology Stack Relevant to This Feature

### Backend
- Java 21, Spring Boot 3.4.13
- Spring Data JPA with Liquibase
- PostgreSQL (prod), H2 (test)
- No Spring multipart config yet (defaults apply: 1MB per file, 10MB per request)

### Frontend
- React 19, TypeScript, Webpack
- Fluent UI v9 (`@fluentui/react-components`, `@fluentui/react-icons`)
- Redux Toolkit + Redux Saga
- Axios for HTTP
- CSS Modules (`.module.scss`)
- `xlsx` library already available (for XLSX handling)

## 6. Finalized Architectural Decisions

### File Storage -- DECIDED
- **Decision**: Store uploaded template files directly in the database as BYTEA/BLOB column on the `data_template` table.
- Rationale: Simplest approach for a prototype with single-service architecture; CSV/XLSX files are small.

### File Size Limits -- DECIDED
- **Decision**: 5 MB maximum file size per template upload.
- Requires explicit Spring Boot multipart configuration in `application.properties`:
  - `spring.servlet.multipart.max-file-size=5MB`
  - `spring.servlet.multipart.max-request-size=5MB`

### Activation Mutual Exclusivity -- DECIDED
- **Decision**: Activating a template automatically deactivates the previously active template for that scenario type.
- Service layer handles this in a single operation: deactivate current active (if any), then activate the target template.

### Upload Metadata -- DECIDED
- **Decision**: Original filename plus auto-generated version number. No extra metadata fields (name, description, notes) in this increment.

### Template List Display -- DECIDED
- **Decision**: Flat table showing all versions (active and inactive) with columns: Version, Filename, Status (Active/Inactive), Uploaded At, and Actions (Download, Activate/Deactivate).
- No separate "current active" summary section -- the table with status column is sufficient.

### Zero Active Templates -- DECIDED
- **Decision**: A scenario type may have zero active templates. Deactivating the only active template leaves no active template.

### Confirmation Dialogs -- DECIDED
- **Decision**: Activate is immediate (no confirmation). Deactivate requires a confirmation dialog.
- Rationale: Deactivation affects end users; activation is a positive action that replaces the current active template automatically.

### ScenarioType Entity Changes -- DECIDED
- **Decision**: No changes to the `ScenarioType` entity itself. Template summary surfacing to the detail DTO is allowed if needed, but changes to the entity are out of scope.

## 7. Files to Modify (Expected)

### Backend (New Files)
- `entity/DataTemplate.java` -- new JPA entity
- `repository/DataTemplateRepository.java` -- new repository interface
- `service/DataTemplateService.java` -- new service class
- `controller/DataTemplateController.java` (or extend `ScenarioTypeAdminController`)
- `dto/DataTemplateDto.java` -- response DTO
- Liquibase changeset `036-create-data-template-table.yaml`

### Backend (Modified Files)
- `db/changelog/db.changelog-master.yaml` -- add include for new changeset
- `application.properties` -- multipart config

### Frontend (New Files)
- `services/dataTemplateApi.ts` -- API layer
- `store/dataTemplateSlice.ts` -- Redux slice
- `store/dataTemplateSaga.ts` -- Redux saga
- New component(s) for the Data Templates tab content (e.g., `DataTemplatesTabContent.tsx`)
- Deactivate confirmation dialog component

### Frontend (Modified Files)
- `ScenarioTypeWorkspacePage.tsx` -- change `data-templates` case to render new component instead of `ReadOnlySummaryTab`
- `store/rootSaga.ts` -- register new saga watchers
- `store/store.ts` -- register new reducer
