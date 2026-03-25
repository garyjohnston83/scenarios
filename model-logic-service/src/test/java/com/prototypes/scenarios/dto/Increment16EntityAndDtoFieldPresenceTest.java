package com.prototypes.scenarios.dto;

import com.prototypes.scenarios.entity.ScenarioType;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Increment 16 Task Group 2 -- Tests for entity and DTO field presence.
 * These tests verify that the new directChangesInternalRenderMode and renderMode
 * fields exist on the appropriate entities and DTO records.
 */
class Increment16EntityAndDtoFieldPresenceTest {

    // ========================================================================
    // Test 1: ScenarioType entity can get/set directChangesInternalRenderMode
    // ========================================================================

    @Test
    void scenarioTypeEntity_canGetAndSetDirectChangesInternalRenderMode() {
        ScenarioType entity = new ScenarioType();
        assertNull(entity.getDirectChangesInternalRenderMode(),
                "directChangesInternalRenderMode should be null by default");

        entity.setDirectChangesInternalRenderMode("FULL_DATA_CHANGES");
        assertEquals("FULL_DATA_CHANGES", entity.getDirectChangesInternalRenderMode(),
                "Should be able to set and retrieve FULL_DATA_CHANGES");

        entity.setDirectChangesInternalRenderMode("DELTA_BY_UNIQUE_ID");
        assertEquals("DELTA_BY_UNIQUE_ID", entity.getDirectChangesInternalRenderMode(),
                "Should be able to set and retrieve DELTA_BY_UNIQUE_ID");

        entity.setDirectChangesInternalRenderMode(null);
        assertNull(entity.getDirectChangesInternalRenderMode(),
                "Should be able to set directChangesInternalRenderMode back to null");
    }

    // ========================================================================
    // Test 2: ScenarioTypeAdminDetailDto record includes directChangesInternalRenderMode
    // ========================================================================

    @Test
    void scenarioTypeAdminDetailDto_includesDirectChangesInternalRenderModeField() {
        ScenarioTypeAdminDetailDto dto = new ScenarioTypeAdminDetailDto(
                "MARKET_DATA",
                "Market Data",
                "ChartMultiple",
                "INTERNAL",
                "INTERNAL",
                "https://example.com/dc/${scenarioId}",
                "https://example.com/impact/${scenarioId}",
                "DELTA_BY_UNIQUE_ID",
                true,
                1,
                5L,
                2L,
                3L,
                1L
        );

        assertEquals("DELTA_BY_UNIQUE_ID", dto.directChangesInternalRenderMode(),
                "ScenarioTypeAdminDetailDto should include directChangesInternalRenderMode field");
        assertEquals("MARKET_DATA", dto.code(),
                "Other fields should remain accessible");
        assertEquals("INTERNAL", dto.directChangesMode(),
                "directChangesMode should remain accessible");
        assertEquals(true, dto.isEnabled(),
                "isEnabled should remain accessible after the new field");
        assertEquals(1, dto.sortOrder(),
                "sortOrder should remain accessible after the new field");
    }

    // ========================================================================
    // Test 3: ScenarioTypeAdminDto record includes directChangesInternalRenderMode
    // ========================================================================

    @Test
    void scenarioTypeAdminDto_includesDirectChangesInternalRenderModeField() {
        ScenarioTypeAdminDto dto = new ScenarioTypeAdminDto(
                "RISK_FACTOR",
                "Risk Factor",
                "Pulse",
                "INTERNAL",
                "EXTERNAL",
                "FULL_DATA_CHANGES",
                true,
                2
        );

        assertEquals("FULL_DATA_CHANGES", dto.directChangesInternalRenderMode(),
                "ScenarioTypeAdminDto should include directChangesInternalRenderMode field");
        assertEquals("RISK_FACTOR", dto.code(),
                "Other fields should remain accessible");
        assertEquals("INTERNAL", dto.directChangesMode(),
                "directChangesMode should remain accessible");
        assertEquals("EXTERNAL", dto.impactDataMode(),
                "impactDataMode should remain accessible");
        assertEquals(true, dto.isEnabled(),
                "isEnabled should remain accessible after the new field");
        assertEquals(2, dto.sortOrder(),
                "sortOrder should remain accessible after the new field");
    }

    // ========================================================================
    // Test 4: ChangeViewDefinitionDetailDto and ChangeViewDefinitionListItemDto
    //         records include renderMode field
    // ========================================================================

    @Test
    void changeViewDefinitionDtos_includeRenderModeField() {
        UUID listItemId = UUID.fromString("11111111-1111-4111-8111-111111111101");
        LocalDateTime now = LocalDateTime.of(2026, 3, 24, 10, 0, 0);

        ChangeViewDefinitionListItemDto listItemDto = new ChangeViewDefinitionListItemDto(
                listItemId,
                "MARKET_DATA",
                "template_key_1",
                "My Change View",
                "DELTA_BY_UNIQUE_ID",
                1,
                true,
                now,
                now
        );

        assertEquals("DELTA_BY_UNIQUE_ID", listItemDto.renderMode(),
                "ChangeViewDefinitionListItemDto should include renderMode field");
        assertEquals("My Change View", listItemDto.displayName(),
                "displayName should remain accessible");
        assertEquals(1, listItemDto.version(),
                "version should remain accessible after the new renderMode field");
        assertEquals(true, listItemDto.isActive(),
                "isActive should remain accessible after the new renderMode field");

        UUID detailId = UUID.fromString("22222222-2222-4222-8222-222222222202");

        ChangeViewDefinitionDetailDto detailDto = new ChangeViewDefinitionDetailDto(
                detailId,
                "RISK_FACTOR",
                "template_key_2",
                "Another Change View",
                2,
                false,
                now,
                now,
                "{\"renderMode\": \"FULL_DATA_CHANGES\"}",
                "1.0",
                "FULL_DATA_CHANGES"
        );

        assertEquals("FULL_DATA_CHANGES", detailDto.renderMode(),
                "ChangeViewDefinitionDetailDto should include renderMode field");
        assertEquals("1.0", detailDto.schemaVersion(),
                "schemaVersion should remain accessible before renderMode");
        assertEquals("{\"renderMode\": \"FULL_DATA_CHANGES\"}", detailDto.definition(),
                "definition should remain accessible");

        // Verify null renderMode is also supported (for legacy definitions)
        ChangeViewDefinitionListItemDto legacyListItem = new ChangeViewDefinitionListItemDto(
                UUID.randomUUID(),
                "MARKET_DATA",
                "legacy_key",
                "Legacy View",
                null,
                1,
                true,
                now,
                now
        );

        assertNull(legacyListItem.renderMode(),
                "ChangeViewDefinitionListItemDto should support null renderMode for legacy definitions");

        ChangeViewDefinitionDetailDto legacyDetail = new ChangeViewDefinitionDetailDto(
                UUID.randomUUID(),
                "MARKET_DATA",
                "legacy_key",
                "Legacy View",
                1,
                true,
                now,
                now,
                "{}",
                "1.0",
                null
        );

        assertNull(legacyDetail.renderMode(),
                "ChangeViewDefinitionDetailDto should support null renderMode for legacy definitions");
    }
}
