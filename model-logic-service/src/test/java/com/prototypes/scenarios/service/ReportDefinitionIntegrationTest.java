package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.CreateReportDefinitionRequestDto;
import com.prototypes.scenarios.dto.ReportDefinitionDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Task Group 8: End-to-end integration tests for the Report Definition feature.
 *
 * Uses the full Spring context with H2 in PostgreSQL compatibility mode
 * so that all Liquibase changesets and seed data are available.
 * Tests exercise the service layer end-to-end, verifying create, retrieve,
 * version auto-increment, deactivation, and seed data accessibility.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class ReportDefinitionIntegrationTest {

    @Autowired
    private ReportDefinitionService reportDefinitionService;

    private static final String VALID_DEFINITION = """
            {
              "schema_version": "1.0",
              "report_key": "integration_test_report",
              "scenario_type": "FRTB_SA",
              "display_name": "Integration Test Report",
              "description": "A report definition for integration testing.",
              "sections": [
                {
                  "key": "capital_charges",
                  "title": "Capital Charges",
                  "order": 1,
                  "metrics": [
                    {
                      "key": "total_charge",
                      "label": "Total Capital Charge",
                      "source_field": "risk_charges.total",
                      "format": "currency",
                      "unit": "USD"
                    },
                    {
                      "key": "delta_charge",
                      "label": "Delta Charge",
                      "source_field": "risk_charges.delta",
                      "format": "currency",
                      "unit": "USD"
                    }
                  ]
                },
                {
                  "key": "risk_summary",
                  "title": "Risk Summary",
                  "order": 2,
                  "metrics": [
                    {
                      "key": "vega_charge",
                      "label": "Vega Charge",
                      "source_field": "risk_charges.vega",
                      "format": "currency",
                      "unit": "USD"
                    }
                  ]
                }
              ],
              "metadata": {
                "author": "integration-test",
                "tags": ["test", "integration"]
              }
            }
            """;

    // ========================================================================
    // Test 1: End-to-end create + retrieve
    // ========================================================================

    @Test
    void endToEnd_createAndRetrieve_returnsCreatedDefinition() {
        CreateReportDefinitionRequestDto request = new CreateReportDefinitionRequestDto(
                "FRTB_SA", "integration_test_report", VALID_DEFINITION);

        // Create
        ReportDefinitionDto created = reportDefinitionService.createDefinition(request);

        assertNotNull(created.id(), "Created definition should have a non-null ID");
        assertEquals("FRTB_SA", created.scenarioTypeCode());
        assertEquals("integration_test_report", created.reportKey());
        assertEquals(1, created.version());
        assertTrue(created.isActive());
        assertNotNull(created.createdAt());
        assertNotNull(created.updatedAt());
        assertNotNull(created.definition());

        // Retrieve via getLatestDefinition
        Optional<ReportDefinitionDto> retrieved = reportDefinitionService
                .getLatestDefinition("integration_test_report");

        assertTrue(retrieved.isPresent(), "Should find the created definition via getLatestDefinition");
        assertEquals(created.id(), retrieved.get().id());
        assertEquals(created.version(), retrieved.get().version());
        assertEquals(created.reportKey(), retrieved.get().reportKey());
        assertEquals(created.scenarioTypeCode(), retrieved.get().scenarioTypeCode());
        assertEquals(created.definition(), retrieved.get().definition());
    }

    // ========================================================================
    // Test 2: Version auto-increment end-to-end
    // ========================================================================

    @Test
    void endToEnd_versionAutoIncrement_assignsSequentialVersions() {
        CreateReportDefinitionRequestDto request = new CreateReportDefinitionRequestDto(
                "MARKET_DATA", "version_increment_test", VALID_DEFINITION);

        // First create: should be version 1
        ReportDefinitionDto first = reportDefinitionService.createDefinition(request);
        assertEquals(1, first.version(), "First definition should be version 1");
        assertEquals("MARKET_DATA", first.scenarioTypeCode());
        assertEquals("version_increment_test", first.reportKey());

        // Second create for same (scenarioTypeCode, reportKey): should be version 2
        ReportDefinitionDto second = reportDefinitionService.createDefinition(request);
        assertEquals(2, second.version(), "Second definition should be version 2");
        assertEquals("MARKET_DATA", second.scenarioTypeCode());
        assertEquals("version_increment_test", second.reportKey());

        // Verify both have distinct IDs
        assertFalse(first.id().equals(second.id()),
                "Each version should have a unique ID");
    }

    // ========================================================================
    // Test 3: Deactivate + getLatest falls back to previous active version
    // ========================================================================

    @Test
    void endToEnd_deactivateVersion2_getLatestReturnsVersion1() {
        CreateReportDefinitionRequestDto request = new CreateReportDefinitionRequestDto(
                "RISK_FACTOR", "deactivate_fallback_test", VALID_DEFINITION);

        // Create version 1
        ReportDefinitionDto v1 = reportDefinitionService.createDefinition(request);
        assertEquals(1, v1.version());

        // Create version 2
        ReportDefinitionDto v2 = reportDefinitionService.createDefinition(request);
        assertEquals(2, v2.version());

        // Verify getLatest returns version 2 initially
        Optional<ReportDefinitionDto> latestBefore = reportDefinitionService
                .getLatestDefinition("deactivate_fallback_test");
        assertTrue(latestBefore.isPresent());
        assertEquals(2, latestBefore.get().version(),
                "Before deactivation, latest should be version 2");

        // Deactivate version 2
        ReportDefinitionDto deactivated = reportDefinitionService.deactivateDefinition(v2.id());
        assertFalse(deactivated.isActive(), "Deactivated definition should have isActive=false");

        // Now getLatest should return version 1 (the highest active version)
        Optional<ReportDefinitionDto> latestAfter = reportDefinitionService
                .getLatestDefinition("deactivate_fallback_test");
        assertTrue(latestAfter.isPresent(), "Should still find an active definition after deactivating version 2");
        assertEquals(1, latestAfter.get().version(),
                "After deactivating version 2, latest active should be version 1");
        assertEquals(v1.id(), latestAfter.get().id());
        assertTrue(latestAfter.get().isActive());
    }

    // ========================================================================
    // Test 4: listVersions includes inactive definitions
    // ========================================================================

    @Test
    void endToEnd_listVersionsIncludesInactive() {
        CreateReportDefinitionRequestDto request = new CreateReportDefinitionRequestDto(
                "FRTB_SA", "list_versions_inactive_test", VALID_DEFINITION);

        // Create a definition
        ReportDefinitionDto created = reportDefinitionService.createDefinition(request);
        assertTrue(created.isActive());

        // Deactivate it
        reportDefinitionService.deactivateDefinition(created.id());

        // listVersions should still show it, with isActive=false
        List<ReportDefinitionDto> versions = reportDefinitionService
                .listVersions("list_versions_inactive_test");

        assertFalse(versions.isEmpty(), "listVersions should return the deactivated definition");
        assertEquals(1, versions.size(), "Should have exactly 1 version");
        assertEquals(created.id(), versions.get(0).id());
        assertFalse(versions.get(0).isActive(),
                "The deactivated definition should show isActive=false in listVersions");
        assertEquals(1, versions.get(0).version());
    }

    // ========================================================================
    // Test 5: Seed data end-to-end -- getLatestDefinition for seed report key
    // ========================================================================

    @Test
    void endToEnd_seedData_getLatestReturnsSeededDefinition() {
        // The seed data from changeset 029 inserts a definition with reportKey="sa_capital_summary"
        Optional<ReportDefinitionDto> result = reportDefinitionService
                .getLatestDefinition("sa_capital_summary");

        assertTrue(result.isPresent(), "Seed data for 'sa_capital_summary' should be retrievable via service");
        ReportDefinitionDto dto = result.get();
        assertEquals("FRTB_SA", dto.scenarioTypeCode());
        assertEquals("sa_capital_summary", dto.reportKey());
        assertEquals(1, dto.version());
        assertTrue(dto.isActive());
        assertNotNull(dto.definition(), "Seed definition JSON should not be null");
        assertTrue(dto.definition().contains("schema_version"),
                "Seed definition should contain schema_version field");
        assertTrue(dto.definition().contains("SA Capital Charge Summary"),
                "Seed definition should contain the expected display_name");
    }

    // ========================================================================
    // Test 6: Create with invalid scenario type returns 400
    // ========================================================================

    @Test
    void endToEnd_createWithInvalidScenarioType_throws400() {
        CreateReportDefinitionRequestDto request = new CreateReportDefinitionRequestDto(
                "NONEXISTENT_TYPE", "bad_type_test", VALID_DEFINITION);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> reportDefinitionService.createDefinition(request));

        assertEquals(400, exception.getStatusCode().value(),
                "Should return 400 BAD_REQUEST for non-existent scenario type code");
        assertTrue(exception.getReason().contains("NONEXISTENT_TYPE"),
                "Error message should mention the invalid scenario type code");
    }
}
