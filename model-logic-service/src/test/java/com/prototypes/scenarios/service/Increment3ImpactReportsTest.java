package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.ImpactDataDto;
import com.prototypes.scenarios.dto.ImpactReportDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Increment 3 -- Tests for multi-report buildImpactData() (Task 7.1).
 *
 * Uses @SpringBootTest with H2 so that all Liquibase seed data is available.
 * Uses @Transactional to keep the Hibernate session open during each test.
 *
 * Scenarios from seed data:
 * - Scenario 1 (FX Curve): MARKET_DATA type (EXTERNAL mode after migration 024), 1 impact run, 1 dataset
 * - Scenario 2 (IR Vol): MARKET_DATA type (EXTERNAL mode), 2 impact runs, 2 datasets
 * - Scenario 3 (Credit Spread): RISK_FACTOR type (EXTERNAL mode), 1 impact run, 1 dataset
 * - Scenario 4 (SA Capital): FRTB_SA type (INTERNAL mode), 1 impact run, 1 dataset
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment3ImpactReportsTest {

    @Autowired
    private ScenarioDetailService scenarioDetailService;

    // Scenario 1: FX Curve Recalibration -- MARKET_DATA type (EXTERNAL after migration 024)
    private static final UUID FX_CURVE_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // Scenario 2: IR Vol Surface Update -- MARKET_DATA type (EXTERNAL after migration 024)
    private static final UUID IR_VOL_SCENARIO_ID = UUID.fromString("b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e");

    // Scenario 3: Credit Spread Adjustment -- RISK_FACTOR type (EXTERNAL after migration 024)
    private static final UUID CREDIT_SPREAD_SCENARIO_ID = UUID.fromString("c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f");

    // Scenario 4: SA Capital Recalculation -- FRTB_SA type (INTERNAL mode)
    private static final UUID SA_CAPITAL_SCENARIO_ID = UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");

    // ========================================================================
    // Test 1: Single report scenario -- FRTB_SA (INTERNAL) with 1 impact run
    // ========================================================================

    @Test
    void buildImpactData_singleReport_returnsOneReportInArray() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                SA_CAPITAL_SCENARIO_ID, Set.of("impactData"));

        assertTrue(result.isPresent());
        ScenarioDetailDto dto = result.get();
        ImpactDataDto impactData = dto.impactData();
        assertNotNull(impactData, "impactData should be populated when expand=impactData");

        List<ImpactReportDto> reports = impactData.reports();
        assertNotNull(reports, "reports list should not be null");
        assertEquals(1, reports.size(), "Scenario 4 (FRTB_SA) should have 1 report");

        ImpactReportDto report = reports.get(0);
        assertNotNull(report.impactRunId(), "impactRunId should not be null");
        assertNotNull(report.name(), "name should not be null");
        assertNotNull(report.createdAt(), "createdAt should not be null");
        assertNotNull(report.dataset(), "dataset should not be null");
        assertNotNull(report.dataset().columns(), "dataset.columns should not be null");
        assertNotNull(report.dataset().rows(), "dataset.rows should not be null");
        assertTrue(report.dataset().columns().size() > 0, "dataset.columns should not be empty");
        assertTrue(report.dataset().rows().size() > 0, "dataset.rows should not be empty");
    }

    // ========================================================================
    // Test 2: EXTERNAL guard -- MARKET_DATA/RISK_FACTOR types return 400
    // ========================================================================

    @Test
    void buildImpactData_externalMode_returns400BadRequest() {
        // Scenario 1 is MARKET_DATA type which has EXTERNAL impactDataMode after migration 024
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                scenarioDetailService.getScenarioDetail(FX_CURVE_SCENARIO_ID, Set.of("impactData")));

        assertEquals(400, ex.getStatusCode().value(),
                "EXTERNAL mode should return 400 Bad Request");
        assertTrue(ex.getReason() != null && ex.getReason().contains("impactData expand not supported"),
                "Error message should explain the rejection");
    }

    @Test
    void buildImpactData_riskFactorExternalMode_returns400BadRequest() {
        // Scenario 3 is RISK_FACTOR type which has EXTERNAL impactDataMode after migration 024
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                scenarioDetailService.getScenarioDetail(CREDIT_SPREAD_SCENARIO_ID, Set.of("impactData")));

        assertEquals(400, ex.getStatusCode().value(),
                "RISK_FACTOR EXTERNAL mode should return 400 Bad Request");
    }

    // ========================================================================
    // Test 3: Report fields are correctly populated
    // ========================================================================

    @Test
    void buildImpactData_reportFields_correctlyPopulated() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                SA_CAPITAL_SCENARIO_ID, Set.of("impactData"));

        assertTrue(result.isPresent());
        ImpactReportDto report = result.get().impactData().reports().get(0);

        // impactRunId should match the impact run linked to the dataset
        assertEquals("55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa", report.impactRunId(),
                "impactRunId should come from the ImpactRun entity");

        // name should be the run_ref
        assertEquals("RUN-2026-0221-004", report.name(),
                "name should come from ImpactRun.runRef");

        // dataset columns should match the seed data
        assertTrue(report.dataset().columns().contains("Risk Class"),
                "columns should include 'Risk Class' from seed data");
    }

    // ========================================================================
    // Test 4: expand=impactData returns the reports[] shape
    // ========================================================================

    @Test
    void buildImpactData_expandImpactData_returnsReportsArrayShape() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                SA_CAPITAL_SCENARIO_ID, Set.of("impactData"));

        assertTrue(result.isPresent());
        ScenarioDetailDto dto = result.get();

        // The response should contain impactData with reports[] structure
        assertNotNull(dto.impactData(), "impactData section should be present");
        assertNotNull(dto.impactData().reports(), "reports array should be present");

        // Verify the report contains the expected nested structure
        ImpactReportDto report = dto.impactData().reports().get(0);
        assertNotNull(report.dataset(), "dataset should be nested inside report");
        assertNotNull(report.dataset().columns(), "columns should be nested inside dataset");
        assertNotNull(report.dataset().rows(), "rows should be nested inside dataset");
    }

    // ========================================================================
    // Test 5: Rows contain proper GridRowDto data
    // ========================================================================

    @Test
    void buildImpactData_rows_containProperPayloadData() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                SA_CAPITAL_SCENARIO_ID, Set.of("impactData"));

        assertTrue(result.isPresent());
        ImpactReportDto report = result.get().impactData().reports().get(0);

        // Rows should have deserialized payload data
        assertTrue(report.dataset().rows().size() >= 2,
                "Should have at least 2 data rows from seed data");
        assertNotNull(report.dataset().rows().get(0).rowId(),
                "Each row should have a rowId");
        assertNotNull(report.dataset().rows().get(0).payload(),
                "Each row should have a payload map");
    }

    // ========================================================================
    // Test 6: impactData is null when not requested in expand
    // ========================================================================

    @Test
    void getScenarioDetail_noImpactDataExpand_returnsNullImpactData() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                SA_CAPITAL_SCENARIO_ID, Set.of("header"));

        assertTrue(result.isPresent());
        assertNull(result.get().impactData(),
                "impactData should be null when not included in expand sections");
    }
}
