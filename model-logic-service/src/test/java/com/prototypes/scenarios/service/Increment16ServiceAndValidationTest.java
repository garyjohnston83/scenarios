package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.ScenarioTypeAdminDetailDto;
import com.prototypes.scenarios.dto.UpdateNavigationViewModeRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Increment 16 Task Group 3 -- Tests for service logic, validation, and DTO mappers.
 * Uses @SpringBootTest with H2 so that all Liquibase seed data is available.
 * Uses @Transactional to keep the Hibernate session open and roll back after each test.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment16ServiceAndValidationTest {

    @Autowired
    private ScenarioTypeAdminService scenarioTypeAdminService;

    @Autowired
    private ChangeViewDefinitionAdminService changeViewDefinitionAdminService;

    // Use a standalone validation service instance for direct unit-test-style validation calls
    private final ChangeViewDefinitionValidationService validationService =
            new ChangeViewDefinitionValidationService(new ObjectMapper());

    // FRTB_SA is seeded with INTERNAL directChangesMode
    private static final String INTERNAL_SCENARIO_TYPE = "FRTB_SA";
    // MARKET_DATA is seeded with EXTERNAL directChangesMode
    private static final String EXTERNAL_SCENARIO_TYPE = "MARKET_DATA";

    // ========================================================================
    // Test 1: isValidInternalRenderMode() accepts FULL_DATA_CHANGES and
    //         DELTA_BY_UNIQUE_ID, rejects invalid values
    // ========================================================================

    @Test
    void updateNavigationViewMode_rejectsInvalidInternalRenderMode() {
        UpdateNavigationViewModeRequest request = new UpdateNavigationViewModeRequest(
                "INTERNAL",
                "INTERNAL",
                null,
                null,
                "INVALID_MODE"
        );

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                scenarioTypeAdminService.updateNavigationViewMode(INTERNAL_SCENARIO_TYPE, request));

        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("directChangesInternalRenderMode"),
                "Error message should reference directChangesInternalRenderMode, got: " + ex.getReason());
        assertTrue(ex.getReason().contains("FULL_DATA_CHANGES") && ex.getReason().contains("DELTA_BY_UNIQUE_ID"),
                "Error message should list valid values, got: " + ex.getReason());
    }

    // ========================================================================
    // Test 2: updateNavigationViewMode() validates directChangesInternalRenderMode
    //         when directChangesMode is INTERNAL -- accepts valid values
    // ========================================================================

    @Test
    void updateNavigationViewMode_acceptsValidInternalRenderModeWhenInternal() {
        // FULL_DATA_CHANGES should be accepted
        UpdateNavigationViewModeRequest requestFull = new UpdateNavigationViewModeRequest(
                "INTERNAL",
                "INTERNAL",
                null,
                null,
                "FULL_DATA_CHANGES"
        );
        ScenarioTypeAdminDetailDto resultFull = scenarioTypeAdminService.updateNavigationViewMode(
                INTERNAL_SCENARIO_TYPE, requestFull);
        assertEquals("FULL_DATA_CHANGES", resultFull.directChangesInternalRenderMode(),
                "Should persist FULL_DATA_CHANGES when INTERNAL mode");

        // DELTA_BY_UNIQUE_ID should be accepted
        UpdateNavigationViewModeRequest requestDelta = new UpdateNavigationViewModeRequest(
                "INTERNAL",
                "INTERNAL",
                null,
                null,
                "DELTA_BY_UNIQUE_ID"
        );
        ScenarioTypeAdminDetailDto resultDelta = scenarioTypeAdminService.updateNavigationViewMode(
                INTERNAL_SCENARIO_TYPE, requestDelta);
        assertEquals("DELTA_BY_UNIQUE_ID", resultDelta.directChangesInternalRenderMode(),
                "Should persist DELTA_BY_UNIQUE_ID when INTERNAL mode");
    }

    // ========================================================================
    // Test 3: updateNavigationViewMode() defaults to FULL_DATA_CHANGES when
    //         field is null/blank and mode is INTERNAL
    // ========================================================================

    @Test
    void updateNavigationViewMode_defaultsToFullDataChangesWhenNullAndInternal() {
        // null value
        UpdateNavigationViewModeRequest requestNull = new UpdateNavigationViewModeRequest(
                "INTERNAL",
                "INTERNAL",
                null,
                null,
                null
        );
        ScenarioTypeAdminDetailDto resultNull = scenarioTypeAdminService.updateNavigationViewMode(
                INTERNAL_SCENARIO_TYPE, requestNull);
        assertEquals("FULL_DATA_CHANGES", resultNull.directChangesInternalRenderMode(),
                "Should default to FULL_DATA_CHANGES when directChangesInternalRenderMode is null and mode is INTERNAL");

        // blank value
        UpdateNavigationViewModeRequest requestBlank = new UpdateNavigationViewModeRequest(
                "INTERNAL",
                "INTERNAL",
                null,
                null,
                "   "
        );
        ScenarioTypeAdminDetailDto resultBlank = scenarioTypeAdminService.updateNavigationViewMode(
                INTERNAL_SCENARIO_TYPE, requestBlank);
        assertEquals("FULL_DATA_CHANGES", resultBlank.directChangesInternalRenderMode(),
                "Should default to FULL_DATA_CHANGES when directChangesInternalRenderMode is blank and mode is INTERNAL");
    }

    // ========================================================================
    // Test 4: updateNavigationViewMode() accepts/ignores
    //         directChangesInternalRenderMode when mode is EXTERNAL
    // ========================================================================

    @Test
    void updateNavigationViewMode_acceptsRenderModeAsIsWhenExternal() {
        UpdateNavigationViewModeRequest request = new UpdateNavigationViewModeRequest(
                "EXTERNAL",
                "INTERNAL",
                "https://example.com/dc/${scenarioId}",
                null,
                "DELTA_BY_UNIQUE_ID"
        );
        ScenarioTypeAdminDetailDto result = scenarioTypeAdminService.updateNavigationViewMode(
                EXTERNAL_SCENARIO_TYPE, request);

        // When mode is EXTERNAL, the value is persisted as-is (no validation required)
        assertEquals("DELTA_BY_UNIQUE_ID", result.directChangesInternalRenderMode(),
                "Should persist directChangesInternalRenderMode as-is when mode is EXTERNAL");
        assertEquals("EXTERNAL", result.directChangesMode());
    }

    // ========================================================================
    // Test 5: toDetailDto() and toDto() mappers include
    //         directChangesInternalRenderMode in output
    // ========================================================================

    @Test
    void toDetailDtoAndToDto_includeDirectChangesInternalRenderMode() {
        // First set a known value via updateNavigationViewMode
        UpdateNavigationViewModeRequest request = new UpdateNavigationViewModeRequest(
                "INTERNAL",
                "INTERNAL",
                null,
                null,
                "DELTA_BY_UNIQUE_ID"
        );
        scenarioTypeAdminService.updateNavigationViewMode(INTERNAL_SCENARIO_TYPE, request);

        // toDetailDto via getDetail
        ScenarioTypeAdminDetailDto detail = scenarioTypeAdminService.getDetail(INTERNAL_SCENARIO_TYPE);
        assertEquals("DELTA_BY_UNIQUE_ID", detail.directChangesInternalRenderMode(),
                "toDetailDto should include directChangesInternalRenderMode");

        // toDto via listAll
        var allTypes = scenarioTypeAdminService.listAll();
        var frtbSa = allTypes.stream()
                .filter(t -> INTERNAL_SCENARIO_TYPE.equals(t.code()))
                .findFirst()
                .orElse(null);
        assertNotNull(frtbSa, "FRTB_SA should be in the list");
        assertEquals("DELTA_BY_UNIQUE_ID", frtbSa.directChangesInternalRenderMode(),
                "toDto should include directChangesInternalRenderMode");
    }

    // ========================================================================
    // Test 6: ChangeViewDefinitionAdminService.toListItemDto() extracts
    //         renderMode from definition JSON
    // ========================================================================

    @Test
    void changeViewDefinitionListItemDto_extractsRenderModeFromJson() {
        // List definitions for FRTB_SA -- seeded definitions have no renderMode
        var definitions = changeViewDefinitionAdminService.listDefinitions(INTERNAL_SCENARIO_TYPE);

        // Seeded definitions should have null renderMode (legacy FULL_DATA_CHANGES implicit)
        if (!definitions.isEmpty()) {
            assertNull(definitions.get(0).renderMode(),
                    "Legacy definitions without renderMode in JSON should return null renderMode in DTO");
        }

        // Create a definition with renderMode set to test extraction
        String definitionWithRenderMode = """
            {
              "schema_version": "1.0",
              "template_key": "test_render_mode_list",
              "scenario_type": "FRTB_SA",
              "display_name": "Test Render Mode List",
              "renderMode": "DELTA_BY_UNIQUE_ID",
              "dataTypes": [
                {
                  "dataTypeId": "trades",
                  "dataTypeTitle": "Trades",
                  "columnDefinitions": [
                    { "dataAttribute": "tradeId", "type": "string", "display": "Trade ID", "isEntityId": true },
                    { "dataAttribute": "amount", "type": "number", "display": "Amount" }
                  ]
                }
              ]
            }
            """;

        var created = changeViewDefinitionAdminService.createDefinition(INTERNAL_SCENARIO_TYPE,
                new com.prototypes.scenarios.dto.CreateChangeViewDefinitionRequest(
                        "test_render_mode_list", definitionWithRenderMode));

        // Re-list and find our definition
        var updatedDefinitions = changeViewDefinitionAdminService.listDefinitions(INTERNAL_SCENARIO_TYPE);
        var testDef = updatedDefinitions.stream()
                .filter(d -> "test_render_mode_list".equals(d.templateKey()))
                .findFirst()
                .orElse(null);

        assertNotNull(testDef, "Created definition should appear in list");
        assertEquals("DELTA_BY_UNIQUE_ID", testDef.renderMode(),
                "toListItemDto should extract renderMode from definition JSON");
    }

    // ========================================================================
    // Test 7: ChangeViewDefinitionAdminService.toDetailDto() extracts
    //         renderMode from definition JSON
    // ========================================================================

    @Test
    void changeViewDefinitionDetailDto_extractsRenderModeFromJson() {
        String definitionWithRenderMode = """
            {
              "schema_version": "1.0",
              "template_key": "test_render_mode_detail",
              "scenario_type": "FRTB_SA",
              "display_name": "Test Render Mode Detail",
              "renderMode": "DELTA_BY_UNIQUE_ID",
              "dataTypes": [
                {
                  "dataTypeId": "positions",
                  "dataTypeTitle": "Positions",
                  "columnDefinitions": [
                    { "dataAttribute": "posId", "type": "string", "display": "Position ID", "isEntityId": true },
                    { "dataAttribute": "value", "type": "number", "display": "Value" }
                  ]
                }
              ]
            }
            """;

        var created = changeViewDefinitionAdminService.createDefinition(INTERNAL_SCENARIO_TYPE,
                new com.prototypes.scenarios.dto.CreateChangeViewDefinitionRequest(
                        "test_render_mode_detail", definitionWithRenderMode));

        var detail = changeViewDefinitionAdminService.getDefinition(created.id());
        assertNotNull(detail);
        assertEquals("DELTA_BY_UNIQUE_ID", detail.renderMode(),
                "toDetailDto should extract renderMode from definition JSON");
        assertEquals("1.0", detail.schemaVersion(),
                "schemaVersion should still be extracted correctly");
        assertEquals("Test Render Mode Detail", detail.displayName(),
                "displayName should still be extracted correctly");
    }

    // ========================================================================
    // Test 8: ChangeViewDefinitionValidationService.validate() branches
    //         correctly by renderMode
    // ========================================================================

    @Test
    void validate_branchesCorrectlyByRenderMode() {
        // Case 1: absent renderMode -> FULL_DATA_CHANGES path (requires sections)
        String noRenderMode = """
            {
              "schema_version": "1.0",
              "template_key": "test_no_mode",
              "scenario_type": "FRTB_SA",
              "display_name": "No Mode",
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
        List<String> noModeErrors = validationService.validate(noRenderMode);
        assertTrue(noModeErrors.isEmpty(),
                "Definition without renderMode should validate via FULL_DATA_CHANGES path, got: " + noModeErrors);

        // Case 2: explicit FULL_DATA_CHANGES renderMode -> same path (requires sections)
        String fullDataMode = """
            {
              "schema_version": "1.0",
              "template_key": "test_full_mode",
              "scenario_type": "FRTB_SA",
              "display_name": "Full Mode",
              "renderMode": "FULL_DATA_CHANGES",
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
        List<String> fullModeErrors = validationService.validate(fullDataMode);
        assertTrue(fullModeErrors.isEmpty(),
                "Definition with FULL_DATA_CHANGES renderMode should validate via sections path, got: " + fullModeErrors);

        // Case 3: DELTA_BY_UNIQUE_ID renderMode -> new validation path (requires dataTypes, not sections)
        String deltaMode = """
            {
              "schema_version": "1.0",
              "template_key": "test_delta_mode",
              "scenario_type": "FRTB_SA",
              "display_name": "Delta Mode",
              "renderMode": "DELTA_BY_UNIQUE_ID",
              "dataTypes": [
                {
                  "dataTypeId": "trades",
                  "dataTypeTitle": "Trades",
                  "columnDefinitions": [
                    { "dataAttribute": "tradeId", "type": "string", "display": "Trade ID", "isEntityId": true },
                    { "dataAttribute": "amount", "type": "number", "display": "Amount" }
                  ]
                }
              ]
            }
            """;
        List<String> deltaModeErrors = validationService.validate(deltaMode);
        assertTrue(deltaModeErrors.isEmpty(),
                "Valid DELTA_BY_UNIQUE_ID definition should produce no errors, got: " + deltaModeErrors);

        // Case 4: invalid renderMode value -> error
        String invalidMode = """
            {
              "schema_version": "1.0",
              "template_key": "test_invalid_mode",
              "scenario_type": "FRTB_SA",
              "display_name": "Invalid Mode",
              "renderMode": "UNKNOWN_MODE"
            }
            """;
        List<String> invalidModeErrors = validationService.validate(invalidMode);
        assertTrue(invalidModeErrors.stream().anyMatch(e -> e.contains("renderMode") && e.contains("FULL_DATA_CHANGES") && e.contains("DELTA_BY_UNIQUE_ID")),
                "Invalid renderMode should produce an error listing valid values, got: " + invalidModeErrors);

        // Case 5: DELTA_BY_UNIQUE_ID without dataTypes -> error
        String deltaMissingDataTypes = """
            {
              "schema_version": "1.0",
              "template_key": "test_delta_missing",
              "scenario_type": "FRTB_SA",
              "display_name": "Delta Missing DataTypes",
              "renderMode": "DELTA_BY_UNIQUE_ID"
            }
            """;
        List<String> missingErrors = validationService.validate(deltaMissingDataTypes);
        assertTrue(missingErrors.stream().anyMatch(e -> e.contains("dataTypes") && e.contains("must be present")),
                "DELTA_BY_UNIQUE_ID without dataTypes should report error, got: " + missingErrors);
    }
}
