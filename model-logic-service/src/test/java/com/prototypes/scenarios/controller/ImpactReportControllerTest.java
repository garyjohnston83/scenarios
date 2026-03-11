package com.prototypes.scenarios.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.ImpactReportDetailDto;
import com.prototypes.scenarios.dto.ImpactReportSummaryDto;
import com.prototypes.scenarios.service.ImpactReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ImpactReportController.class)
class ImpactReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ImpactReportService impactReportService;

    private static final UUID SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    private static final UUID REPORT_ID_1 = UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001");
    private static final UUID REPORT_ID_2 = UUID.fromString("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002");
    private static final LocalDateTime FIXED_TIME = LocalDateTime.of(2026, 3, 10, 12, 0, 0);

    private static final UUID REPORT_DEF_ID = UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002");

    private static ImpactReportSummaryDto buildSummaryDto(UUID id, String reportKey, String status) {
        return new ImpactReportSummaryDto(
                id,
                SCENARIO_ID,
                REPORT_DEF_ID,
                1,
                reportKey,
                reportKey + " Report",
                FIXED_TIME,
                status
        );
    }

    private static ImpactReportDetailDto buildDetailDto(UUID id, String reportKey, String status,
                                                        Object renderedReport, String errorMessage) {
        return new ImpactReportDetailDto(
                id,
                SCENARIO_ID,
                REPORT_DEF_ID,
                1,
                reportKey,
                reportKey + " Report",
                FIXED_TIME,
                status,
                renderedReport,
                errorMessage
        );
    }

    // Test 1: GET /scenarios/{scenarioId}/impact-reports returns 200 with list of ImpactReportSummaryDto
    @Test
    void getImpactReports_returnsListOfSummaryDtos() throws Exception {
        ImpactReportSummaryDto dto1 = buildSummaryDto(REPORT_ID_1, "market_risk_summary", "GENERATED");
        ImpactReportSummaryDto dto2 = buildSummaryDto(REPORT_ID_2, "credit_risk_summary", "FAILED");

        when(impactReportService.getReportsForScenario(SCENARIO_ID)).thenReturn(List.of(dto1, dto2));

        mockMvc.perform(get("/scenarios/{scenarioId}/impact-reports", SCENARIO_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(REPORT_ID_1.toString())))
                .andExpect(jsonPath("$[0].scenarioId", is(SCENARIO_ID.toString())))
                .andExpect(jsonPath("$[0].reportKey", is("market_risk_summary")))
                .andExpect(jsonPath("$[0].status", is("GENERATED")))
                .andExpect(jsonPath("$[0].generatedAt").exists())
                .andExpect(jsonPath("$[0].renderedReport").doesNotExist())
                .andExpect(jsonPath("$[0].errorMessage").doesNotExist());
    }

    // Test 2: GET /scenarios/{scenarioId}/impact-reports returns 200 with empty array
    @Test
    void getImpactReports_noReports_returnsEmptyArray() throws Exception {
        when(impactReportService.getReportsForScenario(SCENARIO_ID)).thenReturn(List.of());

        mockMvc.perform(get("/scenarios/{scenarioId}/impact-reports", SCENARIO_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // Test 3: GET /scenarios/{scenarioId}/impact-reports returns 404 when scenario does not exist
    @Test
    void getImpactReports_scenarioNotFound_returns404() throws Exception {
        when(impactReportService.getReportsForScenario(SCENARIO_ID))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Scenario not found: " + SCENARIO_ID));

        mockMvc.perform(get("/scenarios/{scenarioId}/impact-reports", SCENARIO_ID))
                .andExpect(status().isNotFound());
    }

    // Test 4: GET /scenarios/{scenarioId}/impact-reports/{reportId} returns 200 with detail DTO including parsed renderedReport
    @Test
    void getImpactReport_returnsDetailWithParsedRenderedReport() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode renderedReport = mapper.readTree(
                "{\"reportKey\":\"market_risk_summary\",\"sections\":[{\"key\":\"var_metrics\"}]}");

        ImpactReportDetailDto dto = buildDetailDto(REPORT_ID_1, "market_risk_summary", "GENERATED", renderedReport, null);

        when(impactReportService.getReportDetail(SCENARIO_ID, REPORT_ID_1)).thenReturn(dto);

        mockMvc.perform(get("/scenarios/{scenarioId}/impact-reports/{reportId}", SCENARIO_ID, REPORT_ID_1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(REPORT_ID_1.toString())))
                .andExpect(jsonPath("$.scenarioId", is(SCENARIO_ID.toString())))
                .andExpect(jsonPath("$.reportKey", is("market_risk_summary")))
                .andExpect(jsonPath("$.status", is("GENERATED")))
                .andExpect(jsonPath("$.errorMessage").value(nullValue()))
                .andExpect(jsonPath("$.renderedReport.reportKey", is("market_risk_summary")))
                .andExpect(jsonPath("$.renderedReport.sections[0].key", is("var_metrics")));
    }

    // Test 5: GET /scenarios/{scenarioId}/impact-reports/{reportId} returns 404 when report does not exist
    @Test
    void getImpactReport_reportNotFound_returns404() throws Exception {
        when(impactReportService.getReportDetail(SCENARIO_ID, REPORT_ID_1))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Impact report not found: " + REPORT_ID_1));

        mockMvc.perform(get("/scenarios/{scenarioId}/impact-reports/{reportId}", SCENARIO_ID, REPORT_ID_1))
                .andExpect(status().isNotFound());
    }

    // Test 6: GET /scenarios/{scenarioId}/impact-reports/{reportId} returns 200 with renderedReport: null for FAILED report
    @Test
    void getImpactReport_failedReport_returnsNullRenderedReportAndErrorMessage() throws Exception {
        ImpactReportDetailDto dto = buildDetailDto(REPORT_ID_1, "market_risk_summary", "FAILED", null,
                "Data provider timeout: unable to fetch risk charge data within 30s");

        when(impactReportService.getReportDetail(SCENARIO_ID, REPORT_ID_1)).thenReturn(dto);

        mockMvc.perform(get("/scenarios/{scenarioId}/impact-reports/{reportId}", SCENARIO_ID, REPORT_ID_1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.renderedReport").value(nullValue()))
                .andExpect(jsonPath("$.status", is("FAILED")))
                .andExpect(jsonPath("$.errorMessage", is("Data provider timeout: unable to fetch risk charge data within 30s")));
    }
}
