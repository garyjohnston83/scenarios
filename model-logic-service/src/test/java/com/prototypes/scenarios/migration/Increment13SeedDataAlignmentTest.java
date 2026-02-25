package com.prototypes.scenarios.migration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for Increment 13 Task Group 1: Liquibase Seed Data Alignment (changeset 023).
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode so that
 * all Liquibase changesets (001-023) are applied, then verifies:
 * - MESSAGE_POSTED events have valid related_message_id FK values
 * - All seeded ScenarioMessage rows have corresponding MESSAGE_POSTED events
 * - State transition events have valid payload_json with oldState/newState
 * - payload_json values use correct WORKFLOW_STATE_LABELS keys
 * - No orphaned messages exist for Credit Spread Adjustment and FX Curve Recalibration
 * - Changeset 023 is registered in db.changelog-master.yaml
 *
 * Note: H2 in PostgreSQL mode stores jsonb columns as byte arrays internally.
 * Queries use CAST(payload_json AS VARCHAR) to retrieve the JSON as a string.
 */
@SpringBootTest
@ActiveProfiles("integration")
class Increment13SeedDataAlignmentTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // Scenario UUIDs
    private static final String IR_VOL_SCENARIO_ID = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";
    private static final String CREDIT_SPREAD_SCENARIO_ID = "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f";
    private static final String FX_CURVE_SCENARIO_ID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

    // MESSAGE_POSTED event UUIDs for IR Vol Surface Update
    private static final String MSG_POSTED_EVENT_1 = "f5f6a7b8-c9d0-4e1f-2a3b-5c6d7e8f9003";
    private static final String MSG_POSTED_EVENT_2 = "b7b8c9d0-e1f2-4a3b-4c5d-7e8f90010205";

    // Corresponding message UUIDs
    private static final String MESSAGE_1 = "b1b2c3d4-e5f6-4a7b-8c9d-1e2f3a4b5c01";
    private static final String MESSAGE_2 = "c2c3d4e5-f6a7-4b8c-9d0e-2f3a4b5c6d02";

    // Valid WORKFLOW_STATE_LABELS keys
    private static final Set<String> VALID_STATE_KEYS = Set.of(
            "DRAFT", "IMPACT_PENDING", "IMPACT_AVAILABLE", "IMPACT_EXPIRED",
            "SIGNOFF_IN_PROGRESS", "SIGNED_OFF", "PROMOTED", "REJECTED"
    );

    // ========================================================================
    // Test 1: After changeset 023, the two existing MESSAGE_POSTED events for
    //         IR Vol Surface Update have non-null related_message_id values
    //         matching the correct scenario_message UUIDs
    // ========================================================================

    @Test
    void messagePostedEvents_haveNonNullRelatedMessageId_matchingCorrectMessages() {
        // Verify first MESSAGE_POSTED event links to first message
        Map<String, Object> event1 = jdbcTemplate.queryForMap(
                "SELECT related_message_id FROM scenario_event WHERE id = ?",
                MSG_POSTED_EVENT_1);
        assertNotNull(event1.get("RELATED_MESSAGE_ID"),
                "MESSAGE_POSTED event f5f6a7b8-... should have non-null related_message_id");
        assertEquals(MESSAGE_1, event1.get("RELATED_MESSAGE_ID").toString(),
                "MESSAGE_POSTED event f5f6a7b8-... should reference message b1b2c3d4-...");

        // Verify second MESSAGE_POSTED event links to second message
        Map<String, Object> event2 = jdbcTemplate.queryForMap(
                "SELECT related_message_id FROM scenario_event WHERE id = ?",
                MSG_POSTED_EVENT_2);
        assertNotNull(event2.get("RELATED_MESSAGE_ID"),
                "MESSAGE_POSTED event b7b8c9d0-... should have non-null related_message_id");
        assertEquals(MESSAGE_2, event2.get("RELATED_MESSAGE_ID").toString(),
                "MESSAGE_POSTED event b7b8c9d0-... should reference message c2c3d4e5-...");
    }

    // ========================================================================
    // Test 2: All seeded ScenarioMessage rows have a corresponding
    //         MESSAGE_POSTED event in the scenario_event table
    // ========================================================================

    @Test
    void allSeededMessages_haveCorrespondingMessagePostedEvent() {
        // Get all seeded messages
        List<Map<String, Object>> messages = jdbcTemplate.queryForList(
                "SELECT id, scenario_id FROM scenario_message");

        assertFalse(messages.isEmpty(), "Should have at least one seeded message");

        for (Map<String, Object> msg : messages) {
            String messageId = msg.get("ID").toString();
            String scenarioId = msg.get("SCENARIO_ID").toString();

            // Check that a MESSAGE_POSTED event exists for this message's scenario
            // with a matching related_message_id
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM scenario_event " +
                    "WHERE event_type = 'MESSAGE_POSTED' " +
                    "AND scenario_id = ? " +
                    "AND related_message_id = ?",
                    Integer.class, scenarioId, messageId);

            assertNotNull(count);
            assertTrue(count > 0,
                    "Message " + messageId + " in scenario " + scenarioId +
                    " should have a corresponding MESSAGE_POSTED event with related_message_id set");
        }
    }

    // ========================================================================
    // Test 3: Existing seed events that imply state transitions
    //         (SIGNOFF_COMMENCED, IMPACT_COMPLETED, SIGNOFF_APPROVED,
    //          SCENARIO_CREATED) have valid JSON in payload_json containing
    //         oldState and newState keys
    // ========================================================================

    @Test
    void stateTransitionEvents_haveValidPayloadJson_withOldStateAndNewState() {
        // Use CAST to retrieve jsonb as VARCHAR since H2 stores jsonb as byte[]
        List<Map<String, Object>> events = jdbcTemplate.queryForList(
                "SELECT id, event_type, CAST(payload_json AS VARCHAR) AS payload_str FROM scenario_event " +
                "WHERE event_type IN ('SCENARIO_CREATED', 'IMPACT_COMPLETED', 'SIGNOFF_COMMENCED', 'SIGNOFF_APPROVED')");

        assertFalse(events.isEmpty(), "Should have seed events of state transition types");

        for (Map<String, Object> event : events) {
            String eventId = event.get("ID").toString();
            String eventType = (String) event.get("EVENT_TYPE");
            Object payloadStr = event.get("PAYLOAD_STR");

            assertNotNull(payloadStr,
                    "Event " + eventId + " (" + eventType + ") should have non-null payload_json");

            String payload = payloadStr.toString();
            assertTrue(payload.contains("oldState"),
                    "Event " + eventId + " (" + eventType + ") payload_json should contain oldState key. Got: " + payload);
            assertTrue(payload.contains("newState"),
                    "Event " + eventId + " (" + eventType + ") payload_json should contain newState key. Got: " + payload);
        }
    }

    // ========================================================================
    // Test 4: The payload_json values use correct state strings that match
    //         WORKFLOW_STATE_LABELS keys (e.g., "DRAFT", "SIGNOFF_IN_PROGRESS",
    //         "SIGNED_OFF")
    // ========================================================================

    @Test
    void payloadJsonValues_useCorrectStateStrings_matchingWorkflowStateLabelsKeys() {
        // Use CAST to retrieve jsonb as VARCHAR since H2 stores jsonb as byte[]
        List<Map<String, Object>> events = jdbcTemplate.queryForList(
                "SELECT id, event_type, CAST(payload_json AS VARCHAR) AS payload_str FROM scenario_event " +
                "WHERE payload_json IS NOT NULL");

        assertFalse(events.isEmpty(), "Should have events with non-null payload_json");

        for (Map<String, Object> event : events) {
            String eventId = event.get("ID").toString();
            String payload = event.get("PAYLOAD_STR").toString();

            // Extract oldState and newState values from the JSON string
            String oldState = extractJsonValue(payload, "oldState");
            String newState = extractJsonValue(payload, "newState");

            assertNotNull(oldState,
                    "Event " + eventId + " should have parseable oldState in payload_json. Got: " + payload);
            assertNotNull(newState,
                    "Event " + eventId + " should have parseable newState in payload_json. Got: " + payload);

            assertTrue(VALID_STATE_KEYS.contains(oldState),
                    "Event " + eventId + " oldState '" + oldState +
                    "' should be a valid WORKFLOW_STATE_LABELS key");
            assertTrue(VALID_STATE_KEYS.contains(newState),
                    "Event " + eventId + " newState '" + newState +
                    "' should be a valid WORKFLOW_STATE_LABELS key");
        }
    }

    // ========================================================================
    // Test 5: Credit Spread Adjustment and FX Curve Recalibration scenarios
    //         have no orphaned messages (messages without corresponding
    //         MESSAGE_POSTED events)
    // ========================================================================

    @Test
    void creditSpreadAndFxCurve_haveNoOrphanedMessages() {
        // Check Credit Spread Adjustment: no messages exist, so no orphans possible
        Integer creditSpreadOrphans = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM scenario_message m " +
                "WHERE m.scenario_id = ? " +
                "AND NOT EXISTS (" +
                "  SELECT 1 FROM scenario_event e " +
                "  WHERE e.event_type = 'MESSAGE_POSTED' " +
                "  AND e.scenario_id = m.scenario_id " +
                "  AND e.related_message_id = m.id" +
                ")",
                Integer.class, CREDIT_SPREAD_SCENARIO_ID);

        assertNotNull(creditSpreadOrphans);
        assertEquals(0, creditSpreadOrphans,
                "Credit Spread Adjustment should have no orphaned messages");

        // Check FX Curve Recalibration: no messages exist, so no orphans possible
        Integer fxCurveOrphans = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM scenario_message m " +
                "WHERE m.scenario_id = ? " +
                "AND NOT EXISTS (" +
                "  SELECT 1 FROM scenario_event e " +
                "  WHERE e.event_type = 'MESSAGE_POSTED' " +
                "  AND e.scenario_id = m.scenario_id " +
                "  AND e.related_message_id = m.id" +
                ")",
                Integer.class, FX_CURVE_SCENARIO_ID);

        assertNotNull(fxCurveOrphans);
        assertEquals(0, fxCurveOrphans,
                "FX Curve Recalibration should have no orphaned messages");
    }

    // ========================================================================
    // Test 6: Changeset 023 is registered in db.changelog-master.yaml and
    //         runs without error after changesets 001-022
    // ========================================================================

    @Test
    void changeset023_isRegisteredInChangelogMaster_andRunsWithoutError() {
        // If this test is running at all, the Spring context has started successfully
        // with all Liquibase changesets applied (including 023). Verify by querying
        // the Liquibase tracking table for changeset 023 entries.
        List<Map<String, Object>> changeset023Entries = jdbcTemplate.queryForList(
                "SELECT id, author, filename FROM databasechangelog " +
                "WHERE id LIKE '023-%'");

        assertFalse(changeset023Entries.isEmpty(),
                "Changeset 023 should be registered in the databasechangelog tracking table");

        // Verify both sub-changesets are present
        boolean hasRelatedMessageUpdate = changeset023Entries.stream()
                .anyMatch(row -> row.get("ID").toString().contains("align-message-posted-related-message-ids"));
        boolean hasPayloadJsonUpdate = changeset023Entries.stream()
                .anyMatch(row -> row.get("ID").toString().contains("populate-state-transition-payload-json"));

        assertTrue(hasRelatedMessageUpdate,
                "Changeset 023-align-message-posted-related-message-ids should be in databasechangelog");
        assertTrue(hasPayloadJsonUpdate,
                "Changeset 023-populate-state-transition-payload-json should be in databasechangelog");
    }

    // ========================================================================
    // Helper: Extract a JSON string value by key from a JSON string.
    // Handles H2's CAST output which may include escaped quotes.
    // ========================================================================

    private String extractJsonValue(String json, String key) {
        // H2 CAST(jsonb AS VARCHAR) may produce output like:
        //   {"oldState":"DRAFT","newState":"DRAFT"}
        // or with escaped quotes:
        //   "{\"oldState\":\"DRAFT\",\"newState\":\"DRAFT\"}"
        // Normalize escaped quotes first
        String normalized = json.replace("\\\"", "\"");
        // Also strip leading/trailing quotes if present
        if (normalized.startsWith("\"") && normalized.endsWith("\"")) {
            normalized = normalized.substring(1, normalized.length() - 1);
            // After stripping outer quotes, re-normalize any remaining escapes
            normalized = normalized.replace("\\\"", "\"");
        }

        // Pattern: "key":"value" or "key": "value"
        String searchKey = "\"" + key + "\"";
        int keyIndex = normalized.indexOf(searchKey);
        if (keyIndex < 0) {
            return null;
        }
        // Find the colon after the key
        int colonIndex = normalized.indexOf(':', keyIndex + searchKey.length());
        if (colonIndex < 0) {
            return null;
        }
        // Find the opening quote of the value
        int openQuote = normalized.indexOf('"', colonIndex + 1);
        if (openQuote < 0) {
            return null;
        }
        // Find the closing quote of the value
        int closeQuote = normalized.indexOf('"', openQuote + 1);
        if (closeQuote < 0) {
            return null;
        }
        return normalized.substring(openQuote + 1, closeQuote);
    }
}
