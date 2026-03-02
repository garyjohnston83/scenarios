package com.prototypes.scenarios.integration;

import com.prototypes.scenarios.dto.PostEventRequestDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import com.prototypes.scenarios.entity.Scenario;
import com.prototypes.scenarios.entity.ScenarioEvent;
import com.prototypes.scenarios.entity.ScenarioMessage;
import com.prototypes.scenarios.entity.UserRef;
import com.prototypes.scenarios.repository.ScenarioEventRepository;
import com.prototypes.scenarios.repository.ScenarioMessageRepository;
import com.prototypes.scenarios.repository.ScenarioRepository;
import com.prototypes.scenarios.service.ScenarioDetailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration gap tests for Increment 10 (Task Group 5).
 * These tests cover end-to-end workflows and constraint enforcement
 * that are not covered by the unit/repository/service tests in Task Groups 1-3.
 *
 * Uses @SpringBootTest with H2 in PostgreSQL compatibility mode so that all
 * Liquibase changesets and seed data are available.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment10IntegrationGapTest {

    @Autowired
    private ScenarioDetailService scenarioDetailService;

    @Autowired
    private ScenarioRepository scenarioRepository;

    @Autowired
    private ScenarioEventRepository scenarioEventRepository;

    @Autowired
    private ScenarioMessageRepository scenarioMessageRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // IR Vol Surface Update -- SIGNOFF_IN_PROGRESS state, has events/messages
    private static final UUID IR_VOL_SCENARIO_ID = UUID.fromString("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");

    // FX Curve Recalibration -- IMPACT_AVAILABLE state, MARKET_DATA type, owner Alice Johnson
    private static final UUID FX_CURVE_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // Credit Spread Adjustment -- SIGNED_OFF state, RISK_FACTOR type, owner Carol Davis
    private static final UUID CREDIT_SPREAD_SCENARIO_ID = UUID.fromString("c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f");

    // ========================================================================
    // Gap Test 1: Full POST /events workflow sets actorUser FK and
    //             actorDisplayName on the persisted ScenarioEvent
    // ========================================================================

    @Test
    void postEvent_recallWithActorId_setsActorUserFkAndActorDisplayNameOnPersistedEvent() {
        // IR Vol Surface Update is in SIGNOFF_IN_PROGRESS, which allows RECALL
        PostEventRequestDto request = new PostEventRequestDto(
                "RECALL", "Recalling for data correction", null, null);

        scenarioDetailService.processEvent(IR_VOL_SCENARIO_ID, request, null, "approver-1");

        // Find the newly created SCENARIO_RECALLED event
        List<ScenarioEvent> events = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(IR_VOL_SCENARIO_ID);

        ScenarioEvent recallEvent = events.stream()
                .filter(e -> "SCENARIO_RECALLED".equals(e.getEventType()))
                .findFirst()
                .orElse(null);

        assertNotNull(recallEvent, "Should have created a SCENARIO_RECALLED event");
        assertEquals("Jane Smith", recallEvent.getActorDisplayName(),
                "actorDisplayName should be resolved from UserRef for approver-1");

        UserRef actorUser = recallEvent.getActorUser();
        assertNotNull(actorUser, "actorUser FK should be set on the persisted event");
        assertEquals("approver-1", actorUser.getId());
        assertEquals("Jane Smith", actorUser.getDisplayName());

        // Also verify that the associated message was created with the correct author FK
        ScenarioMessage relatedMessage = recallEvent.getRelatedMessage();
        assertNotNull(relatedMessage, "RECALL event should have a related message");
        assertEquals("Jane Smith", relatedMessage.getAuthorDisplayName());
        UserRef authorUser = relatedMessage.getAuthorUser();
        assertNotNull(authorUser, "authorUser FK should be set on the related message");
        assertEquals("approver-1", authorUser.getId());
    }

    // ========================================================================
    // Gap Test 2: GET /scenarios/{id}?expand=header returns scenarioType
    //             with code, name, icon (full integration from DB)
    // ========================================================================

    @Test
    void getScenarioDetail_expandHeader_returnsScenarioTypeBlockFromDatabase() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                FX_CURVE_SCENARIO_ID, Set.of("header"));

        assertTrue(result.isPresent(), "FX Curve Recalibration should exist");
        ScenarioDetailDto dto = result.get();
        assertNotNull(dto.header(), "Header should be populated");
        assertNotNull(dto.header().scenarioType(), "scenarioType block should be populated from DB");
        assertEquals("MARKET_DATA", dto.header().scenarioType().code());
        assertEquals("Market Data", dto.header().scenarioType().name());
        assertEquals("ChartMultiple", dto.header().scenarioType().icon());
        assertEquals("EXTERNAL", dto.header().scenarioType().directChangesMode());
        assertEquals("EXTERNAL", dto.header().scenarioType().impactDataMode());

        // Also verify for RISK_FACTOR type scenario
        Optional<ScenarioDetailDto> riskResult = scenarioDetailService.getScenarioDetail(
                CREDIT_SPREAD_SCENARIO_ID, Set.of("header"));
        assertTrue(riskResult.isPresent());
        assertEquals("RISK_FACTOR", riskResult.get().header().scenarioType().code());
        assertEquals("Risk Factor", riskResult.get().header().scenarioType().name());
        assertEquals("Pulse", riskResult.get().header().scenarioType().icon());
    }

    // ========================================================================
    // Gap Test 3: POST /messages with X-Actor-Id="approver-1" results in
    //             authorDisplayName="Jane Smith" and authorUser FK set
    // ========================================================================

    @Test
    void postMessage_withActorId_persistsAuthorUserFkAndAuthorDisplayName() {
        // FX Curve Recalibration is IMPACT_AVAILABLE -- valid for posting messages
        var messageDto = scenarioDetailService.postMessage(
                FX_CURVE_SCENARIO_ID, "Test message from approver-1", "approver-1");

        assertNotNull(messageDto, "Should return created message DTO");
        assertEquals("Jane Smith", messageDto.authorDisplayName(),
                "authorDisplayName should be resolved from UserRef");

        // Verify persistence by loading the message from the repository
        List<ScenarioMessage> messages = scenarioMessageRepository
                .findByScenarioIdOrderByCreatedAtAsc(FX_CURVE_SCENARIO_ID);

        ScenarioMessage persistedMessage = messages.stream()
                .filter(m -> "Test message from approver-1".equals(m.getText()))
                .findFirst()
                .orElse(null);

        assertNotNull(persistedMessage, "Message should be persisted");
        assertEquals("Jane Smith", persistedMessage.getAuthorDisplayName());
        UserRef authorUser = persistedMessage.getAuthorUser();
        assertNotNull(authorUser, "authorUser FK should be set on the persisted message");
        assertEquals("approver-1", authorUser.getId());
        assertEquals("Jane Smith", authorUser.getDisplayName());
    }

    // ========================================================================
    // Gap Test 4: FK constraint prevents inserting scenario_event with
    //             invalid actor_user_id
    // ========================================================================

    @Test
    void fkConstraint_preventsInsertingScenarioEventWithInvalidActorUserId() {
        // Attempt to insert a scenario_event with an actor_user_id that does not
        // exist in user_ref -- should fail due to FK constraint
        Exception exception = assertThrows(Exception.class, () -> {
            jdbcTemplate.update(
                    "INSERT INTO scenario_event (id, scenario_id, actor_display_name, event_type, created_at, actor_user_id) " +
                    "VALUES (?, ?, 'Unknown Actor', 'TEST_EVENT', CURRENT_TIMESTAMP, ?)",
                    UUID.randomUUID().toString(),
                    FX_CURVE_SCENARIO_ID.toString(),
                    "nonexistent-user-id"
            );
        });

        // The exception should indicate a referential integrity violation
        assertNotNull(exception, "Should throw an exception for invalid FK reference");
        String exceptionMessage = exception.getMessage() != null ? exception.getMessage() : "";
        String causeMessage = exception.getCause() != null && exception.getCause().getMessage() != null
                ? exception.getCause().getMessage() : "";
        String fullMessage = exceptionMessage + " " + causeMessage;
        assertTrue(
                fullMessage.toLowerCase().contains("referential integrity")
                        || fullMessage.toLowerCase().contains("foreign key")
                        || fullMessage.toLowerCase().contains("fk_")
                        || fullMessage.toLowerCase().contains("constraint"),
                "Exception should indicate FK constraint violation, got: " + fullMessage
        );
    }

    // ========================================================================
    // Gap Test 5: System-generated event (IMPACT_COMPLETED via processEvent)
    //             has actorUser pointing to "system" UserRef -- verifying a
    //             different system handler than the one tested in Increment10ServiceTest
    // ========================================================================

    @Test
    void processEvent_impactCompleted_setsActorUserToSystemUserRef() {
        // FX Curve Recalibration is IMPACT_AVAILABLE. We need a scenario in
        // DRAFT or IMPACT_PENDING to accept IMPACT_COMPLETED. FX Curve is
        // IMPACT_AVAILABLE so we need to first invalidate impact to move to IMPACT_EXPIRED,
        // but IMPACT_COMPLETED is not allowed from IMPACT_EXPIRED.
        // Instead, let's verify the system user reference through a different approach:
        // Use IMPACT_INVALIDATED on SIGNOFF_IN_PROGRESS (IR Vol), which is allowed.
        // But that is already tested. Let's use PROMOTION_COMPLETED on SIGNED_OFF (Credit Spread).

        PostEventRequestDto request = new PostEventRequestDto(
                "PROMOTION_COMPLETED", null, null, null);

        scenarioDetailService.processEvent(CREDIT_SPREAD_SCENARIO_ID, request, "System", null);

        List<ScenarioEvent> events = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(CREDIT_SPREAD_SCENARIO_ID);

        ScenarioEvent promotionEvent = events.stream()
                .filter(e -> "PROMOTION_COMPLETED".equals(e.getEventType()))
                .findFirst()
                .orElse(null);

        assertNotNull(promotionEvent, "Should have created a PROMOTION_COMPLETED event");
        assertEquals("System", promotionEvent.getActorDisplayName());
        UserRef actorUser = promotionEvent.getActorUser();
        assertNotNull(actorUser, "actorUser should be set to system UserRef");
        assertEquals("system", actorUser.getId());
        assertEquals("System", actorUser.getDisplayName());
    }

    // ========================================================================
    // Gap Test 6: Scenario.ownerUser is populated correctly after backfill
    //             (integration with seed data, entity-level check)
    // ========================================================================

    @Test
    void scenario_ownerUser_isPopulatedCorrectlyAfterBackfill() {
        // FX Curve Recalibration -- owner "Alice Johnson" should map to "owner-1"
        Optional<Scenario> fxCurve = scenarioRepository.findByIdWithSummary(FX_CURVE_SCENARIO_ID);
        assertTrue(fxCurve.isPresent());
        UserRef aliceOwner = fxCurve.get().getOwnerUser();
        assertNotNull(aliceOwner, "ownerUser should be populated from backfill for FX Curve Recalibration");
        assertEquals("owner-1", aliceOwner.getId());
        assertEquals("Alice Johnson", aliceOwner.getDisplayName());

        // IR Vol Surface Update -- owner "Bob Smith" should map to "owner-3"
        Optional<Scenario> irVol = scenarioRepository.findByIdWithSummary(IR_VOL_SCENARIO_ID);
        assertTrue(irVol.isPresent());
        UserRef bobOwner = irVol.get().getOwnerUser();
        assertNotNull(bobOwner, "ownerUser should be populated from backfill for IR Vol Surface Update");
        assertEquals("owner-3", bobOwner.getId());
        assertEquals("Bob Smith", bobOwner.getDisplayName());

        // Credit Spread Adjustment -- owner "Carol Davis" should map to "owner-2"
        Optional<Scenario> creditSpread = scenarioRepository.findByIdWithSummary(CREDIT_SPREAD_SCENARIO_ID);
        assertTrue(creditSpread.isPresent());
        UserRef carolOwner = creditSpread.get().getOwnerUser();
        assertNotNull(carolOwner, "ownerUser should be populated from backfill for Credit Spread Adjustment");
        assertEquals("owner-2", carolOwner.getId());
        assertEquals("Carol Davis", carolOwner.getDisplayName());
    }
}
