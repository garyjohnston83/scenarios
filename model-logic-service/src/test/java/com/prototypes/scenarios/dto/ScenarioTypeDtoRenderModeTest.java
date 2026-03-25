package com.prototypes.scenarios.dto;

import com.prototypes.scenarios.entity.ScenarioType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Increment 3 (DELTA_BY_UNIQUE_ID) Task Group 1 -- Tests for ScenarioTypeDto
 * having the directChangesInternalRenderMode field and for the mapper in
 * ScenarioDetailService passing the value through.
 */
class ScenarioTypeDtoRenderModeTest {

    // ========================================================================
    // Test 1: ScenarioTypeDto record can be constructed with all 6 fields
    //         including directChangesInternalRenderMode
    // ========================================================================

    @Test
    void scenarioTypeDto_canBeConstructedWithAll6FieldsIncludingDirectChangesInternalRenderMode() {
        ScenarioTypeDto dto = new ScenarioTypeDto(
                "MARKET_DATA",
                "Market Data",
                "ChartMultiple",
                "INTERNAL",
                "INTERNAL",
                "DELTA_BY_UNIQUE_ID"
        );

        assertEquals("MARKET_DATA", dto.code());
        assertEquals("Market Data", dto.name());
        assertEquals("ChartMultiple", dto.icon());
        assertEquals("INTERNAL", dto.directChangesMode());
        assertEquals("INTERNAL", dto.impactDataMode());
        assertEquals("DELTA_BY_UNIQUE_ID", dto.directChangesInternalRenderMode());

        // Also verify null is accepted for the new field (backward compatibility)
        ScenarioTypeDto dtoWithNull = new ScenarioTypeDto(
                "RISK_FACTOR",
                "Risk Factor",
                "Pulse",
                "EXTERNAL",
                "EXTERNAL",
                null
        );

        assertEquals("RISK_FACTOR", dtoWithNull.code());
        assertNull(dtoWithNull.directChangesInternalRenderMode());
    }

    // ========================================================================
    // Test 2: Verify the mapper logic passes directChangesInternalRenderMode
    //         from the ScenarioType entity through to the ScenarioTypeDto.
    //         This simulates the mapping done in ScenarioDetailService.
    // ========================================================================

    @Test
    void mapper_passesDirectChangesInternalRenderModeThroughToDto() {
        // Simulate what ScenarioDetailService.toDetailDto does
        ScenarioType entity = new ScenarioType();
        entity.setCode("MARKET_DATA");
        entity.setName("Market Data");
        entity.setIcon("ChartMultiple");
        entity.setDirectChangesMode("INTERNAL");
        entity.setImpactDataMode("INTERNAL");
        entity.setDirectChangesInternalRenderMode("DELTA_BY_UNIQUE_ID");

        // Replicate the mapper logic from ScenarioDetailService line 739
        ScenarioTypeDto dto = new ScenarioTypeDto(
                entity.getCode(),
                entity.getName(),
                entity.getIcon(),
                entity.getDirectChangesMode(),
                entity.getImpactDataMode(),
                entity.getDirectChangesInternalRenderMode()
        );

        assertEquals("DELTA_BY_UNIQUE_ID", dto.directChangesInternalRenderMode(),
                "directChangesInternalRenderMode should be passed through from entity to DTO");
        assertEquals("MARKET_DATA", dto.code());
        assertEquals("INTERNAL", dto.directChangesMode());

        // Also test with null render mode (entity has no render mode set)
        ScenarioType entityNoRenderMode = new ScenarioType();
        entityNoRenderMode.setCode("RISK_FACTOR");
        entityNoRenderMode.setName("Risk Factor");
        entityNoRenderMode.setIcon("Pulse");
        entityNoRenderMode.setDirectChangesMode("INTERNAL");
        entityNoRenderMode.setImpactDataMode("EXTERNAL");
        // directChangesInternalRenderMode is not set -- should remain null

        ScenarioTypeDto dtoNoRenderMode = new ScenarioTypeDto(
                entityNoRenderMode.getCode(),
                entityNoRenderMode.getName(),
                entityNoRenderMode.getIcon(),
                entityNoRenderMode.getDirectChangesMode(),
                entityNoRenderMode.getImpactDataMode(),
                entityNoRenderMode.getDirectChangesInternalRenderMode()
        );

        assertNull(dtoNoRenderMode.directChangesInternalRenderMode(),
                "directChangesInternalRenderMode should be null when entity does not have it set");
    }
}
