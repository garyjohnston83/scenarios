package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.entity.ScenarioImpactReport;
import com.prototypes.scenarios.repository.ReportDefinitionRepository;
import com.prototypes.scenarios.repository.ScenarioImpactReportRepository;
import com.prototypes.scenarios.repository.ScenarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Increment 2, Task Group 9: Gap analysis tests that fill coverage holes
 * identified after reviewing Task Groups 2-8.
 *
 * <p>Uses the full Spring context with H2 in PostgreSQL compatibility mode
 * so that all Liquibase changesets and seed data are available.</p>
 *
 * <p><strong>Note on REQUIRES_NEW transactions:</strong> The report generation
 * service uses REQUIRES_NEW propagation, which means generated reports are
 * committed independently and are NOT rolled back by the test's @Transactional
 * annotation. Tests that count reports must use before/after counting to
 * measure the delta, not absolute counts.</p>
 *
 * <p>Seed data referenced:
 * <ul>
 *   <li>Scenario 1: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d (MARKET_DATA)</li>
 *   <li>Scenario 3: c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f (RISK_FACTOR)</li>
 *   <li>Scenario 4: d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80 (FRTB_SA)</li>
 *   <li>Report definition: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001 (FRTB_SA, sa_capital_summary)</li>
 *   <li>Report definition: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002 (MARKET_DATA, market_risk_summary)</li>
 *   <li>Report definition: aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003 (RISK_FACTOR, risk_factor_impact)</li>
 *   <li>Seed report: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011 (GENERATED)</li>
 *   <li>Seed report: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002 (FAILED)</li>
 * </ul></p>
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment2GapTest {

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

    // Scenario IDs from seed data
    private static final UUID FRTB_SA_SCENARIO_ID =
            UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");
    private static final UUID RISK_FACTOR_SCENARIO_ID =
            UUID.fromString("c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f");
    private static final UUID MARKET_DATA_SCENARIO_ID =
            UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // Seed report IDs from changeset 033 and 031
    private static final UUID SEED_GENERATED_REPORT_ID =
            UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011");
    private static final UUID SEED_FAILED_REPORT_ID =
            UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002");

    // ========================================================================
    // Gap Test 1: FRTB_SA end-to-end -- generate report for FRTB_SA scenario
    //             with all 13 metrics across 4 sections
    // ========================================================================

    @Test
    void frtbSa_endToEnd_generatesReportWithAll13Metrics() throws Exception {
        impactReportGenerationService.generateReportsForScenario(FRTB_SA_SCENARIO_ID);

        List<ScenarioImpactReport> reports =
                scenarioImpactReportRepository.findAllByScenarioId(FRTB_SA_SCENARIO_ID);

        // Find the most recently generated report with GENERATED status
        ScenarioImpactReport generatedReport = reports.stream()
                .filter(r -> "GENERATED".equals(r.getStatus()) && r.getRenderedReport() != null)
                .filter(r -> "sa_capital_summary".equals(r.getReportKey()))
                .max((a, b) -> a.getGeneratedAt().compareTo(b.getGeneratedAt()))
                .orElseThrow(() -> new AssertionError("No GENERATED FRTB_SA report found"));

        assertEquals("sa_capital_summary", generatedReport.getReportKey());
        assertEquals("SA Capital Charge Summary", generatedReport.getReportName());
        assertEquals(FRTB_SA_SCENARIO_ID, generatedReport.getScenarioId());

        JsonNode renderedJson = objectMapper.readTree(generatedReport.getRenderedReport());

        // Verify top-level fields
        assertEquals("sa_capital_summary", renderedJson.get("reportKey").asText());
        assertEquals("FRTB_SA", renderedJson.get("scenarioTypeCode").asText());
        assertEquals("SA Capital Recalculation", renderedJson.get("scenarioName").asText());

        // Verify 4 sections exist
        JsonNode sections = renderedJson.get("sections");
        assertEquals(4, sections.size(), "FRTB_SA report should have 4 sections");

        // Count total metrics across all sections
        int totalMetrics = 0;
        for (JsonNode section : sections) {
            JsonNode contentBlocks = section.get("contentBlocks");
            assertNotNull(contentBlocks, "Section should have contentBlocks");
            for (JsonNode block : contentBlocks) {
                if ("metric".equals(block.get("blockType").asText())) {
                    totalMetrics++;
                }
            }
        }
        assertEquals(13, totalMetrics, "FRTB_SA report should have 13 metric blocks total");

        // Verify section keys match the FRTB_SA definition
        assertEquals("delta_sensitivity", sections.get(0).get("sectionKey").asText());
        assertEquals("vega_risk", sections.get(1).get("sectionKey").asText());
        assertEquals("curvature_risk", sections.get(2).get("sectionKey").asText());
        assertEquals("total_capital", sections.get(3).get("sectionKey").asText());
    }

    // ========================================================================
    // Gap Test 2: RISK_FACTOR end-to-end -- generate report for RISK_FACTOR
    //             scenario with 8 metrics across 2 sections
    // ========================================================================

    @Test
    void riskFactor_endToEnd_generatesReportWith8Metrics() throws Exception {
        impactReportGenerationService.generateReportsForScenario(RISK_FACTOR_SCENARIO_ID);

        List<ScenarioImpactReport> reports =
                scenarioImpactReportRepository.findAllByScenarioId(RISK_FACTOR_SCENARIO_ID);

        ScenarioImpactReport generatedReport = reports.stream()
                .filter(r -> "GENERATED".equals(r.getStatus()) && r.getRenderedReport() != null)
                .filter(r -> "risk_factor_impact".equals(r.getReportKey()))
                .max((a, b) -> a.getGeneratedAt().compareTo(b.getGeneratedAt()))
                .orElseThrow(() -> new AssertionError("No GENERATED RISK_FACTOR report found"));

        assertEquals("risk_factor_impact", generatedReport.getReportKey());
        assertEquals("Risk Factor Impact Analysis", generatedReport.getReportName());

        JsonNode renderedJson = objectMapper.readTree(generatedReport.getRenderedReport());

        assertEquals("RISK_FACTOR", renderedJson.get("scenarioTypeCode").asText());
        assertEquals("Credit Spread Adjustment", renderedJson.get("scenarioName").asText());

        // Verify 2 sections
        JsonNode sections = renderedJson.get("sections");
        assertEquals(2, sections.size(), "RISK_FACTOR report should have 2 sections");

        // Count total metrics
        int totalMetrics = 0;
        for (JsonNode section : sections) {
            JsonNode contentBlocks = section.get("contentBlocks");
            assertNotNull(contentBlocks);
            for (JsonNode block : contentBlocks) {
                if ("metric".equals(block.get("blockType").asText())) {
                    totalMetrics++;
                }
            }
        }
        assertEquals(8, totalMetrics, "RISK_FACTOR report should have 8 metric blocks total");

        // Verify section keys
        assertEquals("pnl_attribution", sections.get(0).get("sectionKey").asText());
        assertEquals("risk_factor_shifts", sections.get(1).get("sectionKey").asText());
    }

    // ========================================================================
    // Gap Test 3: MARKET_DATA definition uses contentBlocks[] with table blocks
    //             and should generate valid reports with table blocks
    // ========================================================================

    @Test
    void backwardCompatibility_metricsOnlyDefinition_generatesValidReport() throws Exception {
        // The MARKET_DATA definition (changeset 033) uses sections[].contentBlocks[]
        // with blockType="table". Generate a report and verify it works.
        impactReportGenerationService.generateReportsForScenario(MARKET_DATA_SCENARIO_ID);

        ScenarioImpactReport report = scenarioImpactReportRepository
                .findAllByScenarioId(MARKET_DATA_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()) && r.getRenderedReport() != null)
                .max((a, b) -> a.getGeneratedAt().compareTo(b.getGeneratedAt()))
                .orElseThrow(() -> new AssertionError("No GENERATED MARKET_DATA report found"));

        JsonNode renderedJson = objectMapper.readTree(report.getRenderedReport());
        JsonNode sections = renderedJson.get("sections");

        // Verify sections have contentBlocks with table blocks
        assertEquals(3, sections.size(), "MARKET_DATA report should have 3 sections");
        for (JsonNode section : sections) {
            assertTrue(section.has("contentBlocks"),
                    "Sections should have contentBlocks in output");
            assertTrue(section.get("contentBlocks").isArray(),
                    "contentBlocks should be an array");
            assertTrue(section.get("contentBlocks").size() > 0,
                    "contentBlocks should not be empty");

            // Verify each content block has blockType = "table"
            for (JsonNode block : section.get("contentBlocks")) {
                assertEquals("table", block.get("blockType").asText(),
                        "Blocks from MARKET_DATA definition should have blockType 'table'");
            }
        }
    }

    // ========================================================================
    // Gap Test 4: All three scenario types generate reports -- verify each of
    //             FRTB_SA, MARKET_DATA, and RISK_FACTOR generates exactly 1
    //             new report per invocation (1 active definition per type),
    //             proving type-based filtering works correctly.
    //             Uses before/after counting because REQUIRES_NEW transactions
    //             persist across test methods.
    // ========================================================================

    @Test
    void allThreeScenarioTypes_eachGeneratesExactlyOneNewReport() {
        // Count before
        long frtbBefore = scenarioImpactReportRepository.findAllByScenarioId(FRTB_SA_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()))
                .count();
        long mdBefore = scenarioImpactReportRepository.findAllByScenarioId(MARKET_DATA_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()))
                .count();
        long rfBefore = scenarioImpactReportRepository.findAllByScenarioId(RISK_FACTOR_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()))
                .count();

        // Generate for all three scenario types
        impactReportGenerationService.generateReportsForScenario(FRTB_SA_SCENARIO_ID);
        impactReportGenerationService.generateReportsForScenario(MARKET_DATA_SCENARIO_ID);
        impactReportGenerationService.generateReportsForScenario(RISK_FACTOR_SCENARIO_ID);

        // Count after
        long frtbAfter = scenarioImpactReportRepository.findAllByScenarioId(FRTB_SA_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()))
                .count();
        long mdAfter = scenarioImpactReportRepository.findAllByScenarioId(MARKET_DATA_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()))
                .count();
        long rfAfter = scenarioImpactReportRepository.findAllByScenarioId(RISK_FACTOR_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()))
                .count();

        // Each type has 1 active definition, so each should produce exactly 1 new report
        assertEquals(1, frtbAfter - frtbBefore,
                "FRTB_SA should generate exactly 1 new report (1 active definition)");
        assertEquals(1, mdAfter - mdBefore,
                "MARKET_DATA should generate exactly 1 new report (1 active definition)");
        assertEquals(1, rfAfter - rfBefore,
                "RISK_FACTOR should generate exactly 1 new report (1 active definition)");

        // Verify each report has the correct report key for its type
        List<ScenarioImpactReport> frtbReports =
                scenarioImpactReportRepository.findAllByScenarioId(FRTB_SA_SCENARIO_ID);
        assertTrue(frtbReports.stream().anyMatch(r ->
                "sa_capital_summary".equals(r.getReportKey()) && "GENERATED".equals(r.getStatus())));

        List<ScenarioImpactReport> rfReports =
                scenarioImpactReportRepository.findAllByScenarioId(RISK_FACTOR_SCENARIO_ID);
        assertTrue(rfReports.stream().anyMatch(r ->
                "risk_factor_impact".equals(r.getReportKey()) && "GENERATED".equals(r.getStatus())));
    }

    // ========================================================================
    // Gap Test 5: Rendered JSON structure validation -- verify the full
    //             structure of a generated report: top-level fields, section
    //             field names (sectionKey, sectionTitle), and content block
    //             field completeness
    // ========================================================================

    @Test
    void renderedJsonStructure_hasCorrectFieldNamesPerSpec() throws Exception {
        impactReportGenerationService.generateReportsForScenario(MARKET_DATA_SCENARIO_ID);

        ScenarioImpactReport report = scenarioImpactReportRepository
                .findAllByScenarioId(MARKET_DATA_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()) && r.getRenderedReport() != null)
                .max((a, b) -> a.getGeneratedAt().compareTo(b.getGeneratedAt()))
                .orElseThrow();

        JsonNode json = objectMapper.readTree(report.getRenderedReport());

        // Top-level fields per spec
        assertTrue(json.has("reportKey"), "Must have reportKey");
        assertTrue(json.has("reportName"), "Must have reportName");
        assertTrue(json.has("definitionVersion"), "Must have definitionVersion");
        assertTrue(json.has("generatedAt"), "Must have generatedAt");
        assertTrue(json.has("scenarioId"), "Must have scenarioId");
        assertTrue(json.has("scenarioName"), "Must have scenarioName");
        assertTrue(json.has("scenarioTypeCode"), "Must have scenarioTypeCode");
        assertTrue(json.has("sections"), "Must have sections");

        // Verify section uses sectionKey and sectionTitle (not key and title)
        JsonNode firstSection = json.get("sections").get(0);
        assertTrue(firstSection.has("sectionKey"),
                "Section must use 'sectionKey' per spec (not 'key')");
        assertTrue(firstSection.has("sectionTitle"),
                "Section must use 'sectionTitle' per spec (not 'title')");
        assertTrue(firstSection.has("order"), "Section must have 'order'");
        assertTrue(firstSection.has("contentBlocks"), "Section must have 'contentBlocks'");

        // Verify section does NOT use the wrong field names
        assertFalse(firstSection.has("key"),
                "Section must not have bare 'key' -- should be 'sectionKey'");
        assertFalse(firstSection.has("title"),
                "Section must not have bare 'title' -- should be 'sectionTitle'");

        // Verify table block has all required fields per spec
        JsonNode firstBlock = firstSection.get("contentBlocks").get(0);
        assertEquals("table", firstBlock.get("blockType").asText());
        assertTrue(firstBlock.has("tableKey"), "Table block must have tableKey");
        assertTrue(firstBlock.has("label"), "Table block must have label");
        assertTrue(firstBlock.has("columnLayout"), "Table block must have columnLayout");
        assertTrue(firstBlock.has("rows"), "Table block must have rows");

        // Verify columnLayout structure
        JsonNode columnLayout = firstBlock.get("columnLayout");
        assertTrue(columnLayout.has("rowColumns"), "columnLayout must have rowColumns");
        assertTrue(columnLayout.has("columnGroups"), "columnLayout must have columnGroups");
        assertTrue(columnLayout.get("columnGroups").isArray(),
                "columnGroups must be an array");
        assertTrue(columnLayout.get("columnGroups").size() > 0,
                "columnGroups must not be empty");

        // Verify a column group has groupLabel and columns
        JsonNode firstGroup = columnLayout.get("columnGroups").get(0);
        assertTrue(firstGroup.has("groupLabel"), "Column group must have groupLabel");
        assertTrue(firstGroup.has("columns"), "Column group must have columns");

        // Verify rows have rowId and cells
        JsonNode rows = firstBlock.get("rows");
        assertTrue(rows.isArray() && rows.size() > 0, "Table must have rows");
        JsonNode firstRow = rows.get(0);
        assertTrue(firstRow.has("rowId"), "Row must have rowId");
        assertTrue(firstRow.has("cells"), "Row must have cells");
    }

    // ========================================================================
    // Gap Test 6: Table cell value verification -- verify rendered table blocks
    //             have cells with correct values from the definition
    // ========================================================================

    @Test
    void deltaCalculationAccuracy_renderedMetricsHaveCorrectNumericValues() throws Exception {
        impactReportGenerationService.generateReportsForScenario(MARKET_DATA_SCENARIO_ID);

        ScenarioImpactReport report = scenarioImpactReportRepository
                .findAllByScenarioId(MARKET_DATA_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()) && r.getRenderedReport() != null)
                .max((a, b) -> a.getGeneratedAt().compareTo(b.getGeneratedAt()))
                .orElseThrow();

        JsonNode json = objectMapper.readTree(report.getRenderedReport());

        // Verify 3 sections
        JsonNode sections = json.get("sections");
        assertEquals(3, sections.size(), "Should have 3 sections");

        // Verify first section: Legal Entity / Division
        JsonNode firstSection = sections.get(0);
        assertEquals("legal_entity_division", firstSection.get("sectionKey").asText());
        JsonNode firstBlock = firstSection.get("contentBlocks").get(0);
        assertEquals("table", firstBlock.get("blockType").asText());

        // Verify first row of first table has expected cell values
        JsonNode rows = firstBlock.get("rows");
        assertTrue(rows.size() > 0, "Table should have rows");
        JsonNode firstRow = rows.get(0);
        assertEquals("le_total", firstRow.get("rowId").asText());

        JsonNode cells = firstRow.get("cells");
        // Verify entity cell
        assertEquals("Alpha Holdings Group", cells.get("entity").get("value").asText());
        // Verify a data cell
        assertEquals("1.24%", cells.get("int_var_1d").get("value").asText());
        assertEquals("positive", cells.get("int_var_1d").get("formatToken").asText());
        assertEquals("0.87%", cells.get("reg_var_1d").get("value").asText());

        // Verify second section: Business
        JsonNode secondSection = sections.get(1);
        assertEquals("business", secondSection.get("sectionKey").asText());
        JsonNode bizBlock = secondSection.get("contentBlocks").get(0);
        JsonNode bizRows = bizBlock.get("rows");
        assertTrue(bizRows.size() > 0, "Business table should have rows");
        JsonNode bizFirstRow = bizRows.get(0);
        assertEquals("biz_total", bizFirstRow.get("rowId").asText());
        assertEquals("Global Markets", bizFirstRow.get("cells").get("business").get("value").asText());

        // Verify third section: Treasury
        JsonNode thirdSection = sections.get(2);
        assertEquals("treasury", thirdSection.get("sectionKey").asText());
        JsonNode treasuryBlock = thirdSection.get("contentBlocks").get(0);
        JsonNode treasuryRows = treasuryBlock.get("rows");
        assertTrue(treasuryRows.size() > 0, "Treasury table should have rows");
        JsonNode treasuryFirstRow = treasuryRows.get(0);
        assertEquals("tr_total", treasuryFirstRow.get("rowId").asText());
        assertEquals("Group Treasury", treasuryFirstRow.get("cells").get("desk").get("value").asText());
    }

    // ========================================================================
    // Gap Test 7: Format token defaults to neutral -- verify that generated
    //             metrics have format tokens set to "neutral" when no
    //             formatRules are defined in the definition (all seed
    //             definitions lack formatRules, so all tokens should be neutral)
    // ========================================================================

    @Test
    void formatTokenDefault_noFormatRulesInDefinition_allMetricsDefaultToNeutral() throws Exception {
        // The seed report definitions do not include formatRules on any metric.
        // Generate for FRTB_SA which has the most metrics (13), then verify all
        // format tokens are "neutral".
        impactReportGenerationService.generateReportsForScenario(FRTB_SA_SCENARIO_ID);

        ScenarioImpactReport report = scenarioImpactReportRepository
                .findAllByScenarioId(FRTB_SA_SCENARIO_ID).stream()
                .filter(r -> "GENERATED".equals(r.getStatus()) && r.getRenderedReport() != null)
                .max((a, b) -> a.getGeneratedAt().compareTo(b.getGeneratedAt()))
                .orElseThrow();

        JsonNode json = objectMapper.readTree(report.getRenderedReport());
        JsonNode sections = json.get("sections");

        int metricCount = 0;
        for (JsonNode section : sections) {
            for (JsonNode block : section.get("contentBlocks")) {
                if ("metric".equals(block.get("blockType").asText())) {
                    assertEquals("neutral", block.get("formatToken").asText(),
                            "Metric '" + block.get("metricKey").asText() +
                            "' should have formatToken 'neutral' when no formatRules are defined");
                    metricCount++;
                }
            }
        }

        // Verify we actually checked all 13 metrics
        assertEquals(13, metricCount,
                "Should have verified all 13 FRTB_SA metrics have neutral format tokens");
    }

    // ========================================================================
    // Gap Test 8: Seed data accessibility -- verify both seed report snapshots
    //             are accessible via repository queries and have correct structure
    // ========================================================================

    @Test
    void seedDataAccessibility_seedReportsQueryableViaRepository() {
        // Verify GENERATED seed report is accessible
        Optional<ScenarioImpactReport> generatedOpt =
                scenarioImpactReportRepository.findById(SEED_GENERATED_REPORT_ID);
        assertTrue(generatedOpt.isPresent(), "GENERATED seed report should be queryable by ID");

        ScenarioImpactReport generatedReport = generatedOpt.get();
        assertEquals("market_risk_summary", generatedReport.getReportKey());
        assertEquals("GENERATED", generatedReport.getStatus());
        assertEquals(MARKET_DATA_SCENARIO_ID, generatedReport.getScenarioId());
        assertNotNull(generatedReport.getRenderedReport(),
                "GENERATED seed report should have non-null renderedReport");
        assertNull(generatedReport.getErrorMessage(),
                "GENERATED seed report should have null errorMessage");
        assertEquals(4, generatedReport.getDefinitionVersion());
        assertEquals("FX Impact Analysis Report on Average Moves", generatedReport.getReportName());

        // Verify FAILED seed report is accessible
        Optional<ScenarioImpactReport> failedOpt =
                scenarioImpactReportRepository.findById(SEED_FAILED_REPORT_ID);
        assertTrue(failedOpt.isPresent(), "FAILED seed report should be queryable by ID");

        ScenarioImpactReport failedReport = failedOpt.get();
        assertEquals("sa_capital_summary", failedReport.getReportKey());
        assertEquals("FAILED", failedReport.getStatus());
        assertEquals(FRTB_SA_SCENARIO_ID, failedReport.getScenarioId());
        assertNull(failedReport.getRenderedReport(),
                "FAILED seed report should have null renderedReport");
        assertEquals("Data provider timeout: unable to fetch risk charge data within 30s",
                failedReport.getErrorMessage());

        // Verify reports are findable via scenario-based queries
        List<ScenarioImpactReport> marketDataReports =
                scenarioImpactReportRepository.findAllByScenarioId(MARKET_DATA_SCENARIO_ID);
        assertTrue(marketDataReports.stream().anyMatch(r -> SEED_GENERATED_REPORT_ID.equals(r.getId())),
                "Seed GENERATED report should appear in scenario-based query results");

        Optional<ScenarioImpactReport> latestForKey =
                scenarioImpactReportRepository.findFirstByScenarioIdAndReportKeyOrderByGeneratedAtDesc(
                        MARKET_DATA_SCENARIO_ID, "market_risk_summary");
        assertTrue(latestForKey.isPresent(),
                "Should find seed report via findFirstByScenarioIdAndReportKey query");
    }
}
