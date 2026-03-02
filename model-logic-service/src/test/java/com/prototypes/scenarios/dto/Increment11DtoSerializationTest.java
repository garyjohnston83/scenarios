package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Increment 11 Task Group 6 -- Gap tests for DirectChangesDto and ImpactDataDto
 * JSON serialization behavior. These tests verify:
 * 1. DirectChangesDto produces the expected JSON structure
 * 2. ImpactDataDto includes compareCta when present and omits it when null
 *    (via @JsonInclude(NON_NULL) on ImpactDataDto)
 */
class Increment11DtoSerializationTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    // ========================================================================
    // Gap Test 1: DirectChangesDto JSON serialization produces expected structure
    // ========================================================================

    @Test
    void directChangesDto_serializesToExpectedJsonStructure() throws Exception {
        UUID rowId1 = UUID.fromString("cc000001-0001-4001-8001-000000000001");
        UUID rowId2 = UUID.fromString("cc000002-0002-4002-8002-000000000002");

        List<GridRowDto> rows = List.of(
                new GridRowDto(rowId1, Map.of(
                        "Risk Factor", "FX_USDJPY",
                        "Risk Class", "FX",
                        "Current Value", 1.35
                )),
                new GridRowDto(rowId2, Map.of(
                        "Risk Factor", "IR_TENOR_5Y",
                        "Risk Class", "IR",
                        "Current Value", 0.025
                ))
        );

        DirectChangesDto dto = new DirectChangesDto(
                List.of("Risk Factor", "Risk Class", "Current Value"),
                rows
        );

        String json = objectMapper.writeValueAsString(dto);

        // Verify top-level structure
        assertTrue(json.contains("\"columns\""), "JSON should contain 'columns' field");
        assertTrue(json.contains("\"rows\""), "JSON should contain 'rows' field");

        // Verify columns array
        assertTrue(json.contains("\"Risk Factor\""), "JSON should contain 'Risk Factor' column");
        assertTrue(json.contains("\"Risk Class\""), "JSON should contain 'Risk Class' column");
        assertTrue(json.contains("\"Current Value\""), "JSON should contain 'Current Value' column");

        // Verify row structure contains rowId and payload
        assertTrue(json.contains("\"rowId\""), "JSON should contain 'rowId' field in rows");
        assertTrue(json.contains("\"payload\""), "JSON should contain 'payload' field in rows");
        assertTrue(json.contains(rowId1.toString()), "JSON should contain first row UUID");
        assertTrue(json.contains("FX_USDJPY"), "JSON should contain seed value FX_USDJPY");

        // Verify deserialization roundtrip produces correct column count and row count
        var tree = objectMapper.readTree(json);
        assertEquals(3, tree.get("columns").size(), "Should have 3 columns");
        assertEquals(2, tree.get("rows").size(), "Should have 2 rows");
    }

    // ========================================================================
    // Gap Test 2: ImpactDataDto includes compareCta when present, omits when null
    // ========================================================================

    @Test
    void impactDataDto_multiReportShape_includesCompareCtaWhenPresent_omitsWhenNull() throws Exception {
        UUID rowId = UUID.fromString("dd000001-0001-4001-8001-000000000001");

        List<GridRowDto> rows = List.of(
                new GridRowDto(rowId, Map.of(
                        "Risk Class", "FX",
                        "Capital Charge", 300000
                ))
        );
        DatasetDto dataset = new DatasetDto(List.of("Risk Class", "Capital Charge"), rows);

        // Case 1: compareCta present on report
        CtaDto cta = new CtaDto("Compare results", "https://example.com/compare");
        ImpactReportDto reportWithCta = new ImpactReportDto(
                "run-001", "RUN-2026-0219-001", "2026-02-19T10:00:00", dataset, cta
        );
        ImpactDataDto dtoWithCta = new ImpactDataDto(List.of(reportWithCta));

        String jsonWithCta = objectMapper.writeValueAsString(dtoWithCta);
        assertTrue(jsonWithCta.contains("\"reports\""),
                "JSON should contain 'reports' field");
        assertTrue(jsonWithCta.contains("\"compareCta\""),
                "JSON should contain 'compareCta' field when CTA is present");
        assertTrue(jsonWithCta.contains("\"Compare results\""),
                "JSON should contain CTA label");
        assertTrue(jsonWithCta.contains("https://example.com/compare"),
                "JSON should contain CTA url");

        // Case 2: compareCta null on report -- should be omitted by @JsonInclude(NON_NULL)
        ImpactReportDto reportWithoutCta = new ImpactReportDto(
                "run-002", "RUN-2026-0219-002", "2026-02-19T11:00:00", dataset, null
        );
        ImpactDataDto dtoWithoutCta = new ImpactDataDto(List.of(reportWithoutCta));

        String jsonWithoutCta = objectMapper.writeValueAsString(dtoWithoutCta);
        assertFalse(jsonWithoutCta.contains("\"compareCta\""),
                "JSON should NOT contain 'compareCta' field when CTA is null (omitted by @JsonInclude(NON_NULL))");

        // Verify the rest of the structure is still correct
        assertTrue(jsonWithoutCta.contains("\"reports\""), "JSON should contain 'reports'");
        assertTrue(jsonWithoutCta.contains("\"dataset\""), "JSON should contain 'dataset' within report");
        assertTrue(jsonWithoutCta.contains("\"columns\""), "JSON should still contain 'columns'");
        assertTrue(jsonWithoutCta.contains("\"rows\""), "JSON should still contain 'rows'");
    }
}
