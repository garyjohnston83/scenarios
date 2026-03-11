package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.ReportDefinitionDto;
import com.prototypes.scenarios.service.ReportDefinitionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportDefinitionController.class)
class ReportDefinitionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReportDefinitionService reportDefinitionService;

    private static final UUID DEF_ID_1 = UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001");
    private static final UUID DEF_ID_2 = UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002");
    private static final LocalDateTime FIXED_TIME = LocalDateTime.of(2026, 3, 10, 12, 0, 0);

    private static final String SAMPLE_DEFINITION = "{\"schema_version\":\"1.0\",\"report_key\":\"sa_capital_summary\",\"scenario_type\":\"FRTB_SA\",\"display_name\":\"SA Capital Charge Summary\",\"sections\":[{\"key\":\"delta\",\"title\":\"Delta\",\"order\":1,\"metrics\":[{\"key\":\"girr_delta\",\"label\":\"GIRR Delta\",\"source_field\":\"risk_charges.girr.delta\",\"format\":\"currency\",\"unit\":\"USD\"}]}]}";

    private ReportDefinitionDto buildDto(UUID id, String scenarioTypeCode, String reportKey,
                                         int version, boolean isActive) {
        return new ReportDefinitionDto(
                id,
                scenarioTypeCode,
                reportKey,
                version,
                SAMPLE_DEFINITION,
                isActive,
                FIXED_TIME,
                FIXED_TIME
        );
    }

    // Test 1: GET /report-definitions returns 200 with list of ReportDefinitionDto
    @Test
    void getReportDefinitions_noFilter_returnsAllDefinitions() throws Exception {
        ReportDefinitionDto dto1 = buildDto(DEF_ID_1, "FRTB_SA", "sa_capital_summary", 1, true);
        ReportDefinitionDto dto2 = buildDto(DEF_ID_2, "MARKET_DATA", "market_risk_summary", 1, true);

        when(reportDefinitionService.listDefinitions(null)).thenReturn(List.of(dto1, dto2));

        mockMvc.perform(get("/report-definitions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id", is(DEF_ID_1.toString())))
                .andExpect(jsonPath("$[0].scenarioTypeCode", is("FRTB_SA")))
                .andExpect(jsonPath("$[0].reportKey", is("sa_capital_summary")))
                .andExpect(jsonPath("$[0].version", is(1)))
                .andExpect(jsonPath("$[0].isActive", is(true)))
                .andExpect(jsonPath("$[1].id", is(DEF_ID_2.toString())))
                .andExpect(jsonPath("$[1].scenarioTypeCode", is("MARKET_DATA")));
    }

    // Test 2: GET /report-definitions?scenarioType=FRTB_SA passes filter and returns filtered results
    @Test
    void getReportDefinitions_filteredByScenarioType_returnsFilteredResults() throws Exception {
        ReportDefinitionDto dto1 = buildDto(DEF_ID_1, "FRTB_SA", "sa_capital_summary", 1, true);

        when(reportDefinitionService.listDefinitions("FRTB_SA")).thenReturn(List.of(dto1));

        mockMvc.perform(get("/report-definitions").param("scenarioType", "FRTB_SA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(DEF_ID_1.toString())))
                .andExpect(jsonPath("$[0].scenarioTypeCode", is("FRTB_SA")))
                .andExpect(jsonPath("$[0].reportKey", is("sa_capital_summary")));

        verify(reportDefinitionService).listDefinitions("FRTB_SA");
    }

    // Test 3: GET /report-definitions/{reportKey} returns 200 with latest version DTO
    @Test
    void getReportDefinition_existingKey_returnsLatestVersion() throws Exception {
        ReportDefinitionDto dto = buildDto(DEF_ID_1, "FRTB_SA", "sa_capital_summary", 2, true);

        when(reportDefinitionService.getLatestDefinition("sa_capital_summary"))
                .thenReturn(Optional.of(dto));

        mockMvc.perform(get("/report-definitions/{reportKey}", "sa_capital_summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(DEF_ID_1.toString())))
                .andExpect(jsonPath("$.scenarioTypeCode", is("FRTB_SA")))
                .andExpect(jsonPath("$.reportKey", is("sa_capital_summary")))
                .andExpect(jsonPath("$.version", is(2)))
                .andExpect(jsonPath("$.isActive", is(true)));
    }

    // Test 4: GET /report-definitions/{reportKey} returns 404 when not found
    @Test
    void getReportDefinition_nonexistentKey_returns404() throws Exception {
        when(reportDefinitionService.getLatestDefinition("nonexistent_report"))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/report-definitions/{reportKey}", "nonexistent_report"))
                .andExpect(status().isNotFound());
    }

    // Test 5: GET /report-definitions/{reportKey}/versions returns 200 with list of all versions
    @Test
    void getReportDefinitionVersions_existingKey_returnsAllVersions() throws Exception {
        ReportDefinitionDto dto1 = buildDto(DEF_ID_1, "FRTB_SA", "sa_capital_summary", 2, true);
        ReportDefinitionDto dto2 = buildDto(DEF_ID_2, "FRTB_SA", "sa_capital_summary", 1, false);

        when(reportDefinitionService.listVersions("sa_capital_summary"))
                .thenReturn(List.of(dto1, dto2));

        mockMvc.perform(get("/report-definitions/{reportKey}/versions", "sa_capital_summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].version", is(2)))
                .andExpect(jsonPath("$[0].isActive", is(true)))
                .andExpect(jsonPath("$[1].version", is(1)))
                .andExpect(jsonPath("$[1].isActive", is(false)));
    }

    // Test 6: POST /report-definitions with valid payload returns 201 with created DTO
    @Test
    void createReportDefinition_validPayload_returns201() throws Exception {
        ReportDefinitionDto createdDto = buildDto(DEF_ID_1, "FRTB_SA", "sa_capital_summary", 1, true);

        when(reportDefinitionService.createDefinition(any())).thenReturn(createdDto);

        mockMvc.perform(post("/report-definitions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "scenarioTypeCode": "FRTB_SA",
                                    "reportKey": "sa_capital_summary",
                                    "definition": "{\\"schema_version\\":\\"1.0\\",\\"report_key\\":\\"sa_capital_summary\\",\\"scenario_type\\":\\"FRTB_SA\\",\\"display_name\\":\\"SA Capital Charge Summary\\",\\"sections\\":[{\\"key\\":\\"delta\\",\\"title\\":\\"Delta\\",\\"order\\":1,\\"metrics\\":[{\\"key\\":\\"girr_delta\\",\\"label\\":\\"GIRR Delta\\",\\"source_field\\":\\"risk_charges.girr.delta\\",\\"format\\":\\"currency\\",\\"unit\\":\\"USD\\"}]}]}"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(DEF_ID_1.toString())))
                .andExpect(jsonPath("$.scenarioTypeCode", is("FRTB_SA")))
                .andExpect(jsonPath("$.reportKey", is("sa_capital_summary")))
                .andExpect(jsonPath("$.version", is(1)))
                .andExpect(jsonPath("$.isActive", is(true)))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    // Test 7: POST /report-definitions with invalid definition returns 422
    @Test
    void createReportDefinition_invalidDefinition_returns422() throws Exception {
        when(reportDefinitionService.createDefinition(any()))
                .thenThrow(new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "schema_version: must be present; sections: must be a non-empty array"));

        mockMvc.perform(post("/report-definitions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "scenarioTypeCode": "FRTB_SA",
                                    "reportKey": "bad_report",
                                    "definition": "{\\"invalid\\":\\"json\\"}"
                                }
                                """))
                .andExpect(status().isUnprocessableEntity());
    }

    // Test 8: POST /report-definitions/{id}/deactivate returns 200 with updated DTO
    @Test
    void deactivateReportDefinition_existingId_returns200() throws Exception {
        ReportDefinitionDto deactivatedDto = buildDto(DEF_ID_1, "FRTB_SA", "sa_capital_summary", 1, false);

        when(reportDefinitionService.deactivateDefinition(DEF_ID_1)).thenReturn(deactivatedDto);

        mockMvc.perform(post("/report-definitions/{id}/deactivate", DEF_ID_1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(DEF_ID_1.toString())))
                .andExpect(jsonPath("$.isActive", is(false)))
                .andExpect(jsonPath("$.scenarioTypeCode", is("FRTB_SA")))
                .andExpect(jsonPath("$.reportKey", is("sa_capital_summary")));
    }
}
