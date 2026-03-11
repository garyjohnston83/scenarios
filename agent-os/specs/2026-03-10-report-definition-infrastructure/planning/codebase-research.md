# Codebase Research: Report Definition Infrastructure

## 1. Architecture Overview

### Backend Stack
- **Language:** Java 21
- **Framework:** Spring Boot 3.4.13
- **Build Tool:** Maven
- **ORM:** Spring Data JPA (Jakarta Persistence)
- **Database:** PostgreSQL 15 (production), H2 in PostgreSQL compatibility mode (tests)
- **Migration Tool:** Liquibase (YAML-based changesets)
- **JSON Processing:** Jackson
- **Server Port:** 9090

### Frontend Stack
- **Language:** TypeScript
- **Framework:** React 19
- **State Management:** Redux Toolkit + Redux Saga
- **HTTP Client:** Axios
- **Build:** Webpack
- **Testing:** Vitest / Jest

---

## 2. Project Structure

### Backend (`model-logic-service/`)
```
src/main/java/com/prototypes/scenarios/
  config/          - WebConfig.java (CORS)
  controller/      - ScenarioController.java, AdminController.java
  dto/             - Java records for API request/response shapes
  entity/          - JPA entities (no Lombok, plain POJOs with getters/setters)
  repository/      - Spring Data JPA repository interfaces
  service/         - ScenarioDetailService.java (main service class)

src/main/resources/
  application.properties
  db/changelog/
    db.changelog-master.yaml           - Master changelog (includes all changesets)
    changesets/                         - Individual Liquibase YAML changesets (001-027)

src/test/java/com/prototypes/scenarios/
  controller/      - @WebMvcTest controller tests with MockMvc + MockitoBean
  dto/             - DTO serialization tests
  entity/          - @SpringBootTest entity/repository tests
  integration/     - Integration gap tests
  migration/       - Migration and seed data alignment tests
  service/         - @SpringBootTest service tests with @Transactional
```

### Frontend (`frontend/`)
```
src/
  components/      - React components (each in own folder with index.ts barrel)
  pages/           - Page-level components
  routes/          - AppRoutes.tsx
  services/        - API service modules (scenarioApi.ts, adminApi.ts)
  store/           - Redux slices, sagas, store config
  utils/           - Utility functions
  constants/       - Shared constants
```

---

## 3. Database Schema Patterns

### Existing Tables
- `scenario` - UUID PK, `scenario_type_code` FK to `scenario_type`, timestamps (LocalDateTime, not OffsetDateTime)
- `scenario_type` - VARCHAR(50) PK (`code`), with `name`, `icon`, mode columns, `is_enabled`, `sort_order`
- `scenario_summary` - UUID PK (same as scenario ID, 1:1), workflow and impact data
- `scenario_event`, `scenario_message`, `scenario_link` - FK to scenario
- `scenario_grid_dataset`, `scenario_grid_row` - Grid data with JSON in TEXT columns
- `impact_run` - UUID PK, FK to scenario
- `signoff_policy` - UUID PK, `scenario_type_code` FK, CRUD resource
- `signoff_approval`, `signoff_case` - Sign-off workflow
- `user_ref` - VARCHAR(100) PK
- `scenario_participant` - Participants

### Key Observations
- **UUID generation:** Entities use `UUID id` with `@Id`, but there is NO `@GeneratedValue`. IDs are set manually via `UUID.randomUUID()` in the controller/service layer before saving.
- **Timestamps:** All timestamp columns use `LocalDateTime` (not `OffsetDateTime` or `Instant`). No timezone-aware types are used anywhere in the codebase.
- **No JSONB columns exist yet:** The `scenario_grid_dataset.columns_json` column is `TEXT`, not `JSONB`. This feature would be the FIRST use of a true PostgreSQL JSONB column in the application.
- **Foreign keys to scenario_type:** Use `scenario_type_code` referencing `scenario_type(code)`.
- **Liquibase changeset numbering:** Sequential 3-digit prefix (001 through 027). Next would be 028.

### Migration Style
- Liquibase YAML format
- Author: `scenarios-team`
- `createTable` for DDL, `sql` blocks for DML (seeds)
- Separate changesets for table creation and seed data
- Changeset IDs match the file prefix (e.g., `022-seed-signoff-policies`)

---

## 4. Entity Patterns

### Style
- Plain Java classes (NO Lombok, NO records for entities)
- Manual getters/setters
- No-arg constructor required by JPA
- `@Entity` + `@Table(name = "...")` annotations
- UUID fields with `@Id` but NO `@GeneratedValue`
- Relationships via `@ManyToOne`, `@OneToMany`, `@OneToOne`
- `FetchType.LAZY` for most relationships, `FetchType.EAGER` for small lookups (e.g., ScenarioType)

### Notable: No JSONB Mapping Exists Yet
The codebase has NO example of mapping a JSONB column. The `ScenarioGridDataset.columnsJson` field stores JSON but as a plain `String` (`TEXT` column), not as a JSONB type. This means:
- No Hibernate JSONB type converter is configured
- No `@Type` or `@JdbcTypeCode` annotations for JSON are in use
- A new approach will need to be established for the `definition` JSONB column

---

## 5. DTO Patterns

- **Java records** used for all DTOs (not classes)
- `@JsonInclude(JsonInclude.Include.NON_NULL)` on response DTOs that have optional fields
- Request DTOs are simple records without validation annotations (no `@NotNull`, `@Valid`, etc.)
- No Bean Validation (`jakarta.validation`) is used anywhere -- validation is done manually in controllers/services

### Example (closest analog - SignoffPolicyDto):
```java
public record SignoffPolicyDto(
    UUID id,
    String scenarioTypeCode,
    String name,
    int requiredApproverCount,
    boolean isEnabled,
    int priority,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
```

---

## 6. Controller/API Patterns

### URL Structure
- No `/api/` prefix: endpoints are at root path (e.g., `/scenarios`, `/admin/signoff-policies`)
- REST verbs: `@GetMapping`, `@PostMapping`, `@PutMapping` (PATCH is NOT used in existing code)
- Path variables for IDs: `@PathVariable UUID id`
- Query params: `@RequestParam(required = false)`

### Response Patterns
- List endpoints return the list directly (no wrapper object like `{ "data": [...] }`)
- Detail endpoints return the object directly or wrapped in `ResponseEntity`
- 201 Created: `ResponseEntity.status(HttpStatus.CREATED).body(dto)`
- 404: `ResponseEntity.notFound().build()` or `throw new ResponseStatusException(HttpStatus.NOT_FOUND, ...)`
- 400: `throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ...)`
- No global exception handler (`@ControllerAdvice`) exists
- No structured error response format (errors use Spring's default)

### CORS
- Configured in `WebConfig` to allow `localhost:*` origins
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- PATCH is explicitly NOT listed (would need to be added if used)

---

## 7. Service Layer Patterns

### Current Architecture
- Single main service: `ScenarioDetailService` (~900+ lines, handles most business logic)
- Controllers are relatively thin -- they delegate to service or call repository directly
- `AdminController` calls repository directly (no service layer for admin CRUD)
- No separate service classes for admin resources

### Validation
- Manual validation in controller/service (no Bean Validation)
- Example: `scenarioTypeRepository.existsById(...)` checked before save
- Errors thrown via `ResponseStatusException`
- No dedicated validator classes exist in the codebase

---

## 8. Repository Patterns

### Spring Data JPA Repositories
- Interface extends `JpaRepository<Entity, IDType>`
- Custom queries via `@Query` with JPQL
- Spring Data method naming for simple queries (e.g., `findAllByScenarioTypeCode`)
- No native SQL queries in repositories
- No pagination support implemented (`Pageable` not used anywhere)

### Example (closest analog - SignoffPolicyRepository):
```java
public interface SignoffPolicyRepository extends JpaRepository<SignoffPolicy, UUID> {
    Optional<SignoffPolicy> findFirstByScenarioTypeCodeAndIsEnabledTrueOrderByPriorityAscUpdatedAtDesc(String scenarioTypeCode);
    List<SignoffPolicy> findAllByScenarioTypeCode(String scenarioTypeCode);
}
```

---

## 9. Test Patterns

### Controller Tests (`@WebMvcTest`)
- Use `MockMvc` for HTTP-level testing
- `@MockitoBean` for dependencies
- Assert status codes and JSON paths
- No request validation tests (since no Bean Validation is used)
- Content type: `MediaType.APPLICATION_JSON`
- Request bodies as inline JSON strings using text blocks (`"""..."""`)

### Service/Integration Tests (`@SpringBootTest`)
- `@ActiveProfiles("integration")` to use H2 config
- `@Transactional` to keep Hibernate session open
- Test against seed data from Liquibase migrations
- Use `@Autowired` for service and repository injection
- Standard JUnit 5 assertions

### Test Database Config (`application-integration.properties`)
```properties
spring.datasource.url=jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
spring.datasource.driver-class-name=org.h2.Driver
```

### H2 Compatibility Concern for JSONB
H2 in PostgreSQL mode has LIMITED JSONB support. The `JSONB` data type and GIN index from the raw idea's SQL will NOT work directly in H2. This will require either:
- Using `TEXT` type in H2 tests with PostgreSQL `JSONB` in production
- Or using Liquibase `property` substitution for column types
- Or switching integration tests to Testcontainers with real PostgreSQL

---

## 10. Scenario Type Codes (Current Values)

From seed data:
| Code | Name | Direct Changes Mode | Impact Data Mode |
|------|------|-------------------|-----------------|
| MARKET_DATA | Market Data | EXTERNAL | EXTERNAL |
| RISK_FACTOR | Risk Factor | EXTERNAL | EXTERNAL |
| FRTB_SA | FRTB SA | INTERNAL | INTERNAL |

The raw idea uses lowercase `scenario_type` values (e.g., `'residential'`, `'commercial'`), but the existing codebase uses UPPER_SNAKE_CASE (e.g., `'MARKET_DATA'`, `'FRTB_SA'`). This is a significant mismatch that needs resolution.

---

## 11. Frontend API Communication Patterns

### API Service Files
- `scenarioApi.ts` - functions for scenario CRUD and expand queries
- `adminApi.ts` - functions for signoff policy CRUD
- Base URL: `process.env.REACT_APP_API_BASE_URL || 'http://localhost:9090'`
- Axios for HTTP requests
- TypeScript interfaces defined alongside API functions

### Redux Store Pattern
- Redux Toolkit slices with `createSlice`
- Redux Saga for async side effects
- Slices: `scenariosSlice`, `adminSlice`, `analysisSlice`
- Pattern: `requestAction` -> saga -> API call -> `successAction` / `failureAction`
- State shape: `{ data, loading, error, saving }`

---

## 12. Relevant Existing Files for Reference

### Closest Analog: Admin CRUD (SignoffPolicy)
This is the most similar existing feature to the report definitions CRUD:

| Layer | File Path |
|-------|-----------|
| Entity | `model-logic-service/src/main/java/com/prototypes/scenarios/entity/SignoffPolicy.java` |
| Repository | `model-logic-service/src/main/java/com/prototypes/scenarios/repository/SignoffPolicyRepository.java` |
| Controller | `model-logic-service/src/main/java/com/prototypes/scenarios/controller/AdminController.java` |
| Request DTO | `model-logic-service/src/main/java/com/prototypes/scenarios/dto/CreateSignoffPolicyRequestDto.java` |
| Response DTO | `model-logic-service/src/main/java/com/prototypes/scenarios/dto/SignoffPolicyDto.java` |
| Migration | `model-logic-service/src/main/resources/db/changelog/changesets/019-create-signoff-policy-table.yaml` |
| Seed | `model-logic-service/src/main/resources/db/changelog/changesets/022-seed-signoff-policies.yaml` |
| Controller Test | `model-logic-service/src/test/java/com/prototypes/scenarios/controller/AdminControllerTest.java` |
| Frontend API | `frontend/src/services/adminApi.ts` |
| Frontend Slice | `frontend/src/store/adminSlice.ts` |

### ScenarioType Entity (FK Target)
| Layer | File Path |
|-------|-----------|
| Entity | `model-logic-service/src/main/java/com/prototypes/scenarios/entity/ScenarioType.java` |
| Repository | `model-logic-service/src/main/java/com/prototypes/scenarios/repository/ScenarioTypeRepository.java` |
| Migration | `model-logic-service/src/main/resources/db/changelog/changesets/013-create-scenario-type-and-user-ref-tables.yaml` |
| Seed | `model-logic-service/src/main/resources/db/changelog/changesets/014-seed-scenario-type-and-user-ref.yaml` |

---

## 13. Key Technical Gaps / Decisions Needed

1. **JSONB Column in JPA:** No precedent exists. Need to decide on mapping strategy (String vs Map vs dedicated type).
2. **JSONB in H2 Tests:** H2 doesn't support JSONB or GIN indexes natively. Need migration compatibility strategy.
3. **Validation Library:** No Bean Validation or JSON Schema validation exists. Need to decide: custom Java validator, Jackson schema validation, or introduce a library.
4. **API URL Prefix:** Raw idea uses `/api/report-definitions` but existing code has no `/api/` prefix.
5. **Response Wrapper:** Raw idea uses `{ "data": [...] }` wrapper but existing endpoints return arrays/objects directly.
6. **PATCH vs PUT:** Raw idea uses `PATCH` for deactivation but existing code uses only `GET`, `POST`, `PUT`. CORS config also doesn't list `PATCH`.
7. **Timestamp Type:** Raw idea specifies `TIMESTAMPTZ` and ISO 8601 UTC, but existing code uses `timestamp` (no timezone) with `LocalDateTime`.
8. **Scenario Type Values:** Raw idea uses lowercase (`residential`, `commercial`) but existing data uses UPPER_SNAKE_CASE (`MARKET_DATA`, `FRTB_SA`).
9. **UUID Generation:** Raw idea specifies `gen_random_uuid()` as DB default, but existing code generates UUIDs in Java.
