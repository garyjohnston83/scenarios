package com.prototypes.scenarios.entity;

import com.prototypes.scenarios.repository.ScenarioEventRepository;
import com.prototypes.scenarios.repository.ScenarioMessageRepository;
import com.prototypes.scenarios.repository.ScenarioRepository;
import com.prototypes.scenarios.repository.ScenarioTypeRepository;
import com.prototypes.scenarios.repository.UserRefRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for Increment 10 JPA entity and repository layer (Task Group 2).
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode so that
 * all Liquibase changesets are applied and seed data is available, then verifies
 * entity mappings and repository functionality.
 *
 * Uses @Transactional to keep the Hibernate session open during each test method,
 * allowing lazy-loaded relationships (actorUser, authorUser) to be accessed.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment10EntityRepositoryTest {

    @Autowired
    private ScenarioTypeRepository scenarioTypeRepository;

    @Autowired
    private UserRefRepository userRefRepository;

    @Autowired
    private ScenarioRepository scenarioRepository;

    @Autowired
    private ScenarioEventRepository scenarioEventRepository;

    @Autowired
    private ScenarioMessageRepository scenarioMessageRepository;

    // IR Vol Surface Update has events and messages seeded in changeset 009
    private static final UUID IR_VOL_SCENARIO_ID = UUID.fromString("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");

    // FX Curve Recalibration has no events/messages but is MARKET_DATA type
    private static final UUID FX_CURVE_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // ========================================================================
    // Test 1: ScenarioType entity can be fetched by code PK ("MARKET_DATA")
    //         with correct field values
    // ========================================================================

    @Test
    void scenarioType_fetchByCodePk_returnsCorrectFieldValues() {
        Optional<ScenarioType> result = scenarioTypeRepository.findById("MARKET_DATA");

        assertTrue(result.isPresent(), "MARKET_DATA should exist in scenario_type");
        ScenarioType marketData = result.get();
        assertEquals("MARKET_DATA", marketData.getCode());
        assertEquals("Market Data", marketData.getName());
        assertEquals("ChartMultiple", marketData.getIcon());
        assertEquals("LINK_OUT", marketData.getDirectChangesMode());
        assertEquals("LINK_OUT", marketData.getImpactDataMode());
        assertTrue(marketData.isEnabled());
        assertEquals(1, marketData.getSortOrder());
    }

    // ========================================================================
    // Test 2: UserRef entity can be fetched by id PK ("approver-1")
    //         with correct displayName
    // ========================================================================

    @Test
    void userRef_fetchByIdPk_returnsCorrectDisplayName() {
        Optional<UserRef> result = userRefRepository.findById("approver-1");

        assertTrue(result.isPresent(), "approver-1 should exist in user_ref");
        UserRef approver1 = result.get();
        assertEquals("approver-1", approver1.getId());
        assertEquals("Jane Smith", approver1.getDisplayName());
        assertTrue(approver1.isActive());
    }

    // ========================================================================
    // Test 3: Scenario entity's scenarioType ManyToOne relationship is
    //         populated via JOIN FETCH
    // ========================================================================

    @Test
    void scenario_scenarioTypeManyToOne_isPopulatedViaJoinFetch() {
        Optional<Scenario> result = scenarioRepository.findByIdWithSummary(FX_CURVE_SCENARIO_ID);

        assertTrue(result.isPresent(), "FX Curve Recalibration scenario should exist");
        Scenario scenario = result.get();
        ScenarioType scenarioType = scenario.getScenarioType();
        assertNotNull(scenarioType, "scenarioType relationship should be populated via JOIN FETCH");
        assertEquals("MARKET_DATA", scenarioType.getCode());
        assertEquals("Market Data", scenarioType.getName());
        assertEquals("ChartMultiple", scenarioType.getIcon());
        assertEquals("LINK_OUT", scenarioType.getDirectChangesMode());
        assertEquals("LINK_OUT", scenarioType.getImpactDataMode());
    }

    // ========================================================================
    // Test 4: ScenarioEvent entity's actorUser ManyToOne relationship loads
    //         the correct UserRef
    // ========================================================================

    @Test
    void scenarioEvent_actorUserManyToOne_loadsCorrectUserRef() {
        // IR Vol Surface Update has events seeded by Jane Smith, John Doe, etc.
        List<ScenarioEvent> events = scenarioEventRepository.findByScenarioIdOrderByCreatedAtAsc(IR_VOL_SCENARIO_ID);

        assertTrue(events.size() > 0, "Should have events for IR Vol Surface Update");

        // Find an event with a known actor (Jane Smith = approver-1)
        Optional<ScenarioEvent> janeEvent = events.stream()
                .filter(e -> "Jane Smith".equals(e.getActorDisplayName()))
                .findFirst();

        assertTrue(janeEvent.isPresent(), "Should have at least one event by Jane Smith");
        UserRef actorUser = janeEvent.get().getActorUser();
        assertNotNull(actorUser, "actorUser relationship should be populated from backfill");
        assertEquals("approver-1", actorUser.getId());
        assertEquals("Jane Smith", actorUser.getDisplayName());
    }

    // ========================================================================
    // Test 5: ScenarioMessage entity's authorUser ManyToOne relationship
    //         loads the correct UserRef
    // ========================================================================

    @Test
    void scenarioMessage_authorUserManyToOne_loadsCorrectUserRef() {
        // IR Vol Surface Update has messages seeded by Jane Smith and John Doe
        List<ScenarioMessage> messages = scenarioMessageRepository.findByScenarioIdOrderByCreatedAtAsc(IR_VOL_SCENARIO_ID);

        assertTrue(messages.size() > 0, "Should have messages for IR Vol Surface Update");

        // Find a message by Jane Smith (approver-1)
        Optional<ScenarioMessage> janeMessage = messages.stream()
                .filter(m -> "Jane Smith".equals(m.getAuthorDisplayName()))
                .findFirst();

        assertTrue(janeMessage.isPresent(), "Should have at least one message by Jane Smith");
        UserRef authorUser = janeMessage.get().getAuthorUser();
        assertNotNull(authorUser, "authorUser relationship should be populated from backfill");
        assertEquals("approver-1", authorUser.getId());
        assertEquals("Jane Smith", authorUser.getDisplayName());
    }
}
