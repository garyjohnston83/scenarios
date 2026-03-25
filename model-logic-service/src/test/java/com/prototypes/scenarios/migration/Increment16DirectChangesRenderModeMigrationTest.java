package com.prototypes.scenarios.migration;

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
 * Integration tests for Liquibase migrations 048 and 049.
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode so that
 * all Liquibase changesets are applied, then verifies:
 * - Changeset 048 adds the direct_changes_internal_render_mode column to scenario_type
 * - Changeset 049 seeds all existing rows with FULL_DATA_CHANGES
 * - Changeset 051 updates MARKET_DATA to DELTA_BY_UNIQUE_ID
 * - Both changesets register and execute without errors in the Liquibase changelog
 */
@SpringBootTest
@ActiveProfiles("integration")
class Increment16DirectChangesRenderModeMigrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // ========================================================================
    // Test 1: Verify changeset 048 adds the direct_changes_internal_render_mode
    //         column to the scenario_type table
    // ========================================================================

    @Test
    void changeset048_addsDirectChangesInternalRenderModeColumn_toScenarioType() {
        // If the column does not exist, this query will throw an exception
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT direct_changes_internal_render_mode FROM scenario_type LIMIT 1");

        assertNotNull(rows,
                "Should be able to SELECT direct_changes_internal_render_mode from scenario_type");
    }

    // ========================================================================
    // Test 2: Verify changeset 049 seeds all existing rows with FULL_DATA_CHANGES,
    //         and changeset 051 updates MARKET_DATA to DELTA_BY_UNIQUE_ID
    // ========================================================================

    @Test
    void changeset049_seedsAllExistingRows_withFullDataChanges_and051_updatesMarketData() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT code, direct_changes_internal_render_mode FROM scenario_type");

        assertFalse(rows.isEmpty(),
                "scenario_type should contain at least one row");

        for (Map<String, Object> row : rows) {
            String code = (String) row.get("CODE");
            String renderMode = (String) row.get("DIRECT_CHANGES_INTERNAL_RENDER_MODE");

            if ("MARKET_DATA".equals(code)) {
                // Changeset 051 updates MARKET_DATA to DELTA_BY_UNIQUE_ID
                assertEquals("DELTA_BY_UNIQUE_ID", renderMode,
                        "MARKET_DATA should have direct_changes_internal_render_mode = DELTA_BY_UNIQUE_ID after changeset 051");
            } else {
                // All other scenario types should still have FULL_DATA_CHANGES from changeset 049
                assertEquals("FULL_DATA_CHANGES", renderMode,
                        "scenario_type row '" + code + "' should have direct_changes_internal_render_mode = FULL_DATA_CHANGES");
            }
        }
    }

    // ========================================================================
    // Test 3: Verify both changesets 048 and 049 are registered in the
    //         databasechangelog tracking table and executed without errors
    // ========================================================================

    @Test
    void changesets048And049_areRegisteredInChangelogMaster_andRunWithoutError() {
        // If this test is running at all, the Spring context has started successfully
        // with all Liquibase changesets applied (including 048 and 049).
        // Verify by querying the Liquibase tracking table for both changeset entries.
        List<Map<String, Object>> changeset048Entries = jdbcTemplate.queryForList(
                "SELECT id, author, filename FROM databasechangelog " +
                "WHERE id = '048-add-direct-changes-internal-render-mode'");

        assertFalse(changeset048Entries.isEmpty(),
                "Changeset 048-add-direct-changes-internal-render-mode should be registered in databasechangelog");
        assertEquals("scenarios-team", changeset048Entries.get(0).get("AUTHOR"),
                "Changeset 048 should have author 'scenarios-team'");

        List<Map<String, Object>> changeset049Entries = jdbcTemplate.queryForList(
                "SELECT id, author, filename FROM databasechangelog " +
                "WHERE id = '049-seed-direct-changes-internal-render-mode'");

        assertFalse(changeset049Entries.isEmpty(),
                "Changeset 049-seed-direct-changes-internal-render-mode should be registered in databasechangelog");
        assertEquals("scenarios-team", changeset049Entries.get(0).get("AUTHOR"),
                "Changeset 049 should have author 'scenarios-team'");

        // Verify ordering: 048 should appear before 049 in the changelog
        Integer orderOf048 = jdbcTemplate.queryForObject(
                "SELECT orderexecuted FROM databasechangelog " +
                "WHERE id = '048-add-direct-changes-internal-render-mode'",
                Integer.class);
        Integer orderOf049 = jdbcTemplate.queryForObject(
                "SELECT orderexecuted FROM databasechangelog " +
                "WHERE id = '049-seed-direct-changes-internal-render-mode'",
                Integer.class);

        assertNotNull(orderOf048, "Changeset 048 should have an execution order");
        assertNotNull(orderOf049, "Changeset 049 should have an execution order");
        assertTrue(orderOf048 < orderOf049,
                "Changeset 048 (order=" + orderOf048 + ") should execute before 049 (order=" + orderOf049 + ")");
    }
}
