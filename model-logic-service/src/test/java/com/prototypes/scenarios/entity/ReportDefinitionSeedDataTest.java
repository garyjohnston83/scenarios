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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Seed data verification tests for changeset 029-seed-report-definitions.
 * Uses raw JDBC (JdbcTemplate) to verify seed data independently of the
 * ReportDefinition entity and ReportDefinitionRepository, which may not
 * exist yet (TG2/TG3 are implemented in parallel with TG7).
 *
 * Once TG2 and TG3 are complete, these tests can optionally be merged into
 * ReportDefinitionEntityRepositoryTest.java.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class ReportDefinitionSeedDataTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String FRTB_SA_UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001";
    private static final String MARKET_DATA_UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002";
    private static final String RISK_FACTOR_UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003";

    // ========================================================================
    // Test 1: Seed data loaded -- FRTB_SA definition exists with correct fields
    // ========================================================================

    @Test
    void seedData_frtbSaDefinition_existsWithCorrectFields() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, scenario_type_code, report_key, version, is_active, definition " +
                "FROM report_definition WHERE id = CAST(? AS UUID)",
                FRTB_SA_UUID
        );

        assertEquals(1, rows.size(), "Should find exactly 1 FRTB_SA seed definition");

        Map<String, Object> row = rows.get(0);
        assertEquals("FRTB_SA", row.get("SCENARIO_TYPE_CODE"));
        assertEquals("sa_capital_summary", row.get("REPORT_KEY"));
        assertEquals(1, row.get("VERSION"));
        assertEquals(true, row.get("IS_ACTIVE"));
        assertNotNull(row.get("DEFINITION"), "Definition should not be null");
    }

    // ========================================================================
    // Test 2: Seed data loaded -- MARKET_DATA definition exists and is active
    // ========================================================================

    @Test
    void seedData_marketDataDefinition_existsAndIsActive() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT scenario_type_code, report_key, version, is_active " +
                "FROM report_definition WHERE scenario_type_code = ? AND is_active = true",
                "MARKET_DATA"
        );

        assertFalse(rows.isEmpty(), "Should find at least 1 active MARKET_DATA definition");

        boolean found = rows.stream()
                .anyMatch(r -> "market_risk_summary".equals(r.get("REPORT_KEY")));
        assertTrue(found, "Should find a definition with report_key = 'market_risk_summary'");
    }

    // ========================================================================
    // Test 3: Seed definition JSON is valid -- all 3 definitions parse correctly
    //         and conform to schema_version 1.0 with non-empty sections
    // ========================================================================

    @Test
    void seedData_allDefinitions_haveValidJsonWithSchemaVersionAndSections() throws Exception {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, scenario_type_code, report_key, definition FROM report_definition " +
                "WHERE id IN (CAST(? AS UUID), CAST(? AS UUID), CAST(? AS UUID))",
                FRTB_SA_UUID, MARKET_DATA_UUID, RISK_FACTOR_UUID
        );

        assertEquals(3, rows.size(), "Should find all 3 seed definitions");

        for (Map<String, Object> row : rows) {
            String id = String.valueOf(row.get("ID"));
            String reportKey = (String) row.get("REPORT_KEY");
            String definitionStr = (String) row.get("DEFINITION");

            assertNotNull(definitionStr, "Definition for " + reportKey + " should not be null");

            JsonNode definition = objectMapper.readTree(definitionStr);

            // Verify schema_version is "1.0"
            assertTrue(definition.has("schema_version"),
                    "Definition for " + reportKey + " must have schema_version");
            assertEquals("1.0", definition.get("schema_version").asText(),
                    "Definition for " + reportKey + " must have schema_version = '1.0'");

            // Verify report_key matches the column value
            assertTrue(definition.has("report_key"),
                    "Definition for " + reportKey + " must have report_key");
            assertEquals(reportKey, definition.get("report_key").asText(),
                    "Definition JSON report_key must match the report_key column for " + reportKey);

            // Verify scenario_type matches the column value
            String scenarioTypeCode = (String) row.get("SCENARIO_TYPE_CODE");
            assertTrue(definition.has("scenario_type"),
                    "Definition for " + reportKey + " must have scenario_type");
            assertEquals(scenarioTypeCode, definition.get("scenario_type").asText(),
                    "Definition JSON scenario_type must match scenario_type_code column for " + reportKey);

            // Verify display_name is non-empty
            assertTrue(definition.has("display_name"),
                    "Definition for " + reportKey + " must have display_name");
            assertFalse(definition.get("display_name").asText().isEmpty(),
                    "Definition for " + reportKey + " must have non-empty display_name");

            // Verify sections is a non-empty array
            assertTrue(definition.has("sections"),
                    "Definition for " + reportKey + " must have sections");
            assertTrue(definition.get("sections").isArray(),
                    "Definition sections for " + reportKey + " must be an array");
            assertTrue(definition.get("sections").size() > 0,
                    "Definition for " + reportKey + " must have at least 1 section");

            // Verify each section has key, title, order, and non-empty content
            // (either metrics[] for metric-based definitions or contentBlocks[] for table-based)
            for (int i = 0; i < definition.get("sections").size(); i++) {
                JsonNode section = definition.get("sections").get(i);
                assertTrue(section.has("key"),
                        "Section " + i + " in " + reportKey + " must have key");
                assertTrue(section.has("title"),
                        "Section " + i + " in " + reportKey + " must have title");
                assertTrue(section.has("order"),
                        "Section " + i + " in " + reportKey + " must have order");
                assertTrue(section.get("order").asInt() >= 1,
                        "Section " + i + " in " + reportKey + " must have order >= 1");

                boolean hasMetrics = section.has("metrics")
                        && section.get("metrics").isArray()
                        && section.get("metrics").size() > 0;
                boolean hasContentBlocks = section.has("contentBlocks")
                        && section.get("contentBlocks").isArray()
                        && section.get("contentBlocks").size() > 0;

                assertTrue(hasMetrics || hasContentBlocks,
                        "Section " + i + " in " + reportKey +
                        " must have non-empty metrics array or non-empty contentBlocks array");

                if (hasMetrics) {
                    // Verify each metric has key, label, source_field, format
                    for (int j = 0; j < section.get("metrics").size(); j++) {
                        JsonNode metric = section.get("metrics").get(j);
                        assertTrue(metric.has("key"),
                                "Metric " + j + " in section " + i + " of " + reportKey + " must have key");
                        assertTrue(metric.has("label"),
                                "Metric " + j + " in section " + i + " of " + reportKey + " must have label");
                        assertTrue(metric.has("source_field"),
                                "Metric " + j + " in section " + i + " of " + reportKey + " must have source_field");
                        assertTrue(metric.has("format"),
                                "Metric " + j + " in section " + i + " of " + reportKey + " must have format");

                        String format = metric.get("format").asText();
                        assertTrue(
                                "number".equals(format) || "currency".equals(format) ||
                                "percentage".equals(format) || "text".equals(format),
                                "Metric " + j + " in section " + i + " of " + reportKey +
                                " must have format in [number, currency, percentage, text], got '" + format + "'"
                        );
                    }
                }

                if (hasContentBlocks) {
                    // Verify each contentBlock has a blockType
                    for (int j = 0; j < section.get("contentBlocks").size(); j++) {
                        JsonNode block = section.get("contentBlocks").get(j);
                        assertTrue(block.has("blockType"),
                                "ContentBlock " + j + " in section " + i + " of " + reportKey + " must have blockType");
                    }
                }
            }
        }
    }
}
