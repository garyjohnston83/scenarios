package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.PostEventRequestDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import com.prototypes.scenarios.entity.SignoffCase;
import com.prototypes.scenarios.entity.SignoffPolicy;
import com.prototypes.scenarios.repository.SignoffCaseRepository;
import com.prototypes.scenarios.repository.SignoffPolicyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Increment 12, Task Group 6: Gap analysis tests that fill coverage holes
 * identified after reviewing Task Groups 1-5.
 *
 * Uses the full Spring context with H2 in PostgreSQL compatibility mode
 * so that all Liquibase changesets and seed data are available.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment12GapTest {

    @Autowired
    private ScenarioDetailService scenarioDetailService;

    @Autowired
    private SignoffCaseRepository signoffCaseRepository;

    @Autowired
    private SignoffPolicyRepository signoffPolicyRepository;

    // FX Curve Recalibration -- MARKET_DATA type, IMPACT_AVAILABLE state, no existing signoff_case
    private static final UUID FX_CURVE_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // SA Capital Recalculation -- FRTB_SA type, IMPACT_AVAILABLE state, no existing signoff_case
    private static final UUID SA_SCENARIO_ID = UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");

    // ========================================================================
    // Gap Test 1: handleSignoff with multiple policies for same type selects
    //             correct one by priority through the full service flow
    // ========================================================================

    @Test
    void handleSignoff_multiplePoliciesForSameType_selectsLowestPriorityPolicy() {
        // Add a higher-priority (lower number) policy for MARKET_DATA with a different requiredApproverCount
        SignoffPolicy higherPriorityPolicy = new SignoffPolicy();
        higherPriorityPolicy.setId(UUID.randomUUID());
        higherPriorityPolicy.setScenarioTypeCode("MARKET_DATA");
        higherPriorityPolicy.setName("High Priority Market Data Policy");
        higherPriorityPolicy.setRequiredApproverCount(5);
        higherPriorityPolicy.setEnabled(true);
        higherPriorityPolicy.setPriority(0); // Lower number = higher priority than seed's priority=1
        higherPriorityPolicy.setCreatedAt(LocalDateTime.of(2026, 2, 22, 10, 0, 0));
        higherPriorityPolicy.setUpdatedAt(LocalDateTime.of(2026, 2, 22, 10, 0, 0));
        signoffPolicyRepository.saveAndFlush(higherPriorityPolicy);

        // Perform SIGNOFF on FX Curve (MARKET_DATA type)
        PostEventRequestDto request = new PostEventRequestDto("SIGNOFF", null, null, null);
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-1");

        // Verify the signoff case used the higher-priority policy (requiredApprovals=5, not the seed's 2)
        SignoffCase signoffCase = signoffCaseRepository.findByScenarioId(FX_CURVE_SCENARIO_ID).orElseThrow();
        assertEquals(5, signoffCase.getRequiredApprovals(),
                "Should use the policy with priority=0 (requiredApproverCount=5), not seed priority=1 (requiredApproverCount=2)");
        assertEquals(higherPriorityPolicy.getId(), signoffCase.getPolicyId(),
                "policyId should reference the higher-priority policy");
    }

    // ========================================================================
    // Gap Test 2: Policy snapshot immutability -- changing a policy after case
    //             creation does not affect the existing case's requiredApprovals
    // ========================================================================

    @Test
    void handleSignoff_policyChangeAfterCaseCreation_doesNotAffectExistingCase() {
        // First SIGNOFF creates the case with the seed policy (requiredApproverCount=2)
        PostEventRequestDto request = new PostEventRequestDto("SIGNOFF", null, null, null);
        scenarioDetailService.processEvent(SA_SCENARIO_ID, request, null, "approver-1");

        // Verify initial snapshot
        SignoffCase signoffCase = signoffCaseRepository.findByScenarioId(SA_SCENARIO_ID).orElseThrow();
        UUID policyId = signoffCase.getPolicyId();
        assertNotNull(policyId);
        assertEquals(2, signoffCase.getRequiredApprovals(),
                "Initial required approvals should be 2 from seed policy");

        // Now change the policy's requiredApproverCount to something different
        SignoffPolicy policy = signoffPolicyRepository.findById(policyId).orElseThrow();
        policy.setRequiredApproverCount(10);
        signoffPolicyRepository.saveAndFlush(policy);

        // Second SIGNOFF by a different user -- should still use the snapshotted value (2), not the updated (10)
        scenarioDetailService.processEvent(SA_SCENARIO_ID, request, null, "approver-2");

        // Re-fetch the case
        SignoffCase updatedCase = signoffCaseRepository.findByScenarioId(SA_SCENARIO_ID).orElseThrow();
        assertEquals(2, updatedCase.getRequiredApprovals(),
                "requiredApprovals should remain 2 (snapshotted), not 10 (current policy value)");
        assertEquals(2, updatedCase.getApprovalsReceived(),
                "approvalsReceived should be 2 after two different users signed off");
        // Since 2 >= 2 (snapshotted), the case should be COMPLETED
        assertEquals("COMPLETED", updatedCase.getStatus(),
                "Case should be completed since approvalsReceived (2) >= snapshotted requiredApprovals (2)");
    }

    // ========================================================================
    // Gap Test 3: Full signoff flow end-to-end verifying ReviewApproval
    //             progression through multiple signoffs
    // ========================================================================

    @Test
    void fullSignoffFlow_reviewApprovalProgressUpdatesWithEachApproval() {
        // Before any signoff, reviewApproval should have null approval counts
        Optional<ScenarioDetailDto> detailBeforeSignoff = scenarioDetailService.getScenarioDetail(
                FX_CURVE_SCENARIO_ID, Set.of("reviewApproval"));
        assertTrue(detailBeforeSignoff.isPresent());
        assertEquals(null, detailBeforeSignoff.get().reviewApproval().approvalsReceived(),
                "Before signoff, approvalsReceived should be null");
        assertEquals(null, detailBeforeSignoff.get().reviewApproval().approvalsRequired(),
                "Before signoff, approvalsRequired should be null");

        // First SIGNOFF (1 of 2)
        PostEventRequestDto request = new PostEventRequestDto("SIGNOFF", null, null, null);
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-1");

        // After first signoff, check reviewApproval shows 1 of 2
        Optional<ScenarioDetailDto> detailAfterFirst = scenarioDetailService.getScenarioDetail(
                FX_CURVE_SCENARIO_ID, Set.of("reviewApproval"));
        assertTrue(detailAfterFirst.isPresent());
        assertEquals(1, detailAfterFirst.get().reviewApproval().approvalsReceived(),
                "After first signoff, approvalsReceived should be 1");
        assertEquals(2, detailAfterFirst.get().reviewApproval().approvalsRequired(),
                "approvalsRequired should be 2 from seed policy");

        // Second SIGNOFF (2 of 2 - completes)
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, request, null, "approver-2");

        // After completion, check reviewApproval shows 2 of 2
        Optional<ScenarioDetailDto> detailAfterSecond = scenarioDetailService.getScenarioDetail(
                FX_CURVE_SCENARIO_ID, Set.of("reviewApproval"));
        assertTrue(detailAfterSecond.isPresent());
        assertEquals(2, detailAfterSecond.get().reviewApproval().approvalsReceived(),
                "After completion, approvalsReceived should be 2");
        assertEquals(2, detailAfterSecond.get().reviewApproval().approvalsRequired(),
                "approvalsRequired should remain 2");
    }
}
