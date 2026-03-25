package com.prototypes.scenarios.integration;

import com.prototypes.scenarios.dto.DirectChangesDataSection;
import com.prototypes.scenarios.dto.DirectChangesRuntimeResponseDto;
import com.prototypes.scenarios.service.DirectChangesRuntimeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for the Direct Changes runtime API endpoint.
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode,
 * Liquibase seed data applied, and the stub provider active.
 * Tests the full controller-to-service-to-provider chain.
 *
 * <p>Note: The MARKET_DATA scenario type has directChangesMode=EXTERNAL in seed data.
 * The happy-path test updates this to INTERNAL within the transactional test boundary
 * (rolled back after each test) so the full DELTA_BY_UNIQUE_ID pipeline can be exercised.</p>
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class DirectChangesIntegrationTest {

    @Autowired
    private DirectChangesRuntimeService directChangesRuntimeService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // FX Curve Recalibration -- a MARKET_DATA scenario with
    // directChangesInternalRenderMode = DELTA_BY_UNIQUE_ID after changeset 051
    private static final UUID MARKET_DATA_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // ========================================================================
    // Integration Test 1: Scenario not found returns 404
    // ========================================================================

    @Test
    void getDirectChanges_scenarioNotFound_returns404ResponseEntity() {
        UUID randomId = UUID.fromString("ffffffff-ffff-4fff-bfff-ffffffffffff");

        ResponseEntity<DirectChangesRuntimeResponseDto> response =
                directChangesRuntimeService.getDirectChanges(randomId);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode(),
                "Should return 404 for a non-existent scenario UUID");
    }

    // ========================================================================
    // Integration Test 2: End-to-end happy path with seed data and stub provider
    // ========================================================================

    @Test
    void getDirectChanges_happyPathWithSeedDataAndStubProvider_returns200WithExpectedStructure() {
        // The MARKET_DATA scenario type has directChangesMode=EXTERNAL in seed data.
        // Update it to INTERNAL within this transactional test so the DELTA_BY_UNIQUE_ID
        // pipeline is exercised end-to-end. This change is rolled back after the test.
        jdbcTemplate.update(
                "UPDATE scenario_type SET direct_changes_mode = 'INTERNAL' WHERE code = 'MARKET_DATA'");

        // Clear the JPA first-level cache so the service picks up the JDBC update
        // by forcing a fresh load from the database.
        // EntityManager flush/clear is not needed here because DirectChangesRuntimeService
        // uses findByIdWithSummary() which executes a JPQL query that will reflect
        // the updated state due to the shared transactional connection.

        ResponseEntity<DirectChangesRuntimeResponseDto> response =
                directChangesRuntimeService.getDirectChanges(MARKET_DATA_SCENARIO_ID);

        // Verify 200 OK
        assertEquals(HttpStatus.OK, response.getStatusCode(),
                "Should return 200 for a MARKET_DATA scenario with INTERNAL + DELTA_BY_UNIQUE_ID mode");

        DirectChangesRuntimeResponseDto body = response.getBody();
        assertNotNull(body, "Response body should not be null");
        assertNotNull(body.dataChanged(), "dataChanged should not be null");

        // Verify expected section count (seed data defines timeSeriesValues and curvePoints,
        // stub provider returns data for both)
        assertEquals(2, body.dataChanged().size(),
                "Should have 2 sections (timeSeriesValues and curvePoints) from seed data + stub provider");

        // Verify first section (timeSeriesValues)
        DirectChangesDataSection tsSection = body.dataChanged().stream()
                .filter(s -> "timeSeriesValues".equals(s.dataType()))
                .findFirst()
                .orElse(null);
        assertNotNull(tsSection, "Should have a timeSeriesValues section");
        assertEquals("ROWS", tsSection.renderState(),
                "timeSeriesValues should be ROWS (6 rows from stub, threshold is 50)");
        assertEquals(6, tsSection.totalDataChanges(),
                "Stub provider returns 6 rows for timeSeriesValues");
        assertNotNull(tsSection.data(), "Data should not be null for ROWS renderState");
        assertEquals(6, tsSection.data().size());

        // Verify column definitions are present
        assertNotNull(tsSection.columnDefinitions(), "columnDefinitions should be present");
        assertFalse(tsSection.columnDefinitions().isEmpty(), "columnDefinitions should not be empty");
        assertEquals(4, tsSection.columnDefinitions().size(),
                "timeSeriesValues should have 4 column definitions per seed data");

        // Verify isEntityId is set on the entity column
        assertTrue(tsSection.columnDefinitions().stream()
                        .anyMatch(cd -> "tsName".equals(cd.dataAttribute()) && Boolean.TRUE.equals(cd.isEntityId())),
                "tsName column should have isEntityId=true");

        // Verify header substitution was performed (no unresolved placeholders)
        assertNotNull(tsSection.header(), "Header should not be null");
        assertFalse(tsSection.header().contains("${changedValuesCount}"),
                "Header should have ${changedValuesCount} placeholder substituted");
        assertFalse(tsSection.header().contains("${changedEntitiesCount}"),
                "Header should have ${changedEntitiesCount} placeholder substituted");

        // Verify header has correct computed counts:
        // 6 rows, 3 distinct tsName values (USD LIBOR 3M, EUR EURIBOR 6M, GBP SONIA ON)
        assertTrue(tsSection.header().contains("6"),
                "Header should contain changedValuesCount of 6");
        assertTrue(tsSection.header().contains("3"),
                "Header should contain changedEntitiesCount of 3");

        // Verify externalLink is present for timeSeriesValues (stub provides one)
        assertNotNull(tsSection.externalLink(), "timeSeriesValues should have an externalLink from stub");

        // Verify second section (curvePoints)
        DirectChangesDataSection curveSection = body.dataChanged().stream()
                .filter(s -> "curvePoints".equals(s.dataType()))
                .findFirst()
                .orElse(null);
        assertNotNull(curveSection, "Should have a curvePoints section");
        assertEquals("ROWS", curveSection.renderState(),
                "curvePoints should be ROWS (4 rows from stub, threshold is 50)");
        assertEquals(4, curveSection.totalDataChanges(),
                "Stub provider returns 4 rows for curvePoints");
        assertNotNull(curveSection.data());
        assertNotNull(curveSection.columnDefinitions());
        assertEquals(4, curveSection.columnDefinitions().size(),
                "curvePoints should have 4 column definitions per seed data");

        // Verify sorting was applied (timeSeriesValues sorted by tsName ASC per seed definition)
        // The stub data has: USD LIBOR 3M, USD LIBOR 3M, EUR EURIBOR 6M, EUR EURIBOR 6M, GBP SONIA ON, GBP SONIA ON
        // After ASC sort: EUR EURIBOR 6M, EUR EURIBOR 6M, GBP SONIA ON, GBP SONIA ON, USD LIBOR 3M, USD LIBOR 3M
        List<String> tsNames = tsSection.data().stream()
                .map(row -> (String) row.get("tsName"))
                .toList();
        for (int i = 0; i < tsNames.size() - 1; i++) {
            assertTrue(tsNames.get(i).compareTo(tsNames.get(i + 1)) <= 0,
                    "timeSeriesValues rows should be sorted by tsName ASC: found '" +
                    tsNames.get(i) + "' before '" + tsNames.get(i + 1) + "'");
        }
    }
}
