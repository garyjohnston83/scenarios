package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.ScenarioDetailDto;
import com.prototypes.scenarios.dto.ScenarioHeaderDto;
import com.prototypes.scenarios.entity.ScenarioEvent;
import com.prototypes.scenarios.entity.UserRef;
import com.prototypes.scenarios.repository.ScenarioEventRepository;
import com.prototypes.scenarios.repository.UserRefRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Integration tests for Increment 10 service-layer behavior (Task Group 3).
 * Uses @SpringBootTest with H2 so that all Liquibase seed data is available.
 * Uses @Transactional to keep the Hibernate session open during each test.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment10ServiceTest {

    @Autowired
    private ScenarioDetailService scenarioDetailService;

    @Autowired
    private UserRefRepository userRefRepository;

    @Autowired
    private ScenarioEventRepository scenarioEventRepository;

    // FX Curve Recalibration -- MARKET_DATA type, owner Alice Johnson
    private static final UUID FX_CURVE_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // IR Vol Surface Update -- has events, DRAFT state initially but seeded as SIGNOFF_IN_PROGRESS
    private static final UUID IR_VOL_SCENARIO_ID = UUID.fromString("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");

    // ========================================================================
    // Test 1: toDetailDto() populates scenarioType block in header
    // ========================================================================

    @Test
    void toDetailDto_populatesScenarioTypeBlockInHeader() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                FX_CURVE_SCENARIO_ID, Set.of("header"));

        assertNotNull(result.isPresent());
        ScenarioDetailDto dto = result.get();
        ScenarioHeaderDto header = dto.header();
        assertNotNull(header, "Header should be populated when expand=header");
        assertNotNull(header.scenarioType(), "scenarioType should be populated in header");
        assertEquals("MARKET_DATA", header.scenarioType().code());
        assertEquals("Market Data", header.scenarioType().name());
        assertEquals("ChartMultiple", header.scenarioType().icon());
        assertEquals("EXTERNAL", header.scenarioType().directChangesMode());
        assertEquals("EXTERNAL", header.scenarioType().impactDataMode());
    }

    // ========================================================================
    // Test 2: resolveActorDisplayName("approver-1") returns "Jane Smith"
    // ========================================================================

    @Test
    void resolveActorDisplayName_withKnownActorId_returnsDisplayNameFromUserRef() {
        String displayName = scenarioDetailService.resolveActorDisplayName("approver-1");
        assertEquals("Jane Smith", displayName);
    }

    // ========================================================================
    // Test 3: resolveActorDisplayName(null) falls back to "Current User"
    // ========================================================================

    @Test
    void resolveActorDisplayName_withNullActorId_fallsBackToCurrentUser() {
        String displayName = scenarioDetailService.resolveActorDisplayName(null);
        assertEquals("Current User", displayName);
    }

    // ========================================================================
    // Test 6: System event handler sets actorUser to "system" UserRef
    // ========================================================================

    @Test
    void systemEventHandler_setsActorUserToSystemUserRef() {
        // The IR Vol Surface Update scenario is in IMPACT_AVAILABLE state (seeded)
        // We need a scenario in a state that allows IMPACT_INVALIDATED.
        // IR Vol Surface Update is in SIGNOFF_IN_PROGRESS, which is valid for IMPACT_INVALIDATED.

        int eventCountBefore = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(IR_VOL_SCENARIO_ID).size();

        // Post an IMPACT_INVALIDATED system event
        var request = new com.prototypes.scenarios.dto.PostEventRequestDto(
                "IMPACT_INVALIDATED", null, null, null);
        scenarioDetailService.processEvent(IR_VOL_SCENARIO_ID, request, "System", null);

        List<ScenarioEvent> events = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(IR_VOL_SCENARIO_ID);

        // Find the newly created IMPACT_INVALIDATED event
        ScenarioEvent newEvent = events.stream()
                .filter(e -> "IMPACT_INVALIDATED".equals(e.getEventType()))
                .findFirst()
                .orElse(null);

        assertNotNull(newEvent, "Should have created an IMPACT_INVALIDATED event");
        assertEquals("System", newEvent.getActorDisplayName());
        UserRef actorUser = newEvent.getActorUser();
        assertNotNull(actorUser, "actorUser should be set to system UserRef");
        assertEquals("system", actorUser.getId());
        assertEquals("System", actorUser.getDisplayName());
    }
}
