package com.prototypes.scenarios.migration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for Liquibase changesets 050 and 051.
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode so that
 * all Liquibase changesets are applied, then verifies:
 * <ul>
 *   <li>Changeset 050 inserts an active DELTA_BY_UNIQUE_ID change view definition for MARKET_DATA</li>
 *   <li>The definition JSON is valid and contains expected fields: renderMode, dataTypes, columnDefinitions, sortOrdering, rowThreshold</li>
 *   <li>Changeset 051 updates MARKET_DATA scenario type's direct_changes_internal_render_mode to DELTA_BY_UNIQUE_ID</li>
 * </ul>
 */
@SpringBootTest
@ActiveProfiles("integration")
class DeltaByUniqueIdSeedDataTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String DEFINITION_UUID = "cccccccc-cccc-4ccc-8ccc-ccccccccc003";

    // ========================================================================
    // Test 1: Application context starts successfully with new changesets applied
    //         and the seeded definition exists with correct metadata
    // ========================================================================

    @Test
    void applicationContextStartsAndSeedDataApplied_changesets050And051_existInChangelog() {
        // If we reach here, the Spring context has started successfully with all
        // Liquibase changesets applied (including 050 and 051).

        // Verify changeset 050 is registered in the Liquibase tracking table
        List<Map<String, Object>> changeset050Entries = jdbcTemplate.queryForList(
                "SELECT id, author, filename FROM databasechangelog " +
                "WHERE id = '050-seed-delta-by-unique-id-change-view-definition'");

        assertFalse(changeset050Entries.isEmpty(),
                "Changeset 050-seed-delta-by-unique-id-change-view-definition should be registered in databasechangelog");
        assertEquals("scenarios-team", changeset050Entries.get(0).get("AUTHOR"),
                "Changeset 050 should have author 'scenarios-team'");

        // Verify changeset 051 is registered in the Liquibase tracking table
        List<Map<String, Object>> changeset051Entries = jdbcTemplate.queryForList(
                "SELECT id, author, filename FROM databasechangelog " +
                "WHERE id = '051-update-market-data-render-mode'");

        assertFalse(changeset051Entries.isEmpty(),
                "Changeset 051-update-market-data-render-mode should be registered in databasechangelog");
        assertEquals("scenarios-team", changeset051Entries.get(0).get("AUTHOR"),
                "Changeset 051 should have author 'scenarios-team'");

        // Verify the seeded definition row exists
        List<Map<String, Object>> defRows = jdbcTemplate.queryForList(
                "SELECT id, scenario_type_code, template_key, version, is_active " +
                "FROM change_view_definition WHERE id = CAST(? AS UUID)",
                DEFINITION_UUID);

        assertEquals(1, defRows.size(), "Should find exactly 1 seeded DELTA_BY_UNIQUE_ID definition");
        assertEquals("MARKET_DATA", defRows.get(0).get("SCENARIO_TYPE_CODE"));
        assertEquals("market_data_delta_by_unique_id", defRows.get(0).get("TEMPLATE_KEY"));
        assertEquals(1, defRows.get(0).get("VERSION"));
        assertEquals(true, defRows.get(0).get("IS_ACTIVE"));

        // Verify MARKET_DATA scenario type has DELTA_BY_UNIQUE_ID render mode
        List<Map<String, Object>> typeRows = jdbcTemplate.queryForList(
                "SELECT code, direct_changes_internal_render_mode FROM scenario_type WHERE code = 'MARKET_DATA'");

        assertFalse(typeRows.isEmpty(), "MARKET_DATA scenario type should exist");
        assertEquals("DELTA_BY_UNIQUE_ID", typeRows.get(0).get("DIRECT_CHANGES_INTERNAL_RENDER_MODE"),
                "MARKET_DATA should have direct_changes_internal_render_mode = DELTA_BY_UNIQUE_ID after changeset 051");
    }

    // ========================================================================
    // Test 2: Seeded DELTA_BY_UNIQUE_ID definition JSON is valid and parseable
    //         with expected renderMode, dataTypes, columnDefinitions, sortOrdering,
    //         and rowThreshold fields
    // ========================================================================

    @Test
    void seedDefinitionJson_isValidAndContainsExpectedFields() throws Exception {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT definition FROM change_view_definition WHERE id = CAST(? AS UUID)",
                DEFINITION_UUID);

        assertEquals(1, rows.size(), "Should find the seeded definition");
        String definitionStr = (String) rows.get(0).get("DEFINITION");
        assertNotNull(definitionStr, "Definition JSON should not be null");

        // Parse JSON
        JsonNode root = objectMapper.readTree(definitionStr);

        // Verify renderMode
        assertTrue(root.has("renderMode"), "Definition must have renderMode");
        assertEquals("DELTA_BY_UNIQUE_ID", root.get("renderMode").asText(),
                "renderMode must be DELTA_BY_UNIQUE_ID");

        // Verify dataTypes is a non-empty array
        assertTrue(root.has("dataTypes"), "Definition must have dataTypes");
        assertTrue(root.get("dataTypes").isArray(), "dataTypes must be an array");
        assertTrue(root.get("dataTypes").size() >= 2,
                "dataTypes must have at least 2 sections (timeSeriesValues and curvePoints)");

        // Check each dataType section
        for (int i = 0; i < root.get("dataTypes").size(); i++) {
            JsonNode dataType = root.get("dataTypes").get(i);
            String dataTypeId = dataType.get("dataTypeId").asText();

            // Required fields
            assertTrue(dataType.has("dataTypeId"),
                    "Section " + i + " must have dataTypeId");
            assertTrue(dataType.has("dataTypeTitle"),
                    "Section " + i + " must have dataTypeTitle");
            assertTrue(dataType.has("headerSummaryTextTemplate"),
                    "Section " + i + " (" + dataTypeId + ") must have headerSummaryTextTemplate");

            // Verify headerSummaryTextTemplate contains placeholders
            String template = dataType.get("headerSummaryTextTemplate").asText();
            assertTrue(template.contains("${changedValuesCount}"),
                    "headerSummaryTextTemplate for " + dataTypeId + " must contain ${changedValuesCount}");
            assertTrue(template.contains("${changedEntitiesCount}"),
                    "headerSummaryTextTemplate for " + dataTypeId + " must contain ${changedEntitiesCount}");

            // Verify columnDefinitions
            assertTrue(dataType.has("columnDefinitions"),
                    "Section " + dataTypeId + " must have columnDefinitions");
            assertTrue(dataType.get("columnDefinitions").isArray(),
                    "columnDefinitions for " + dataTypeId + " must be an array");
            assertTrue(dataType.get("columnDefinitions").size() >= 2,
                    "columnDefinitions for " + dataTypeId + " must have at least 2 entries");

            // Verify each column definition has required fields
            boolean foundEntityId = false;
            for (int j = 0; j < dataType.get("columnDefinitions").size(); j++) {
                JsonNode colDef = dataType.get("columnDefinitions").get(j);
                assertTrue(colDef.has("dataAttribute"),
                        "Column " + j + " in " + dataTypeId + " must have dataAttribute");
                assertTrue(colDef.has("type"),
                        "Column " + j + " in " + dataTypeId + " must have type");
                assertTrue(colDef.has("display"),
                        "Column " + j + " in " + dataTypeId + " must have display");

                if (colDef.has("isEntityId") && colDef.get("isEntityId").asBoolean()) {
                    foundEntityId = true;
                }
            }
            assertTrue(foundEntityId,
                    "Section " + dataTypeId + " must have at least one column with isEntityId: true");

            // Verify sortOrdering
            assertTrue(dataType.has("sortOrdering"),
                    "Section " + dataTypeId + " must have sortOrdering");
            JsonNode sortOrdering = dataType.get("sortOrdering");
            assertTrue(sortOrdering.has("dataAttribute"),
                    "sortOrdering for " + dataTypeId + " must have dataAttribute");
            assertTrue(sortOrdering.has("direction"),
                    "sortOrdering for " + dataTypeId + " must have direction");

            // Verify rowThreshold
            assertTrue(dataType.has("rowThreshold"),
                    "Section " + dataTypeId + " must have rowThreshold");
            assertTrue(dataType.get("rowThreshold").isNumber(),
                    "rowThreshold for " + dataTypeId + " must be a number");
            assertTrue(dataType.get("rowThreshold").asInt() > 0,
                    "rowThreshold for " + dataTypeId + " must be positive");
        }

        // Verify specific dataTypeIds match what StubDirectChangesViewDataProvider expects
        JsonNode dataTypes = root.get("dataTypes");
        boolean hasTimeSeriesValues = false;
        boolean hasCurvePoints = false;
        for (JsonNode dt : dataTypes) {
            String id = dt.get("dataTypeId").asText();
            if ("timeSeriesValues".equals(id)) hasTimeSeriesValues = true;
            if ("curvePoints".equals(id)) hasCurvePoints = true;
        }
        assertTrue(hasTimeSeriesValues, "dataTypes must include 'timeSeriesValues'");
        assertTrue(hasCurvePoints, "dataTypes must include 'curvePoints'");
    }
}
