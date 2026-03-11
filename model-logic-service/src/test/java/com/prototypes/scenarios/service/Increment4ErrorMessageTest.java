package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.prototypes.scenarios.dto.ImpactReportDetailDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Increment 4, Task Group 1 -- Tests for the errorMessage field on ImpactReportDetailDto.
 *
 * Uses the full Spring context with H2 in PostgreSQL compatibility mode
 * so that all Liquibase changesets and seed data are available.
 *
 * Seed data used:
 * - Report 011: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011 (GENERATED, market_risk_summary, belongs to scenario A)
 *   -> errorMessage should be null, renderedReport should be populated
 * - Report 002: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002 (FAILED, sa_capital_summary, belongs to scenario C)
 *   -> errorMessage should be "Data provider timeout: unable to fetch risk charge data within 30s"
 *   -> renderedReport should be null
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment4ErrorMessageTest {

    @Autowired
    private ImpactReportService impactReportService;

    // Scenario A: MARKET_DATA scenario with seed report 011 (GENERATED)
    private static final UUID SCENARIO_A_ID =
            UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // Scenario C: FRTB_SA scenario with seed report 002 (FAILED)
    private static final UUID SCENARIO_C_ID =
            UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");

    // Seed report 011: GENERATED, belongs to scenario A
    private static final UUID SEED_REPORT_011_ID =
            UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb011");

    // Seed report 002: FAILED, belongs to scenario C
    private static final UUID SEED_REPORT_002_ID =
            UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002");

    // ========================================================================
    // Test 1: GENERATED report returns errorMessage: null in the detail DTO
    // ========================================================================

    @Test
    void getReportDetail_generatedReport_returnsErrorMessageNull() {
        ImpactReportDetailDto detail = impactReportService.getReportDetail(SCENARIO_A_ID, SEED_REPORT_011_ID);

        assertNotNull(detail, "Detail DTO should not be null");
        assertEquals("GENERATED", detail.status(), "Status should be GENERATED");

        // errorMessage should be null for a GENERATED report
        assertNull(detail.errorMessage(),
                "errorMessage should be null for a GENERATED report");

        // renderedReport should be populated for a GENERATED report
        assertNotNull(detail.renderedReport(),
                "renderedReport should not be null for a GENERATED report");
        assertInstanceOf(JsonNode.class, detail.renderedReport(),
                "renderedReport should be a parsed JsonNode");
    }

    // ========================================================================
    // Test 2: FAILED report returns errorMessage with the stored error string
    // ========================================================================

    @Test
    void getReportDetail_failedReport_returnsErrorMessageWithStoredErrorString() {
        ImpactReportDetailDto detail = impactReportService.getReportDetail(SCENARIO_C_ID, SEED_REPORT_002_ID);

        assertNotNull(detail, "Detail DTO should not be null");
        assertEquals("FAILED", detail.status(), "Status should be FAILED");

        // errorMessage should contain the stored error string
        assertNotNull(detail.errorMessage(),
                "errorMessage should not be null for a FAILED report");
        assertEquals("Data provider timeout: unable to fetch risk charge data within 30s",
                detail.errorMessage(),
                "errorMessage should match the seed data error string");

        // renderedReport should be null for a FAILED report
        assertNull(detail.renderedReport(),
                "renderedReport should be null for a FAILED report");
    }
}
