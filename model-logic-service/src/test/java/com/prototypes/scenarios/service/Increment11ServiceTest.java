package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.DirectChangesDto;
import com.prototypes.scenarios.dto.GridRowDto;
import com.prototypes.scenarios.dto.ImpactDataDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for Increment 11 service-layer behavior (Task Group 3).
 * Uses @SpringBootTest with H2 so that all Liquibase seed data is available.
 * Uses @Transactional to keep the Hibernate session open during each test.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment11ServiceTest {

    @Autowired
    private ScenarioDetailService scenarioDetailService;

    // FRTB_SA scenario seeded in changeset 017 -- GRID/GRID modes
    private static final UUID SA_SCENARIO_ID = UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");

    // FX Curve Recalibration -- MARKET_DATA type, LINK_OUT/LINK_OUT modes
    private static final UUID MD_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    // ========================================================================
    // Test 1: ScenarioDetailService returns DirectChangesDto with correct
    //         columns and 5 rows when expand=directChanges for FRTB_SA scenario
    // ========================================================================

    @Test
    void getScenarioDetail_expandDirectChanges_gridMode_returnsDirectChangesDtoWithColumnsAndRows() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                SA_SCENARIO_ID, Set.of("directChanges"));

        assertTrue(result.isPresent());
        ScenarioDetailDto dto = result.get();
        DirectChangesDto directChanges = dto.directChanges();
        assertNotNull(directChanges, "directChanges should be populated when expand=directChanges for GRID mode");

        assertEquals(6, directChanges.columns().size(), "Should have 6 columns");
        assertEquals("Risk Factor", directChanges.columns().get(0));
        assertEquals("Risk Class", directChanges.columns().get(1));
        assertEquals("Sensitivity Type", directChanges.columns().get(2));
        assertEquals("Current Value", directChanges.columns().get(3));
        assertEquals("Proposed Value", directChanges.columns().get(4));
        assertEquals("Delta", directChanges.columns().get(5));

        assertEquals(5, directChanges.rows().size(), "Should have 5 rows");
    }

    // ========================================================================
    // Test 2: ScenarioDetailService returns ImpactDataDto with correct columns,
    //         5 rows, and compareCta when expand=impactData for FRTB_SA scenario
    // ========================================================================

    @Test
    void getScenarioDetail_expandImpactData_gridMode_returnsImpactDataDtoWithColumnsRowsAndCompareCta() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                SA_SCENARIO_ID, Set.of("impactData"));

        assertTrue(result.isPresent());
        ScenarioDetailDto dto = result.get();
        ImpactDataDto impactData = dto.impactData();
        assertNotNull(impactData, "impactData should be populated when expand=impactData for GRID mode");

        assertEquals(5, impactData.columns().size(), "Should have 5 columns");
        assertEquals("Risk Class", impactData.columns().get(0));
        assertEquals("Risk Measure", impactData.columns().get(1));
        assertEquals("Base Value", impactData.columns().get(2));
        assertEquals("Stressed Value", impactData.columns().get(3));
        assertEquals("Capital Charge", impactData.columns().get(4));

        assertEquals(5, impactData.rows().size(), "Should have 5 rows");

        assertNotNull(impactData.compareCta(), "compareCta should be populated from COMPARE link");
        assertEquals("Compare results", impactData.compareCta().label());
        assertTrue(impactData.compareCta().url().contains("compare"),
                "compareCta url should contain 'compare'");
    }

    // ========================================================================
    // Test 3: ScenarioDetailService throws ResponseStatusException(400)
    //         when expand=directChanges requested for a LINK_OUT-mode scenario
    // ========================================================================

    @Test
    void getScenarioDetail_expandDirectChanges_linkOutMode_throws400() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                scenarioDetailService.getScenarioDetail(MD_SCENARIO_ID, Set.of("directChanges")));

        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("directChanges expand not supported for LINK_OUT mode"));
    }

    // ========================================================================
    // Test 4: ScenarioDetailService throws ResponseStatusException(400)
    //         when expand=impactData requested for a LINK_OUT-mode scenario
    // ========================================================================

    @Test
    void getScenarioDetail_expandImpactData_linkOutMode_throws400() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                scenarioDetailService.getScenarioDetail(MD_SCENARIO_ID, Set.of("impactData")));

        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("impactData expand not supported for LINK_OUT mode"));
    }

    // ========================================================================
    // Test 5: ScenarioDetailService returns null directChanges/impactData
    //         when those sections are not in expandSections
    // ========================================================================

    @Test
    void getScenarioDetail_noGridExpandSections_returnsNullDirectChangesAndImpactData() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                SA_SCENARIO_ID, Set.of("header"));

        assertTrue(result.isPresent());
        ScenarioDetailDto dto = result.get();
        assertNull(dto.directChanges(), "directChanges should be null when not in expandSections");
        assertNull(dto.impactData(), "impactData should be null when not in expandSections");
    }

    // ========================================================================
    // Test 6: GridRowDto payload contains expected key-value pairs from seed data
    // ========================================================================

    @Test
    void getScenarioDetail_expandDirectChanges_gridRowPayloadContainsExpectedKeyValuePairs() {
        Optional<ScenarioDetailDto> result = scenarioDetailService.getScenarioDetail(
                SA_SCENARIO_ID, Set.of("directChanges"));

        assertTrue(result.isPresent());
        DirectChangesDto directChanges = result.get().directChanges();
        assertNotNull(directChanges);

        // First row should be FX_USDJPY based on seed data ordering
        GridRowDto firstRow = directChanges.rows().get(0);
        assertNotNull(firstRow.rowId(), "rowId should not be null");
        Map<String, Object> payload = firstRow.payload();
        assertEquals("FX_USDJPY", payload.get("Risk Factor"));
        assertEquals("FX", payload.get("Risk Class"));
        assertEquals("Delta", payload.get("Sensitivity Type"));
        // Numeric values from seed data
        assertNotNull(payload.get("Current Value"), "Current Value should be present");
        assertNotNull(payload.get("Proposed Value"), "Proposed Value should be present");
        assertNotNull(payload.get("Delta"), "Delta should be present");
    }
}
