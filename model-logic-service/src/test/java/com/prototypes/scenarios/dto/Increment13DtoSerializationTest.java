package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Increment 13 Task Group 2 -- Tests for ActivityRowDto, ActivityStreamDto,
 * and ScenarioDetailDto expansion with events field.
 * These tests verify JSON serialization behavior including @JsonInclude(NON_NULL).
 */
class Increment13DtoSerializationTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    // ========================================================================
    // Test 1: ActivityRowDto serializes to JSON with all non-null fields present
    // ========================================================================

    @Test
    void activityRowDto_serializesToJsonWithAllNonNullFieldsPresent() throws Exception {
        UUID rowId = UUID.fromString("aa000001-0001-4001-8001-000000000001");
        LocalDateTime occurredAt = LocalDateTime.of(2026, 2, 19, 14, 30, 45);

        ActivityRowDto dto = new ActivityRowDto(
                rowId,
                "USER",
                occurredAt,
                "Alice Smith",
                "Sign-off started",
                "Draft -> Sign-off In Progress"
        );

        String json = objectMapper.writeValueAsString(dto);

        assertTrue(json.contains("\"id\""), "JSON should contain 'id' field");
        assertTrue(json.contains(rowId.toString()), "JSON should contain the row UUID");
        assertTrue(json.contains("\"bucketType\""), "JSON should contain 'bucketType' field");
        assertTrue(json.contains("\"USER\""), "JSON should contain bucket type value 'USER'");
        assertTrue(json.contains("\"occurredAt\""), "JSON should contain 'occurredAt' field");
        assertTrue(json.contains("\"authorDisplayName\""), "JSON should contain 'authorDisplayName' field");
        assertTrue(json.contains("\"Alice Smith\""), "JSON should contain author display name");
        assertTrue(json.contains("\"details\""), "JSON should contain 'details' field");
        assertTrue(json.contains("\"Sign-off started\""), "JSON should contain details text");
        assertTrue(json.contains("\"statusTransition\""), "JSON should contain 'statusTransition' field");
        assertTrue(json.contains("\"Draft -> Sign-off In Progress\""),
                "JSON should contain status transition string");

        // Verify deserialization roundtrip structure
        var tree = objectMapper.readTree(json);
        assertEquals(6, tree.size(), "ActivityRowDto should have 6 fields when all are non-null");
    }

    // ========================================================================
    // Test 2: ActivityRowDto serializes with statusTransition omitted when null
    // ========================================================================

    @Test
    void activityRowDto_omitsStatusTransitionFromJsonWhenNull() throws Exception {
        UUID rowId = UUID.fromString("aa000002-0002-4002-8002-000000000002");
        LocalDateTime occurredAt = LocalDateTime.of(2026, 2, 19, 9, 0, 0);

        ActivityRowDto dto = new ActivityRowDto(
                rowId,
                "MESSAGE",
                occurredAt,
                "Bob Jones",
                "Please review the updated data.",
                null  // statusTransition is null
        );

        String json = objectMapper.writeValueAsString(dto);

        // statusTransition should be omitted due to @JsonInclude(NON_NULL)
        assertFalse(json.contains("\"statusTransition\""),
                "JSON should NOT contain 'statusTransition' field when null (omitted by @JsonInclude(NON_NULL))");

        // Other fields should still be present
        assertTrue(json.contains("\"id\""), "JSON should still contain 'id' field");
        assertTrue(json.contains("\"bucketType\""), "JSON should still contain 'bucketType' field");
        assertTrue(json.contains("\"MESSAGE\""), "JSON should contain bucket type value 'MESSAGE'");
        assertTrue(json.contains("\"occurredAt\""), "JSON should still contain 'occurredAt' field");
        assertTrue(json.contains("\"authorDisplayName\""), "JSON should still contain 'authorDisplayName' field");
        assertTrue(json.contains("\"details\""), "JSON should still contain 'details' field");

        var tree = objectMapper.readTree(json);
        assertEquals(5, tree.size(), "ActivityRowDto should have 5 fields when statusTransition is null");
    }

    // ========================================================================
    // Test 3: ActivityStreamDto serializes with rows and non-null approvals
    // ========================================================================

    @Test
    void activityStreamDto_serializesWithRowsAndNonNullApprovals() throws Exception {
        UUID rowId1 = UUID.fromString("aa000003-0003-4003-8003-000000000003");
        UUID rowId2 = UUID.fromString("aa000004-0004-4004-8004-000000000004");

        List<ActivityRowDto> rows = List.of(
                new ActivityRowDto(rowId1, "SYSTEM", LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                        "System", "Scenario created", null),
                new ActivityRowDto(rowId2, "USER", LocalDateTime.of(2026, 2, 19, 14, 0, 0),
                        "Alice Smith", "Sign-off started", "Impact Available -> Sign-off In Progress")
        );

        ActivityStreamDto dto = new ActivityStreamDto(rows, 1, 2);

        String json = objectMapper.writeValueAsString(dto);

        assertTrue(json.contains("\"rows\""), "JSON should contain 'rows' field");
        assertTrue(json.contains("\"approvalsReceived\""), "JSON should contain 'approvalsReceived' field");
        assertTrue(json.contains("\"approvalsRequired\""), "JSON should contain 'approvalsRequired' field");

        var tree = objectMapper.readTree(json);
        assertEquals(2, tree.get("rows").size(), "Should have 2 rows");
        assertEquals(1, tree.get("approvalsReceived").asInt(), "approvalsReceived should be 1");
        assertEquals(2, tree.get("approvalsRequired").asInt(), "approvalsRequired should be 2");
    }

    // ========================================================================
    // Test 4: ActivityStreamDto omits approvalsReceived/approvalsRequired when null
    // ========================================================================

    @Test
    void activityStreamDto_omitsApprovalsWhenNull() throws Exception {
        UUID rowId = UUID.fromString("aa000005-0005-4005-8005-000000000005");

        List<ActivityRowDto> rows = List.of(
                new ActivityRowDto(rowId, "SYSTEM", LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                        "System", "Scenario created", null)
        );

        ActivityStreamDto dto = new ActivityStreamDto(rows, null, null);

        String json = objectMapper.writeValueAsString(dto);

        // Approval fields should be omitted due to @JsonInclude(NON_NULL)
        assertFalse(json.contains("\"approvalsReceived\""),
                "JSON should NOT contain 'approvalsReceived' field when null (omitted by @JsonInclude(NON_NULL))");
        assertFalse(json.contains("\"approvalsRequired\""),
                "JSON should NOT contain 'approvalsRequired' field when null (omitted by @JsonInclude(NON_NULL))");

        // rows should still be present
        assertTrue(json.contains("\"rows\""), "JSON should still contain 'rows' field");

        var tree = objectMapper.readTree(json);
        assertEquals(1, tree.size(), "ActivityStreamDto should have only 1 field (rows) when approvals are null");
        assertEquals(1, tree.get("rows").size(), "Should have 1 row");
    }

    // ========================================================================
    // Test 5: ScenarioDetailDto includes events field when populated
    // ========================================================================

    @Test
    void scenarioDetailDto_includesEventsFieldWhenPopulated() throws Exception {
        UUID scenarioId = UUID.fromString("bb000001-0001-4001-8001-000000000001");
        UUID rowId = UUID.fromString("aa000006-0006-4006-8006-000000000006");

        List<ActivityRowDto> rows = List.of(
                new ActivityRowDto(rowId, "SYSTEM", LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                        "System", "Scenario created", null)
        );
        ActivityStreamDto events = new ActivityStreamDto(rows, 1, 2);

        ScenarioDetailDto dto = new ScenarioDetailDto(
                scenarioId,
                "Test Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                null,
                null,
                events,
                null,
                null
        );

        String json = objectMapper.writeValueAsString(dto);

        assertTrue(json.contains("\"events\""), "JSON should contain 'events' field when populated");
        assertTrue(json.contains("\"rows\""), "JSON should contain 'rows' within events");
        assertTrue(json.contains("\"approvalsReceived\""),
                "JSON should contain 'approvalsReceived' within events");
        assertTrue(json.contains("\"approvalsRequired\""),
                "JSON should contain 'approvalsRequired' within events");

        var tree = objectMapper.readTree(json);
        assertTrue(tree.has("events"), "ScenarioDetailDto tree should have 'events' node");
        assertEquals(1, tree.get("events").get("rows").size(), "events.rows should have 1 row");
        assertEquals(1, tree.get("events").get("approvalsReceived").asInt(),
                "events.approvalsReceived should be 1");
        assertEquals(2, tree.get("events").get("approvalsRequired").asInt(),
                "events.approvalsRequired should be 2");
    }

    // ========================================================================
    // Test 6: ScenarioDetailDto omits events field when null
    // ========================================================================

    @Test
    void scenarioDetailDto_omitsEventsFieldWhenNull() throws Exception {
        UUID scenarioId = UUID.fromString("bb000002-0002-4002-8002-000000000002");

        ScenarioDetailDto dto = new ScenarioDetailDto(
                scenarioId,
                "Test Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                null,
                null,
                null,  // events is null
                null,
                null
        );

        String json = objectMapper.writeValueAsString(dto);

        assertFalse(json.contains("\"events\""),
                "JSON should NOT contain 'events' field when null (omitted by @JsonInclude(NON_NULL))");

        // Base fields should still be present
        assertTrue(json.contains("\"id\""), "JSON should contain 'id' field");
        assertTrue(json.contains("\"name\""), "JSON should contain 'name' field");
        assertTrue(json.contains("\"scenarioTypeCode\""), "JSON should contain 'scenarioTypeCode' field");
        assertTrue(json.contains("\"ownerDisplayName\""), "JSON should contain 'ownerDisplayName' field");
        assertTrue(json.contains("\"createdAt\""), "JSON should contain 'createdAt' field");
        assertTrue(json.contains("\"updatedAt\""), "JSON should contain 'updatedAt' field");

        // Other optional sections should also be absent
        assertFalse(json.contains("\"header\""),
                "JSON should NOT contain 'header' field when null");
        assertFalse(json.contains("\"summaryCards\""),
                "JSON should NOT contain 'summaryCards' field when null");
        assertFalse(json.contains("\"reviewApproval\""),
                "JSON should NOT contain 'reviewApproval' field when null");
        assertFalse(json.contains("\"directChanges\""),
                "JSON should NOT contain 'directChanges' field when null");
        assertFalse(json.contains("\"impactData\""),
                "JSON should NOT contain 'impactData' field when null");

        var tree = objectMapper.readTree(json);
        assertEquals(6, tree.size(),
                "ScenarioDetailDto should have only 6 base fields when all optional fields are null");
    }
}
