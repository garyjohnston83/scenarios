package com.prototypes.scenarios.entity;

import com.prototypes.scenarios.repository.ReportDefinitionRepository;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for ReportDefinition JPA entity and repository layer (Task Groups 2 and 3).
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode so that
 * all Liquibase changesets are applied and seed data is available, then verifies
 * ReportDefinition entity mappings, constraint enforcement, and custom query methods.
 *
 * Uses @Transactional to keep the Hibernate session open during each test method
 * and to roll back after each test.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class ReportDefinitionEntityRepositoryTest {

    @Autowired
    private ReportDefinitionRepository reportDefinitionRepository;

    private static final String SAMPLE_DEFINITION_JSON = """
            {"schema_version":"1.0","report_key":"test_report","scenario_type":"MARKET_DATA","display_name":"Test Report","sections":[{"key":"section1","title":"Section 1","order":1,"metrics":[{"key":"metric1","label":"Metric 1","source_field":"data.metric1","format":"number"}]}]}""";

    // ========================================================================
    // TG2 - Test 1: ReportDefinition can be persisted and retrieved with all fields
    // ========================================================================

    @Test
    void reportDefinition_canBePersistedAndRetrievedWithAllFields() {
        ReportDefinition rd = new ReportDefinition();
        rd.setId(UUID.randomUUID());
        rd.setScenarioTypeCode("MARKET_DATA");
        rd.setReportKey("test_persist_report");
        rd.setVersion(1);
        rd.setDefinition(SAMPLE_DEFINITION_JSON);
        rd.setActive(true);
        rd.setCreatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        rd.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));

        ReportDefinition saved = reportDefinitionRepository.save(rd);
        reportDefinitionRepository.flush();

        ReportDefinition fetched = reportDefinitionRepository.findById(saved.getId()).orElseThrow();
        assertEquals("MARKET_DATA", fetched.getScenarioTypeCode());
        assertEquals("test_persist_report", fetched.getReportKey());
        assertEquals(1, fetched.getVersion());
        assertEquals(SAMPLE_DEFINITION_JSON, fetched.getDefinition());
        assertTrue(fetched.isActive());
        assertNotNull(fetched.getCreatedAt());
        assertNotNull(fetched.getUpdatedAt());
    }

    // ========================================================================
    // TG2 - Test 2: Unique constraint throws DataIntegrityViolationException for
    //         duplicate (scenarioTypeCode, reportKey, version)
    // ========================================================================

    @Test
    void reportDefinition_uniqueConstraint_throwsOnDuplicateInsert() {
        ReportDefinition rd1 = new ReportDefinition();
        rd1.setId(UUID.randomUUID());
        rd1.setScenarioTypeCode("MARKET_DATA");
        rd1.setReportKey("duplicate_test_report");
        rd1.setVersion(1);
        rd1.setDefinition(SAMPLE_DEFINITION_JSON);
        rd1.setActive(true);
        rd1.setCreatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        rd1.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));

        reportDefinitionRepository.saveAndFlush(rd1);

        ReportDefinition rd2 = new ReportDefinition();
        rd2.setId(UUID.randomUUID());
        rd2.setScenarioTypeCode("MARKET_DATA");
        rd2.setReportKey("duplicate_test_report");
        rd2.setVersion(1);
        rd2.setDefinition(SAMPLE_DEFINITION_JSON);
        rd2.setActive(true);
        rd2.setCreatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));
        rd2.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));

        assertThrows(DataIntegrityViolationException.class, () -> {
            reportDefinitionRepository.saveAndFlush(rd2);
        });
    }

    // ========================================================================
    // TG2 - Test 3: FK constraint rejects insert with non-existent scenario_type_code
    // ========================================================================

    @Test
    void reportDefinition_fkConstraint_rejectsNonExistentScenarioTypeCode() {
        ReportDefinition rd = new ReportDefinition();
        rd.setId(UUID.randomUUID());
        rd.setScenarioTypeCode("NON_EXISTENT_TYPE");
        rd.setReportKey("fk_test_report");
        rd.setVersion(1);
        rd.setDefinition(SAMPLE_DEFINITION_JSON);
        rd.setActive(true);
        rd.setCreatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        rd.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));

        assertThrows(DataIntegrityViolationException.class, () -> {
            reportDefinitionRepository.saveAndFlush(rd);
        });
    }

    // ========================================================================
    // TG2 - Test 4: Multiple rows with same (scenarioTypeCode, reportKey) but
    //         different versions persist successfully
    // ========================================================================

    @Test
    void reportDefinition_multipleVersions_persistSuccessfully() {
        ReportDefinition v1 = new ReportDefinition();
        v1.setId(UUID.randomUUID());
        v1.setScenarioTypeCode("RISK_FACTOR");
        v1.setReportKey("versioned_report");
        v1.setVersion(1);
        v1.setDefinition(SAMPLE_DEFINITION_JSON);
        v1.setActive(true);
        v1.setCreatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        v1.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));

        ReportDefinition v2 = new ReportDefinition();
        v2.setId(UUID.randomUUID());
        v2.setScenarioTypeCode("RISK_FACTOR");
        v2.setReportKey("versioned_report");
        v2.setVersion(2);
        v2.setDefinition(SAMPLE_DEFINITION_JSON);
        v2.setActive(true);
        v2.setCreatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));
        v2.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));

        ReportDefinition v3 = new ReportDefinition();
        v3.setId(UUID.randomUUID());
        v3.setScenarioTypeCode("RISK_FACTOR");
        v3.setReportKey("versioned_report");
        v3.setVersion(3);
        v3.setDefinition(SAMPLE_DEFINITION_JSON);
        v3.setActive(true);
        v3.setCreatedAt(LocalDateTime.of(2026, 3, 10, 12, 0, 0));
        v3.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 12, 0, 0));

        reportDefinitionRepository.save(v1);
        reportDefinitionRepository.save(v2);
        reportDefinitionRepository.save(v3);
        reportDefinitionRepository.flush();

        ReportDefinition fetchedV1 = reportDefinitionRepository.findById(v1.getId()).orElseThrow();
        ReportDefinition fetchedV2 = reportDefinitionRepository.findById(v2.getId()).orElseThrow();
        ReportDefinition fetchedV3 = reportDefinitionRepository.findById(v3.getId()).orElseThrow();

        assertEquals(1, fetchedV1.getVersion());
        assertEquals(2, fetchedV2.getVersion());
        assertEquals(3, fetchedV3.getVersion());

        assertEquals("RISK_FACTOR", fetchedV1.getScenarioTypeCode());
        assertEquals("versioned_report", fetchedV1.getReportKey());
        assertEquals("RISK_FACTOR", fetchedV2.getScenarioTypeCode());
        assertEquals("versioned_report", fetchedV2.getReportKey());
        assertEquals("RISK_FACTOR", fetchedV3.getScenarioTypeCode());
        assertEquals("versioned_report", fetchedV3.getReportKey());
    }

    // ========================================================================
    // TG3 - Test 1: findAllByIsActiveTrue() returns only active definitions
    // ========================================================================

    @Test
    void findAllByIsActiveTrue_returnsOnlyActiveDefinitions() {
        // Insert an active definition
        ReportDefinition active = new ReportDefinition();
        active.setId(UUID.randomUUID());
        active.setScenarioTypeCode("MARKET_DATA");
        active.setReportKey("active_filter_test");
        active.setVersion(1);
        active.setDefinition(SAMPLE_DEFINITION_JSON);
        active.setActive(true);
        active.setCreatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        active.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));

        // Insert an inactive definition
        ReportDefinition inactive = new ReportDefinition();
        inactive.setId(UUID.randomUUID());
        inactive.setScenarioTypeCode("MARKET_DATA");
        inactive.setReportKey("active_filter_test");
        inactive.setVersion(2);
        inactive.setDefinition(SAMPLE_DEFINITION_JSON);
        inactive.setActive(false);
        inactive.setCreatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));
        inactive.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));

        reportDefinitionRepository.saveAndFlush(active);
        reportDefinitionRepository.saveAndFlush(inactive);

        List<ReportDefinition> results = reportDefinitionRepository.findAllByIsActiveTrue();

        // Should contain the active one we inserted (and possibly seed data which is also active)
        assertTrue(results.stream().anyMatch(rd -> rd.getId().equals(active.getId())));
        // Should NOT contain the inactive one
        assertFalse(results.stream().anyMatch(rd -> rd.getId().equals(inactive.getId())));
        // Every returned row must be active
        assertTrue(results.stream().allMatch(ReportDefinition::isActive));
    }

    // ========================================================================
    // TG3 - Test 2: findAllByScenarioTypeCodeAndIsActiveTrue(code) returns only
    //         active definitions for the given scenario type
    // ========================================================================

    @Test
    void findAllByScenarioTypeCodeAndIsActiveTrue_returnsOnlyActiveForGivenType() {
        // Insert an active FRTB_SA definition
        ReportDefinition activeFrtb = new ReportDefinition();
        activeFrtb.setId(UUID.randomUUID());
        activeFrtb.setScenarioTypeCode("FRTB_SA");
        activeFrtb.setReportKey("type_filter_test");
        activeFrtb.setVersion(1);
        activeFrtb.setDefinition(SAMPLE_DEFINITION_JSON);
        activeFrtb.setActive(true);
        activeFrtb.setCreatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        activeFrtb.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));

        // Insert an inactive FRTB_SA definition
        ReportDefinition inactiveFrtb = new ReportDefinition();
        inactiveFrtb.setId(UUID.randomUUID());
        inactiveFrtb.setScenarioTypeCode("FRTB_SA");
        inactiveFrtb.setReportKey("type_filter_test");
        inactiveFrtb.setVersion(2);
        inactiveFrtb.setDefinition(SAMPLE_DEFINITION_JSON);
        inactiveFrtb.setActive(false);
        inactiveFrtb.setCreatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));
        inactiveFrtb.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));

        // Insert an active MARKET_DATA definition
        ReportDefinition activeMarket = new ReportDefinition();
        activeMarket.setId(UUID.randomUUID());
        activeMarket.setScenarioTypeCode("MARKET_DATA");
        activeMarket.setReportKey("type_filter_test_market");
        activeMarket.setVersion(1);
        activeMarket.setDefinition(SAMPLE_DEFINITION_JSON);
        activeMarket.setActive(true);
        activeMarket.setCreatedAt(LocalDateTime.of(2026, 3, 10, 12, 0, 0));
        activeMarket.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 12, 0, 0));

        reportDefinitionRepository.saveAndFlush(activeFrtb);
        reportDefinitionRepository.saveAndFlush(inactiveFrtb);
        reportDefinitionRepository.saveAndFlush(activeMarket);

        List<ReportDefinition> results = reportDefinitionRepository
                .findAllByScenarioTypeCodeAndIsActiveTrue("FRTB_SA");

        // Should include the active FRTB_SA definition we inserted
        assertTrue(results.stream().anyMatch(rd -> rd.getId().equals(activeFrtb.getId())));
        // Should NOT include the inactive FRTB_SA definition
        assertFalse(results.stream().anyMatch(rd -> rd.getId().equals(inactiveFrtb.getId())));
        // Should NOT include the MARKET_DATA definition
        assertFalse(results.stream().anyMatch(rd -> rd.getId().equals(activeMarket.getId())));
        // Every returned row must be active and FRTB_SA
        assertTrue(results.stream().allMatch(rd -> rd.isActive() && "FRTB_SA".equals(rd.getScenarioTypeCode())));
    }

    // ========================================================================
    // TG3 - Test 3: findFirstByReportKeyAndIsActiveTrueOrderByVersionDesc(reportKey)
    //         returns the highest-version active definition
    // ========================================================================

    @Test
    void findFirstByReportKeyAndIsActiveTrueOrderByVersionDesc_returnsHighestVersionActive() {
        String reportKey = "latest_version_test";

        // Version 1 - active
        ReportDefinition v1 = new ReportDefinition();
        v1.setId(UUID.randomUUID());
        v1.setScenarioTypeCode("RISK_FACTOR");
        v1.setReportKey(reportKey);
        v1.setVersion(1);
        v1.setDefinition(SAMPLE_DEFINITION_JSON);
        v1.setActive(true);
        v1.setCreatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        v1.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));

        // Version 2 - active (should be returned)
        ReportDefinition v2 = new ReportDefinition();
        v2.setId(UUID.randomUUID());
        v2.setScenarioTypeCode("RISK_FACTOR");
        v2.setReportKey(reportKey);
        v2.setVersion(2);
        v2.setDefinition(SAMPLE_DEFINITION_JSON);
        v2.setActive(true);
        v2.setCreatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));
        v2.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));

        // Version 3 - inactive (should be skipped)
        ReportDefinition v3 = new ReportDefinition();
        v3.setId(UUID.randomUUID());
        v3.setScenarioTypeCode("RISK_FACTOR");
        v3.setReportKey(reportKey);
        v3.setVersion(3);
        v3.setDefinition(SAMPLE_DEFINITION_JSON);
        v3.setActive(false);
        v3.setCreatedAt(LocalDateTime.of(2026, 3, 10, 12, 0, 0));
        v3.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 12, 0, 0));

        reportDefinitionRepository.save(v1);
        reportDefinitionRepository.save(v2);
        reportDefinitionRepository.save(v3);
        reportDefinitionRepository.flush();

        Optional<ReportDefinition> result = reportDefinitionRepository
                .findFirstByReportKeyAndIsActiveTrueOrderByVersionDesc(reportKey);

        assertTrue(result.isPresent());
        assertEquals(v2.getId(), result.get().getId());
        assertEquals(2, result.get().getVersion());
        assertTrue(result.get().isActive());
    }

    // ========================================================================
    // TG3 - Test 4: findAllByReportKeyOrderByVersionDesc(reportKey) returns all
    //         versions (active and inactive) in descending version order
    // ========================================================================

    @Test
    void findAllByReportKeyOrderByVersionDesc_returnsAllVersionsDescending() {
        String reportKey = "all_versions_test";

        // Version 1 - active
        ReportDefinition v1 = new ReportDefinition();
        v1.setId(UUID.randomUUID());
        v1.setScenarioTypeCode("FRTB_SA");
        v1.setReportKey(reportKey);
        v1.setVersion(1);
        v1.setDefinition(SAMPLE_DEFINITION_JSON);
        v1.setActive(true);
        v1.setCreatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        v1.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));

        // Version 2 - inactive
        ReportDefinition v2 = new ReportDefinition();
        v2.setId(UUID.randomUUID());
        v2.setScenarioTypeCode("FRTB_SA");
        v2.setReportKey(reportKey);
        v2.setVersion(2);
        v2.setDefinition(SAMPLE_DEFINITION_JSON);
        v2.setActive(false);
        v2.setCreatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));
        v2.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));

        // Version 3 - active
        ReportDefinition v3 = new ReportDefinition();
        v3.setId(UUID.randomUUID());
        v3.setScenarioTypeCode("FRTB_SA");
        v3.setReportKey(reportKey);
        v3.setVersion(3);
        v3.setDefinition(SAMPLE_DEFINITION_JSON);
        v3.setActive(true);
        v3.setCreatedAt(LocalDateTime.of(2026, 3, 10, 12, 0, 0));
        v3.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 12, 0, 0));

        reportDefinitionRepository.save(v1);
        reportDefinitionRepository.save(v2);
        reportDefinitionRepository.save(v3);
        reportDefinitionRepository.flush();

        List<ReportDefinition> results = reportDefinitionRepository
                .findAllByReportKeyOrderByVersionDesc(reportKey);

        assertEquals(3, results.size());
        // Verify descending order
        assertEquals(3, results.get(0).getVersion());
        assertEquals(2, results.get(1).getVersion());
        assertEquals(1, results.get(2).getVersion());
        // Verify all report keys match
        assertTrue(results.stream().allMatch(rd -> reportKey.equals(rd.getReportKey())));
        // Verify inactive is included (version 2)
        assertFalse(results.get(1).isActive());
    }

    // ========================================================================
    // TG3 - Test 5: findMaxVersion(scenarioTypeCode, reportKey) returns the correct
    //         max version; returns Optional.empty() when no rows exist
    // ========================================================================

    @Test
    void findMaxVersion_returnsCorrectMaxAndEmptyWhenNoRows() {
        String reportKey = "max_version_test";
        String scenarioTypeCode = "MARKET_DATA";

        // No rows yet -- should return Optional.empty()
        Optional<Integer> emptyResult = reportDefinitionRepository
                .findMaxVersion(scenarioTypeCode, reportKey);
        assertTrue(emptyResult.isEmpty());

        // Insert version 1
        ReportDefinition v1 = new ReportDefinition();
        v1.setId(UUID.randomUUID());
        v1.setScenarioTypeCode(scenarioTypeCode);
        v1.setReportKey(reportKey);
        v1.setVersion(1);
        v1.setDefinition(SAMPLE_DEFINITION_JSON);
        v1.setActive(true);
        v1.setCreatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        v1.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));

        // Insert version 5 (skipping versions to test MAX works correctly)
        ReportDefinition v5 = new ReportDefinition();
        v5.setId(UUID.randomUUID());
        v5.setScenarioTypeCode(scenarioTypeCode);
        v5.setReportKey(reportKey);
        v5.setVersion(5);
        v5.setDefinition(SAMPLE_DEFINITION_JSON);
        v5.setActive(true);
        v5.setCreatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));
        v5.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 11, 0, 0));

        // Insert version 3 (inserted out of order to confirm MAX, not LAST)
        ReportDefinition v3 = new ReportDefinition();
        v3.setId(UUID.randomUUID());
        v3.setScenarioTypeCode(scenarioTypeCode);
        v3.setReportKey(reportKey);
        v3.setVersion(3);
        v3.setDefinition(SAMPLE_DEFINITION_JSON);
        v3.setActive(false);
        v3.setCreatedAt(LocalDateTime.of(2026, 3, 10, 12, 0, 0));
        v3.setUpdatedAt(LocalDateTime.of(2026, 3, 10, 12, 0, 0));

        reportDefinitionRepository.save(v1);
        reportDefinitionRepository.save(v5);
        reportDefinitionRepository.save(v3);
        reportDefinitionRepository.flush();

        Optional<Integer> maxResult = reportDefinitionRepository
                .findMaxVersion(scenarioTypeCode, reportKey);
        assertTrue(maxResult.isPresent());
        assertEquals(5, maxResult.get());

        // Verify different report key returns empty
        Optional<Integer> otherKeyResult = reportDefinitionRepository
                .findMaxVersion(scenarioTypeCode, "nonexistent_key");
        assertTrue(otherKeyResult.isEmpty());
    }
}
