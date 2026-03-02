package com.prototypes.scenarios.migration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for Increment 10 Liquibase migrations (changesets 013, 014, 015).
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode so that
 * all Liquibase changesets are applied, then verifies table creation, seed data,
 * FK column existence, and backfill correctness via raw SQL queries.
 *
 * Note: Increment 11 added a third scenario type (FRTB_SA) and a new scenario
 * owned by Alice Johnson, so row counts are adjusted accordingly.
 */
@SpringBootTest
@ActiveProfiles("integration")
class Increment10MigrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // ========================================================================
    // Test 1: Verify scenario_type table exists with seeded rows including
    //         the two original types (MARKET_DATA, RISK_FACTOR) plus FRTB_SA
    //         added by Inc 11 changeset 017
    // ========================================================================

    @Test
    void scenarioTypeTable_containsSeededRows_withCorrectColumnValues() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT code, name, icon, direct_changes_mode, impact_data_mode, is_enabled, sort_order " +
                "FROM scenario_type ORDER BY sort_order");

        // Inc 10 seeded 2 types, Inc 11 added FRTB_SA = 3 total
        assertTrue(rows.size() >= 2, "scenario_type should contain at least the 2 original seeded rows");

        // Row 1: MARKET_DATA (sort_order=1)
        Map<String, Object> marketData = rows.get(0);
        assertEquals("MARKET_DATA", marketData.get("CODE"));
        assertEquals("Market Data", marketData.get("NAME"));
        assertEquals("ChartMultiple", marketData.get("ICON"));
        assertEquals("EXTERNAL", marketData.get("DIRECT_CHANGES_MODE"));
        assertEquals("EXTERNAL", marketData.get("IMPACT_DATA_MODE"));
        assertTrue((Boolean) marketData.get("IS_ENABLED"));
        assertEquals(1, marketData.get("SORT_ORDER"));

        // Row 2: RISK_FACTOR (sort_order=2)
        Map<String, Object> riskFactor = rows.get(1);
        assertEquals("RISK_FACTOR", riskFactor.get("CODE"));
        assertEquals("Risk Factor", riskFactor.get("NAME"));
        assertEquals("Pulse", riskFactor.get("ICON"));
        assertEquals("EXTERNAL", riskFactor.get("DIRECT_CHANGES_MODE"));
        assertEquals("EXTERNAL", riskFactor.get("IMPACT_DATA_MODE"));
        assertTrue((Boolean) riskFactor.get("IS_ENABLED"));
        assertEquals(2, riskFactor.get("SORT_ORDER"));
    }

    // ========================================================================
    // Test 2: Verify user_ref table exists with all 8 seeded rows
    // ========================================================================

    @Test
    void userRefTable_containsEightSeededRows_withCorrectDisplayNames() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, display_name, is_active FROM user_ref ORDER BY id");

        assertEquals(8, rows.size(), "user_ref should contain exactly 8 seeded rows");

        // Verify each row by id and display_name
        Map<String, String> expectedNames = Map.of(
                "approver-1", "Jane Smith",
                "approver-2", "John Doe",
                "approver-3", "Bob Williams",
                "current-user", "Current User",
                "owner-1", "Alice Johnson",
                "owner-2", "Carol Davis",
                "owner-3", "Bob Smith",
                "system", "System"
        );

        for (Map<String, Object> row : rows) {
            String id = (String) row.get("ID");
            String displayName = (String) row.get("DISPLAY_NAME");
            assertTrue(expectedNames.containsKey(id),
                    "Unexpected user_ref id: " + id);
            assertEquals(expectedNames.get(id), displayName,
                    "display_name mismatch for user_ref id=" + id);
            assertTrue((Boolean) row.get("IS_ACTIVE"),
                    "is_active should be true for user_ref id=" + id);
        }
    }

    // ========================================================================
    // Test 3: Verify FK columns exist on scenario, scenario_message, and scenario_event
    // ========================================================================

    @Test
    void fkColumns_existOnScenarioAndMessageAndEvent() {
        // Verify owner_user_id column exists on scenario by selecting it
        List<Map<String, Object>> scenarioColumns = jdbcTemplate.queryForList(
                "SELECT owner_user_id FROM scenario LIMIT 1");
        assertNotNull(scenarioColumns, "Should be able to SELECT owner_user_id from scenario");

        // Verify author_user_id column exists on scenario_message by selecting it
        List<Map<String, Object>> messageColumns = jdbcTemplate.queryForList(
                "SELECT author_user_id FROM scenario_message LIMIT 1");
        assertNotNull(messageColumns, "Should be able to SELECT author_user_id from scenario_message");

        // Verify actor_user_id column exists on scenario_event by selecting it
        List<Map<String, Object>> eventColumns = jdbcTemplate.queryForList(
                "SELECT actor_user_id FROM scenario_event LIMIT 1");
        assertNotNull(eventColumns, "Should be able to SELECT actor_user_id from scenario_event");
    }

    // ========================================================================
    // Test 4: Verify backfill populated FK columns correctly
    // ========================================================================

    @Test
    void backfill_populatedFkColumnsCorrectly() {
        // Verify scenario.owner_user_id backfill
        // "Alice Johnson" -> "owner-1" (FX Curve Recalibration + SA Capital Recalculation)
        List<Map<String, Object>> aliceScenarios = jdbcTemplate.queryForList(
                "SELECT owner_user_id FROM scenario WHERE owner_display_name = 'Alice Johnson'");
        assertTrue(aliceScenarios.size() >= 1, "Should have at least 1 scenario for Alice Johnson");
        for (Map<String, Object> row : aliceScenarios) {
            assertEquals("owner-1", row.get("OWNER_USER_ID"),
                    "Alice Johnson should map to owner-1");
        }

        // "Bob Smith" -> "owner-3" (IR Vol Surface Update)
        Map<String, Object> bobScenario = jdbcTemplate.queryForMap(
                "SELECT owner_user_id FROM scenario WHERE owner_display_name = 'Bob Smith'");
        assertEquals("owner-3", bobScenario.get("OWNER_USER_ID"),
                "Bob Smith should map to owner-3");

        // "Carol Davis" -> "owner-2" (Credit Spread Adjustment)
        Map<String, Object> carolScenario = jdbcTemplate.queryForMap(
                "SELECT owner_user_id FROM scenario WHERE owner_display_name = 'Carol Davis'");
        assertEquals("owner-2", carolScenario.get("OWNER_USER_ID"),
                "Carol Davis should map to owner-2");

        // Verify scenario_event.actor_user_id backfill -- check a sample
        // Jane Smith events should have actor_user_id = "approver-1"
        List<Map<String, Object>> janeEvents = jdbcTemplate.queryForList(
                "SELECT actor_user_id FROM scenario_event WHERE actor_display_name = 'Jane Smith'");
        assertTrue(janeEvents.size() > 0, "Should have events for Jane Smith");
        for (Map<String, Object> row : janeEvents) {
            assertEquals("approver-1", row.get("ACTOR_USER_ID"),
                    "Jane Smith events should have actor_user_id = approver-1");
        }

        // System events should have actor_user_id = "system"
        List<Map<String, Object>> systemEvents = jdbcTemplate.queryForList(
                "SELECT actor_user_id FROM scenario_event WHERE actor_display_name = 'System'");
        assertTrue(systemEvents.size() > 0, "Should have System events");
        for (Map<String, Object> row : systemEvents) {
            assertEquals("system", row.get("ACTOR_USER_ID"),
                    "System events should have actor_user_id = system");
        }

        // Verify scenario_message.author_user_id backfill -- check Jane Smith messages
        List<Map<String, Object>> janeMessages = jdbcTemplate.queryForList(
                "SELECT author_user_id FROM scenario_message WHERE author_display_name = 'Jane Smith'");
        assertTrue(janeMessages.size() > 0, "Should have messages for Jane Smith");
        for (Map<String, Object> row : janeMessages) {
            assertEquals("approver-1", row.get("AUTHOR_USER_ID"),
                    "Jane Smith messages should have author_user_id = approver-1");
        }

        // Verify John Doe messages
        List<Map<String, Object>> johnMessages = jdbcTemplate.queryForList(
                "SELECT author_user_id FROM scenario_message WHERE author_display_name = 'John Doe'");
        assertTrue(johnMessages.size() > 0, "Should have messages for John Doe");
        for (Map<String, Object> row : johnMessages) {
            assertEquals("approver-2", row.get("AUTHOR_USER_ID"),
                    "John Doe messages should have author_user_id = approver-2");
        }
    }
}
