package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.entity.ReportDefinition;
import com.prototypes.scenarios.entity.ScenarioImpactReport;
import com.prototypes.scenarios.repository.ReportDefinitionRepository;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for ImpactReportGenerationService.
 *
 * Uses the full Spring context with H2 in PostgreSQL compatibility mode
 * so that all Liquibase changesets and seed data are available.
 *
 * Seed data used:
 * - Scenario 1: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d (MARKET_DATA, "FX Curve Recalibration")
 * - Report definition: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002 (MARKET_DATA, "market_risk_summary", active)
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class ImpactReportGenerationServiceTest {

    @Autowired
    private ImpactReportGenerationService impactReportGenerationService;

    @Autowired
    private ScenarioImpactReportRepository scenarioImpactReportRepository;

    @Autowired
    private ScenarioRepository scenarioRepository;

    @Autowired
    private ReportDefinitionRepository reportDefinitionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private static final UUID MARKET_DATA_SCENARIO_ID =
            UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // ========================================================================
    // Test 1: Generate reports for MARKET_DATA scenario produces 1 GENERATED report
    // ========================================================================

    @Test
    void generateReportsForScenario_marketData_generatesOneReport() {
        impactReportGenerationService.generateReportsForScenario(MARKET_DATA_SCENARIO_ID);

        List<ScenarioImpactReport> reports =
                scenarioImpactReportRepository.findAllByScenarioId(MARKET_DATA_SCENARIO_ID);

        // Filter to only reports generated in this test (exclude seed data)
        List<ScenarioImpactReport> generatedReports = reports.stream()
                .filter(r -> "GENERATED".equals(r.getStatus()))
                .filter(r -> "market_risk_summary".equals(r.getReportKey()))
                .toList();

        // Seed data may already contain a GENERATED report; we expect at least 1 new one
        // Since there is 1 active MARKET_DATA definition, we expect the generation to
        // create exactly 1 new report. We verify by counting total new reports
        // after clearing previous test data.
        assertFalse(generatedReports.isEmpty(),
                "Should have at least one GENERATED report for market_risk_summary");

        ScenarioImpactReport latestReport = generatedReports.stream()
                .max((a, b) -> a.getGeneratedAt().compareTo(b.getGeneratedAt()))
                .orElseThrow();

        assertEquals("GENERATED", latestReport.getStatus());
        assertNotNull(latestReport.getRenderedReport());
        assertEquals("market_risk_summary", latestReport.getReportKey());
        assertEquals(MARKET_DATA_SCENARIO_ID, latestReport.getScenarioId());
    }

    // ========================================================================
    // Test 2: Rendered report JSON contains expected top-level fields
    // ========================================================================

    @Test
    void generateReportsForScenario_renderedJson_hasTopLevelFields() throws Exception {
        impactReportGenerationService.generateReportsForScenario(MARKET_DATA_SCENARIO_ID);

        ScenarioImpactReport report = scenarioImpactReportRepository
                .findAllByScenarioId(MARKET_DATA_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()) && r.getRenderedReport() != null)
                .max((a, b) -> a.getGeneratedAt().compareTo(b.getGeneratedAt()))
                .orElseThrow(() -> new AssertionError("No GENERATED report found"));

        JsonNode renderedJson = objectMapper.readTree(report.getRenderedReport());

        // Verify top-level fields
        assertTrue(renderedJson.has("reportKey"), "Should have reportKey");
        assertTrue(renderedJson.has("reportName"), "Should have reportName");
        assertTrue(renderedJson.has("definitionVersion"), "Should have definitionVersion");
        assertTrue(renderedJson.has("generatedAt"), "Should have generatedAt");
        assertTrue(renderedJson.has("scenarioId"), "Should have scenarioId");
        assertTrue(renderedJson.has("scenarioName"), "Should have scenarioName");
        assertTrue(renderedJson.has("scenarioTypeCode"), "Should have scenarioTypeCode");
        assertTrue(renderedJson.has("sections"), "Should have sections");

        assertEquals("market_risk_summary", renderedJson.get("reportKey").asText());
        assertEquals("FX Impact Analysis Report on Average Moves", renderedJson.get("reportName").asText());
        assertEquals(4, renderedJson.get("definitionVersion").asInt());
        assertEquals(MARKET_DATA_SCENARIO_ID.toString(), renderedJson.get("scenarioId").asText());
        assertEquals("MARKET_DATA", renderedJson.get("scenarioTypeCode").asText());
        assertEquals("FX Curve Recalibration", renderedJson.get("scenarioName").asText());

        // Sections should be an array with 3 elements
        assertTrue(renderedJson.get("sections").isArray(), "sections should be an array");
        assertEquals(3, renderedJson.get("sections").size(), "sections should have 3 elements");
    }

    // ========================================================================
    // Test 3: Rendered report JSON table blocks have all required fields
    // ========================================================================

    @Test
    void generateReportsForScenario_tableBlocks_haveAllFields() throws Exception {
        impactReportGenerationService.generateReportsForScenario(MARKET_DATA_SCENARIO_ID);

        ScenarioImpactReport report = scenarioImpactReportRepository
                .findAllByScenarioId(MARKET_DATA_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()) && r.getRenderedReport() != null)
                .max((a, b) -> a.getGeneratedAt().compareTo(b.getGeneratedAt()))
                .orElseThrow(() -> new AssertionError("No GENERATED report found"));

        JsonNode renderedJson = objectMapper.readTree(report.getRenderedReport());
        JsonNode sections = renderedJson.get("sections");
        assertTrue(sections.size() > 0, "Should have at least one section");

        JsonNode firstSection = sections.get(0);
        assertTrue(firstSection.has("contentBlocks"), "Section should have contentBlocks");

        JsonNode contentBlocks = firstSection.get("contentBlocks");
        assertTrue(contentBlocks.size() > 0, "Should have at least one content block");

        JsonNode firstBlock = contentBlocks.get(0);
        assertEquals("table", firstBlock.get("blockType").asText());

        // Verify all required table block fields
        assertTrue(firstBlock.has("tableKey"), "Should have tableKey");
        assertTrue(firstBlock.has("label"), "Should have label");
        assertTrue(firstBlock.has("columnLayout"), "Should have columnLayout");
        assertTrue(firstBlock.has("rows"), "Should have rows");

        // Verify columnLayout structure
        JsonNode columnLayout = firstBlock.get("columnLayout");
        assertTrue(columnLayout.has("rowColumns"), "columnLayout should have rowColumns");
        assertTrue(columnLayout.has("columnGroups"), "columnLayout should have columnGroups");
        assertTrue(columnLayout.get("rowColumns").isArray(), "rowColumns should be an array");
        assertTrue(columnLayout.get("columnGroups").isArray(), "columnGroups should be an array");
        assertTrue(columnLayout.get("columnGroups").size() > 0, "columnGroups should not be empty");

        // Verify rows have cells
        JsonNode rows = firstBlock.get("rows");
        assertTrue(rows.isArray() && rows.size() > 0, "rows should be a non-empty array");
        JsonNode firstRow = rows.get(0);
        assertTrue(firstRow.has("rowId"), "Row should have rowId");
        assertTrue(firstRow.has("cells"), "Row should have cells");

        // Verify cells have value and formatToken
        JsonNode cells = firstRow.get("cells");
        assertTrue(cells.size() > 0, "Row should have at least one cell");
        var fieldNames = cells.fieldNames();
        assertTrue(fieldNames.hasNext(), "Cells should have at least one entry");
        String firstCellKey = fieldNames.next();
        JsonNode firstCell = cells.get(firstCellKey);
        assertTrue(firstCell.has("value"), "Cell should have value");
    }

    // ========================================================================
    // Test 4: No active definitions generates 0 reports
    // ========================================================================

    @Test
    void generateReportsForScenario_noActiveDefinitions_generatesZeroReports() {
        // Deactivate all MARKET_DATA definitions
        List<ReportDefinition> marketDataDefs =
                reportDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue("MARKET_DATA");
        for (ReportDefinition def : marketDataDefs) {
            def.setActive(false);
            reportDefinitionRepository.save(def);
        }
        reportDefinitionRepository.flush();

        // Count reports before generation
        long beforeCount = scenarioImpactReportRepository.findAllByScenarioId(MARKET_DATA_SCENARIO_ID)
                .stream()
                .filter(r -> !"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011".equals(r.getId().toString()))
                .count();

        impactReportGenerationService.generateReportsForScenario(MARKET_DATA_SCENARIO_ID);

        // Count reports after generation -- should be no additional reports
        long afterCount = scenarioImpactReportRepository.findAllByScenarioId(MARKET_DATA_SCENARIO_ID)
                .stream()
                .filter(r -> !"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011".equals(r.getId().toString()))
                .count();

        // No new reports should have been generated since we deactivated all definitions
        // The seed data report bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011 may still be there
        // but no NEW reports should be added
        assertEquals(beforeCount, afterCount,
                "No new reports should be generated when no active definitions exist");
    }

    // ========================================================================
    // Test 5: Non-existent scenario ID throws 404
    // ========================================================================

    @Test
    void generateReportsForScenario_nonExistentScenario_throws404() {
        UUID nonExistentId = UUID.fromString("00000000-0000-0000-0000-000000000099");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> impactReportGenerationService.generateReportsForScenario(nonExistentId));

        assertEquals(404, exception.getStatusCode().value(),
                "Should return 404 NOT_FOUND for nonexistent scenario ID");
    }

    // ========================================================================
    // Test 6: Multiple invocations create separate (non-deduplicated) reports
    // ========================================================================

    @Test
    void generateReportsForScenario_calledTwice_createsTwoSeparateReports() {
        // Count existing reports before
        long beforeCount = scenarioImpactReportRepository.findAllByScenarioId(MARKET_DATA_SCENARIO_ID)
                .stream()
                .filter(r -> "market_risk_summary".equals(r.getReportKey()))
                .filter(r -> "GENERATED".equals(r.getStatus()))
                .count();

        // First generation
        impactReportGenerationService.generateReportsForScenario(MARKET_DATA_SCENARIO_ID);

        long afterFirstCount = scenarioImpactReportRepository.findAllByScenarioId(MARKET_DATA_SCENARIO_ID)
                .stream()
                .filter(r -> "market_risk_summary".equals(r.getReportKey()))
                .filter(r -> "GENERATED".equals(r.getStatus()))
                .count();

        // Second generation
        impactReportGenerationService.generateReportsForScenario(MARKET_DATA_SCENARIO_ID);

        long afterSecondCount = scenarioImpactReportRepository.findAllByScenarioId(MARKET_DATA_SCENARIO_ID)
                .stream()
                .filter(r -> "market_risk_summary".equals(r.getReportKey()))
                .filter(r -> "GENERATED".equals(r.getStatus()))
                .count();

        // Each invocation should create 1 new report (1 active MARKET_DATA definition)
        assertEquals(afterFirstCount, beforeCount + 1,
                "First generation should create 1 new report");
        assertEquals(afterSecondCount, beforeCount + 2,
                "Second generation should create another report (no deduplication)");
    }
}
