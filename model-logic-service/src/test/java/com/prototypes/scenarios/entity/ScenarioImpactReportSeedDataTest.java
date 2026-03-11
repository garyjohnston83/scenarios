package com.prototypes.scenarios.entity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Seed data verification tests for changeset 031-seed-scenario-impact-reports
 * and changeset 033-update-market-data-report.
 * Uses raw JDBC (JdbcTemplate) to verify seed data independently of the
 * ScenarioImpactReport entity and ScenarioImpactReportRepository, which may
 * not exist yet when this test group is implemented.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class ScenarioImpactReportSeedDataTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String GENERATED_UUID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011";
    private static final String FAILED_UUID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002";

    // ========================================================================
    // Test 1: GENERATED report exists with correct fields and non-null rendered_report
    // ========================================================================

    @Test
    void seedData_generatedReport_existsWithCorrectFields() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, scenario_id, report_definition_id, definition_version, " +
                "report_key, report_name, status, rendered_report, error_message " +
                "FROM scenario_impact_report WHERE id = CAST(? AS UUID)",
                GENERATED_UUID
        );

        assertEquals(1, rows.size(), "Should find exactly 1 GENERATED seed report");

        Map<String, Object> row = rows.get(0);
        assertEquals("market_risk_summary", row.get("REPORT_KEY"));
        assertEquals("FX Impact Analysis Report on Average Moves", row.get("REPORT_NAME"));
        assertEquals("GENERATED", row.get("STATUS"));
        assertEquals(4, row.get("DEFINITION_VERSION"));
        assertNotNull(row.get("RENDERED_REPORT"), "Rendered report should not be null for GENERATED status");
        assertNull(row.get("ERROR_MESSAGE"), "Error message should be null for GENERATED status");
    }

    // ========================================================================
    // Test 2: FAILED report exists with correct fields, null rendered_report, non-null error_message
    // ========================================================================

    @Test
    void seedData_failedReport_existsWithCorrectFields() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, scenario_id, report_definition_id, definition_version, " +
                "report_key, report_name, status, rendered_report, error_message " +
                "FROM scenario_impact_report WHERE id = CAST(? AS UUID)",
                FAILED_UUID
        );

        assertEquals(1, rows.size(), "Should find exactly 1 FAILED seed report");

        Map<String, Object> row = rows.get(0);
        assertEquals("sa_capital_summary", row.get("REPORT_KEY"));
        assertEquals("SA Capital Charge Summary", row.get("REPORT_NAME"));
        assertEquals("FAILED", row.get("STATUS"));
        assertEquals(1, row.get("DEFINITION_VERSION"));
        assertNull(row.get("RENDERED_REPORT"), "Rendered report should be null for FAILED status");
        assertNotNull(row.get("ERROR_MESSAGE"), "Error message should not be null for FAILED status");
        assertEquals("Data provider timeout: unable to fetch risk charge data within 30s",
                row.get("ERROR_MESSAGE"));
    }

    // ========================================================================
    // Test 3: GENERATED seed rendered report JSON is valid and contains expected structure
    // ========================================================================

    @Test
    void seedData_generatedReport_hasValidRenderedReportJson() throws Exception {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT rendered_report FROM scenario_impact_report WHERE id = CAST(? AS UUID)",
                GENERATED_UUID
        );

        assertEquals(1, rows.size());
        String renderedReportStr = (String) rows.get(0).get("RENDERED_REPORT");
        assertNotNull(renderedReportStr, "Rendered report should not be null");

        JsonNode report = objectMapper.readTree(renderedReportStr);

        // Verify top-level fields
        assertEquals("market_risk_summary", report.get("reportKey").asText());
        assertEquals("FX Impact Analysis Report on Average Moves", report.get("reportName").asText());
        assertEquals(4, report.get("definitionVersion").asInt());
        assertNotNull(report.get("generatedAt"), "generatedAt must be present");
        assertEquals("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", report.get("scenarioId").asText());
        assertEquals("FX Curve Recalibration", report.get("scenarioName").asText());
        assertEquals("MARKET_DATA", report.get("scenarioTypeCode").asText());

        // Verify sections array is present and has 3 sections
        assertTrue(report.has("sections"), "Report must have sections");
        assertTrue(report.get("sections").isArray(), "Sections must be an array");
        assertEquals(3, report.get("sections").size(), "Report must have 3 sections");

        // Verify first section has contentBlocks with table blocks
        JsonNode firstSection = report.get("sections").get(0);
        assertEquals("legal_entity_division", firstSection.get("sectionKey").asText());
        assertEquals("Legal Entity / Division (Average Moves)", firstSection.get("sectionTitle").asText());
        assertEquals(1, firstSection.get("order").asInt());

        assertTrue(firstSection.has("contentBlocks"), "Section must have contentBlocks");
        assertTrue(firstSection.get("contentBlocks").isArray(), "contentBlocks must be an array");
        assertTrue(firstSection.get("contentBlocks").size() > 0, "contentBlocks must not be empty");

        // Verify the first content block is a table block
        JsonNode firstBlock = firstSection.get("contentBlocks").get(0);
        assertEquals("table", firstBlock.get("blockType").asText());
        assertTrue(firstBlock.has("columnLayout"), "Table block must have columnLayout");
        assertTrue(firstBlock.has("rows"), "Table block must have rows");

        // Verify columnLayout has rowColumns and columnGroups
        JsonNode columnLayout = firstBlock.get("columnLayout");
        assertTrue(columnLayout.has("rowColumns"), "columnLayout must have rowColumns");
        assertTrue(columnLayout.has("columnGroups"), "columnLayout must have columnGroups");

        // Verify rows have cells with value and formatToken
        JsonNode rows2 = firstBlock.get("rows");
        assertTrue(rows2.isArray() && rows2.size() > 0, "Table must have at least one row");
        JsonNode firstRow = rows2.get(0);
        assertTrue(firstRow.has("rowId"), "Row must have rowId");
        assertTrue(firstRow.has("cells"), "Row must have cells");

        // Verify second section
        JsonNode secondSection = report.get("sections").get(1);
        assertEquals("business", secondSection.get("sectionKey").asText());

        // Verify third section
        JsonNode thirdSection = report.get("sections").get(2);
        assertEquals("treasury", thirdSection.get("sectionKey").asText());
    }
}
