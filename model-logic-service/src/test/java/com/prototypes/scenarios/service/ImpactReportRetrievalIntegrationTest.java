package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.ImpactReportDetailDto;
import com.prototypes.scenarios.dto.ImpactReportSummaryDto;
import com.prototypes.scenarios.entity.ScenarioImpactReport;
import com.prototypes.scenarios.repository.ScenarioImpactReportRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for the Impact Report Retrieval API (Increment 3, Task Group 5).
 *
 * <p>Uses the full Spring context with H2 in PostgreSQL compatibility mode
 * so that all Liquibase changesets and seed data are available.</p>
 *
 * <p>These tests exercise end-to-end workflows through {@link ImpactReportService},
 * covering seed data retrieval, ordering, status filtering, ownership enforcement,
 * malformed JSON handling, and scenario existence validation ordering.</p>
 *
 * <p>Seed data used:
 * <ul>
 *   <li>Scenario A: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d (MARKET_DATA, "FX Curve Recalibration")</li>
 *   <li>Scenario B: b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e (MARKET_DATA, "IR Vol Surface Update", no reports)</li>
 *   <li>Scenario C: d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80 (FRTB_SA, "SA Capital Recalculation")</li>
 *   <li>Report 011: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011 (GENERATED, market_risk_summary, belongs to scenario A)</li>
 *   <li>Report 002: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002 (FAILED, sa_capital_summary, belongs to scenario C)</li>
 * </ul>
 * </p>
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class ImpactReportRetrievalIntegrationTest {

    @Autowired
    private ImpactReportService impactReportService;

    @Autowired
    private ScenarioImpactReportRepository scenarioImpactReportRepository;

    @Autowired
    private ObjectMapper objectMapper;

    // Scenario A: MARKET_DATA scenario with seed report 011
    private static final UUID SCENARIO_A_ID =
            UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // Scenario B: MARKET_DATA scenario with no impact reports
    private static final UUID SCENARIO_B_ID =
            UUID.fromString("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");

    // Scenario C: FRTB_SA scenario with seed report 002 (FAILED)
    private static final UUID SCENARIO_C_ID =
            UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");

    // Seed report 011: GENERATED, belongs to scenario A
    private static final UUID SEED_REPORT_011_ID =
            UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011");

    // Seed report 002: FAILED, belongs to scenario C
    private static final UUID SEED_REPORT_002_ID =
            UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002");

    // Report definition for MARKET_DATA
    private static final UUID MARKET_DATA_REPORT_DEF_ID =
            UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002");

    // Report definition for FRTB_SA
    private static final UUID FRTB_SA_REPORT_DEF_ID =
            UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001");

    private static final UUID NON_EXISTENT_SCENARIO_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000099");

    private static final UUID NON_EXISTENT_REPORT_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000088");

    // ========================================================================
    // Test 1: End-to-end list with seed data
    // ========================================================================

    @Test
    void endToEndList_seedData_returnsReportWithCorrectFields() {
        List<ImpactReportSummaryDto> results = impactReportService.getReportsForScenario(SCENARIO_A_ID);

        assertNotNull(results, "Results should not be null");

        // Find the seed report in the results
        ImpactReportSummaryDto seedReport = results.stream()
                .filter(dto -> SEED_REPORT_011_ID.equals(dto.id()))
                .findFirst()
                .orElseThrow(() -> new AssertionError(
                        "Seed report bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011 should be present in results"));

        // Verify correct field values from seed data
        assertEquals("market_risk_summary", seedReport.reportKey(),
                "reportKey should match seed data");
        assertEquals("GENERATED", seedReport.status(),
                "status should be GENERATED");
        assertEquals(LocalDateTime.of(2026, 3, 11, 12, 0, 0), seedReport.generatedAt(),
                "generatedAt should match seed data timestamp");
        assertEquals(SCENARIO_A_ID, seedReport.scenarioId(),
                "scenarioId should match the queried scenario");
        assertEquals(MARKET_DATA_REPORT_DEF_ID, seedReport.reportDefinitionId(),
                "reportDefinitionId should match seed data");
        assertEquals("FX Impact Analysis Report on Average Moves", seedReport.reportName(),
                "reportName should match seed data");
        assertEquals(4, seedReport.definitionVersion(),
                "definitionVersion should match seed data");
    }

    // ========================================================================
    // Test 2: End-to-end detail with renderedReport parsing
    // ========================================================================

    @Test
    void endToEndDetail_renderedReport_isParsedJsonNodeWithCorrectStructure() {
        ImpactReportDetailDto detail = impactReportService.getReportDetail(SCENARIO_A_ID, SEED_REPORT_011_ID);

        assertNotNull(detail, "Detail DTO should not be null");

        // Verify renderedReport is a JsonNode, not a String
        assertNotNull(detail.renderedReport(),
                "renderedReport should not be null for a GENERATED report");
        assertInstanceOf(JsonNode.class, detail.renderedReport(),
                "renderedReport should be a JsonNode, not a String");

        JsonNode renderedReport = (JsonNode) detail.renderedReport();

        // Verify sections array with 3 elements: legal_entity_division, business, treasury
        assertTrue(renderedReport.has("sections"), "Should have sections field");
        assertTrue(renderedReport.get("sections").isArray(), "sections should be an array");
        assertEquals(3, renderedReport.get("sections").size(),
                "Seed data has 3 sections: legal_entity_division, business, treasury");

        JsonNode section1 = renderedReport.get("sections").get(0);
        JsonNode section2 = renderedReport.get("sections").get(1);
        JsonNode section3 = renderedReport.get("sections").get(2);
        assertEquals("legal_entity_division", section1.get("sectionKey").asText(),
                "First section should be legal_entity_division");
        assertEquals("business", section2.get("sectionKey").asText(),
                "Second section should be business");
        assertEquals("treasury", section3.get("sectionKey").asText(),
                "Third section should be treasury");

        // Verify table blocks have required fields: blockType, columnLayout, rows
        JsonNode firstBlock = section1.get("contentBlocks").get(0);
        assertEquals("table", firstBlock.get("blockType").asText(),
                "Content block should have blockType 'table'");
        assertTrue(firstBlock.has("columnLayout"), "Table block should have columnLayout");
        assertTrue(firstBlock.has("rows"), "Table block should have rows");

        // Verify rows have cells with value
        JsonNode rows = firstBlock.get("rows");
        assertTrue(rows.isArray() && rows.size() > 0, "Table should have rows");
        JsonNode firstRow = rows.get(0);
        assertTrue(firstRow.has("cells"), "Row should have cells");
    }

    // ========================================================================
    // Test 3: FAILED report detail has null renderedReport
    // ========================================================================

    @Test
    void endToEndDetail_failedReport_hasNullRenderedReport() {
        // Seed report 002 is FAILED and belongs to scenario C
        ImpactReportDetailDto detail = impactReportService.getReportDetail(SCENARIO_C_ID, SEED_REPORT_002_ID);

        assertNotNull(detail, "Detail DTO should not be null");
        assertNull(detail.renderedReport(),
                "renderedReport should be null for a FAILED report");
        assertEquals("FAILED", detail.status(),
                "status should be FAILED");
        assertEquals(SEED_REPORT_002_ID, detail.id(),
                "id should match the queried report ID");
        assertEquals(SCENARIO_C_ID, detail.scenarioId(),
                "scenarioId should match the queried scenario ID");
    }

    // ========================================================================
    // Test 4: List ordering is ascending by generatedAt
    // ========================================================================

    @Test
    void listOrdering_threeReportsInsertedOutOfOrder_returnedInAscendingOrder() {
        LocalDateTime t1 = LocalDateTime.of(2026, 3, 15, 10, 0, 0);
        LocalDateTime t2 = LocalDateTime.of(2026, 3, 15, 12, 0, 0);
        LocalDateTime t3 = LocalDateTime.of(2026, 3, 15, 11, 0, 0);

        // Insert in order: T+1, T+3, T+2 (not ascending)
        scenarioImpactReportRepository.saveAndFlush(createReport(
                SCENARIO_A_ID, MARKET_DATA_REPORT_DEF_ID, "market_risk_summary", t1, "GENERATED"));
        scenarioImpactReportRepository.saveAndFlush(createReport(
                SCENARIO_A_ID, MARKET_DATA_REPORT_DEF_ID, "market_risk_summary", t3, "GENERATED"));
        scenarioImpactReportRepository.saveAndFlush(createReport(
                SCENARIO_A_ID, MARKET_DATA_REPORT_DEF_ID, "market_risk_summary", t2, "GENERATED"));

        List<ImpactReportSummaryDto> results = impactReportService.getReportsForScenario(SCENARIO_A_ID);

        // Verify strictly ascending ordering
        assertTrue(results.size() >= 4,
                "Should have at least 4 reports (1 seed + 3 inserted)");

        for (int i = 1; i < results.size(); i++) {
            assertTrue(
                    !results.get(i).generatedAt().isBefore(results.get(i - 1).generatedAt()),
                    "Reports should be strictly ordered by generatedAt ascending. " +
                    "Index " + (i - 1) + " (" + results.get(i - 1).generatedAt() + ") should be <= " +
                    "index " + i + " (" + results.get(i).generatedAt() + ")");
        }
    }

    // ========================================================================
    // Test 5: List includes both GENERATED and FAILED reports
    // ========================================================================

    @Test
    void listResults_bothGeneratedAndFailed_appearsInResults() {
        // Insert one GENERATED and one FAILED report for scenario A
        scenarioImpactReportRepository.saveAndFlush(createReport(
                SCENARIO_A_ID, MARKET_DATA_REPORT_DEF_ID, "market_risk_summary",
                LocalDateTime.of(2026, 3, 16, 10, 0, 0), "GENERATED"));

        ScenarioImpactReport failedReport = createReport(
                SCENARIO_A_ID, MARKET_DATA_REPORT_DEF_ID, "market_risk_summary",
                LocalDateTime.of(2026, 3, 16, 11, 0, 0), "FAILED");
        failedReport.setRenderedReport(null);
        failedReport.setErrorMessage("Provider timeout");
        scenarioImpactReportRepository.saveAndFlush(failedReport);

        List<ImpactReportSummaryDto> results = impactReportService.getReportsForScenario(SCENARIO_A_ID);

        Set<String> statuses = results.stream()
                .map(ImpactReportSummaryDto::status)
                .collect(Collectors.toSet());

        assertTrue(statuses.contains("GENERATED"),
                "Results should include GENERATED reports");
        assertTrue(statuses.contains("FAILED"),
                "Results should include FAILED reports");
    }

    // ========================================================================
    // Test 6: Ownership enforcement end-to-end
    // ========================================================================

    @Test
    void ownershipEnforcement_reportBelongsToScenarioA_queryWithScenarioB_throws404() {
        // Insert a report for scenario A
        ScenarioImpactReport report = createReport(
                SCENARIO_A_ID, MARKET_DATA_REPORT_DEF_ID, "market_risk_summary",
                LocalDateTime.of(2026, 3, 17, 10, 0, 0), "GENERATED");
        scenarioImpactReportRepository.saveAndFlush(report);

        // Try to fetch it using scenario B's ID -- should fail with 404
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> impactReportService.getReportDetail(SCENARIO_B_ID, report.getId()));

        assertEquals(404, exception.getStatusCode().value(),
                "Should return 404 when report does not belong to the queried scenario");
        assertTrue(exception.getReason().contains("Impact report not found"),
                "Error message should indicate the impact report was not found");
    }

    // ========================================================================
    // Test 7: Malformed renderedReport JSON does not throw 500
    // ========================================================================

    @Test
    void malformedRenderedReportJson_handledGracefully_returnsNullRenderedReport() {
        // Insert a report with invalid JSON in renderedReport
        ScenarioImpactReport report = createReport(
                SCENARIO_A_ID, MARKET_DATA_REPORT_DEF_ID, "market_risk_summary",
                LocalDateTime.of(2026, 3, 18, 10, 0, 0), "GENERATED");
        report.setRenderedReport("this is not valid JSON");
        scenarioImpactReportRepository.saveAndFlush(report);

        // Should not throw -- should gracefully return null renderedReport
        ImpactReportDetailDto detail = impactReportService.getReportDetail(SCENARIO_A_ID, report.getId());

        assertNotNull(detail, "Detail DTO should not be null");
        assertNull(detail.renderedReport(),
                "renderedReport should be null when the stored JSON is malformed (graceful fallback)");
        assertEquals("GENERATED", detail.status(),
                "status should still be returned correctly");
        assertEquals(report.getId(), detail.id(),
                "id should match the queried report");
    }

    // ========================================================================
    // Test 8: Scenario existence check precedes report query
    // ========================================================================

    @Test
    void scenarioExistenceCheck_precedesReportQuery_errorMessageSaysScenarioNotFound() {
        // Call getReportDetail with a non-existent scenario ID and a valid-looking report ID
        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> impactReportService.getReportDetail(NON_EXISTENT_SCENARIO_ID, NON_EXISTENT_REPORT_ID));

        assertEquals(404, exception.getStatusCode().value(),
                "Should return 404");
        assertTrue(exception.getReason().contains("Scenario not found"),
                "Error message should contain 'Scenario not found' (not 'Impact report not found'), " +
                "confirming scenario is validated first. Actual message: " + exception.getReason());
    }

    // ========================================================================
    // Helper method to create a ScenarioImpactReport
    // ========================================================================

    private ScenarioImpactReport createReport(UUID scenarioId, UUID reportDefinitionId,
                                               String reportKey, LocalDateTime generatedAt,
                                               String status) {
        ScenarioImpactReport report = new ScenarioImpactReport();
        report.setId(UUID.randomUUID());
        report.setScenarioId(scenarioId);
        report.setReportDefinitionId(reportDefinitionId);
        report.setDefinitionVersion(2);
        report.setReportKey(reportKey);
        report.setReportName("Test Report");
        report.setGeneratedAt(generatedAt);
        report.setStatus(status);
        report.setRenderedReport("{\"reportKey\":\"" + reportKey + "\",\"sections\":[]}");
        return report;
    }
}
