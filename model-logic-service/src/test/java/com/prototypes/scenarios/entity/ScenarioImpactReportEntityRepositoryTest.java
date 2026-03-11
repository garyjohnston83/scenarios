package com.prototypes.scenarios.entity;

import com.prototypes.scenarios.repository.ScenarioImpactReportRepository;
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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for ScenarioImpactReport JPA entity and repository layer (Task Group 2 + 3).
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode so that
 * all Liquibase changesets are applied and seed data is available, then verifies
 * ScenarioImpactReport entity mappings, FK constraint enforcement, and repository
 * query methods.
 *
 * Uses @Transactional to keep the Hibernate session open during each test method
 * and to roll back after each test.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class ScenarioImpactReportEntityRepositoryTest {

    @Autowired
    private ScenarioImpactReportRepository scenarioImpactReportRepository;

    // Existing scenario ID from seed data (002-seed-data.yaml -- MARKET_DATA scenario)
    private static final UUID EXISTING_SCENARIO_ID =
            UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // Existing report definition ID from seed data (029-seed-report-definitions.yaml -- MARKET_DATA definition)
    private static final UUID EXISTING_REPORT_DEFINITION_ID =
            UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002");

    // Seed report ID from 033-update-market-data-report (belongs to EXISTING_SCENARIO_ID)
    private static final UUID SEED_REPORT_ID =
            UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011");

    // Scenario that exists in seed data but has no impact reports
    private static final UUID SCENARIO_WITH_NO_REPORTS =
            UUID.fromString("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");

    private static final String SAMPLE_RENDERED_REPORT_JSON = """
            {"reportKey":"market_risk_summary","reportName":"FX Impact Analysis Report on Average Moves","definitionVersion":2,"generatedAt":"2026-03-10T10:00:00","scenarioId":"a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d","sections":[]}""";

    // ========================================================================
    // TG2 - Test 1: ScenarioImpactReport can be persisted and retrieved with all fields
    // ========================================================================

    @Test
    void scenarioImpactReport_canBePersistedAndRetrievedWithAllFields() {
        ScenarioImpactReport report = new ScenarioImpactReport();
        report.setId(UUID.randomUUID());
        report.setScenarioId(EXISTING_SCENARIO_ID);
        report.setReportDefinitionId(EXISTING_REPORT_DEFINITION_ID);
        report.setDefinitionVersion(2);
        report.setReportKey("market_risk_summary");
        report.setReportName("FX Impact Analysis Report on Average Moves");
        report.setGeneratedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        report.setStatus("GENERATED");
        report.setRenderedReport(SAMPLE_RENDERED_REPORT_JSON);
        report.setErrorMessage(null);

        ScenarioImpactReport saved = scenarioImpactReportRepository.saveAndFlush(report);

        ScenarioImpactReport fetched = scenarioImpactReportRepository.findById(saved.getId()).orElseThrow();
        assertEquals(EXISTING_SCENARIO_ID, fetched.getScenarioId());
        assertEquals(EXISTING_REPORT_DEFINITION_ID, fetched.getReportDefinitionId());
        assertEquals(2, fetched.getDefinitionVersion());
        assertEquals("market_risk_summary", fetched.getReportKey());
        assertEquals("FX Impact Analysis Report on Average Moves", fetched.getReportName());
        assertNotNull(fetched.getGeneratedAt());
        assertEquals("GENERATED", fetched.getStatus());
        assertEquals(SAMPLE_RENDERED_REPORT_JSON, fetched.getRenderedReport());
        assertNull(fetched.getErrorMessage());
    }

    // ========================================================================
    // TG2 - Test 2: FK constraint fk_sir_scenario rejects non-existent scenario_id
    // ========================================================================

    @Test
    void scenarioImpactReport_fkConstraint_rejectsNonExistentScenarioId() {
        ScenarioImpactReport report = new ScenarioImpactReport();
        report.setId(UUID.randomUUID());
        report.setScenarioId(UUID.fromString("00000000-0000-4000-8000-000000000099"));
        report.setReportDefinitionId(EXISTING_REPORT_DEFINITION_ID);
        report.setDefinitionVersion(2);
        report.setReportKey("market_risk_summary");
        report.setReportName("FX Impact Analysis Report on Average Moves");
        report.setGeneratedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        report.setStatus("GENERATED");
        report.setRenderedReport(SAMPLE_RENDERED_REPORT_JSON);

        assertThrows(DataIntegrityViolationException.class, () -> {
            scenarioImpactReportRepository.saveAndFlush(report);
        });
    }

    // ========================================================================
    // TG2 - Test 3: FK constraint fk_sir_report_definition rejects non-existent report_definition_id
    // ========================================================================

    @Test
    void scenarioImpactReport_fkConstraint_rejectsNonExistentReportDefinitionId() {
        ScenarioImpactReport report = new ScenarioImpactReport();
        report.setId(UUID.randomUUID());
        report.setScenarioId(EXISTING_SCENARIO_ID);
        report.setReportDefinitionId(UUID.fromString("00000000-0000-4000-8000-000000000099"));
        report.setDefinitionVersion(2);
        report.setReportKey("market_risk_summary");
        report.setReportName("FX Impact Analysis Report on Average Moves");
        report.setGeneratedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        report.setStatus("GENERATED");
        report.setRenderedReport(SAMPLE_RENDERED_REPORT_JSON);

        assertThrows(DataIntegrityViolationException.class, () -> {
            scenarioImpactReportRepository.saveAndFlush(report);
        });
    }

    // ========================================================================
    // TG2 - Test 4: Entity with status="FAILED" can be persisted with null renderedReport
    //         and non-null errorMessage
    // ========================================================================

    @Test
    void scenarioImpactReport_failedStatus_persistsWithNullRenderedReportAndNonNullErrorMessage() {
        ScenarioImpactReport report = new ScenarioImpactReport();
        report.setId(UUID.randomUUID());
        report.setScenarioId(EXISTING_SCENARIO_ID);
        report.setReportDefinitionId(EXISTING_REPORT_DEFINITION_ID);
        report.setDefinitionVersion(2);
        report.setReportKey("market_risk_summary");
        report.setReportName("FX Impact Analysis Report on Average Moves");
        report.setGeneratedAt(LocalDateTime.of(2026, 3, 10, 10, 0, 0));
        report.setStatus("FAILED");
        report.setRenderedReport(null);
        report.setErrorMessage("Data provider returned null for scenario type MARKET_DATA");

        ScenarioImpactReport saved = scenarioImpactReportRepository.saveAndFlush(report);

        ScenarioImpactReport fetched = scenarioImpactReportRepository.findById(saved.getId()).orElseThrow();
        assertEquals("FAILED", fetched.getStatus());
        assertNull(fetched.getRenderedReport());
        assertEquals("Data provider returned null for scenario type MARKET_DATA", fetched.getErrorMessage());
    }

    // ========================================================================
    // TG3 - Test 1: findAllByScenarioIdOrderByGeneratedAtDesc returns reports
    //         ordered by generatedAt descending
    // ========================================================================

    @Test
    void findAllByScenarioIdOrderByGeneratedAtDesc_returnsReportsOrderedByGeneratedAtDescending() {
        // Insert 2 reports for the same scenario with timestamps clearly after seed data
        // (seed data has a report at 2026-03-11 12:00:00 for this scenario)
        ScenarioImpactReport olderReport = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                "market_risk_summary",
                LocalDateTime.of(2026, 3, 11, 14, 0, 0),
                "GENERATED"
        );
        ScenarioImpactReport newerReport = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                "market_risk_summary",
                LocalDateTime.of(2026, 3, 11, 18, 0, 0),
                "GENERATED"
        );

        scenarioImpactReportRepository.saveAndFlush(olderReport);
        scenarioImpactReportRepository.saveAndFlush(newerReport);

        List<ScenarioImpactReport> results =
                scenarioImpactReportRepository.findAllByScenarioIdOrderByGeneratedAtDesc(EXISTING_SCENARIO_ID);

        // Should have at least 3 reports (1 from seed data + 2 inserted)
        assertTrue(results.size() >= 3);
        // First result should be the newest one (descending order)
        assertEquals(newerReport.getId(), results.get(0).getId());
        assertEquals(olderReport.getId(), results.get(1).getId());
        // Verify ordering: each generatedAt should be >= the next
        for (int i = 0; i < results.size() - 1; i++) {
            assertTrue(
                    !results.get(i).getGeneratedAt().isBefore(results.get(i + 1).getGeneratedAt()),
                    "Results should be ordered by generatedAt descending"
            );
        }
    }

    // ========================================================================
    // TG3 - Test 2: findFirstByScenarioIdAndReportKeyOrderByGeneratedAtDesc
    //         returns the most recent report for the given scenario and report key
    // ========================================================================

    @Test
    void findFirstByScenarioIdAndReportKeyOrderByGeneratedAtDesc_returnsMostRecentReportForKey() {
        // Use a unique report key to avoid interference from seed data
        String reportKey = "market_risk_summary_tg3_test";

        ScenarioImpactReport olderReport = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                reportKey,
                LocalDateTime.of(2026, 3, 10, 8, 0, 0),
                "GENERATED"
        );
        ScenarioImpactReport newerReport = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                reportKey,
                LocalDateTime.of(2026, 3, 10, 14, 0, 0),
                "GENERATED"
        );

        scenarioImpactReportRepository.saveAndFlush(olderReport);
        scenarioImpactReportRepository.saveAndFlush(newerReport);

        Optional<ScenarioImpactReport> result =
                scenarioImpactReportRepository.findFirstByScenarioIdAndReportKeyOrderByGeneratedAtDesc(
                        EXISTING_SCENARIO_ID, reportKey);

        assertTrue(result.isPresent());
        assertEquals(newerReport.getId(), result.get().getId());
        assertEquals(LocalDateTime.of(2026, 3, 10, 14, 0, 0), result.get().getGeneratedAt());
    }

    // ========================================================================
    // TG3 - Test 3: findAllByScenarioId returns all reports for the given scenario
    //         (both GENERATED and FAILED)
    // ========================================================================

    @Test
    void findAllByScenarioId_returnsAllReportsForScenarioIncludingGeneratedAndFailed() {
        ScenarioImpactReport generatedReport = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                "market_risk_summary",
                LocalDateTime.of(2026, 3, 10, 9, 0, 0),
                "GENERATED"
        );
        generatedReport.setRenderedReport(SAMPLE_RENDERED_REPORT_JSON);

        ScenarioImpactReport failedReport = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                "market_risk_summary",
                LocalDateTime.of(2026, 3, 10, 10, 0, 0),
                "FAILED"
        );
        failedReport.setRenderedReport(null);
        failedReport.setErrorMessage("Provider unavailable");

        scenarioImpactReportRepository.saveAndFlush(generatedReport);
        scenarioImpactReportRepository.saveAndFlush(failedReport);

        List<ScenarioImpactReport> results =
                scenarioImpactReportRepository.findAllByScenarioId(EXISTING_SCENARIO_ID);

        // Should have at least the 2 we just inserted (plus seed data)
        assertTrue(results.size() >= 2);
        // Verify both statuses are present in the results
        boolean hasGenerated = results.stream().anyMatch(r -> "GENERATED".equals(r.getStatus()));
        boolean hasFailed = results.stream().anyMatch(r -> "FAILED".equals(r.getStatus()));
        assertTrue(hasGenerated, "Results should include GENERATED reports");
        assertTrue(hasFailed, "Results should include FAILED reports");
    }

    // ========================================================================
    // TG3 - Test 4: Repository queries return empty results for a scenario with no reports
    // ========================================================================

    @Test
    void repositoryQueries_returnEmptyResultsForScenarioWithNoReports() {
        // Use a scenario ID that exists in seed data but has no impact reports
        UUID scenarioWithNoReports = UUID.fromString("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");

        List<ScenarioImpactReport> allReports =
                scenarioImpactReportRepository.findAllByScenarioIdOrderByGeneratedAtDesc(scenarioWithNoReports);
        assertTrue(allReports.isEmpty(), "Should return empty list for scenario with no reports");

        Optional<ScenarioImpactReport> latestReport =
                scenarioImpactReportRepository.findFirstByScenarioIdAndReportKeyOrderByGeneratedAtDesc(
                        scenarioWithNoReports, "nonexistent_key");
        assertTrue(latestReport.isEmpty(), "Should return empty Optional for scenario with no reports");

        List<ScenarioImpactReport> allById =
                scenarioImpactReportRepository.findAllByScenarioId(scenarioWithNoReports);
        assertTrue(allById.isEmpty(), "Should return empty list for scenario with no reports");
    }

    // ========================================================================
    // Increment 3 - TG1 - Test 1: findAllByScenarioIdOrderByGeneratedAtAsc
    //         returns reports ordered by generatedAt ascending (oldest first)
    // ========================================================================

    @Test
    void findAllByScenarioIdOrderByGeneratedAtAsc_returnsReportsOrderedByGeneratedAtAscending() {
        // Insert 2 reports for the same scenario with timestamps clearly after seed data
        // (seed data has report bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011 at 2026-03-11 12:00:00)
        ScenarioImpactReport olderReport = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                "market_risk_summary",
                LocalDateTime.of(2026, 3, 11, 14, 0, 0),
                "GENERATED"
        );
        ScenarioImpactReport newerReport = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                "market_risk_summary",
                LocalDateTime.of(2026, 3, 11, 18, 0, 0),
                "GENERATED"
        );

        scenarioImpactReportRepository.saveAndFlush(olderReport);
        scenarioImpactReportRepository.saveAndFlush(newerReport);

        List<ScenarioImpactReport> results =
                scenarioImpactReportRepository.findAllByScenarioIdOrderByGeneratedAtAsc(EXISTING_SCENARIO_ID);

        // Should have at least 3 reports (1 from seed data + 2 inserted)
        assertTrue(results.size() >= 3);

        // The seed data report (2026-03-11 12:00:00) should appear before the inserted reports
        assertEquals(SEED_REPORT_ID, results.get(0).getId(),
                "Seed report should be first (oldest) in ascending order");

        // Verify ordering: each generatedAt should be <= the next (ascending)
        for (int i = 0; i < results.size() - 1; i++) {
            assertTrue(
                    !results.get(i).getGeneratedAt().isAfter(results.get(i + 1).getGeneratedAt()),
                    "Results should be ordered by generatedAt ascending"
            );
        }

        // The last result should be the newest inserted report
        assertEquals(newerReport.getId(), results.get(results.size() - 1).getId(),
                "Newest inserted report should be last in ascending order");
    }

    // ========================================================================
    // Increment 3 - TG1 - Test 2: findAllByScenarioIdOrderByGeneratedAtAsc
    //         returns both GENERATED and FAILED reports
    // ========================================================================

    @Test
    void findAllByScenarioIdOrderByGeneratedAtAsc_returnsBothGeneratedAndFailedReports() {
        ScenarioImpactReport generatedReport = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                "market_risk_summary",
                LocalDateTime.of(2026, 3, 12, 9, 0, 0),
                "GENERATED"
        );
        generatedReport.setRenderedReport(SAMPLE_RENDERED_REPORT_JSON);

        ScenarioImpactReport failedReport = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                "market_risk_summary",
                LocalDateTime.of(2026, 3, 12, 10, 0, 0),
                "FAILED"
        );
        failedReport.setRenderedReport(null);
        failedReport.setErrorMessage("Provider unavailable");

        scenarioImpactReportRepository.saveAndFlush(generatedReport);
        scenarioImpactReportRepository.saveAndFlush(failedReport);

        List<ScenarioImpactReport> results =
                scenarioImpactReportRepository.findAllByScenarioIdOrderByGeneratedAtAsc(EXISTING_SCENARIO_ID);

        // Should have at least 3 reports (1 seed + 2 inserted)
        assertTrue(results.size() >= 3);

        // Verify both statuses are present in the results
        boolean hasGenerated = results.stream().anyMatch(r -> "GENERATED".equals(r.getStatus()));
        boolean hasFailed = results.stream().anyMatch(r -> "FAILED".equals(r.getStatus()));
        assertTrue(hasGenerated, "Results should include GENERATED reports");
        assertTrue(hasFailed, "Results should include FAILED reports");
    }

    // ========================================================================
    // Increment 3 - TG1 - Test 3: findByIdAndScenarioId returns the report
    //         when id and scenarioId match
    // ========================================================================

    @Test
    void findByIdAndScenarioId_returnsReportWhenIdAndScenarioIdMatch() {
        ScenarioImpactReport report = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                "market_risk_summary",
                LocalDateTime.of(2026, 3, 12, 15, 0, 0),
                "GENERATED"
        );

        scenarioImpactReportRepository.saveAndFlush(report);

        Optional<ScenarioImpactReport> result =
                scenarioImpactReportRepository.findByIdAndScenarioId(report.getId(), EXISTING_SCENARIO_ID);

        assertTrue(result.isPresent(), "Should return the report when id and scenarioId match");
        assertEquals(report.getId(), result.get().getId());
        assertEquals(EXISTING_SCENARIO_ID, result.get().getScenarioId());
        assertEquals("market_risk_summary", result.get().getReportKey());
        assertEquals("GENERATED", result.get().getStatus());
        assertEquals(LocalDateTime.of(2026, 3, 12, 15, 0, 0), result.get().getGeneratedAt());
    }

    // ========================================================================
    // Increment 3 - TG1 - Test 4: findByIdAndScenarioId returns Optional.empty()
    //         when scenarioId does not match the report's actual scenario
    // ========================================================================

    @Test
    void findByIdAndScenarioId_returnsEmptyWhenScenarioIdDoesNotMatch() {
        ScenarioImpactReport report = createReport(
                EXISTING_SCENARIO_ID,
                EXISTING_REPORT_DEFINITION_ID,
                "market_risk_summary",
                LocalDateTime.of(2026, 3, 12, 16, 0, 0),
                "GENERATED"
        );

        scenarioImpactReportRepository.saveAndFlush(report);

        // Query with the report's ID but a different scenarioId
        // (b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e is a real seed scenario with no impact reports)
        Optional<ScenarioImpactReport> result =
                scenarioImpactReportRepository.findByIdAndScenarioId(report.getId(), SCENARIO_WITH_NO_REPORTS);

        assertTrue(result.isEmpty(),
                "Should return empty Optional when scenarioId does not match the report's actual scenario");
    }

    // ========================================================================
    // Helper method to create a ScenarioImpactReport
    // ========================================================================

    private ScenarioImpactReport createReport(UUID scenarioId, UUID reportDefinitionId,
                                               String reportKey, LocalDateTime generatedAt,
                                               String status) {
        ScenarioImpactReport report = new ScenarioImpactReport();
        report.setId(UUID.randomUUID());
        report.setScenarioId(scenarioId);
        report.setReportDefinitionId(reportDefinitionId);
        report.setDefinitionVersion(2);
        report.setReportKey(reportKey);
        report.setReportName("Test Report");
        report.setGeneratedAt(generatedAt);
        report.setStatus(status);
        report.setRenderedReport(SAMPLE_RENDERED_REPORT_JSON);
        return report;
    }
}
