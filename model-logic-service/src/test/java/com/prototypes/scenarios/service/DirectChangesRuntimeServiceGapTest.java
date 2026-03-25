package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.DirectChangesColumnDefinition;
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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Gap analysis tests for DirectChangesRuntimeService.
 * These tests cover critical paths not fully exercised by the existing 8 service tests:
 * sorting (ASC string with null-last, DESC numeric), no sortOrdering,
 * header fallback to dataTypeTitle, multiple sections with mixed renderStates,
 * and column definitions passthrough including isEntityId only-when-true behavior.
 */
@ExtendWith(MockitoExtension.class)
class DirectChangesRuntimeServiceGapTest {

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
    // Gap Test 1: Sorting - string column ASC with null-last behavior
    // ========================================================================

    @Test
    void getDirectChanges_sortStringColumnAsc_sortsAlphabeticallyWithNullsLast() {
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        ChangeViewDefinition definition = buildDefinition("""
                {
                  "renderMode": "DELTA_BY_UNIQUE_ID",
                  "dataTypes": [
                    {
                      "dataTypeId": "timeSeriesValues",
                      "dataTypeTitle": "Time-Series Values",
                      "headerSummaryTextTemplate": "${changedValuesCount} points",
                      "columnDefinitions": [
                        { "dataAttribute": "tsName", "type": "string", "display": "TS Name", "isEntityId": true },
                        { "dataAttribute": "date", "type": "date", "display": "Date" }
                      ],
                      "sortOrdering": { "dataAttribute": "tsName", "direction": "ASC" },
                      "rowThreshold": 100
                    }
                  ]
                }
                """);
        when(changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(SCENARIO_TYPE_CODE))
                .thenReturn(List.of(definition));

        // Provider returns rows in deliberately unsorted order with one null tsName
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(tsRow("Charlie", "01/01/2025"));
        rows.add(tsRow(null, "02/01/2025"));        // null should sort last
        rows.add(tsRow("Alpha", "03/01/2025"));
        rows.add(tsRow("Bravo", "04/01/2025"));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "timeSeriesValues"))
                .thenReturn(new DirectChangesSectionData(rows, null));

        // Act
        ResponseEntity<DirectChangesRuntimeResponseDto> response = service.getDirectChanges(SCENARIO_ID);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        DirectChangesDataSection section = response.getBody().dataChanged().get(0);
        List<Map<String, Object>> sortedData = section.data();

        assertEquals(4, sortedData.size());
        assertEquals("Alpha", sortedData.get(0).get("tsName"));
        assertEquals("Bravo", sortedData.get(1).get("tsName"));
        assertEquals("Charlie", sortedData.get(2).get("tsName"));
        assertNull(sortedData.get(3).get("tsName"), "Null tsName should be sorted last");
    }

    // ========================================================================
    // Gap Test 2: Sorting - numeric column DESC
    // ========================================================================

    @Test
    void getDirectChanges_sortNumericColumnDesc_sortsDescendingNumerically() {
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        ChangeViewDefinition definition = buildDefinition("""
                {
                  "renderMode": "DELTA_BY_UNIQUE_ID",
                  "dataTypes": [
                    {
                      "dataTypeId": "curvePoints",
                      "dataTypeTitle": "Curve Points",
                      "headerSummaryTextTemplate": "${changedValuesCount} points",
                      "columnDefinitions": [
                        { "dataAttribute": "curveName", "type": "string", "display": "Curve", "isEntityId": true },
                        { "dataAttribute": "curValue", "type": "number", "display": "Current" }
                      ],
                      "sortOrdering": { "dataAttribute": "curValue", "direction": "DESC" },
                      "rowThreshold": 100
                    }
                  ]
                }
                """);
        when(changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(SCENARIO_TYPE_CODE))
                .thenReturn(List.of(definition));

        // Provider returns rows with numeric values in random order
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(numRow("Curve-A", 1.5));
        rows.add(numRow("Curve-B", 10.0));
        rows.add(numRow("Curve-C", 5.25));
        rows.add(numRow("Curve-D", 7.8));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "curvePoints"))
                .thenReturn(new DirectChangesSectionData(rows, null));

        // Act
        ResponseEntity<DirectChangesRuntimeResponseDto> response = service.getDirectChanges(SCENARIO_ID);

        // Assert
        DirectChangesDataSection section = response.getBody().dataChanged().get(0);
        List<Map<String, Object>> sortedData = section.data();

        assertEquals(4, sortedData.size());
        assertEquals(10.0, ((Number) sortedData.get(0).get("curValue")).doubleValue(), 0.001);
        assertEquals(7.8, ((Number) sortedData.get(1).get("curValue")).doubleValue(), 0.001);
        assertEquals(5.25, ((Number) sortedData.get(2).get("curValue")).doubleValue(), 0.001);
        assertEquals(1.5, ((Number) sortedData.get(3).get("curValue")).doubleValue(), 0.001);
    }

    // ========================================================================
    // Gap Test 3: No sortOrdering - rows returned in provider-supplied order
    // ========================================================================

    @Test
    void getDirectChanges_noSortOrdering_returnsRowsInProviderSuppliedOrder() {
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        // Definition without sortOrdering field
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
                    }
                  ]
                }
                """);
        when(changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(SCENARIO_TYPE_CODE))
                .thenReturn(List.of(definition));

        // Provider returns rows in a specific order
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(Map.of("tsName", "Zebra"));
        rows.add(Map.of("tsName", "Apple"));
        rows.add(Map.of("tsName", "Mango"));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "timeSeriesValues"))
                .thenReturn(new DirectChangesSectionData(rows, null));

        // Act
        ResponseEntity<DirectChangesRuntimeResponseDto> response = service.getDirectChanges(SCENARIO_ID);

        // Assert: order must be preserved exactly as provided
        DirectChangesDataSection section = response.getBody().dataChanged().get(0);
        List<Map<String, Object>> data = section.data();

        assertEquals(3, data.size());
        assertEquals("Zebra", data.get(0).get("tsName"));
        assertEquals("Apple", data.get(1).get("tsName"));
        assertEquals("Mango", data.get(2).get("tsName"));
    }

    // ========================================================================
    // Gap Test 4: Header fallback - when headerSummaryTextTemplate is absent,
    //             dataTypeTitle is used as the header
    // ========================================================================

    @Test
    void getDirectChanges_noHeaderTemplate_fallsBackToDataTypeTitle() {
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        // Definition without headerSummaryTextTemplate
        ChangeViewDefinition definition = buildDefinition("""
                {
                  "renderMode": "DELTA_BY_UNIQUE_ID",
                  "dataTypes": [
                    {
                      "dataTypeId": "curvePoints",
                      "dataTypeTitle": "Curve Points",
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

        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(Map.of("curveName", "USD SOFR"));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "curvePoints"))
                .thenReturn(new DirectChangesSectionData(rows, null));

        // Act
        ResponseEntity<DirectChangesRuntimeResponseDto> response = service.getDirectChanges(SCENARIO_ID);

        // Assert: header should fall back to dataTypeTitle
        DirectChangesDataSection section = response.getBody().dataChanged().get(0);
        assertEquals("Curve Points", section.header(),
                "When headerSummaryTextTemplate is absent, header should fall back to dataTypeTitle");
    }

    // ========================================================================
    // Gap Test 5: Multiple sections with different renderStates
    //             (one ROWS, one OVERFLOW)
    // ========================================================================

    @Test
    void getDirectChanges_multipleSections_assemblesWithDifferentRenderStates() {
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        // Two sections: first has high threshold (ROWS), second has threshold of 1 (OVERFLOW)
        ChangeViewDefinition definition = buildDefinition("""
                {
                  "renderMode": "DELTA_BY_UNIQUE_ID",
                  "dataTypes": [
                    {
                      "dataTypeId": "timeSeriesValues",
                      "dataTypeTitle": "Time-Series Values",
                      "headerSummaryTextTemplate": "${changedValuesCount} TS points for ${changedEntitiesCount} series",
                      "columnDefinitions": [
                        { "dataAttribute": "tsName", "type": "string", "display": "TS Name", "isEntityId": true },
                        { "dataAttribute": "date", "type": "date", "display": "Date" }
                      ],
                      "rowThreshold": 100
                    },
                    {
                      "dataTypeId": "curvePoints",
                      "dataTypeTitle": "Curve Points",
                      "headerSummaryTextTemplate": "${changedValuesCount} curve points for ${changedEntitiesCount} curves",
                      "columnDefinitions": [
                        { "dataAttribute": "curveName", "type": "string", "display": "Curve Name", "isEntityId": true },
                        { "dataAttribute": "tenor", "type": "string", "display": "Tenor" }
                      ],
                      "rowThreshold": 1
                    }
                  ]
                }
                """);
        when(changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(SCENARIO_TYPE_CODE))
                .thenReturn(List.of(definition));

        // First section: 2 rows, within threshold
        List<Map<String, Object>> tsRows = new ArrayList<>();
        tsRows.add(tsRow("TS-A", "01/01/2025"));
        tsRows.add(tsRow("TS-B", "02/01/2025"));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "timeSeriesValues"))
                .thenReturn(new DirectChangesSectionData(tsRows, "https://example.com/ts"));

        // Second section: 3 rows, exceeds threshold of 1
        List<Map<String, Object>> curveRows = new ArrayList<>();
        curveRows.add(curveRow("C-A", "1Y"));
        curveRows.add(curveRow("C-B", "5Y"));
        curveRows.add(curveRow("C-A", "10Y"));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "curvePoints"))
                .thenReturn(new DirectChangesSectionData(curveRows, null));

        // Act
        ResponseEntity<DirectChangesRuntimeResponseDto> response = service.getDirectChanges(SCENARIO_ID);

        // Assert: both sections present, with different renderStates
        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<DirectChangesDataSection> sections = response.getBody().dataChanged();
        assertEquals(2, sections.size(), "Both sections should be present");

        // First section: ROWS
        DirectChangesDataSection tsSection = sections.get(0);
        assertEquals("timeSeriesValues", tsSection.dataType());
        assertEquals("ROWS", tsSection.renderState());
        assertEquals(2, tsSection.totalDataChanges());
        assertNotNull(tsSection.data(), "Data should be present for ROWS renderState");
        assertEquals(2, tsSection.data().size());
        assertEquals("2 TS points for 2 series", tsSection.header());
        assertEquals("https://example.com/ts", tsSection.externalLink());

        // Second section: OVERFLOW (3 rows > threshold of 1)
        DirectChangesDataSection curveSection = sections.get(1);
        assertEquals("curvePoints", curveSection.dataType());
        assertEquals("OVERFLOW", curveSection.renderState());
        assertEquals(3, curveSection.totalDataChanges());
        assertNull(curveSection.data(), "Data should be null for OVERFLOW renderState");
        assertEquals("3 curve points for 2 curves", curveSection.header(),
                "Header should still be populated with actual counts even in OVERFLOW");
    }

    // ========================================================================
    // Gap Test 6: Column definitions passthrough - verify columnDefinitions
    //             match definition JSON including isEntityId only when true
    // ========================================================================

    @Test
    void getDirectChanges_columnDefinitions_matchDefinitionJsonWithIsEntityIdOnlyWhenTrue() {
        Scenario scenario = buildScenario("INTERNAL", "DELTA_BY_UNIQUE_ID");
        when(scenarioRepository.findByIdWithSummary(SCENARIO_ID)).thenReturn(Optional.of(scenario));

        ChangeViewDefinition definition = buildDefinition("""
                {
                  "renderMode": "DELTA_BY_UNIQUE_ID",
                  "dataTypes": [
                    {
                      "dataTypeId": "timeSeriesValues",
                      "dataTypeTitle": "Time-Series Values",
                      "headerSummaryTextTemplate": "${changedValuesCount} points",
                      "columnDefinitions": [
                        { "dataAttribute": "tsName", "type": "string", "display": "Time-Series Name", "isEntityId": true },
                        { "dataAttribute": "date", "type": "date", "display": "Date" },
                        { "dataAttribute": "cur", "type": "number", "display": "Current Value" },
                        { "dataAttribute": "new", "type": "number", "display": "New Value", "isEntityId": false }
                      ],
                      "rowThreshold": 100
                    }
                  ]
                }
                """);
        when(changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(SCENARIO_TYPE_CODE))
                .thenReturn(List.of(definition));

        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(Map.of("tsName", "TS-A", "date", "01/01/2025", "cur", 1.0, "new", 2.0));
        when(provider.getSectionData(SCENARIO_ID, SCENARIO_TYPE_CODE, "timeSeriesValues"))
                .thenReturn(new DirectChangesSectionData(rows, null));

        // Act
        ResponseEntity<DirectChangesRuntimeResponseDto> response = service.getDirectChanges(SCENARIO_ID);

        // Assert: verify column definitions
        DirectChangesDataSection section = response.getBody().dataChanged().get(0);
        List<DirectChangesColumnDefinition> colDefs = section.columnDefinitions();

        assertEquals(4, colDefs.size(), "Should have 4 column definitions");

        // First column: tsName with isEntityId=true
        DirectChangesColumnDefinition col0 = colDefs.get(0);
        assertEquals("tsName", col0.dataAttribute());
        assertEquals("string", col0.type());
        assertEquals("Time-Series Name", col0.display());
        assertEquals(true, col0.isEntityId(), "isEntityId should be true for the entity identifier column");

        // Second column: date without isEntityId
        DirectChangesColumnDefinition col1 = colDefs.get(1);
        assertEquals("date", col1.dataAttribute());
        assertEquals("date", col1.type());
        assertEquals("Date", col1.display());
        assertNull(col1.isEntityId(), "isEntityId should be null when not specified in definition");

        // Third column: cur without isEntityId
        DirectChangesColumnDefinition col2 = colDefs.get(2);
        assertEquals("cur", col2.dataAttribute());
        assertEquals("number", col2.type());
        assertEquals("Current Value", col2.display());
        assertNull(col2.isEntityId(), "isEntityId should be null when not specified in definition");

        // Fourth column: new with isEntityId=false (should be treated as null/not present)
        DirectChangesColumnDefinition col3 = colDefs.get(3);
        assertEquals("new", col3.dataAttribute());
        assertEquals("number", col3.type());
        assertEquals("New Value", col3.display());
        assertNull(col3.isEntityId(),
                "isEntityId should be null when explicitly false in definition (only included when true)");
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

    private Map<String, Object> tsRow(String tsName, String date) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("tsName", tsName);
        row.put("date", date);
        return row;
    }

    private Map<String, Object> numRow(String curveName, double curValue) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("curveName", curveName);
        row.put("curValue", curValue);
        return row;
    }

    private Map<String, Object> curveRow(String curveName, String tenor) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("curveName", curveName);
        row.put("tenor", tenor);
        return row;
    }
}
