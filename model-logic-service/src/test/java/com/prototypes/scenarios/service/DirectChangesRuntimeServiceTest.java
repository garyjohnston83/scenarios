package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.DirectChangesDataSection;
import com.prototypes.scenarios.dto.DirectChangesRuntimeResponseDto;
import com.prototypes.scenarios.entity.ChangeViewDefinition;
import com.prototypes.scenarios.entity.Scenario;
import com.prototypes.scenarios.entity.ScenarioType;
import com.prototypes.scenarios.repository.ChangeViewDefinitionRepository;
import com.prototypes.scenarios.repository.ScenarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit tests for DirectChangesRuntimeService.
 * Uses Mockito for fast, isolated tests with mocked dependencies.
 */
@ExtendWith(MockitoExtension.class)
class DirectChangesRuntimeServiceTest {

    @Mock
    private ScenarioRepository scenarioRepository;

    @Mock
    private ChangeViewDefinitionRepository changeViewDefinitionRepository;

    @Mock
    private DirectChangesViewDataProvider provider;

    private ObjectMapper objectMapper;
    private DirectChangesRuntimeService service;

    private static final UUID SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    private static final String SCENARIO_TYPE_CODE = "MARKET_DATA";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new DirectChangesRuntimeService(
                scenarioRepository,
                changeViewDefinitionRepository,
                objectMapper,
                provider
        );
    }

    // ========================================================================
    // Test 1: Successful DELTA_BY_UNIQUE_ID flow
    // ========================================================================

    @Test
    void getDirectChanges_successfulDeltaByUniqueIdFlow_returnsExpectedSections() {
        // Arrange: scenario with INTERNAL mode + DELTA_BY_UNIQUE_ID render mode
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        // Active definition with one section
        ChangeViewDefinition definition = buildDefinition("""
                {
                  "renderMode": "DELTA_BY_UNIQUE_ID",
                  "dataTypes": [
                    {
                      "dataTypeId": "timeSeriesValues",
                      "dataTypeTitle": "Time-Series Values",
                      "headerSummaryTextTemplate": "${changedValuesCount} points changed for ${changedEntitiesCount} series",
                      "columnDefinitions": [
                        { "dataAttribute": "tsName", "type": "string", "display": "TS Name", "isEntityId": true },
                        { "dataAttribute": "date", "type": "date", "display": "Date" },
                        { "dataAttribute": "cur", "type": "number", "display": "Current" },
                        { "dataAttribute": "new", "type": "number", "display": "New" }
                      ],
                      "sortOrdering": { "dataAttribute": "tsName", "direction": "ASC" },
                      "rowThreshold": 100
                    }
                  ]
                }
                """);
        when(changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(SCENARIO_TYPE_CODE))
                .thenReturn(List.of(definition));

        // Provider returns 3 rows with 2 distinct tsName values
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(tsRow("TS-B", "14/10/2025", 5.25, 5.35));
        rows.add(tsRow("TS-A", "13/10/2025", 3.85, 3.92));
        rows.add(tsRow("TS-A", "14/10/2025", 3.87, 3.95));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "timeSeriesValues"))
                .thenReturn(new DirectChangesSectionData(rows, "https://example.com/link"));

        // Act
        ResponseEntity<DirectChangesRuntimeResponseDto> response = service.getDirectChanges(SCENARIO_ID);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().dataChanged().size());

        DirectChangesDataSection section = response.getBody().dataChanged().get(0);
        assertEquals("timeSeriesValues", section.dataType());
        assertEquals("ROWS", section.renderState());
        assertEquals(3, section.totalDataChanges());
        assertNotNull(section.data());
        assertEquals(3, section.data().size());
        assertEquals("https://example.com/link", section.externalLink());
        assertEquals(4, section.columnDefinitions().size());

        // Verify header substitution: 3 values changed, 2 distinct entities
        assertEquals("3 points changed for 2 series", section.header());
    }

    // ========================================================================
    // Test 2: EXTERNAL mode returns 400
    // ========================================================================

    @Test
    void getDirectChanges_externalMode_returns400() {
        Scenario scenario = buildScenario("EXTERNAL", null);
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.getDirectChanges(SCENARIO_ID));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Direct changes are configured as EXTERNAL for this scenario type."));
    }

    // ========================================================================
    // Test 3: FULL_DATA_CHANGES mode returns 400
    // ========================================================================

    @Test
    void getDirectChanges_fullDataChangesMode_returns400() {
        Scenario scenario = buildScenario("INTERNAL", "FULL_DATA_CHANGES");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.getDirectChanges(SCENARIO_ID));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Direct changes use FULL_DATA_CHANGES and are provided by the existing grid endpoint."));
    }

    // ========================================================================
    // Test 4: Null render mode defaults to FULL_DATA_CHANGES 400
    // ========================================================================

    @Test
    void getDirectChanges_nullRenderMode_defaultsToFullDataChanges400() {
        Scenario scenario = buildScenario("INTERNAL", null);
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.getDirectChanges(SCENARIO_ID));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getReason().contains("Direct changes use FULL_DATA_CHANGES and are provided by the existing grid endpoint."));
    }

    // ========================================================================
    // Test 5: No active definition returns 404
    // ========================================================================

    @Test
    void getDirectChanges_noActiveDefinition_returns404() {
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        // Return a definition that does NOT have renderMode=DELTA_BY_UNIQUE_ID
        ChangeViewDefinition nonMatchingDef = buildDefinition("""
                { "renderMode": "FULL_DATA_CHANGES", "dataTypes": [] }
                """);
        when(changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(SCENARIO_TYPE_CODE))
                .thenReturn(List.of(nonMatchingDef));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.getDirectChanges(SCENARIO_ID));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        assertTrue(exception.getReason().contains("No active DELTA_BY_UNIQUE_ID change view definition found for scenario type: MARKET_DATA"));
    }

    // ========================================================================
    // Test 6: Threshold OVERFLOW
    // ========================================================================

    @Test
    void getDirectChanges_thresholdExceeded_returnsOverflowWithNullDataButPopulatedHeader() {
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        // Definition with rowThreshold of 2
        ChangeViewDefinition definition = buildDefinition("""
                {
                  "renderMode": "DELTA_BY_UNIQUE_ID",
                  "dataTypes": [
                    {
                      "dataTypeId": "timeSeriesValues",
                      "dataTypeTitle": "Time-Series Values",
                      "headerSummaryTextTemplate": "${changedValuesCount} points for ${changedEntitiesCount} series",
                      "columnDefinitions": [
                        { "dataAttribute": "tsName", "type": "string", "display": "TS Name", "isEntityId": true },
                        { "dataAttribute": "date", "type": "date", "display": "Date" }
                      ],
                      "rowThreshold": 2,
                      "overflowMessage": "Too many changes to display"
                    }
                  ]
                }
                """);
        when(changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(SCENARIO_TYPE_CODE))
                .thenReturn(List.of(definition));

        // Provider returns 5 rows exceeding the threshold of 2
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(tsRow("TS-A", "13/10/2025", 1.0, 2.0));
        rows.add(tsRow("TS-A", "14/10/2025", 1.1, 2.1));
        rows.add(tsRow("TS-B", "13/10/2025", 3.0, 4.0));
        rows.add(tsRow("TS-B", "14/10/2025", 3.1, 4.1));
        rows.add(tsRow("TS-C", "13/10/2025", 5.0, 6.0));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "timeSeriesValues"))
                .thenReturn(new DirectChangesSectionData(rows, null));

        // Act
        ResponseEntity<DirectChangesRuntimeResponseDto> response = service.getDirectChanges(SCENARIO_ID);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        DirectChangesDataSection section = response.getBody().dataChanged().get(0);
        assertEquals("OVERFLOW", section.renderState());
        assertNull(section.data(), "Data should be null for OVERFLOW renderState");
        assertEquals(5, section.totalDataChanges(), "totalDataChanges should reflect actual row count");
        // Header should still be populated with actual counts
        assertEquals("5 points for 3 series", section.header());
        assertNotNull(section.columnDefinitions(), "columnDefinitions should still be present");
    }

    // ========================================================================
    // Test 7: Header template substitution
    // ========================================================================

    @Test
    void getDirectChanges_headerTemplateSubstitution_replacesPlaceholders() {
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        ChangeViewDefinition definition = buildDefinition("""
                {
                  "renderMode": "DELTA_BY_UNIQUE_ID",
                  "dataTypes": [
                    {
                      "dataTypeId": "curvePoints",
                      "dataTypeTitle": "Curve Points",
                      "headerSummaryTextTemplate": "${changedValuesCount} Curve Points have been changed for ${changedEntitiesCount} Curves",
                      "columnDefinitions": [
                        { "dataAttribute": "curveName", "type": "string", "display": "Curve Name", "isEntityId": true },
                        { "dataAttribute": "tenor", "type": "string", "display": "Tenor" },
                        { "dataAttribute": "curValue", "type": "number", "display": "Current" },
                        { "dataAttribute": "newValue", "type": "number", "display": "New" }
                      ],
                      "rowThreshold": 100
                    }
                  ]
                }
                """);
        when(changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(SCENARIO_TYPE_CODE))
                .thenReturn(List.of(definition));

        // Provider returns 4 rows with 2 distinct curveName values
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(curveRow("USD SOFR", "1Y", 4.85, 4.92));
        rows.add(curveRow("USD SOFR", "5Y", 4.25, 4.35));
        rows.add(curveRow("EUR ESTR", "1Y", 3.10, 3.18));
        rows.add(curveRow("EUR ESTR", "10Y", 2.95, 3.05));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "curvePoints"))
                .thenReturn(new DirectChangesSectionData(rows, null));

        // Act
        ResponseEntity<DirectChangesRuntimeResponseDto> response = service.getDirectChanges(SCENARIO_ID);

        // Assert
        DirectChangesDataSection section = response.getBody().dataChanged().get(0);
        // changedValuesCount = 4, changedEntitiesCount = 2 (USD SOFR, EUR ESTR)
        assertEquals("4 Curve Points have been changed for 2 Curves", section.header());
    }

    // ========================================================================
    // Test 8: Empty section omission
    // ========================================================================

    @Test
    void getDirectChanges_emptySectionOmission_omitsNoDataSection() {
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        // Definition with two sections
        ChangeViewDefinition definition = buildDefinition("""
                {
                  "renderMode": "DELTA_BY_UNIQUE_ID",
                  "dataTypes": [
                    {
                      "dataTypeId": "timeSeriesValues",
                      "dataTypeTitle": "Time-Series Values",
                      "headerSummaryTextTemplate": "${changedValuesCount} points",
                      "columnDefinitions": [
                        { "dataAttribute": "tsName", "type": "string", "display": "TS Name", "isEntityId": true }
                      ],
                      "rowThreshold": 100
                    },
                    {
                      "dataTypeId": "curvePoints",
                      "dataTypeTitle": "Curve Points",
                      "headerSummaryTextTemplate": "${changedValuesCount} curves",
                      "columnDefinitions": [
                        { "dataAttribute": "curveName", "type": "string", "display": "Curve Name", "isEntityId": true }
                      ],
                      "rowThreshold": 100
                    }
                  ]
                }
                """);
        when(changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(SCENARIO_TYPE_CODE))
                .thenReturn(List.of(definition));

        // First section: provider returns null rows (NO_DATA) -> should be omitted
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "timeSeriesValues"))
                .thenReturn(new DirectChangesSectionData(null, null));

        // Second section: provider returns valid rows
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(curveRow("USD SOFR", "1Y", 4.85, 4.92));
        rows.add(curveRow("EUR ESTR", "1Y", 3.10, 3.18));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "curvePoints"))
                .thenReturn(new DirectChangesSectionData(rows, null));

        // Act
        ResponseEntity<DirectChangesRuntimeResponseDto> response = service.getDirectChanges(SCENARIO_ID);

        // Assert: only the curvePoints section should be present
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(1, response.getBody().dataChanged().size(),
                "Only one section should be present; the NO_DATA section should be omitted");
        assertEquals("curvePoints", response.getBody().dataChanged().get(0).dataType());
        assertEquals("ROWS", response.getBody().dataChanged().get(0).renderState());
    }

    // ========================================================================
    // Helper methods
    // ========================================================================

    private Scenario buildScenario(String directChangesMode, String directChangesInternalRenderMode) {
        ScenarioType scenarioType = new ScenarioType();
        scenarioType.setCode(SCENARIO_TYPE_CODE);
        scenarioType.setName("Market Data");
        scenarioType.setDirectChangesMode(directChangesMode);
        scenarioType.setDirectChangesInternalRenderMode(directChangesInternalRenderMode);
        scenarioType.setEnabled(true);

        Scenario scenario = new Scenario();
        scenario.setId(SCENARIO_ID);
        scenario.setScenarioTypeCode(SCENARIO_TYPE_CODE);
        scenario.setName("Test Scenario");
        scenario.setOwnerDisplayName("Test User");
        scenario.setCreatedAt(LocalDateTime.now());
        scenario.setUpdatedAt(LocalDateTime.now());

        // Use reflection to set scenarioType since there is no public setter
        try {
            java.lang.reflect.Field scenarioTypeField = Scenario.class.getDeclaredField("scenarioType");
            scenarioTypeField.setAccessible(true);
            scenarioTypeField.set(scenario, scenarioType);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set scenarioType via reflection", e);
        }

        return scenario;
    }

    private ChangeViewDefinition buildDefinition(String definitionJson) {
        ChangeViewDefinition definition = new ChangeViewDefinition();
        definition.setId(UUID.randomUUID());
        definition.setScenarioTypeCode(SCENARIO_TYPE_CODE);
        definition.setTemplateKey("test_delta_def");
        definition.setVersion(1);
        definition.setDefinition(definitionJson);
        definition.setActive(true);
        definition.setCreatedAt(LocalDateTime.now());
        definition.setUpdatedAt(LocalDateTime.now());
        return definition;
    }

    private Map<String, Object> tsRow(String tsName, String date, double cur, double newVal) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("tsName", tsName);
        row.put("date", date);
        row.put("cur", cur);
        row.put("new", newVal);
        return row;
    }

    private Map<String, Object> curveRow(String curveName, String tenor, double curValue, double newValue) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("curveName", curveName);
        row.put("tenor", tenor);
        row.put("curValue", curValue);
        row.put("newValue", newValue);
        return row;
    }
}
