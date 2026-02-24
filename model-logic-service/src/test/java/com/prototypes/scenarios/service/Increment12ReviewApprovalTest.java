package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.PostEventRequestDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for the buildReviewApproval method's inclusion of
 * approvalsReceived and approvalsRequired in the ReviewApprovalDto
 * (Increment 12, Task Group 4).
 *
 * Uses the full Spring context with H2 in PostgreSQL compatibility mode
 * so that all Liquibase changesets and seed data are available.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment12ReviewApprovalTest {

    @Autowired
    private ScenarioDetailService scenarioDetailService;

    // FX Curve Recalibration -- MARKET_DATA type, IMPACT_AVAILABLE state, no existing signoff_case
    private static final UUID FX_CURVE_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // SA Capital Recalculation -- FRTB_SA type, IMPACT_AVAILABLE state, no existing signoff_case
    private static final UUID SA_SCENARIO_ID = UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");

    // ========================================================================
    // Backend Test 1: buildReviewApproval includes approvalsReceived and
    //                 approvalsRequired when a SignoffCase exists
    // ========================================================================

    @Test
    void buildReviewApproval_withSignoffCase_includesApprovalsReceivedAndRequired() {
        // Create a signoff case by performing a SIGNOFF event on the FX Curve scenario
        // (MARKET_DATA type, IMPACT_AVAILABLE state, no existing signoff_case)
        PostEventRequestDto signoffRequest = new PostEventRequestDto("SIGNOFF", null, null, null);
        scenarioDetailService.processEvent(FX_CURVE_SCENARIO_ID, signoffRequest, null, "approver-1");

        // Now fetch the scenario detail with reviewApproval expanded
        Optional<ScenarioDetailDto> detailOpt = scenarioDetailService.getScenarioDetail(
                FX_CURVE_SCENARIO_ID, Set.of("reviewApproval"));

        assertTrue(detailOpt.isPresent(), "Scenario detail should be present");
        ScenarioDetailDto detail = detailOpt.get();
        assertNotNull(detail.reviewApproval(), "reviewApproval should be populated");

        // Verify approval progress fields are present
        assertNotNull(detail.reviewApproval().approvalsReceived(),
                "approvalsReceived should not be null when SignoffCase exists");
        assertNotNull(detail.reviewApproval().approvalsRequired(),
                "approvalsRequired should not be null when SignoffCase exists");
        assertEquals(1, detail.reviewApproval().approvalsReceived(),
                "approvalsReceived should be 1 after one signoff");
        assertEquals(2, detail.reviewApproval().approvalsRequired(),
                "approvalsRequired should match policy's requiredApproverCount (2)");
    }

    // ========================================================================
    // Backend Test 2: buildReviewApproval returns null for approvalsReceived
    //                 and approvalsRequired when no SignoffCase exists
    // ========================================================================

    @Test
    void buildReviewApproval_withoutSignoffCase_returnsNullForApprovalFields() {
        // SA Capital Recalculation (FRTB_SA type) has no signoff_case in seed data
        Optional<ScenarioDetailDto> detailOpt = scenarioDetailService.getScenarioDetail(
                SA_SCENARIO_ID, Set.of("reviewApproval"));

        assertTrue(detailOpt.isPresent(), "Scenario detail should be present");
        ScenarioDetailDto detail = detailOpt.get();
        assertNotNull(detail.reviewApproval(), "reviewApproval should be populated");

        // Verify approval progress fields are null
        assertNull(detail.reviewApproval().approvalsReceived(),
                "approvalsReceived should be null when no SignoffCase exists");
        assertNull(detail.reviewApproval().approvalsRequired(),
                "approvalsRequired should be null when no SignoffCase exists");
    }
}
