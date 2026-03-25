package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.DirectChangesColumnDefinition;
import com.prototypes.scenarios.dto.DirectChangesDataSection;
import com.prototypes.scenarios.dto.DirectChangesRuntimeResponseDto;
import com.prototypes.scenarios.repository.ScenarioRepository;
import com.prototypes.scenarios.service.DirectChangesRuntimeService;
import com.prototypes.scenarios.service.ScenarioDetailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Focused tests for the GET /scenarios/{id}/direct-changes endpoint.
 * Uses @WebMvcTest with MockMvc to test controller routing, HTTP status codes,
 * and JSON response shape in isolation from the full application context.
 */
@WebMvcTest(ScenarioController.class)
class DirectChangesEndpointTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ScenarioRepository scenarioRepository;

    @MockitoBean
    private ScenarioDetailService scenarioDetailService;

    @MockitoBean
    private DirectChangesRuntimeService directChangesRuntimeService;

    private static final UUID SCENARIO_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    // ========================================================================
    // Test 1: Successful 200 response with valid JSON structure
    // ========================================================================

    @Test
    void getDirectChanges_success_returns200WithExpectedJsonStructure() throws Exception {
        // Arrange: service returns a valid response with one section
        DirectChangesColumnDefinition col1 = new DirectChangesColumnDefinition(
                "tsName", "string", "Time-Series Name", true);
        DirectChangesColumnDefinition col2 = new DirectChangesColumnDefinition(
                "date", "date", "Date", null);
        DirectChangesColumnDefinition col3 = new DirectChangesColumnDefinition(
                "cur", "number", "Current Value", null);
        DirectChangesColumnDefinition col4 = new DirectChangesColumnDefinition(
                "new", "number", "New Value", null);

        List<Map<String, Object>> rows = List.of(
                Map.of("tsName", "USD LIBOR 3M", "date", "13/10/2025", "cur", 5.25, "new", 5.35),
                Map.of("tsName", "EUR EURIBOR 6M", "date", "13/10/2025", "cur", 3.85, "new", 3.92)
        );

        DirectChangesDataSection section = new DirectChangesDataSection(
                "timeSeriesValues",
                "2 Time-series Points have been changed for 2 Time-Series",
                "https://marketdata.example.com/timeseries/overview",
                2,
                "ROWS",
                List.of(col1, col2, col3, col4),
                rows
        );

        DirectChangesRuntimeResponseDto responseDto = new DirectChangesRuntimeResponseDto(List.of(section));
        when(directChangesRuntimeService.getDirectChanges(SCENARIO_ID))
                .thenReturn(ResponseEntity.ok(responseDto));

        // Act & Assert
        mockMvc.perform(get("/scenarios/{id}/direct-changes", SCENARIO_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dataChanged", hasSize(1)))
                .andExpect(jsonPath("$.dataChanged[0].dataType", is("timeSeriesValues")))
                .andExpect(jsonPath("$.dataChanged[0].header",
                        is("2 Time-series Points have been changed for 2 Time-Series")))
                .andExpect(jsonPath("$.dataChanged[0].externalLink",
                        is("https://marketdata.example.com/timeseries/overview")))
                .andExpect(jsonPath("$.dataChanged[0].totalDataChanges", is(2)))
                .andExpect(jsonPath("$.dataChanged[0].renderState", is("ROWS")))
                .andExpect(jsonPath("$.dataChanged[0].columnDefinitions", hasSize(4)))
                .andExpect(jsonPath("$.dataChanged[0].columnDefinitions[0].dataAttribute", is("tsName")))
                .andExpect(jsonPath("$.dataChanged[0].columnDefinitions[0].isEntityId", is(true)))
                .andExpect(jsonPath("$.dataChanged[0].columnDefinitions[1].isEntityId").doesNotExist())
                .andExpect(jsonPath("$.dataChanged[0].data", hasSize(2)))
                .andExpect(jsonPath("$.dataChanged[0].data[0].tsName", is("USD LIBOR 3M")));
    }

    // ========================================================================
    // Test 2: 404 when scenario not found
    // ========================================================================

    @Test
    void getDirectChanges_scenarioNotFound_returns404() throws Exception {
        UUID unknownId = UUID.fromString("99999999-9999-9999-9999-999999999999");

        when(directChangesRuntimeService.getDirectChanges(unknownId))
                .thenReturn(ResponseEntity.notFound().build());

        mockMvc.perform(get("/scenarios/{id}/direct-changes", unknownId))
                .andExpect(status().isNotFound());
    }

    // ========================================================================
    // Test 3: 400 for EXTERNAL mode
    // ========================================================================

    @Test
    void getDirectChanges_externalMode_returns400WithErrorMessage() throws Exception {
        when(directChangesRuntimeService.getDirectChanges(SCENARIO_ID))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Direct changes are configured as EXTERNAL for this scenario type."));

        mockMvc.perform(get("/scenarios/{id}/direct-changes", SCENARIO_ID))
                .andExpect(status().isBadRequest());
    }

    // ========================================================================
    // Test 4: 400 for FULL_DATA_CHANGES mode
    // ========================================================================

    @Test
    void getDirectChanges_fullDataChangesMode_returns400WithErrorMessage() throws Exception {
        when(directChangesRuntimeService.getDirectChanges(SCENARIO_ID))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Direct changes use FULL_DATA_CHANGES and are provided by the existing grid endpoint."));

        mockMvc.perform(get("/scenarios/{id}/direct-changes", SCENARIO_ID))
                .andExpect(status().isBadRequest());
    }
}
