package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Tests for Direct Changes DTO serialization behavior.
 * Verifies JSON structure, null handling, and @JsonInclude(NON_NULL) on isEntityId.
 */
class DirectChangesDtoSerializationTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    // ========================================================================
    // Test 1: DirectChangesRuntimeResponseDto serializes to expected JSON
    //         structure with dataChanged array
    // ========================================================================

    @Test
    void runtimeResponseDto_serializesToExpectedJsonStructureWithDataChangedArray() throws Exception {
        Map<String, Object> row1 = new LinkedHashMap<>();
        row1.put("tsName", "TS Name 1");
        row1.put("date", "13/10/2025");
        row1.put("cur", 10.4);
        row1.put("new", 9.1);

        DirectChangesColumnDefinition col1 = new DirectChangesColumnDefinition("tsName", "string", "Time-Series Name", true);
        DirectChangesColumnDefinition col2 = new DirectChangesColumnDefinition("date", "date", "Date", null);

        DirectChangesDataSection section = new DirectChangesDataSection(
                "timeSeriesValues",
                "5 Time-series Points have been changed for 2 Time-Series",
                "http://example.com/ts-link",
                5,
                "ROWS",
                List.of(col1, col2),
                List.of(row1)
        );

        DirectChangesRuntimeResponseDto dto = new DirectChangesRuntimeResponseDto(List.of(section));

        String json = objectMapper.writeValueAsString(dto);

        var tree = objectMapper.readTree(json);
        assertTrue(tree.has("dataChanged"), "JSON should contain 'dataChanged' field");
        assertEquals(1, tree.get("dataChanged").size(), "dataChanged should have 1 section");

        var sectionNode = tree.get("dataChanged").get(0);
        assertEquals("timeSeriesValues", sectionNode.get("dataType").asText());
        assertEquals("ROWS", sectionNode.get("renderState").asText());
        assertEquals(5, sectionNode.get("totalDataChanges").asInt());
        assertEquals("http://example.com/ts-link", sectionNode.get("externalLink").asText());
        assertTrue(sectionNode.has("columnDefinitions"), "Section should have 'columnDefinitions'");
        assertTrue(sectionNode.has("data"), "Section should have 'data'");
        assertEquals(1, sectionNode.get("data").size(), "data should have 1 row");

        var firstRow = sectionNode.get("data").get(0);
        assertEquals("TS Name 1", firstRow.get("tsName").asText());
        assertEquals(10.4, firstRow.get("cur").asDouble(), 0.001);
    }

    // ========================================================================
    // Test 2: DirectChangesDataSection serializes data as null (not omitted)
    //         when renderState is OVERFLOW
    // ========================================================================

    @Test
    void dataSection_serializesDataAsNullNotOmittedWhenRenderStateIsOverflow() throws Exception {
        DirectChangesColumnDefinition col = new DirectChangesColumnDefinition("tsName", "string", "Time-Series Name", true);

        DirectChangesDataSection section = new DirectChangesDataSection(
                "timeSeriesValues",
                "100 Time-series Points have been changed for 5 Time-Series",
                null,
                100,
                "OVERFLOW",
                List.of(col),
                null  // data is null for OVERFLOW
        );

        String json = objectMapper.writeValueAsString(section);

        var tree = objectMapper.readTree(json);
        assertTrue(tree.has("data"), "JSON should contain 'data' field even when null (not omitted)");
        assertTrue(tree.get("data").isNull(), "'data' should serialize as JSON null");
        assertEquals("OVERFLOW", tree.get("renderState").asText());
        assertEquals(100, tree.get("totalDataChanges").asInt());
        assertTrue(tree.has("header"), "Header should still be present");
    }

    // ========================================================================
    // Test 3: DirectChangesColumnDefinition omits isEntityId from JSON when
    //         it is null (Jackson @JsonInclude(NON_NULL) verification)
    // ========================================================================

    @Test
    void columnDefinition_omitsIsEntityIdFromJsonWhenNull() throws Exception {
        // Column WITH isEntityId set to true
        DirectChangesColumnDefinition colWithEntityId = new DirectChangesColumnDefinition(
                "tsName", "string", "Time-Series Name", true
        );
        // Column WITHOUT isEntityId (null)
        DirectChangesColumnDefinition colWithoutEntityId = new DirectChangesColumnDefinition(
                "date", "date", "Date", null
        );

        String jsonWithEntityId = objectMapper.writeValueAsString(colWithEntityId);
        String jsonWithoutEntityId = objectMapper.writeValueAsString(colWithoutEntityId);

        // When isEntityId is true, it should be present in JSON
        var treeWith = objectMapper.readTree(jsonWithEntityId);
        assertTrue(treeWith.has("isEntityId"), "JSON should contain 'isEntityId' when it is true");
        assertTrue(treeWith.get("isEntityId").asBoolean(), "isEntityId should be true");
        assertEquals(4, treeWith.size(), "Should have 4 fields when isEntityId is present");

        // When isEntityId is null, it should be omitted from JSON
        var treeWithout = objectMapper.readTree(jsonWithoutEntityId);
        assertFalse(treeWithout.has("isEntityId"),
                "JSON should NOT contain 'isEntityId' field when null (omitted by @JsonInclude(NON_NULL))");
        assertEquals(3, treeWithout.size(), "Should have 3 fields when isEntityId is null");

        // Verify other fields are always present
        assertTrue(treeWithout.has("dataAttribute"), "Should have 'dataAttribute'");
        assertTrue(treeWithout.has("type"), "Should have 'type'");
        assertTrue(treeWithout.has("display"), "Should have 'display'");
    }
}
