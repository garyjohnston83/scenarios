package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.ScenarioTypeAdminDetailDto;
import com.prototypes.scenarios.dto.UpdateNavigationViewModeRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Increment 16 Task Group 6 -- Gap tests filling critical coverage holes
 * identified during test review of Task Groups 1-5.
 *
 * Uses @SpringBootTest with H2 so all Liquibase seed data is available.
 * Uses @Transactional to roll back after each test.
 *
 * Tests in this file (7 total):
 * 1. DELTA_BY_UNIQUE_ID with duplicate dataTypeId produces error
 * 2. DELTA_BY_UNIQUE_ID missing isEntityId:true column produces error
 * 3. DELTA_BY_UNIQUE_ID with invalid sortOrdering.dataAttribute reference produces error
 * 4. DELTA_BY_UNIQUE_ID with rowThreshold but missing overflowMessage produces error
 * 5. Existing FULL_DATA_CHANGES definitions (no renderMode field) still validate unchanged
 * 6. toListItemDto() returns renderMode: null for legacy definitions without renderMode
 * 7. Full save-round-trip: updateNavigationViewMode persists and returns directChangesInternalRenderMode via getDetail
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment16GapTest {

    @Autowired
    private ScenarioTypeAdminService scenarioTypeAdminService;

    @Autowired
    private ChangeViewDefinitionAdminService changeViewDefinitionAdminService;

    // Standalone validation service for direct unit-test-style validation calls
    private final ChangeViewDefinitionValidationService validationService =
            new ChangeViewDefinitionValidationService(new ObjectMapper());

    private static final String INTERNAL_SCENARIO_TYPE = "FRTB_SA";

    // ========================================================================
    // Gap Test 1: DELTA_BY_UNIQUE_ID definition with duplicate dataTypeId
    //             produces error
    // ========================================================================

    @Test
    void validate_deltaByUniqueId_duplicateDataTypeId_producesError() {
        String json = """
            {
              "schema_version": "1.0",
              "template_key": "gap_dup_dtid",
              "scenario_type": "FRTB_SA",
              "display_name": "Duplicate DataTypeId",
              "renderMode": "DELTA_BY_UNIQUE_ID",
              "dataTypes": [
                {
                  "dataTypeId": "trades",
                  "dataTypeTitle": "Trades",
                  "columnDefinitions": [
                    { "dataAttribute": "tradeId", "type": "string", "display": "Trade ID", "isEntityId": true }
                  ]
                },
                {
                  "dataTypeId": "trades",
                  "dataTypeTitle": "Trades Again",
                  "columnDefinitions": [
                    { "dataAttribute": "posId", "type": "string", "display": "Position ID", "isEntityId": true }
                  ]
                }
              ]
            }
            """;

        List<String> errors = validationService.validate(json);
        assertFalse(errors.isEmpty(), "Should produce at least one error for duplicate dataTypeId");
        assertTrue(errors.stream().anyMatch(e -> e.contains("Duplicate dataTypeId") && e.contains("trades")),
                "Should report duplicate dataTypeId 'trades', got: " + errors);
    }

    // ========================================================================
    // Gap Test 2: DELTA_BY_UNIQUE_ID definition missing isEntityId:true
    //             column produces error
    // ========================================================================

    @Test
    void validate_deltaByUniqueId_missingIsEntityId_producesError() {
        String json = """
            {
              "schema_version": "1.0",
              "template_key": "gap_no_entity_id",
              "scenario_type": "FRTB_SA",
              "display_name": "Missing EntityId",
              "renderMode": "DELTA_BY_UNIQUE_ID",
              "dataTypes": [
                {
                  "dataTypeId": "trades",
                  "dataTypeTitle": "Trades",
                  "columnDefinitions": [
                    { "dataAttribute": "tradeId", "type": "string", "display": "Trade ID" },
                    { "dataAttribute": "amount", "type": "number", "display": "Amount" }
                  ]
                }
              ]
            }
            """;

        List<String> errors = validationService.validate(json);
        assertFalse(errors.isEmpty(), "Should produce an error when no column has isEntityId: true");
        assertTrue(errors.stream().anyMatch(e -> e.contains("isEntityId")),
                "Should report missing isEntityId: true column, got: " + errors);
    }

    // ========================================================================
    // Gap Test 3: DELTA_BY_UNIQUE_ID definition with invalid
    //             sortOrdering.dataAttribute reference produces error
    // ========================================================================

    @Test
    void validate_deltaByUniqueId_invalidSortOrderingReference_producesError() {
        String json = """
            {
              "schema_version": "1.0",
              "template_key": "gap_bad_sort",
              "scenario_type": "FRTB_SA",
              "display_name": "Invalid Sort Reference",
              "renderMode": "DELTA_BY_UNIQUE_ID",
              "dataTypes": [
                {
                  "dataTypeId": "trades",
                  "dataTypeTitle": "Trades",
                  "columnDefinitions": [
                    { "dataAttribute": "tradeId", "type": "string", "display": "Trade ID", "isEntityId": true },
                    { "dataAttribute": "amount", "type": "number", "display": "Amount" }
                  ],
                  "sortOrdering": {
                    "dataAttribute": "nonExistentColumn",
                    "direction": "ASC"
                  }
                }
              ]
            }
            """;

        List<String> errors = validationService.validate(json);
        assertFalse(errors.isEmpty(), "Should produce an error when sortOrdering.dataAttribute references a non-existent column");
        assertTrue(errors.stream().anyMatch(e -> e.contains("sortOrdering.dataAttribute") && e.contains("nonExistentColumn")),
                "Should report invalid sort ordering reference, got: " + errors);
    }

    // ========================================================================
    // Gap Test 4: DELTA_BY_UNIQUE_ID definition with rowThreshold but
    //             missing overflowMessage produces error
    // ========================================================================

    @Test
    void validate_deltaByUniqueId_rowThresholdWithoutOverflowMessage_producesError() {
        String json = """
            {
              "schema_version": "1.0",
              "template_key": "gap_no_overflow",
              "scenario_type": "FRTB_SA",
              "display_name": "Missing Overflow",
              "renderMode": "DELTA_BY_UNIQUE_ID",
              "dataTypes": [
                {
                  "dataTypeId": "trades",
                  "dataTypeTitle": "Trades",
                  "columnDefinitions": [
                    { "dataAttribute": "tradeId", "type": "string", "display": "Trade ID", "isEntityId": true }
                  ],
                  "rowThreshold": 100
                }
              ]
            }
            """;

        List<String> errors = validationService.validate(json);
        assertFalse(errors.isEmpty(), "Should produce an error when rowThreshold is set but overflowMessage is missing");
        assertTrue(errors.stream().anyMatch(e -> e.contains("overflowMessage") && e.contains("required")),
                "Should report that overflowMessage is required when rowThreshold is set, got: " + errors);
    }

    // ========================================================================
    // Gap Test 5: Existing FULL_DATA_CHANGES definitions (no renderMode
    //             field) still validate unchanged -- backward compatibility
    // ========================================================================

    @Test
    void validate_legacyDefinitionWithoutRenderMode_validatesViaExistingSectionsPath() {
        // This is a complete, valid FULL_DATA_CHANGES definition with no renderMode field.
        // It must continue to validate successfully (backward compatibility).
        String json = """
            {
              "schema_version": "1.0",
              "template_key": "gap_legacy_compat",
              "scenario_type": "FRTB_SA",
              "display_name": "Legacy Compatible",
              "description": "A traditional sections-based definition",
              "metadata": {
                "author": "test",
                "tags": ["legacy"]
              },
              "sections": [
                {
                  "key": "overview",
                  "title": "Overview",
                  "order": 1,
                  "contentBlocks": [
                    { "blockType": "text", "key": "intro", "content": "Introduction text." }
                  ]
                },
                {
                  "key": "data",
                  "title": "Data Table",
                  "order": 2,
                  "contentBlocks": [
                    {
                      "blockType": "table",
                      "key": "main_table",
                      "label": "Main Data",
                      "rowColumns": [{ "key": "row_id", "header": "Row ID" }],
                      "columnGroups": [
                        {
                          "groupLabel": "Values",
                          "columns": [{ "key": "val", "header": "Value" }]
                        }
                      ],
                      "rows": [
                        {
                          "rowId": "r1",
                          "cells": {
                            "val": { "value": "123" }
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
            """;

        List<String> errors = validationService.validate(json);
        assertTrue(errors.isEmpty(),
                "Legacy definition without renderMode should validate with zero errors, got: " + errors);
    }

    // ========================================================================
    // Gap Test 6: toListItemDto() returns renderMode: null for legacy
    //             definitions without renderMode in JSON
    // ========================================================================

    @Test
    void toListItemDto_legacyDefinitionWithoutRenderMode_returnsNullRenderMode() {
        // Create a definition without any renderMode in the JSON (legacy behavior)
        String legacyJson = """
            {
              "schema_version": "1.0",
              "template_key": "gap_legacy_list",
              "scenario_type": "FRTB_SA",
              "display_name": "Legacy List Item",
              "sections": [
                {
                  "key": "s1",
                  "title": "Section 1",
                  "order": 1,
                  "contentBlocks": [
                    { "blockType": "text", "key": "t1", "content": "Hello" }
                  ]
                }
              ]
            }
            """;

        var created = changeViewDefinitionAdminService.createDefinition(INTERNAL_SCENARIO_TYPE,
                new com.prototypes.scenarios.dto.CreateChangeViewDefinitionRequest(
                        "gap_legacy_list", legacyJson));

        // Get it via list and verify renderMode is null
        var definitions = changeViewDefinitionAdminService.listDefinitions(INTERNAL_SCENARIO_TYPE);
        var legacyDef = definitions.stream()
                .filter(d -> "gap_legacy_list".equals(d.templateKey()))
                .findFirst()
                .orElse(null);

        assertFalse(definitions.isEmpty(), "Should have at least the created definition");
        assertNull(legacyDef.renderMode(),
                "toListItemDto should return null renderMode for definitions without renderMode in JSON");

        // Also verify via detail DTO
        var detail = changeViewDefinitionAdminService.getDefinition(created.id());
        assertNull(detail.renderMode(),
                "toDetailDto should return null renderMode for definitions without renderMode in JSON");
    }

    // ========================================================================
    // Gap Test 7: Full save-round-trip: updateNavigationViewMode persists
    //             directChangesInternalRenderMode, which is then retrievable
    //             via getDetail in a separate call
    // ========================================================================

    @Test
    void fullRoundTrip_updateAndRetrieveDirectChangesInternalRenderMode() {
        // 1. Set to DELTA_BY_UNIQUE_ID via updateNavigationViewMode
        UpdateNavigationViewModeRequest requestDelta = new UpdateNavigationViewModeRequest(
                "INTERNAL",
                "INTERNAL",
                null,
                null,
                "DELTA_BY_UNIQUE_ID"
        );
        ScenarioTypeAdminDetailDto updateResult = scenarioTypeAdminService.updateNavigationViewMode(
                INTERNAL_SCENARIO_TYPE, requestDelta);
        assertEquals("DELTA_BY_UNIQUE_ID", updateResult.directChangesInternalRenderMode(),
                "Update response should contain DELTA_BY_UNIQUE_ID");

        // 2. Retrieve via getDetail (separate call, separate DTO construction)
        ScenarioTypeAdminDetailDto detail = scenarioTypeAdminService.getDetail(INTERNAL_SCENARIO_TYPE);
        assertEquals("DELTA_BY_UNIQUE_ID", detail.directChangesInternalRenderMode(),
                "getDetail should return DELTA_BY_UNIQUE_ID after save");

        // 3. Switch back to FULL_DATA_CHANGES
        UpdateNavigationViewModeRequest requestFull = new UpdateNavigationViewModeRequest(
                "INTERNAL",
                "INTERNAL",
                null,
                null,
                "FULL_DATA_CHANGES"
        );
        scenarioTypeAdminService.updateNavigationViewMode(INTERNAL_SCENARIO_TYPE, requestFull);

        // 4. Verify via getDetail again
        ScenarioTypeAdminDetailDto detailAfterSwitch = scenarioTypeAdminService.getDetail(INTERNAL_SCENARIO_TYPE);
        assertEquals("FULL_DATA_CHANGES", detailAfterSwitch.directChangesInternalRenderMode(),
                "getDetail should return FULL_DATA_CHANGES after switching back");

        // 5. Also verify via listAll (toDto mapper)
        var allTypes = scenarioTypeAdminService.listAll();
        var frtbSa = allTypes.stream()
                .filter(t -> INTERNAL_SCENARIO_TYPE.equals(t.code()))
                .findFirst()
                .orElse(null);
        assertEquals("FULL_DATA_CHANGES", frtbSa.directChangesInternalRenderMode(),
                "listAll toDto mapper should reflect updated value");
    }
}
