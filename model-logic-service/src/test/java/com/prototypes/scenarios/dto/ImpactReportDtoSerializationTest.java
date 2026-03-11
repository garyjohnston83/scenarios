package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Increment 3 Task Group 2 -- DTO serialization tests for ImpactReportSummaryDto
 * and ImpactReportDetailDto. These tests verify:
 * 1. ImpactReportSummaryDto serializes all 8 fields and omits renderedReport/errorMessage
 * 2. ImpactReportDetailDto serializes renderedReport as nested JSON (not escaped string)
 *    and handles null renderedReport correctly, includes errorMessage field
 */
class ImpactReportDtoSerializationTest {

    private ObjectMapper objectMapper;

    private static final UUID ID = UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001");
    private static final UUID SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    private static final UUID REPORT_DEFINITION_ID = UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002");
    private static final LocalDateTime GENERATED_AT = LocalDateTime.of(2026, 3, 10, 12, 0, 0);

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    // ========================================================================
    // Test 1: ImpactReportSummaryDto serializes all 8 fields and omits
    // renderedReport and errorMessage
    // ========================================================================

    @Test
    void summaryDto_serializesAllFieldsAndOmitsRenderedReportAndErrorMessage() throws Exception {
        ImpactReportSummaryDto dto = new ImpactReportSummaryDto(
                ID,
                SCENARIO_ID,
                REPORT_DEFINITION_ID,
                1,
                "market_risk_summary",
                "Market Risk Summary",
                GENERATED_AT,
                "GENERATED"
        );

        String json = objectMapper.writeValueAsString(dto);
        JsonNode tree = objectMapper.readTree(json);

        // Verify all 8 fields are present
        assertEquals(ID.toString(), tree.get("id").asText(), "id should be present");
        assertEquals(SCENARIO_ID.toString(), tree.get("scenarioId").asText(), "scenarioId should be present");
        assertEquals(REPORT_DEFINITION_ID.toString(), tree.get("reportDefinitionId").asText(), "reportDefinitionId should be present");
        assertEquals(1, tree.get("definitionVersion").asInt(), "definitionVersion should be present");
        assertEquals("market_risk_summary", tree.get("reportKey").asText(), "reportKey should be present");
        assertEquals("Market Risk Summary", tree.get("reportName").asText(), "reportName should be present");
        assertEquals("2026-03-10T12:00:00", tree.get("generatedAt").asText(), "generatedAt should be present");
        assertEquals("GENERATED", tree.get("status").asText(), "status should be present");

        // Verify exactly 8 fields (no extras)
        assertEquals(8, tree.size(), "Summary DTO should have exactly 8 fields");

        // Verify renderedReport and errorMessage are absent
        assertFalse(json.contains("renderedReport"), "JSON should NOT contain renderedReport");
        assertFalse(json.contains("errorMessage"), "JSON should NOT contain errorMessage");
    }

    // ========================================================================
    // Test 2: ImpactReportDetailDto serializes renderedReport as nested JSON
    // object (not escaped string), and null renderedReport serializes as JSON null.
    // Also includes errorMessage field.
    // ========================================================================

    @Test
    void detailDto_serializesRenderedReportAsNestedJsonAndHandlesNull() throws Exception {
        // Case 1: renderedReport is a JsonNode -- should serialize as nested JSON object
        String renderedJson = "{\"reportKey\":\"market_risk_summary\",\"sections\":[{\"name\":\"var_metrics\"},{\"name\":\"exposure_summary\"}]}";
        JsonNode renderedNode = objectMapper.readTree(renderedJson);

        ImpactReportDetailDto dtoWithReport = new ImpactReportDetailDto(
                ID,
                SCENARIO_ID,
                REPORT_DEFINITION_ID,
                1,
                "market_risk_summary",
                "Market Risk Summary",
                GENERATED_AT,
                "GENERATED",
                renderedNode,
                null
        );

        String jsonWithReport = objectMapper.writeValueAsString(dtoWithReport);
        JsonNode treeWithReport = objectMapper.readTree(jsonWithReport);

        // Verify all 10 fields are present (9 original + errorMessage)
        assertEquals(10, treeWithReport.size(), "Detail DTO should have exactly 10 fields");
        assertEquals(ID.toString(), treeWithReport.get("id").asText(), "id should be present");
        assertEquals(SCENARIO_ID.toString(), treeWithReport.get("scenarioId").asText(), "scenarioId should be present");
        assertEquals("GENERATED", treeWithReport.get("status").asText(), "status should be present");

        // Verify renderedReport is a nested JSON object (not an escaped string)
        JsonNode renderedReportNode = treeWithReport.get("renderedReport");
        assertTrue(renderedReportNode.isObject(), "renderedReport should be a JSON object, not a string");
        assertEquals("market_risk_summary", renderedReportNode.get("reportKey").asText(),
                "renderedReport should contain reportKey as a nested field");
        assertEquals(2, renderedReportNode.get("sections").size(),
                "renderedReport should contain sections array with 2 elements");

        // Verify errorMessage is null for GENERATED report
        assertTrue(treeWithReport.get("errorMessage").isNull(),
                "errorMessage should be JSON null for GENERATED report");

        // Case 2: renderedReport is null, errorMessage is set -- should serialize as JSON null and string
        ImpactReportDetailDto dtoWithNull = new ImpactReportDetailDto(
                ID,
                SCENARIO_ID,
                REPORT_DEFINITION_ID,
                1,
                "market_risk_summary",
                "Market Risk Summary",
                GENERATED_AT,
                "FAILED",
                null,
                "Data provider timeout: unable to fetch risk charge data within 30s"
        );

        String jsonWithNull = objectMapper.writeValueAsString(dtoWithNull);
        JsonNode treeWithNull = objectMapper.readTree(jsonWithNull);

        // Verify renderedReport is JSON null
        assertTrue(treeWithNull.get("renderedReport").isNull(),
                "renderedReport should be JSON null when set to null");
        assertEquals("FAILED", treeWithNull.get("status").asText(), "status should be FAILED");

        // Verify errorMessage is present for FAILED report
        assertEquals("Data provider timeout: unable to fetch risk charge data within 30s",
                treeWithNull.get("errorMessage").asText(),
                "errorMessage should contain the error string for FAILED report");

        // Verify all 10 fields are still present (including the null ones)
        assertEquals(10, treeWithNull.size(), "Detail DTO with null renderedReport should still have 10 fields");
    }
}
