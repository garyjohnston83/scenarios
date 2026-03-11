package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.prototypes.scenarios.dto.ImpactReportDetailDto;
import com.prototypes.scenarios.dto.ImpactReportSummaryDto;
import com.prototypes.scenarios.repository.ScenarioImpactReportRepository;
import com.prototypes.scenarios.repository.ScenarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for ImpactReportService.
 *
 * Uses the full Spring context with H2 in PostgreSQL compatibility mode
 * so that all Liquibase changesets and seed data are available.
 *
 * Seed data used:
 * - Scenario: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d (MARKET_DATA, "FX Curve Recalibration")
 * - Scenario with no reports: b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e (MARKET_DATA, "IR Vol Surface Update")
 * - Report: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011 (GENERATED, market_risk_summary, with renderedReport JSON)
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class ImpactReportServiceTest {

    @Autowired
    private ImpactReportService impactReportService;

    @Autowired
    private ScenarioImpactReportRepository scenarioImpactReportRepository;

    @Autowired
    private ScenarioRepository scenarioRepository;

    private static final UUID EXISTING_SCENARIO_ID =
            UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    private static final UUID SCENARIO_WITH_NO_REPORTS =
            UUID.fromString("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");

    private static final UUID SEED_REPORT_ID =
            UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011");

    private static final UUID NON_EXISTENT_SCENARIO_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000099");

    private static final UUID NON_EXISTENT_REPORT_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000088");

    // ========================================================================
    // Test 1: getReportsForScenario returns non-empty list with correct mapping
    // ========================================================================

    @Test
    void getReportsForScenario_existingScenario_returnsNonEmptyListWithCorrectMapping() {
        List<ImpactReportSummaryDto> results = impactReportService.getReportsForScenario(EXISTING_SCENARIO_ID);

        assertFalse(results.isEmpty(), "Should return at least one report for the MARKET_DATA scenario");

        // Find the seed report in the results
        ImpactReportSummaryDto seedReport = results.stream()
                .filter(dto -> SEED_REPORT_ID.equals(dto.id()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Seed report bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011 should appear in results"));

        // Verify DTO field mapping
        assertEquals(SEED_REPORT_ID, seedReport.id());
        assertEquals(EXISTING_SCENARIO_ID, seedReport.scenarioId());
        assertEquals("market_risk_summary", seedReport.reportKey());
        assertEquals("GENERATED", seedReport.status());
        assertNotNull(seedReport.generatedAt(), "generatedAt should not be null");

        // Verify ascending ordering: if there are multiple reports, each generatedAt
        // should be <= the next
        for (int i = 1; i < results.size(); i++) {
            assertTrue(
                    !results.get(i).generatedAt().isBefore(results.get(i - 1).generatedAt()),
                    "Reports should be ordered by generatedAt ascending"
            );
        }
    }

    // ========================================================================
    // Test 2: getReportsForScenario throws 404 for non-existent scenario
    // ========================================================================

    @Test
    void getReportsForScenario_nonExistentScenario_throws404() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> impactReportService.getReportsForScenario(NON_EXISTENT_SCENARIO_ID));

        assertEquals(404, exception.getStatusCode().value());
        assertTrue(exception.getReason().contains("Scenario not found"),
                "Error message should contain 'Scenario not found'");
    }

    // ========================================================================
    // Test 3: getReportsForScenario returns empty list for scenario with no reports
    // ========================================================================

    @Test
    void getReportsForScenario_scenarioWithNoReports_returnsEmptyList() {
        List<ImpactReportSummaryDto> results = impactReportService.getReportsForScenario(SCENARIO_WITH_NO_REPORTS);

        assertNotNull(results, "Result should not be null");
        assertTrue(results.isEmpty(), "Should return empty list for scenario with no impact reports");
    }

    // ========================================================================
    // Test 4: getReportDetail returns detail with parsed JsonNode renderedReport
    // ========================================================================

    @Test
    void getReportDetail_existingReport_returnsDetailWithParsedRenderedReport() {
        ImpactReportDetailDto detail = impactReportService.getReportDetail(EXISTING_SCENARIO_ID, SEED_REPORT_ID);

        assertNotNull(detail, "Detail DTO should not be null");
        assertEquals(SEED_REPORT_ID, detail.id());
        assertEquals(EXISTING_SCENARIO_ID, detail.scenarioId());
        assertEquals("market_risk_summary", detail.reportKey());
        assertEquals("GENERATED", detail.status());

        // Verify renderedReport is a JsonNode, not a String
        assertNotNull(detail.renderedReport(), "renderedReport should not be null for a GENERATED report");
        assertInstanceOf(JsonNode.class, detail.renderedReport(),
                "renderedReport should be a JsonNode, not a String");

        JsonNode renderedReport = (JsonNode) detail.renderedReport();

        // Verify top-level fields from the seed data rendered report JSON
        assertTrue(renderedReport.has("reportKey"), "Should have reportKey field");
        assertEquals("market_risk_summary", renderedReport.get("reportKey").asText());

        assertTrue(renderedReport.has("sections"), "Should have sections field");
        assertTrue(renderedReport.get("sections").isArray(), "sections should be an array");
        assertEquals(3, renderedReport.get("sections").size(),
                "Seed data has 3 sections: legal_entity_division, business, treasury");

        // Verify section keys
        assertEquals("legal_entity_division", renderedReport.get("sections").get(0).get("sectionKey").asText());
        assertEquals("business", renderedReport.get("sections").get(1).get("sectionKey").asText());
        assertEquals("treasury", renderedReport.get("sections").get(2).get("sectionKey").asText());
    }

    // ========================================================================
    // Test 5: getReportDetail throws 404 for non-existent report
    // ========================================================================

    @Test
    void getReportDetail_nonExistentReport_throws404() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> impactReportService.getReportDetail(EXISTING_SCENARIO_ID, NON_EXISTENT_REPORT_ID));

        assertEquals(404, exception.getStatusCode().value());
        assertTrue(exception.getReason().contains("Impact report not found"),
                "Error message should contain 'Impact report not found'");
    }

    // ========================================================================
    // Test 6: getReportDetail throws 404 for report belonging to different scenario
    // ========================================================================

    @Test
    void getReportDetail_reportBelongsToDifferentScenario_throws404() {
        // The seed report bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011 belongs to EXISTING_SCENARIO_ID,
        // so querying with SCENARIO_WITH_NO_REPORTS should fail with 404 (ownership enforcement)
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> impactReportService.getReportDetail(SCENARIO_WITH_NO_REPORTS, SEED_REPORT_ID));

        assertEquals(404, exception.getStatusCode().value());
    }
}
