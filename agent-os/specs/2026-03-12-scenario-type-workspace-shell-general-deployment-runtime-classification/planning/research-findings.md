# Research Findings: Scenario Type Workspace Shell + General + Deployment/Runtime Classification

## 1. Backend Architecture

### 1.1 ScenarioType Entity
**File:** `model-logic-service/src/main/java/com/prototypes/scenarios/entity/ScenarioType.java`

Current fields on the `ScenarioType` entity:
| Field | Type | Column | Notes |
|-------|------|--------|-------|
| `code` | String (PK) | `code` varchar(50) | Natural key, e.g. `MARKET_DATA`, `RISK_FACTOR`, `FRTB_SA` |
| `name` | String | `name` varchar(255) | Display name, e.g. "Market Data" |
| `icon` | String | `icon` varchar(100) | FluentUI icon name, e.g. "ChartMultiple", "Pulse", "ShieldTask" |
| `directChangesMode` | String | `direct_changes_mode` varchar(50) | Values: `EXTERNAL` or `INTERNAL` |
| `impactDataMode` | String | `impact_data_mode` varchar(50) | Values: `EXTERNAL` or `INTERNAL` |
| `isEnabled` | boolean | `is_enabled` | Whether the type is active |
| `sortOrder` | Integer | `sort_order` | Display ordering |

**Decision:** Entity will NOT be modified in this increment. No `description`, `createdAt`, or `updatedAt` fields will be added.

### 1.2 Existing ScenarioType Seeded Data (from Liquibase)
Three scenario types exist:
- `MARKET_DATA` - "Market Data" - icon: ChartMultiple - directChanges: EXTERNAL, impactData: EXTERNAL, sort: 1
- `RISK_FACTOR` - "Risk Factor" - icon: Pulse - directChanges: EXTERNAL, impactData: EXTERNAL, sort: 2
- `FRTB_SA` - "FRTB SA" - icon: ShieldTask - directChanges: INTERNAL, impactData: INTERNAL, sort: 3

Mode values were renamed in changeset 024: `LINK_OUT` -> `EXTERNAL`, `GRID` -> `INTERNAL`.

### 1.3 ScenarioType DTO
**File:** `model-logic-service/src/main/java/com/prototypes/scenarios/dto/ScenarioTypeDto.java`

Current DTO is minimal (used only to embed within ScenarioHeaderDto):
```java
public record ScenarioTypeDto(
    String code, String name, String icon,
    String directChangesMode, String impactDataMode
) {}
```
Missing `isEnabled` and `sortOrder` -- a new admin-specific DTO will be needed.

### 1.4 ScenarioTypeRepository
**File:** `model-logic-service/src/main/java/com/prototypes/scenarios/repository/ScenarioTypeRepository.java`

Simple `JpaRepository<ScenarioType, String>` with no custom query methods.

### 1.5 Existing Admin Controller
**File:** `model-logic-service/src/main/java/com/prototypes/scenarios/controller/AdminController.java`

Currently handles **signoff policies only** under `/admin/signoff-policies`. Pattern:
- `@RestController` with no `@RequestMapping` prefix
- Direct repository injection (no service layer for signoff policies)
- Manual `toDto()` mapping method
- Routes: GET list, POST create, PUT update by ID

**Decision:** A new dedicated `ScenarioTypeAdminController` will be created (not added to the existing AdminController).

### 1.6 Service Layer Pattern
**File:** `model-logic-service/src/main/java/com/prototypes/scenarios/service/ReportDefinitionService.java`

More complex admin operations use a `@Service` class. Pattern:
- Constructor-injected repositories
- `@Service` annotation
- Private `toDto()` and `buildEntity()` helper methods
- Validation before save
- `ResponseStatusException` for errors

**Decision:** A new `ScenarioTypeAdminService` will follow this service layer pattern.

### 1.7 Related Entities Linked to ScenarioType
Entities that reference `scenarioTypeCode`:
- `Scenario.scenarioTypeCode` (FK to scenario_type.code) -- The main scenario entity
- `SignoffPolicy.scenarioTypeCode` -- Sign-off rules per scenario type
- `ReportDefinition.scenarioTypeCode` -- Impact report definitions per scenario type
- `ScenarioLink` -- via Scenario (indirect) -- External/internal links for direct changes and impact data

### 1.8 Where Configuration "Areas" Live Currently
1. **Data Templates**: No explicit entity. Column templates stored as `columnsJson` in `ScenarioGridDataset`, but this is per-scenario instance, not per-type config. **Decision:** Runtime Editable placeholder -- "No templates configured".
2. **Navigation & View Mode**: `directChangesMode` and `impactDataMode` on `ScenarioType` entity. Values: `EXTERNAL` or `INTERNAL`. **Decision:** Deployment Managed -- read-only summary showing both mode values.
3. **Impact Execution**: `ImpactRun` entity (per-scenario, per-run). No per-type configuration entity. **Decision:** Deployment Managed -- read-only summary showing "Configured via deployment".
4. **Impact Reports**: `ReportDefinition` entity, keyed by `scenarioTypeCode` and `reportKey`. **Decision:** Deployment Managed -- read-only summary showing count of active report definitions.
5. **Change View**: Driven by `directChangesMode` on ScenarioType. **Decision:** Deployment Managed -- separate summary card (not merged with Nav & View Mode).
6. **Sign-off Rules**: `SignoffPolicy` entity, keyed by `scenarioTypeCode`. **Decision:** Deployment Managed -- read-only summary showing count of active signoff policies.

---

## 2. Frontend Architecture

### 2.1 UI Component Library
**Fluent UI React v9** (`@fluentui/react-components` ^9.72.8) with `@fluentui/react-icons`.

Application wrapped in `<FluentProvider theme={webLightTheme}>`.

Components used across the app: `Button`, `Dialog`, `DialogSurface`, `DialogBody`, `DialogTitle`, `DialogContent`, `DialogActions`, `Input`, `Switch`, `Dropdown`, `Option`, `SpinButton`, `Text`, `makeStyles`, `tokens`.

### 2.2 Routing
**File:** `frontend/src/routes/AppRoutes.tsx`

Uses `react-router-dom` v7. Current routes:
```
/scenarios                  -> ScenarioManagementPage
/scenarios/:id              -> ScenarioManagementPage (detail pane)
/scenarios/:id/analysis     -> AnalysisPage (within ScenarioManagementPage)
/admin/signoff-policies     -> SignoffPoliciesAdminPage
*                           -> Redirect to /scenarios
```

**Decision:** New routes: `/admin/scenario-types` (list) and `/admin/scenario-types/:code` (workspace).

### 2.3 State Management
**Redux Toolkit + Redux Saga pattern:**

- **Slice:** `adminSlice.ts` -- state shape: `{ policies: [], loading: boolean, error: string | null, saving: boolean }`
- **Saga:** `adminSaga.ts` -- watchers for fetch/create/update, uses `call()` and `put()` effect creators
- **Root Saga:** `rootSaga.ts` -- forks all watchers using `all([fork(...)])`
- **Store:** `store.ts` -- combines reducers: `scenarios`, `admin`, `analysis`
- **Hooks:** `hooks.ts` -- typed `useAppDispatch` and `useAppSelector`

**Decision:** New dedicated `scenarioTypeAdminSlice.ts` + `scenarioTypeAdminSaga.ts` (separate from existing admin slice).

### 2.4 API Layer
**File:** `frontend/src/services/adminApi.ts`

Pattern:
- Axios-based functions
- `API_BASE_URL` from env or default `http://localhost:9090`
- TypeScript interfaces for DTOs and request types
- Individual `async function` exports (not a class)
- Returns `response.data` directly

### 2.5 Existing Admin Page: SignoffPoliciesAdminPage
**File:** `frontend/src/pages/SignoffPoliciesAdminPage/SignoffPoliciesAdminPage.tsx`

This is the **only existing admin page** and serves as the primary pattern:
- Full-page layout with `pageContainer` class (flex column, 100vh, padded)
- Page title at top
- Toolbar with action button(s)
- Data table with header cells, sortable rows
- Dialog-based create/edit forms using Fluent UI Dialog
- Switch toggle inline in table for boolean fields
- Loading and error state handling
- Dispatches fetch on mount via `useEffect`
- Uses CSS Modules (`.module.scss`)

### 2.6 CSS Patterns
- **CSS Modules** (`.module.scss`) for component-scoped styles
- **Fluent UI `makeStyles`** for token-based styles (colors, borders)
- Both patterns used together per component
- No shared CSS framework / utility classes beyond Fluent tokens

### 2.7 Frontend Type: ScenarioTypeData
**File:** `frontend/src/store/scenariosSlice.ts`

```typescript
export type DataMode = 'EXTERNAL' | 'INTERNAL';
export interface ScenarioTypeData {
  code: string;
  name: string;
  icon: string;
  directChangesMode: DataMode;
  impactDataMode: DataMode;
}
```

### 2.8 Navigation Pattern
**File:** `frontend/src/components/TopNavBar/TopNavBar.tsx`

Simple static header with logo placeholder and "Scenarios" title. No navigation links or menu to admin pages currently.

**Decision:** No changes to TopNavBar. Admin pages continue to be accessed by direct URL.

---

## 3. Key Gaps and Decisions

### 3.1 Backend Gaps (with Decisions)
1. **No admin endpoints for ScenarioType** -- **Will create:** `GET /admin/scenario-types` (list), `GET /admin/scenario-types/{code}` (detail with related counts)
2. **No update endpoint for ScenarioType** -- **Will create:** `PUT /admin/scenario-types/{code}` for General tab fields only
3. **ScenarioType entity missing fields** -- **Decision: No entity changes** this increment
4. **ScenarioTypeDto incomplete for admin use** -- **Will create:** new admin-specific DTO with all fields + related config counts
5. **No aggregation for related config counts** -- **Will add:** queries for report definition count and signoff policy count per type
6. **No service layer for ScenarioType admin** -- **Will create:** dedicated `ScenarioTypeAdminService`

### 3.2 Frontend Gaps (with Decisions)
1. **No admin list + workspace pattern** -- **Will create:** new list page with row-click navigation to workspace page
2. **No tab-based admin workspace** -- **Will create:** workspace page with 7 tabs (General + 6 admin areas)
3. **No scenario type admin state** -- **Will create:** new `scenarioTypeAdminSlice` + `scenarioTypeAdminSaga`
4. **No admin API for scenario types** -- **Will add:** new functions to adminApi.ts or new file
5. **No admin navigation changes** -- **Decision: No changes** to TopNavBar
6. **No read-only summary card components** -- **Will create:** components for deployment-managed area summaries
7. **No classification badges** -- **Will create:** "Runtime Editable" / "Deployment Managed" badges on tabs

---

## 4. Established Patterns to Follow

### 4.1 Backend Patterns
| Pattern | Example | Apply To |
|---------|---------|----------|
| Controller structure | `AdminController.java` | New `ScenarioTypeAdminController` |
| Service layer | `ReportDefinitionService.java` | New `ScenarioTypeAdminService` |
| DTO records | `SignoffPolicyDto.java` | New admin-specific ScenarioType DTOs |
| Repository | `ScenarioTypeRepository.java` | Extend with query methods if needed |
| Validation | `ReportDefinitionService.java` | Minimal validation: name required, sortOrder numeric |

### 4.2 Frontend Patterns
| Pattern | Example | Apply To |
|---------|---------|----------|
| List page | `SignoffPoliciesAdminPage.tsx` | New `ScenarioTypeListPage` (table with row-click navigation) |
| Workspace page | New pattern (no existing example) | New `ScenarioTypeWorkspacePage` with tabs |
| Tab component | `AnalysisTabs.tsx` (reference only) | Tab bar for workspace page |
| Redux slice | `adminSlice.ts` | New `scenarioTypeAdminSlice` |
| Redux saga | `adminSaga.ts` | New `scenarioTypeAdminSaga` |
| API service | `adminApi.ts` | New scenario type admin API functions |
| CSS Modules | `SignoffPoliciesAdminPage.module.scss` | New page styles |
| Routing | `AppRoutes.tsx` | Two new routes |
| Root saga | `rootSaga.ts` | Register new watchers |
| Store | `store.ts` | Add new reducer |

---

## 5. Technology Summary
- **Backend:** Java 21, Spring Boot 3.x, Spring Data JPA, PostgreSQL (Liquibase), Jackson
- **Frontend:** React 19, TypeScript, Redux Toolkit, Redux Saga, Fluent UI React v9, Axios, CSS Modules (SCSS), react-router-dom v7
- **Build:** Maven (backend), Webpack (frontend)
- **Testing:** JUnit (backend), Jest + Testing Library (frontend), Playwright (E2E)
