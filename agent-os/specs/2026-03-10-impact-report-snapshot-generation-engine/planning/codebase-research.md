# Codebase Research: Impact Report Snapshot Generation Engine (Increment 2)

## 1. Increment 1 Implementation (Report Definition Infrastructure)

### ReportDefinition Entity
- **Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/entity/ReportDefinition.java`
- **Table:** `report_definition` (single table, no separate version table)
- **Fields:** `UUID id` (PK, no @GeneratedValue), `String scenarioTypeCode` (FK to `scenario_type(code)`), `String reportKey`, `int version`, `String definition` (@Column(columnDefinition = "text")), `boolean isActive`, `LocalDateTime createdAt`, `LocalDateTime updatedAt`
- **Key insight:** There is NO `report_definition_version` table. Each row in `report_definition` is a unique `(scenario_type_code, report_key, version)` tuple. The `id` column is the UUID PK and the `version` column is just an integer on each row. The raw idea for Increment 2 references `report_definition_version_id` which does NOT exist -- it should reference `report_definition.id` (the `report_definition_id`).

### ReportDefinitionRepository
- **Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/repository/ReportDefinitionRepository.java`
- **Key queries:**
  - `findAllByIsActiveTrue()` -- returns all active definitions
  - `findAllByScenarioTypeCodeAndIsActiveTrue(String scenarioTypeCode)` -- filtered by scenario type
  - `findFirstByReportKeyAndIsActiveTrueOrderByVersionDesc(String reportKey)` -- latest active version for a key
  - `findAllByReportKeyOrderByVersionDesc(String reportKey)` -- all versions
  - `findMaxVersion(String scenarioTypeCode, String reportKey)` -- custom @Query returning Optional<Integer>

### ReportDefinitionService
- **Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/service/ReportDefinitionService.java`
- **Key methods for Increment 2:**
  - `listDefinitions(String scenarioTypeCode)` -- returns `List<ReportDefinitionDto>` of active definitions, filterable by scenario type
  - `getLatestDefinition(String reportKey)` -- returns `Optional<ReportDefinitionDto>`
- **Dependencies:** `ReportDefinitionRepository`, `ReportDefinitionValidationService`, `ScenarioTypeRepository`, `ObjectMapper`
- **Pattern:** Constructor injection, `@Service` annotation, private `toDto()` mapping method

### ReportDefinitionValidationService
- **Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/service/ReportDefinitionValidationService.java`
- **Method:** `List<String> validate(String definitionJson)` -- validates the definition JSON structure
- **Approach:** Manual Java validation using Jackson ObjectMapper, no Bean Validation

### Report Definition JSON Structure (from seed data)
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
          "format": "currency"
        }
      ]
    }
  ],
  "metadata": {
    "author": "system",
    "tags": ["frtb", "sa", "capital"]
  }
}
```

### Liquibase Changesets from Increment 1
- **028:** `028-create-report-definition-table.yaml` -- creates `report_definition` table with Liquibase property substitution for JSONB/CLOB
- **029:** `029-seed-report-definitions.yaml` -- seeds 3 report definitions (FRTB_SA, MARKET_DATA, RISK_FACTOR) with deterministic UUIDs
- **Next available changeset number:** 030

---

## 2. Scenario Infrastructure

### Scenario Entity
- **Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/entity/Scenario.java`
- **Table:** `scenario`
- **Fields:** `UUID id` (PK), `String scenarioTypeCode` (FK), `String name`, `String ownerDisplayName`, `LocalDateTime createdAt`, `LocalDateTime updatedAt`
- **Relationships:** `@OneToOne` with `ScenarioSummary`, `@ManyToOne` with `ScenarioType`, `@ManyToOne` with `UserRef`

### ScenarioSummary Entity
- **Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/entity/ScenarioSummary.java`
- **Table:** `scenario_summary` (shares PK with Scenario via @MapsId)
- **Fields:** `String workflowState`, `String impact`, `LocalDateTime lastImpactAt`, `String impactRunRef`, `String headlineDeltaText`, `int changesTotal`, `int changesDirect`, `int changesIndirect`, `String entitiesSummary`, `String validationStatus`, `Integer exceptionsCount`
- **Key field for Increment 2:** `workflowState` -- must be checked to determine if impact calculations have completed

### ScenarioType Entity
- **Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/entity/ScenarioType.java`
- **Table:** `scenario_type`
- **Fields:** `String code` (PK), `String name`, `String icon`, `String directChangesMode`, `String impactDataMode`, `boolean isEnabled`, `Integer sortOrder`
- **Key insight:** `impactDataMode` can be `"LINK_OUT"` / `"EXTERNAL"` (impact data displayed via external link) or null/internal (impact data stored in grid datasets)

### Workflow States
Defined in `ScenarioDetailService`:
- `DRAFT` -> `IMPACT_PENDING` -> `IMPACT_AVAILABLE` -> `SIGNOFF_IN_PROGRESS` -> `SIGNED_OFF` -> `PROMOTED`
- Also: `IMPACT_EXPIRED`, `REJECTED`
- **Impact-completed transitions:** `IMPACT_COMPLETED` allowed from states: `DRAFT`, `IMPACT_PENDING` -- transitions to `IMPACT_AVAILABLE`
- **Impact-data-refreshed transitions:** `IMPACT_DATA_REFRESHED` allowed from states: `IMPACT_AVAILABLE`, `IMPACT_EXPIRED` -- transitions to `IMPACT_AVAILABLE`

### ImpactRun Entity
- **Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/entity/ImpactRun.java`
- **Table:** `impact_run`
- **Fields:** `UUID id` (PK), `Scenario scenario` (FK), `String runRef`, `String status`, `LocalDateTime startedAt`, `LocalDateTime completedAt`
- **Created by:** `ScenarioDetailService.createImpactRun()` during IMPACT_COMPLETED event handling

### ImpactRunRepository
- **Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/repository/ImpactRunRepository.java`
- **Key query:** `findTopByScenarioIdOrderByStartedAtDesc(UUID scenarioId)` -- gets latest impact run for a scenario

---

## 3. Event Processing (IMPACT_COMPLETED)

### How Events Work
- **Controller:** `ScenarioController.postEvent()` at `POST /scenarios/{id}/events`
- **DTO:** `PostEventRequestDto(String type, String message, ImpactRunPayload impactRun, SummaryPatchPayload summaryPatch)`
- **ImpactRunPayload:** `record ImpactRunPayload(String finishedAt, String status)`
- **Processing:** `ScenarioDetailService.processEvent()` -- transactional method that routes events by type

### IMPACT_COMPLETED Handler (line 577-604)
1. Validates current workflow state is in `IMPACT_COMPLETED_ALLOWED_STATES` (DRAFT, IMPACT_PENDING)
2. Requires `impactRun` payload (throws BAD_REQUEST if null)
3. Creates an `ImpactRun` record via `createImpactRun()`
4. Applies optional `summaryPatch` to ScenarioSummary
5. Sets workflow state to `IMPACT_AVAILABLE`
6. Creates a `ScenarioEvent` record with eventType `IMPACT_COMPLETED`
7. **Does NOT currently trigger any report snapshot generation** -- this is what Increment 2 needs to add

### Integration Point for Increment 2
The `handleImpactCompleted()` method is the natural hook point. After the impact run is created and the workflow state transitions to `IMPACT_AVAILABLE`, the report snapshot generation should be triggered. Options:
- Call `ReportSnapshotGenerationService.generateSnapshotsForScenario()` directly at the end of `handleImpactCompleted()`
- Also hook into `handleImpactDataRefreshed()` for re-generation

---

## 4. Existing Impact Data Structure

### ScenarioGridDataset + ScenarioGridRow
- **Grid datasets** store tabular impact data per scenario
- Each dataset has `columnsJson` (JSON array of column names) and related `ScenarioGridRow` entities
- Each row has `rowPayloadJson` (JSON object with column-value pairs)
- Datasets are linked to scenarios via `scenario_id` FK and optionally to `ImpactRun` via `impact_run_id` FK
- Dataset types include `"IMPACT_DATA"`

### Current Impact Data Example (from seed data)
```json
// columns_json
["Currency Pair","Risk Measure","Base Value","Stressed Value","PnL Impact"]

// row_payload_json per row
{"Currency Pair":"USD/JPY","Risk Measure":"VaR 99%","Base Value":1250000,"Stressed Value":1290000,"PnL Impact":40000}
```

### Key Observation: No Structured "Source Field" Data Exists
The report definition's `source_field` values (e.g., `risk_charges.girr.delta`, `market_risk.var_99`) reference a dot-notation path into a structured data object. However, the existing impact data is stored as flat grid rows with key-value pairs (column names as keys). There is **no existing structured data object** that matches the `source_field` paths in the report definitions.

This means the "data provider" concept needs to either:
1. Transform existing grid data into a structured object matching source_field paths
2. Return mock/stub data for the prototype
3. Be designed as an extensible interface that can be implemented differently per scenario type

---

## 5. Database Patterns

### Liquibase Conventions
- YAML format, 3-digit prefix numbering
- Author: always `scenarios-team`
- Latest changeset: 029 (from Increment 1 seed data)
- **Next available: 030**
- FK constraints defined inline in `createTable`
- Property substitution for JSONB/CLOB already established in changeset 028

### JSONB/CLOB Pattern (from Increment 1)
```yaml
- property:
    name: jsonColumnType
    value: JSONB
    dbms: postgresql
- property:
    name: jsonColumnType
    value: CLOB
```
Column defined as `type: ${jsonColumnType}` in Liquibase, mapped as `@Column(columnDefinition = "text")` in JPA entity.

### FK Constraint Naming
- Pattern: `fk_<short_table_name>_<referenced_table>`
- Examples: `fk_report_def_scenario_type`, `fk_signoff_case_scenario`, `fk_grid_ds_scenario`

### UUID Generation
- Always in Java via `UUID.randomUUID()` -- no DB-generated UUIDs
- `@Id` with no `@GeneratedValue`

### Timestamp Pattern
- `timestamp` type (no timezone), `LocalDateTime` in Java
- Column names: `created_at`, `updated_at`, `generated_at`

---

## 6. Service Layer Patterns

### Constructor Injection
All services use constructor injection (no field injection, no @Autowired). Example from `ReportDefinitionService`:
```java
public ReportDefinitionService(ReportDefinitionRepository reportDefinitionRepository,
                               ReportDefinitionValidationService validationService,
                               ScenarioTypeRepository scenarioTypeRepository,
                               ObjectMapper objectMapper) {
```

### Transaction Management
- `@Transactional` annotation used on `ScenarioDetailService.processEvent()` and related methods
- Individual service methods like `createDefinition()` do NOT use `@Transactional` explicitly -- they rely on default transactional behavior of `repository.save()`
- For Increment 2, each snapshot generation should probably have its own transaction boundary to allow partial failures

### Error Handling
- `ResponseStatusException` used throughout for HTTP error responses
- `HttpStatus.NOT_FOUND` for missing entities
- `HttpStatus.BAD_REQUEST` for invalid inputs
- `HttpStatus.CONFLICT` for invalid workflow state transitions
- `HttpStatus.UNPROCESSABLE_ENTITY` (422) for validation errors
- `RuntimeException` for unexpected serialization failures

### Service-to-Service Communication
- Services can be injected into other services (e.g., `ReportDefinitionValidationService` into `ReportDefinitionService`)
- `ScenarioDetailService` is a large orchestration service that coordinates multiple repositories
- New services for Increment 2 should follow the same DI pattern

---

## 7. Test Patterns

### Unit Tests (no Spring context)
- `ReportDefinitionValidationServiceTest` -- plain JUnit 5, manually instantiated service with `new ObjectMapper()`
- Good pattern for testing the `ReportDefinitionResolver` in Increment 2

### Controller Tests (@WebMvcTest)
- `ReportDefinitionControllerTest`, `AdminControllerTest` -- `@WebMvcTest(Controller.class)` + `@MockitoBean`
- MockMvc for HTTP testing, inline JSON text blocks, `jsonPath` assertions

### Integration Tests (@SpringBootTest)
- `ReportDefinitionIntegrationTest`, `ReportDefinitionServiceTest` -- `@SpringBootTest` + `@ActiveProfiles("integration")` + `@Transactional`
- Run against H2 with seed data from Liquibase migrations
- Entity/repository tests in `entity/` package directory

### Test Count
- Increment 1 added 40 tests (validation: 8, entity/repo: 9, service: 6, controller: 8, integration: 6, seed: 3)
- Total test suite: 173 tests passing

---

## 8. API Convention Observations

### Endpoint Patterns
- No `/api/` prefix -- endpoints at root level (e.g., `/scenarios`, `/report-definitions`)
- Response bodies returned directly (no wrapper objects)
- `ResponseEntity.ok(body)` for 200, `ResponseEntity.status(HttpStatus.CREATED).body(body)` for 201
- `ResponseEntity.notFound().build()` for 404

### Controller Style
- `@RestController` with constructor injection
- Thin controllers delegating all logic to services
- `@GetMapping`, `@PostMapping` -- no `@PutMapping` or `@PatchMapping` in current codebase

### URL Design for Increment 2
The raw idea suggests `/api/scenarios/:scenarioId/report-snapshots/...` but following existing conventions:
- Should be `/scenarios/{scenarioId}/report-snapshots/generate` (POST)
- Should be `/scenarios/{scenarioId}/report-snapshots` (GET list)
- Should be `/scenarios/{scenarioId}/report-snapshots/{snapshotId}` (GET single)

---

## 9. Key Discrepancies Between Raw Idea and Existing Codebase

1. **`report_definition_version_id` does not exist.** The raw idea's schema references this as an FK, but Increment 1 uses a single `report_definition` table with an `id` (UUID) PK and a `version` integer column. The FK should reference `report_definition(id)` as `report_definition_id`.

2. **`report_definition_version` column in snapshot table.** The raw idea proposes storing `report_definition_version` as a separate integer column. This is redundant with the `report_definition_id` FK (since each `report_definition` row already has a `version` column), but it serves auditability if the definition is later deactivated/deleted.

3. **`/api/` prefix.** The raw idea uses `/api/scenarios/:scenarioId/...` but existing endpoints have no `/api/` prefix.

4. **`generated_by` as UUID FK.** The raw idea specifies this as a UUID FK to users, but the existing `user_ref` table uses `String` IDs (e.g., `"current-user"`, `"system"`). This needs alignment.

5. **`timestamptz` vs `timestamp`.** The raw idea uses `timestamptz` but the codebase uses `timestamp` with `LocalDateTime`.

6. **Rendered report structure vs definition structure.** The definition uses `sections[].metrics[]` with `source_field`, `format`, `unit`. The rendered report in the raw idea uses `sections[].content_blocks[]` with block types `text`, `metric`, `table`. This is a significant structural difference -- the rendering engine needs to transform the flat metrics-based definition into a richer content-block structure, or the rendered structure should match the definition structure more closely.

7. **No existing "scenario impact data" object.** The `source_field` paths in definitions (e.g., `risk_charges.girr.delta`) don't map to any existing data model. Impact data is stored as flat grid rows, not as structured objects.

8. **Promise-style method signatures.** The raw idea uses TypeScript-style `Promise<void>` signatures, but this is a Java/Spring Boot codebase.

---

## 10. Seed Data Available for Testing

### Scenarios (from seed data)
- Scenario 1: `a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d` -- FX Curve Recalibration (has impact run + grid data)
- Scenario 2: `b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e` -- IR Vol Surface Update (multi-report, 2 impact runs)
- Scenario 3: `c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f` -- Credit Spread Adjustment (has impact run + grid data)
- Scenario 4 and FRTB_SA scenario also exist

### Report Definitions (from changeset 029)
- `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001` -- FRTB_SA / sa_capital_summary
- `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002` -- MARKET_DATA / market_risk_summary
- `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003` -- RISK_FACTOR / risk_factor_impact

### Impact Runs (from changeset 005)
- `d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80` -- for Scenario 1
- `e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091` -- for Scenario 2 (run 1)
- `f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f809102` -- for Scenario 2 (run 2)
- `a7b8c9d0-e1f2-4a3b-4c5d-6e7f80910213` -- for Scenario 3
