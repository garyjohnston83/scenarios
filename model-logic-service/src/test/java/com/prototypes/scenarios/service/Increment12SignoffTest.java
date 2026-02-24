package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.PostEventRequestDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import com.prototypes.scenarios.entity.ScenarioEvent;
import com.prototypes.scenarios.entity.SignoffApproval;
import com.prototypes.scenarios.entity.SignoffCase;
import com.prototypes.scenarios.entity.SignoffPolicy;
import com.prototypes.scenarios.repository.ScenarioEventRepository;
import com.prototypes.scenarios.repository.SignoffApprovalRepository;
import com.prototypes.scenarios.repository.SignoffCaseRepository;
import com.prototypes.scenarios.repository.SignoffPolicyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for the refactored handleSignoff method in ScenarioDetailService
 * (Increment 12, Task Group 3). Boots the full Spring context with H2 in PostgreSQL
 * compatibility mode so that all Liquibase changesets and seed data are available.
 *
 * Uses @Transactional to keep the Hibernate session open during each test method
 * and to roll back after each test, ensuring test isolation.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment12SignoffTest {

    @Autowired
    private ScenarioDetailService scenarioDetailService;

    @Autowired
    private SignoffCaseRepository signoffCaseRepository;

    @Autowired
    private SignoffPolicyRepository signoffPolicyRepository;

    @Autowired
    private SignoffApprovalRepository signoffApprovalRepository;

    @Autowired
    private ScenarioEventRepository scenarioEventRepository;

    // FX Curve Recalibration -- MARKET_DATA type, IMPACT_AVAILABLE state, no existing signoff_case
    private static final UUID FX_CURVE_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // SA Capital Recalculation -- FRTB_SA type, IMPACT_AVAILABLE state, no existing signoff_case
    private static final UUID SA_SCENARIO_ID = UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");

    // Seed policy UUIDs from changeset 022
    private static final UUID MARKET_DATA_POLICY_ID = UUID.fromString("11111111-1111-4111-8111-111111111101");

    // ========================================================================
    // Test 1: First SIGNOFF selects correct policy (lowest priority, newest
    //         updated_at tie-break), creates SignoffCase with snapshotted
    //         requiredApprovals and policyId
    // ========================================================================

    @Test
    void firstSignoff_selectsCorrectPolicy_createsSignoffCaseWithSnapshotAndPolicyId() {
        // The seed data has one enabled MARKET_DATA policy with priority=1, requiredApproverCount=2
        // Post a SIGNOFF event as approver-1
        PostEventRequestDto request = new PostEventRequestDto("SIGNOFF", null, null, null);
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-1");

        // Verify SignoffCase was created with policy snapshot
        Optional<SignoffCase> caseOpt = signoffCaseRepository.findByScenarioId(FX_CURVE_SCENARIO_ID);
        assertTrue(caseOpt.isPresent(), "SignoffCase should be created on first SIGNOFF");

        SignoffCase signoffCase = caseOpt.get();
        assertEquals(2, signoffCase.getRequiredApprovals(),
                "requiredApprovals should be snapshotted from policy's requiredApproverCount");
        assertEquals(MARKET_DATA_POLICY_ID, signoffCase.getPolicyId(),
                "policyId should be stored from the selected policy");
        assertEquals("IN_PROGRESS", signoffCase.getStatus());
        assertNotNull(signoffCase.getCommencedAt());
        assertEquals(1, signoffCase.getApprovalsReceived(),
                "approvalsReceived should be 1 after first signoff");
    }

    // ========================================================================
    // Test 2: First SIGNOFF with no enabled policy returns 409 Conflict
    // ========================================================================

    @Test
    void firstSignoff_noEnabledPolicy_returns409Conflict() {
        // Disable all FRTB_SA policies
        List<SignoffPolicy> frtbPolicies = signoffPolicyRepository.findAllByScenarioTypeCode("FRTB_SA");
        for (SignoffPolicy policy : frtbPolicies) {
            policy.setEnabled(false);
            signoffPolicyRepository.save(policy);
        }
        signoffPolicyRepository.flush();

        PostEventRequestDto request = new PostEventRequestDto("SIGNOFF", null, null, null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                scenarioDetailService.processEvent(SA_SCENARIO_ID, request, null, "approver-1"));

        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("No enabled signoff policy found for scenario type: FRTB_SA"));
    }

    // ========================================================================
    // Test 3: Subsequent SIGNOFF by same user returns 409 Conflict
    //         ("You have already approved this scenario.")
    // ========================================================================

    @Test
    void subsequentSignoff_sameUser_returns409Conflict() {
        // First SIGNOFF by approver-1
        PostEventRequestDto request = new PostEventRequestDto("SIGNOFF", null, null, null);
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-1");

        // Second SIGNOFF by same approver-1 should fail
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-1"));

        assertEquals(409, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("You have already approved this scenario."));
    }

    // ========================================================================
    // Test 4: Subsequent SIGNOFF by different user increments approvalsReceived
    //         and creates SignoffApproval record
    // ========================================================================

    @Test
    void subsequentSignoff_differentUser_incrementsApprovalsAndCreatesApproval() {
        // First SIGNOFF by approver-1
        PostEventRequestDto request = new PostEventRequestDto("SIGNOFF", null, null, null);
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-1");

        // Verify state after first signoff
        SignoffCase caseAfterFirst = signoffCaseRepository.findByScenarioId(FX_CURVE_SCENARIO_ID).orElseThrow();
        assertEquals(1, caseAfterFirst.getApprovalsReceived());

        // Second SIGNOFF by approver-2 (different user)
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-2");

        // Verify state after second signoff
        SignoffCase caseAfterSecond = signoffCaseRepository.findByScenarioId(FX_CURVE_SCENARIO_ID).orElseThrow();
        assertEquals(2, caseAfterSecond.getApprovalsReceived(),
                "approvalsReceived should be 2 after two different users signed off");

        // Verify both SignoffApproval records exist
        List<SignoffApproval> approvals = signoffApprovalRepository.findAll().stream()
                .filter(a -> a.getSignoffCase().getId().equals(caseAfterSecond.getId()))
                .toList();
        assertEquals(2, approvals.size(), "Should have 2 SignoffApproval records");
    }

    // ========================================================================
    // Test 5: SIGNOFF that reaches requiredApprovals threshold emits
    //         SIGNOFF_COMPLETED, sets status COMPLETED, transitions to SIGNED_OFF
    // ========================================================================

    @Test
    void signoff_reachesThreshold_emitsCompletedAndTransitionsToSignedOff() {
        // Seed policy has requiredApproverCount=2 for MARKET_DATA
        PostEventRequestDto request = new PostEventRequestDto("SIGNOFF", null, null, null);

        // First SIGNOFF (1 of 2)
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-1");

        // Second SIGNOFF (2 of 2) -- should complete
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-2");

        // Verify SignoffCase is COMPLETED
        SignoffCase signoffCase = signoffCaseRepository.findByScenarioId(FX_CURVE_SCENARIO_ID).orElseThrow();
        assertEquals("COMPLETED", signoffCase.getStatus());
        assertNotNull(signoffCase.getCompletedAt(), "completedAt should be set when signoff completes");
        assertEquals(2, signoffCase.getApprovalsReceived());
        assertEquals(2, signoffCase.getRequiredApprovals());

        // Verify workflow state transitioned to SIGNED_OFF
        Optional<ScenarioDetailDto> detailOpt = scenarioDetailService.getScenarioDetail(
                FX_CURVE_SCENARIO_ID, Set.of("header"));
        assertTrue(detailOpt.isPresent());
        assertEquals("SIGNED_OFF", detailOpt.get().header().workflowState());

        // Verify SIGNOFF_COMPLETED event was emitted
        List<ScenarioEvent> events = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(FX_CURVE_SCENARIO_ID);
        ScenarioEvent completedEvent = events.stream()
                .filter(e -> "SIGNOFF_COMPLETED".equals(e.getEventType()))
                .findFirst()
                .orElse(null);
        assertNotNull(completedEvent, "SIGNOFF_COMPLETED event should be emitted");
        assertEquals("John Doe", completedEvent.getActorDisplayName());
    }

    // ========================================================================
    // Test 6: First SIGNOFF emits SIGNOFF_STARTED event and transitions to
    //         SIGNOFF_IN_PROGRESS
    // ========================================================================

    @Test
    void firstSignoff_emitsStartedEventAndTransitionsToSignoffInProgress() {
        PostEventRequestDto request = new PostEventRequestDto("SIGNOFF", null, null, null);
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-1");

        // Verify workflow state transitioned to SIGNOFF_IN_PROGRESS
        Optional<ScenarioDetailDto> detailOpt = scenarioDetailService.getScenarioDetail(
                FX_CURVE_SCENARIO_ID, Set.of("header"));
        assertTrue(detailOpt.isPresent());
        assertEquals("SIGNOFF_IN_PROGRESS", detailOpt.get().header().workflowState());

        // Verify SIGNOFF_STARTED event was emitted
        List<ScenarioEvent> events = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(FX_CURVE_SCENARIO_ID);
        ScenarioEvent startedEvent = events.stream()
                .filter(e -> "SIGNOFF_STARTED".equals(e.getEventType()))
                .findFirst()
                .orElse(null);
        assertNotNull(startedEvent, "SIGNOFF_STARTED event should be emitted on first signoff");
        assertEquals("Jane Smith", startedEvent.getActorDisplayName(),
                "Actor display name should be resolved from user_ref for approver-1");
        assertNotNull(startedEvent.getActorUser(), "actorUser should be set");
        assertEquals("approver-1", startedEvent.getActorUser().getId());
    }
}
