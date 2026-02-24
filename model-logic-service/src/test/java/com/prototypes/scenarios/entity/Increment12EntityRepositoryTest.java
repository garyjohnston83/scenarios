package com.prototypes.scenarios.entity;

import com.prototypes.scenarios.repository.ScenarioRepository;
import com.prototypes.scenarios.repository.SignoffApprovalRepository;
import com.prototypes.scenarios.repository.SignoffCaseRepository;
import com.prototypes.scenarios.repository.SignoffPolicyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for Increment 12 JPA entity and repository layer (Task Group 1).
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode so that
 * all Liquibase changesets are applied and seed data is available, then verifies
 * SignoffPolicy, SignoffApproval, and SignoffCase (policyId) entity mappings
 * and repository functionality.
 *
 * Uses @Transactional to keep the Hibernate session open during each test method,
 * allowing lazy-loaded relationships to be accessed.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment12EntityRepositoryTest {

    @Autowired
    private SignoffPolicyRepository signoffPolicyRepository;

    @Autowired
    private SignoffApprovalRepository signoffApprovalRepository;

    @Autowired
    private SignoffCaseRepository signoffCaseRepository;

    @Autowired
    private ScenarioRepository scenarioRepository;

    // IR Vol Surface Update scenario (has a signoff_case seeded in changeset 009)
    private static final UUID IR_VOL_SCENARIO_ID = UUID.fromString("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");
    private static final UUID IR_VOL_SIGNOFF_CASE_ID = UUID.fromString("a0a1b2c3-d4e5-4f6a-b7c8-d9e0f1a2b301");

    // Seed policy UUIDs from changeset 022
    private static final UUID MARKET_DATA_POLICY_ID = UUID.fromString("11111111-1111-4111-8111-111111111101");
    private static final UUID RISK_FACTOR_POLICY_ID = UUID.fromString("22222222-2222-4222-8222-222222222202");
    private static final UUID FRTB_SA_POLICY_ID = UUID.fromString("33333333-3333-4333-8333-333333333303");

    // ========================================================================
    // Test 1: SignoffPolicy entity can be persisted and retrieved with all fields
    // ========================================================================

    @Test
    void signoffPolicy_canBePersistedAndRetrievedWithAllFields() {
        SignoffPolicy policy = new SignoffPolicy();
        policy.setId(UUID.randomUUID());
        policy.setScenarioTypeCode("MARKET_DATA");
        policy.setName("Test Policy");
        policy.setRequiredApproverCount(3);
        policy.setEnabled(true);
        policy.setPriority(5);
        policy.setCreatedAt(LocalDateTime.of(2026, 2, 22, 10, 0, 0));
        policy.setUpdatedAt(LocalDateTime.of(2026, 2, 22, 10, 0, 0));

        SignoffPolicy saved = signoffPolicyRepository.save(policy);
        signoffPolicyRepository.flush();

        SignoffPolicy fetched = signoffPolicyRepository.findById(saved.getId()).orElseThrow();
        assertEquals("MARKET_DATA", fetched.getScenarioTypeCode());
        assertEquals("Test Policy", fetched.getName());
        assertEquals(3, fetched.getRequiredApproverCount());
        assertTrue(fetched.isEnabled());
        assertEquals(5, fetched.getPriority());
        assertNotNull(fetched.getCreatedAt());
        assertNotNull(fetched.getUpdatedAt());
    }

    // ========================================================================
    // Test 2: SignoffPolicyRepository findFirstByScenarioTypeCodeAndIsEnabledTrue...
    //         returns correct policy (lowest priority, newest updated_at tie-break)
    // ========================================================================

    @Test
    void findFirstByScenarioTypeCodeAndIsEnabledTrue_returnsCorrectPolicy() {
        // Insert two additional policies for MARKET_DATA with different priorities and updated_at
        SignoffPolicy lowPriority = new SignoffPolicy();
        lowPriority.setId(UUID.randomUUID());
        lowPriority.setScenarioTypeCode("MARKET_DATA");
        lowPriority.setName("Low Priority Policy");
        lowPriority.setRequiredApproverCount(1);
        lowPriority.setEnabled(true);
        lowPriority.setPriority(2);
        lowPriority.setCreatedAt(LocalDateTime.of(2026, 2, 20, 10, 0, 0));
        lowPriority.setUpdatedAt(LocalDateTime.of(2026, 2, 20, 10, 0, 0));

        SignoffPolicy highPriority = new SignoffPolicy();
        highPriority.setId(UUID.randomUUID());
        highPriority.setScenarioTypeCode("MARKET_DATA");
        highPriority.setName("High Priority Policy");
        highPriority.setRequiredApproverCount(5);
        highPriority.setEnabled(true);
        highPriority.setPriority(0);
        highPriority.setCreatedAt(LocalDateTime.of(2026, 2, 21, 10, 0, 0));
        highPriority.setUpdatedAt(LocalDateTime.of(2026, 2, 21, 10, 0, 0));

        signoffPolicyRepository.save(lowPriority);
        signoffPolicyRepository.save(highPriority);
        signoffPolicyRepository.flush();

        // Should return priority=0 policy (lowest priority number = highest priority)
        Optional<SignoffPolicy> result = signoffPolicyRepository
                .findFirstByScenarioTypeCodeAndIsEnabledTrueOrderByPriorityAscUpdatedAtDesc("MARKET_DATA");

        assertTrue(result.isPresent(), "Should find an enabled policy for MARKET_DATA");
        assertEquals("High Priority Policy", result.get().getName());
        assertEquals(0, result.get().getPriority());
    }

    // ========================================================================
    // Test 3: SignoffPolicyRepository findAllByScenarioTypeCode returns filtered list
    // ========================================================================

    @Test
    void findAllByScenarioTypeCode_returnsFilteredList() {
        // Seed data should have one policy per type from changeset 022
        List<SignoffPolicy> marketDataPolicies = signoffPolicyRepository
                .findAllByScenarioTypeCode("MARKET_DATA");

        assertEquals(1, marketDataPolicies.size(), "Should have 1 seeded policy for MARKET_DATA");
        assertEquals("Default Market Data Policy", marketDataPolicies.get(0).getName());

        List<SignoffPolicy> riskFactorPolicies = signoffPolicyRepository
                .findAllByScenarioTypeCode("RISK_FACTOR");

        assertEquals(1, riskFactorPolicies.size(), "Should have 1 seeded policy for RISK_FACTOR");
        assertEquals("Default Risk Factor Policy", riskFactorPolicies.get(0).getName());

        List<SignoffPolicy> nonExistentPolicies = signoffPolicyRepository
                .findAllByScenarioTypeCode("NON_EXISTENT_TYPE");

        assertEquals(0, nonExistentPolicies.size(), "Should have 0 policies for non-existent type");
    }

    // ========================================================================
    // Test 4: SignoffApproval entity can be persisted with signoffCase and userId
    // ========================================================================

    @Test
    void signoffApproval_canBePersistedWithSignoffCaseAndUserId() {
        SignoffCase signoffCase = signoffCaseRepository.findById(IR_VOL_SIGNOFF_CASE_ID).orElseThrow();

        SignoffApproval approval = new SignoffApproval();
        approval.setId(UUID.randomUUID());
        approval.setSignoffCase(signoffCase);
        approval.setUserId("approver-1");
        approval.setApprovedAt(LocalDateTime.of(2026, 2, 22, 12, 0, 0));

        SignoffApproval saved = signoffApprovalRepository.save(approval);
        signoffApprovalRepository.flush();

        SignoffApproval fetched = signoffApprovalRepository.findById(saved.getId()).orElseThrow();
        assertEquals("approver-1", fetched.getUserId());
        assertNotNull(fetched.getApprovedAt());
        assertNotNull(fetched.getSignoffCase());
        assertEquals(IR_VOL_SIGNOFF_CASE_ID, fetched.getSignoffCase().getId());
    }

    // ========================================================================
    // Test 5: SignoffApproval unique constraint on (signoff_case_id, user_id)
    //         throws DataIntegrityViolationException on duplicate insert
    // ========================================================================

    @Test
    void signoffApproval_uniqueConstraint_throwsOnDuplicateInsert() {
        SignoffCase signoffCase = signoffCaseRepository.findById(IR_VOL_SIGNOFF_CASE_ID).orElseThrow();

        SignoffApproval approval1 = new SignoffApproval();
        approval1.setId(UUID.randomUUID());
        approval1.setSignoffCase(signoffCase);
        approval1.setUserId("approver-2");
        approval1.setApprovedAt(LocalDateTime.of(2026, 2, 22, 13, 0, 0));

        signoffApprovalRepository.saveAndFlush(approval1);

        SignoffApproval approval2 = new SignoffApproval();
        approval2.setId(UUID.randomUUID());
        approval2.setSignoffCase(signoffCase);
        approval2.setUserId("approver-2");
        approval2.setApprovedAt(LocalDateTime.of(2026, 2, 22, 14, 0, 0));

        assertThrows(DataIntegrityViolationException.class, () -> {
            signoffApprovalRepository.saveAndFlush(approval2);
        });
    }

    // ========================================================================
    // Test 6: SignoffCase entity persists and retrieves the new nullable policyId field
    //         (null for existing rows, populated for new rows)
    // ========================================================================

    @Test
    void signoffCase_policyId_nullableAndPersistable() {
        // Existing seeded signoff_case should have null policyId
        SignoffCase existingCase = signoffCaseRepository.findById(IR_VOL_SIGNOFF_CASE_ID).orElseThrow();
        assertNull(existingCase.getPolicyId(), "Existing seeded signoff_case should have null policyId");

        // Create a new signoff_case with policyId set
        Scenario scenario = scenarioRepository.findById(
                UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")).orElseThrow();

        SignoffCase newCase = new SignoffCase();
        newCase.setId(UUID.randomUUID());
        newCase.setScenario(scenario);
        newCase.setStatus("IN_PROGRESS");
        newCase.setCommencedAt(LocalDateTime.of(2026, 2, 22, 15, 0, 0));
        newCase.setRequiredApprovals(2);
        newCase.setApprovalsReceived(0);
        newCase.setPolicyId(MARKET_DATA_POLICY_ID);

        SignoffCase saved = signoffCaseRepository.save(newCase);
        signoffCaseRepository.flush();

        SignoffCase fetched = signoffCaseRepository.findById(saved.getId()).orElseThrow();
        assertEquals(MARKET_DATA_POLICY_ID, fetched.getPolicyId(),
                "New signoff_case should have the set policyId");
        assertEquals(2, fetched.getRequiredApprovals());
        assertEquals(0, fetched.getApprovalsReceived());
    }
}
