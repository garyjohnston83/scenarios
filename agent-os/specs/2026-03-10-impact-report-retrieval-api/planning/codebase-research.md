# Codebase Research: Impact Report Retrieval API (Increment 3)

## 1. Increment 2 Implementation (What This Builds On)

### ScenarioImpactReport Entity
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/entity/ScenarioImpactReport.java`

| Field | Java Type | Column Name | Notes |
|---|---|---|---|
| `id` | `UUID` | `id` | `@Id`, no `@GeneratedValue` |
| `scenarioId` | `UUID` | `scenario_id` | FK to `scenario(id)` |
| `reportDefinitionId` | `UUID` | `report_definition_id` | FK to `report_definition(id)` |
| `definitionVersion` | `int` | `definition_version` | Integer version for auditability |
| `reportKey` | `String` | `report_key` | varchar(100) |
| `reportName` | `String` | `report_name` | varchar(255) |
| `generatedAt` | `LocalDateTime` | `generated_at` | timestamp, not null |
| `status` | `String` | `status` | varchar(20) -- "GENERATED" or "FAILED" |
| `renderedReport` | `String` | `rendered_report` | `@Column(columnDefinition = "text")` -- JSONB/CLOB |
| `errorMessage` | `String` | `error_message` | varchar(2000), nullable |

Key observations:
- No `createdAt`/`updatedAt` -- only `generatedAt`
- No `snapshotVersion` field -- the raw idea mentions this but the entity does not have it
- `status` is a plain String, not an enum
- `renderedReport` is stored as a String (serialized JSON)
- Uses simple UUID FKs (not `@ManyToOne` relationships)
- Follows `SignoffPolicy` pattern: no Lombok, manual getters/setters

### ScenarioImpactReportRepository
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/repository/ScenarioImpactReportRepository.java`

Existing query methods:
```java
List<ScenarioImpactReport> findAllByScenarioIdOrderByGeneratedAtDesc(UUID scenarioId);
Optional<ScenarioImpactReport> findFirstByScenarioIdAndReportKeyOrderByGeneratedAtDesc(UUID scenarioId, String reportKey);
List<ScenarioImpactReport> findAllByScenarioId(UUID scenarioId);
```

Key observations:
- `findAllByScenarioIdOrderByGeneratedAtDesc` -- returns ALL reports (both GENERATED and FAILED) for a scenario, ordered newest-first. This is very close to what the list endpoint needs.
- `findFirstByScenarioIdAndReportKeyOrderByGeneratedAtDesc` -- returns the latest report by reportKey for a scenario. The raw idea mentions retrieving by reportId (UUID), but this query finds by composite key.
- No `findById` is needed beyond `JpaRepository.findById(UUID)` which already exists.
- No query filtering by status (GENERATED vs FAILED) exists yet.
- No query that also validates the scenarioId relationship (the detail endpoint needs to verify the report belongs to the given scenario).

### ScenarioImpactReportDto (Existing)
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/dto/ScenarioImpactReportDto.java`

```java
public record ScenarioImpactReportDto(
    UUID id,
    UUID scenarioId,
    UUID reportDefinitionId,
    int definitionVersion,
    String reportKey,
    String reportName,
    LocalDateTime generatedAt,
    String status,
    String renderedReport,
    String errorMessage
) {}
```

Key observations:
- This DTO includes ALL fields from the entity, including the full `renderedReport` (which is a large JSON string)
- For a list endpoint, returning the full `renderedReport` for every row would be very expensive -- a separate summary DTO is likely needed
- No `@JsonInclude` annotation (unlike `ImpactReportDto` which has `@JsonInclude(NON_NULL)`)
- The raw idea's data contract specifies a `report_summary` shape without `renderedReport` and a `report_detail` shape that includes sections/metadata parsed from `renderedReport`

### ImpactReportDto (Pre-existing, Different Feature)
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/dto/ImpactReportDto.java`

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ImpactReportDto(
    String impactRunId,
    String name,
    String createdAt,
    DatasetDto dataset,
    CtaDto compareCta
) {}
```

This is a DIFFERENT DTO used for the older impact report display within the scenario detail. NOT related to the new impact report snapshots from Increment 2. The naming overlap could cause confusion.

### ImpactReportGenerationService
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/service/ImpactReportGenerationService.java`

- Orchestrates report snapshot generation for a scenario
- Primary method: `generateReportsForScenario(UUID scenarioId)`
- Fetches scenario, resolves type code, queries active definitions, iterates and delegates to `ImpactReportSnapshotGenerator`
- Handles partial failures: if one report fails, catches exception, saves FAILED record, continues to next
- Logs summary: "Generated X of Y reports for scenario {scenarioId} (Z failed)"
- Throws `ResponseStatusException(NOT_FOUND)` if scenario not found
- Constructor-injected with: `ScenarioRepository`, `ReportDefinitionRepository`, `ImpactReportSnapshotGenerator`

### ImpactReportSnapshotGenerator
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/service/ImpactReportSnapshotGenerator.java`

- Separate Spring bean for `REQUIRES_NEW` transaction isolation
- `generateSingleReport(Scenario, ReportDefinition)` -- renders and persists a GENERATED report
- `saveFailedReport(Scenario, ReportDefinition, String errorMessage)` -- persists a FAILED report
- Uses `ObjectMapper` for JSON parsing/serialization
- Builds rendered report JSON with structure: `reportKey`, `reportName`, `definitionVersion`, `generatedAt`, `scenarioId`, `scenarioName`, `scenarioTypeCode`, `sections[]` with `contentBlocks[]`
- The `renderedReport` JSON structure differs from the raw idea's API response shape -- the raw idea specifies `sections[].content` as markdown/HTML and `metadata` with `generatedBy`/`modelVersion`/`durationMs`, but the actual rendered JSON uses `sections[].contentBlocks[]` with metric/text/table blocks

## 2. Existing API Patterns

### ReportDefinitionController (Increment 1)
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/controller/ReportDefinitionController.java`

- `@RestController` with no `@RequestMapping` base path
- Constructor injection with single service
- Returns `ResponseEntity<T>` for all endpoints
- 404 handling: returns `ResponseEntity.notFound().build()` for Optional.empty() cases
- No UUID validation in controller -- Spring handles conversion
- No `ResponseStatusException` in controller itself; service throws them
- GET returns wrapped in `ResponseEntity.ok()`

### ScenarioController (Closest Analog for New Endpoints)
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/controller/ScenarioController.java`

- `@RestController` with no `@RequestMapping` base path
- Endpoints under `/scenarios/{id}/...` pattern:
  - `GET /scenarios` -- list
  - `GET /scenarios/{id}` -- detail with `?expand=` param
  - `POST /scenarios/{id}/messages` -- create message
  - `POST /scenarios/{id}/events` -- post event
  - `POST /scenarios/combine` -- combine scenarios
- Uses `@PathVariable UUID id` for scenario ID path variable
- 404 for scenario: returns `ResponseEntity.notFound().build()` via Optional mapping
- Error handling: `ScenarioDetailService` throws `ResponseStatusException` for various error states
- Constructor-injected with `ScenarioRepository` and `ScenarioDetailService`

**Key observation:** The new endpoints (`/scenarios/{scenarioId}/impact-reports` and `/scenarios/{scenarioId}/impact-reports/{reportId}`) follow the scenario-scoped pattern already established by `ScenarioController`. The question is whether to add them to `ScenarioController` or create a new dedicated controller.

### AdminController
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/controller/AdminController.java`

- `@RestController`, no base path annotation
- CRUD patterns with `ResponseEntity` return types
- 404 via `ResponseStatusException(HttpStatus.NOT_FOUND, ...)`
- Direct repository access (thinner service layer pattern)
- `toDto()` private helper for entity-to-DTO mapping

### Error Handling Patterns
- `ResponseStatusException(HttpStatus.NOT_FOUND, "message")` for 404s (AdminController, ImpactReportGenerationService)
- `ResponseEntity.notFound().build()` for 404 from Optional (ScenarioController, ReportDefinitionController)
- `ResponseStatusException(HttpStatus.BAD_REQUEST, "message")` for 400s (AdminController)
- Spring auto-converts invalid UUID path variables to 400 (MethodArgumentTypeMismatchException)

## 3. Existing Test Patterns

### ReportDefinitionControllerTest
**Path:** `model-logic-service/src/test/java/com/prototypes/scenarios/controller/ReportDefinitionControllerTest.java`

- `@WebMvcTest(ReportDefinitionController.class)`
- `@MockitoBean` for `ReportDefinitionService`
- Helper method `buildDto()` for constructing test DTOs
- Uses `mockMvc.perform(get(...))` with chained `.andExpect()` assertions
- `jsonPath("$", hasSize(2))` for list size
- `jsonPath("$[0].fieldName", is(expectedValue))` for field assertions
- `status().isOk()`, `status().isCreated()`, `status().isNotFound()`, `status().isUnprocessableEntity()`
- Error responses mocked via `when(...).thenThrow(new ResponseStatusException(...))`

### AdminControllerTest
**Path:** `model-logic-service/src/test/java/com/prototypes/scenarios/controller/AdminControllerTest.java`

- `@WebMvcTest(AdminController.class)`
- `@MockitoBean` for `SignoffPolicyRepository` and `ScenarioTypeRepository`
- Helper method `buildPolicy()` for constructing test entities
- Same MockMvc + jsonPath assertion pattern
- Tests empty list scenario (returns 200 with empty array)

### ScenarioControllerTest
**Path:** `model-logic-service/src/test/java/com/prototypes/scenarios/controller/ScenarioControllerTest.java`

- `@WebMvcTest(ScenarioController.class)`
- `@MockitoBean` for `ScenarioRepository` and `ScenarioDetailService`
- Tests scenario-scoped endpoints (`/scenarios/{id}`, `/scenarios/{id}/events`)
- Uses `@PathVariable UUID id` -- Spring handles UUID parsing/validation
- Tests 404 for non-existent scenario ID
- Tests event posting with headers (`X-Actor`, `X-Actor-Id`)

## 4. ScenarioRepository
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/repository/ScenarioRepository.java`

```java
public interface ScenarioRepository extends JpaRepository<Scenario, UUID> {
    // findAllWithSummary, findByIdWithSummary, findAllWithSummaryByIds
}
```

- `existsById(UUID)` is inherited from `JpaRepository` and can be used to validate scenario existence
- `findById(UUID)` returns `Optional<Scenario>` -- already used in `ImpactReportGenerationService`

## 5. WebConfig (CORS)
**Path:** `model-logic-service/src/main/java/com/prototypes/scenarios/config/WebConfig.java`

```java
registry.addMapping("/**")
    .allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*")
    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS");
```

- Wildcard `/**` mapping covers all paths, including the new `/scenarios/{scenarioId}/impact-reports` endpoints
- `GET` is already in the allowed methods list
- No CORS changes needed for Increment 3

## 6. Key Discrepancies Between Raw Idea and Actual Codebase

### Response Shape vs Entity Fields
The raw idea specifies response fields like:
- `title` -- the entity has `reportName` (not `title`)
- `snapshotVersion` -- does not exist on the entity
- `sections[].heading` -- the rendered JSON uses `sectionTitle`
- `sections[].content` -- the rendered JSON uses `contentBlocks[]` with block-type objects
- `metadata.generatedBy` -- not stored (column was omitted in Increment 2)
- `metadata.modelVersion` -- not stored
- `metadata.durationMs` -- not stored

### The `renderedReport` Field
The entity stores the full rendered JSON as a String. The raw idea's detail response expects this to be decomposed into `sections[]` and `metadata{}`. Two options:
1. Return `renderedReport` as a parsed JSON object in the response (parse the string and include it as a nested object)
2. Return `renderedReport` as a raw string (the frontend parses it)

### No `/api/` Prefix
The raw idea uses `/api/scenarios/{scenarioId}/impact-reports` but no existing endpoint uses an `/api/` prefix. Increment 2 requirements already confirmed: follow existing convention with no `/api/` prefix.

## 7. Summary of New Repository Queries Likely Needed

Based on the raw idea's requirements:
1. `findAllByScenarioIdOrderByGeneratedAtDesc(UUID scenarioId)` -- ALREADY EXISTS, returns all reports for a scenario
2. `findById(UUID reportId)` -- ALREADY EXISTS via JpaRepository
3. Potentially: `findByIdAndScenarioId(UUID id, UUID scenarioId)` -- for the detail endpoint to verify report belongs to scenario
4. Potentially: filter out FAILED reports from the list endpoint (no existing query for this)
