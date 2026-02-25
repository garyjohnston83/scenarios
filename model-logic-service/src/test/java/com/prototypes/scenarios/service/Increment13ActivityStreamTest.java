package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.ActivityRowDto;
import com.prototypes.scenarios.dto.ActivityStreamDto;
import com.prototypes.scenarios.dto.MessageDto;
import com.prototypes.scenarios.dto.PostEventRequestDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import com.prototypes.scenarios.entity.ScenarioEvent;
import com.prototypes.scenarios.repository.ScenarioEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for Increment 13 Task Group 3: buildActivityStream,
 * postMessage event creation, and status transition capture.
 *
 * Uses the full Spring context with H2 in PostgreSQL compatibility mode
 * so that all Liquibase changesets and seed data are available.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment13ActivityStreamTest {

    @Autowired
    private ScenarioDetailService scenarioDetailService;

    @Autowired
    private ScenarioEventRepository scenarioEventRepository;

    @Autowired
    private ObjectMapper objectMapper;

    // IR Vol Surface Update -- SIGNOFF_IN_PROGRESS state, has 5 seed events (2 MESSAGE_POSTED with relatedMessage,
    // 1 SCENARIO_CREATED, 1 IMPACT_COMPLETED, 1 SIGNOFF_COMMENCED) and a signoff_case
    private static final UUID IR_VOL_SCENARIO_ID = UUID.fromString("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");

    // FX Curve Recalibration -- IMPACT_AVAILABLE state, no events, no signoff_case
    private static final UUID FX_CURVE_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // Credit Spread Adjustment -- SIGNED_OFF state, has 4 seed events, has a COMPLETED signoff_case
    private static final UUID CREDIT_SPREAD_SCENARIO_ID = UUID.fromString("c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f");

    // ========================================================================
    // Test 1: buildActivityStream returns rows in chronological ASC with
    //         correct bucketType classification
    // ========================================================================

    @Test
    void buildActivityStream_returnsRowsInChronologicalAscWithCorrectBucketType() {
        Optional<ScenarioDetailDto> detailOpt = scenarioDetailService.getScenarioDetail(
                IR_VOL_SCENARIO_ID, Set.of("events"));

        assertTrue(detailOpt.isPresent(), "Scenario detail should be present");
        ScenarioDetailDto detail = detailOpt.get();
        assertNotNull(detail.events(), "events should be populated when expand=events");

        List<ActivityRowDto> rows = detail.events().rows();
        assertNotNull(rows, "rows should not be null");
        assertTrue(rows.size() >= 5, "IR Vol Surface Update should have at least 5 seed events");

        // Verify chronological ascending order
        for (int i = 1; i < rows.size(); i++) {
            assertTrue(rows.get(i).occurredAt().compareTo(rows.get(i - 1).occurredAt()) >= 0,
                    "Rows should be in chronological ascending order: row " + i +
                    " (" + rows.get(i).occurredAt() + ") should be >= row " + (i - 1) +
                    " (" + rows.get(i - 1).occurredAt() + ")");
        }

        // Verify bucketType classification:
        // SCENARIO_CREATED by Bob Smith (owner-3, non-system user) -> USER
        ActivityRowDto createdEvent = rows.stream()
                .filter(r -> "Scenario created".equals(r.details()) || "USER".equals(r.bucketType()))
                .filter(r -> "Bob Smith".equals(r.authorDisplayName()))
                .findFirst().orElse(null);
        assertNotNull(createdEvent, "Should find the SCENARIO_CREATED event by Bob Smith");
        assertEquals("USER", createdEvent.bucketType(), "SCENARIO_CREATED by a non-system user should be USER");

        // IMPACT_COMPLETED by System -> SYSTEM
        ActivityRowDto impactEvent = rows.stream()
                .filter(r -> "SYSTEM".equals(r.bucketType()))
                .findFirst().orElse(null);
        assertNotNull(impactEvent, "Should find a SYSTEM bucket event (IMPACT_COMPLETED by System)");
        assertEquals("SYSTEM", impactEvent.bucketType());

        // MESSAGE_POSTED -> MESSAGE
        List<ActivityRowDto> messageRows = rows.stream()
                .filter(r -> "MESSAGE".equals(r.bucketType()))
                .toList();
        assertTrue(messageRows.size() >= 2,
                "Should have at least 2 MESSAGE bucket rows from seed MESSAGE_POSTED events");
    }

    // ========================================================================
    // Test 2: buildActivityStream populates details with message text for
    //         MESSAGE_POSTED and EVENT_LABELS for others
    // ========================================================================

    @Test
    void buildActivityStream_populatesDetailsWithMessageTextOrEventLabel() {
        Optional<ScenarioDetailDto> detailOpt = scenarioDetailService.getScenarioDetail(
                IR_VOL_SCENARIO_ID, Set.of("events"));

        assertTrue(detailOpt.isPresent());
        List<ActivityRowDto> rows = detailOpt.get().events().rows();

        // MESSAGE_POSTED events should have the actual message text from relatedMessage
        // Jane Smith's message (b1b2c3d4-...) has text starting with "I have reviewed"
        ActivityRowDto janeMessageRow = rows.stream()
                .filter(r -> "MESSAGE".equals(r.bucketType()) && "Jane Smith".equals(r.authorDisplayName()))
                .findFirst().orElse(null);
        assertNotNull(janeMessageRow, "Should find Jane Smith's MESSAGE_POSTED row");
        assertTrue(janeMessageRow.details().contains("I have reviewed"),
                "MESSAGE_POSTED details should contain the actual message text, got: " + janeMessageRow.details());

        // IMPACT_COMPLETED event should use EVENT_LABELS label
        ActivityRowDto impactRow = rows.stream()
                .filter(r -> "SYSTEM".equals(r.bucketType()) && "System".equals(r.authorDisplayName()))
                .findFirst().orElse(null);
        assertNotNull(impactRow, "Should find the IMPACT_COMPLETED system event row");
        assertEquals("Impact assessment completed", impactRow.details(),
                "Non-message events should use EVENT_LABELS label");

        // SIGNOFF_COMMENCED event should use EVENT_LABELS label
        ActivityRowDto signoffRow = rows.stream()
                .filter(r -> "Sign-off commenced".equals(r.details()))
                .findFirst().orElse(null);
        assertNotNull(signoffRow, "Should find the SIGNOFF_COMMENCED event with EVENT_LABELS label");
    }

    // ========================================================================
    // Test 3: buildActivityStream populates statusTransition from payloadJson
    //         and returns null when no payload
    // ========================================================================

    @Test
    void buildActivityStream_populatesStatusTransitionFromPayloadJsonOrNull() {
        Optional<ScenarioDetailDto> detailOpt = scenarioDetailService.getScenarioDetail(
                IR_VOL_SCENARIO_ID, Set.of("events"));

        assertTrue(detailOpt.isPresent());
        List<ActivityRowDto> rows = detailOpt.get().events().rows();

        // IMPACT_COMPLETED seed event has payloadJson: {"oldState":"DRAFT","newState":"IMPACT_AVAILABLE"}
        // -> should produce "Draft -> Impact Available"
        ActivityRowDto impactRow = rows.stream()
                .filter(r -> "Impact assessment completed".equals(r.details()))
                .findFirst().orElse(null);
        assertNotNull(impactRow, "Should find the IMPACT_COMPLETED event");
        assertNotNull(impactRow.statusTransition(), "IMPACT_COMPLETED should have a statusTransition");
        assertEquals("Draft -> Impact Available", impactRow.statusTransition(),
                "statusTransition should use human-readable WORKFLOW_STATE_LABELS");

        // SIGNOFF_COMMENCED seed event has payloadJson: {"oldState":"IMPACT_AVAILABLE","newState":"SIGNOFF_IN_PROGRESS"}
        ActivityRowDto signoffRow = rows.stream()
                .filter(r -> "Sign-off commenced".equals(r.details()))
                .findFirst().orElse(null);
        assertNotNull(signoffRow, "Should find the SIGNOFF_COMMENCED event");
        assertEquals("Impact Available -> Sign-off In Progress", signoffRow.statusTransition(),
                "SIGNOFF_COMMENCED should show correct state transition");

        // MESSAGE_POSTED events have no payloadJson -> statusTransition should be null
        ActivityRowDto messageRow = rows.stream()
                .filter(r -> "MESSAGE".equals(r.bucketType()))
                .findFirst().orElse(null);
        assertNotNull(messageRow, "Should find a MESSAGE row");
        assertNull(messageRow.statusTransition(),
                "MESSAGE_POSTED events should have null statusTransition (no state change)");
    }

    // ========================================================================
    // Test 4: postMessage creates both a ScenarioMessage and a ScenarioEvent
    //         with eventType=MESSAGE_POSTED and correct relatedMessage FK
    // ========================================================================

    @Test
    void postMessage_createsBothMessageAndMessagePostedEvent() {
        // Count events before posting
        List<ScenarioEvent> eventsBefore = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(FX_CURVE_SCENARIO_ID);
        int eventCountBefore = eventsBefore.size();

        // Post a message
        MessageDto postedMessage = scenarioDetailService.postMessage(
                FX_CURVE_SCENARIO_ID, "Test message for activity stream", "approver-1");

        assertNotNull(postedMessage, "postMessage should return a MessageDto");
        assertNotNull(postedMessage.id(), "Posted message should have an ID");
        assertEquals("Test message for activity stream", postedMessage.text());

        // Verify a MESSAGE_POSTED event was created
        List<ScenarioEvent> eventsAfter = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(FX_CURVE_SCENARIO_ID);
        assertEquals(eventCountBefore + 1, eventsAfter.size(),
                "Should have exactly one more event after postMessage");

        ScenarioEvent messageEvent = eventsAfter.stream()
                .filter(e -> "MESSAGE_POSTED".equals(e.getEventType()))
                .findFirst().orElse(null);
        assertNotNull(messageEvent, "Should find a MESSAGE_POSTED event after postMessage");
        assertEquals("Jane Smith", messageEvent.getActorDisplayName(),
                "Actor display name should match resolved approver-1");
        assertNotNull(messageEvent.getRelatedMessage(),
                "MESSAGE_POSTED event should have relatedMessage FK set");
        assertEquals(postedMessage.id(), messageEvent.getRelatedMessage().getId(),
                "relatedMessage should reference the saved ScenarioMessage");
        assertEquals(postedMessage.createdAt(), messageEvent.getCreatedAt(),
                "MESSAGE_POSTED event should have same timestamp as the message");
    }

    // ========================================================================
    // Test 5: handleSignoff stores {"oldState":"<old>","newState":"<new>"} in
    //         payloadJson when creating a ScenarioEvent
    // ========================================================================

    @Test
    void handleSignoff_storesOldStateNewStateInPayloadJson() throws Exception {
        // FX Curve is IMPACT_AVAILABLE, first SIGNOFF transitions to SIGNOFF_IN_PROGRESS
        PostEventRequestDto signoffRequest = new PostEventRequestDto("SIGNOFF", null, null, null);
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, signoffRequest, null, "approver-1");

        // Find the SIGNOFF_STARTED event
        List<ScenarioEvent> events = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(FX_CURVE_SCENARIO_ID);
        ScenarioEvent signoffEvent = events.stream()
                .filter(e -> "SIGNOFF_STARTED".equals(e.getEventType()))
                .findFirst().orElse(null);
        assertNotNull(signoffEvent, "Should find a SIGNOFF_STARTED event");
        assertNotNull(signoffEvent.getPayloadJson(), "payloadJson should not be null");

        // Parse and verify the payload
        Map<String, String> payload = objectMapper.readValue(
                signoffEvent.getPayloadJson(), new TypeReference<Map<String, String>>() {});
        assertEquals("IMPACT_AVAILABLE", payload.get("oldState"),
                "oldState should be the state before the transition");
        assertEquals("SIGNOFF_IN_PROGRESS", payload.get("newState"),
                "newState should be the state after the transition");
    }

    // ========================================================================
    // Test 6: toDetailDto with expand=events returns a non-null
    //         ActivityStreamDto with approvalsReceived/approvalsRequired
    // ========================================================================

    @Test
    void toDetailDto_expandEvents_returnsActivityStreamDtoWithApprovalProgress() {
        // IR Vol Surface Update has a signoff_case (IN_PROGRESS, from seed data)
        Optional<ScenarioDetailDto> detailOpt = scenarioDetailService.getScenarioDetail(
                IR_VOL_SCENARIO_ID, Set.of("events"));

        assertTrue(detailOpt.isPresent());
        ScenarioDetailDto detail = detailOpt.get();
        assertNotNull(detail.events(), "events should be populated when expand=events");

        ActivityStreamDto activityStream = detail.events();
        assertNotNull(activityStream.rows(), "rows should not be null");

        // IR Vol Surface Update has a seed signoff_case
        assertNotNull(activityStream.approvalsReceived(),
                "approvalsReceived should be non-null when a SignoffCase exists");
        assertNotNull(activityStream.approvalsRequired(),
                "approvalsRequired should be non-null when a SignoffCase exists");

        // Verify a scenario without a signoff_case returns null approvals
        Optional<ScenarioDetailDto> fxDetailOpt = scenarioDetailService.getScenarioDetail(
                FX_CURVE_SCENARIO_ID, Set.of("events"));
        assertTrue(fxDetailOpt.isPresent());
        ActivityStreamDto fxStream = fxDetailOpt.get().events();
        assertNotNull(fxStream, "FX Curve events should be populated");
        assertNull(fxStream.approvalsReceived(),
                "approvalsReceived should be null when no SignoffCase exists");
        assertNull(fxStream.approvalsRequired(),
                "approvalsRequired should be null when no SignoffCase exists");
    }
}
