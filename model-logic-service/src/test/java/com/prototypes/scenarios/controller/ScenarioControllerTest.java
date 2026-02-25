package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.ChangesSummaryDto;
import com.prototypes.scenarios.dto.CtaDto;
import com.prototypes.scenarios.dto.DirectChangesDto;
import com.prototypes.scenarios.dto.EventDto;
import com.prototypes.scenarios.dto.GridRowDto;
import com.prototypes.scenarios.dto.ImpactDataDto;
import com.prototypes.scenarios.dto.ImpactSummaryDto;
import com.prototypes.scenarios.dto.MessageDto;
import com.prototypes.scenarios.dto.PostEventRequestDto;
import com.prototypes.scenarios.dto.ProgressDto;
import com.prototypes.scenarios.dto.ReviewApprovalDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import com.prototypes.scenarios.dto.ScenarioHeaderDto;
import com.prototypes.scenarios.dto.ScenarioTypeDto;
import com.prototypes.scenarios.dto.SummaryCardsDto;
import com.prototypes.scenarios.dto.WorkflowDto;
import com.prototypes.scenarios.repository.ScenarioRepository;
import com.prototypes.scenarios.service.ScenarioDetailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ScenarioController.class)
class ScenarioControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ScenarioRepository scenarioRepository;

    @MockitoBean
    private ScenarioDetailService scenarioDetailService;

    private static final UUID SCENARIO_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private static final UUID EVENT_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    private static final CtaDto CHANGES_CTA = new CtaDto(
            "Open in Market Data UI \u2192",
            "https://marketdata.example.com/changes"
    );

    private static final CtaDto IMPACT_CTA = new CtaDto(
            "View all impact reports \u2192",
            "https://marketdata.example.com/impacts"
    );

    // ========================================================================
    // Builder / helper methods
    // ========================================================================

    /**
     * Builds a base ScenarioDetailDto with no expanded sections.
     */
    private ScenarioDetailDto buildBaseDetailDto() {
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    /**
     * Builds a ScenarioDetailDto with the header section expanded.
     */
    private ScenarioDetailDto buildDetailDtoWithHeader() {
        ScenarioHeaderDto header = new ScenarioHeaderDto(
                "SIGNOFF_IN_PROGRESS",
                "MODERATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null
        );
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                header,
                null,
                null,
                null,
                null,
                null
        );
    }

    /**
     * Builds a ScenarioDetailDto with the summaryCards section expanded.
     * Includes non-null values for all impactSummary fields and non-null CTAs.
     */
    private ScenarioDetailDto buildDetailDtoWithSummaryCards() {
        ChangesSummaryDto changesSummary = new ChangesSummaryDto(8, 5, 3, CHANGES_CTA);
        ImpactSummaryDto impactSummary = new ImpactSummaryDto(
                "MODERATE",
                LocalDateTime.of(2026, 2, 20, 14, 0, 0),
                "SUCCEEDED",
                3,
                IMPACT_CTA
        );
        SummaryCardsDto summaryCards = new SummaryCardsDto(changesSummary, impactSummary);
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                summaryCards,
                null,
                null,
                null,
                null
        );
    }

    /**
     * Builds a ScenarioDetailDto with both header and summaryCards sections expanded.
     */
    private ScenarioDetailDto buildDetailDtoWithHeaderAndSummaryCards() {
        ScenarioHeaderDto header = new ScenarioHeaderDto(
                "SIGNOFF_IN_PROGRESS",
                "MODERATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null
        );
        ChangesSummaryDto changesSummary = new ChangesSummaryDto(8, 5, 3, CHANGES_CTA);
        ImpactSummaryDto impactSummary = new ImpactSummaryDto(
                "MODERATE",
                LocalDateTime.of(2026, 2, 20, 14, 0, 0),
                "SUCCEEDED",
                3,
                IMPACT_CTA
        );
        SummaryCardsDto summaryCards = new SummaryCardsDto(changesSummary, impactSummary);
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                header,
                summaryCards,
                null,
                null,
                null,
                null
        );
    }

    /**
     * Builds a ScenarioDetailDto with summaryCards where no ImpactRun exists
     * (lastRunAt and latestRunStatus are null). CTAs are null.
     * Note: With @JsonInclude(NON_NULL) on ImpactSummaryDto, null fields
     * (lastRunAt, latestRunStatus, cta) are omitted from JSON entirely.
     */
    private ScenarioDetailDto buildDetailDtoWithSummaryCardsNoImpactRun() {
        ChangesSummaryDto changesSummary = new ChangesSummaryDto(8, 5, 3, null);
        ImpactSummaryDto impactSummary = new ImpactSummaryDto(
                "MODERATE",
                null,
                null,
                3,
                null
        );
        SummaryCardsDto summaryCards = new SummaryCardsDto(changesSummary, impactSummary);
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                summaryCards,
                null,
                null,
                null,
                null
        );
    }

    /**
     * Builds a ScenarioDetailDto with summaryCards where exceptionsCount is null.
     * Note: With @JsonInclude(NON_NULL) on ImpactSummaryDto, the null
     * exceptionsCount field is omitted from JSON entirely.
     */
    private ScenarioDetailDto buildDetailDtoWithSummaryCardsNullExceptions() {
        ChangesSummaryDto changesSummary = new ChangesSummaryDto(8, 5, 3, CHANGES_CTA);
        ImpactSummaryDto impactSummary = new ImpactSummaryDto(
                "MODERATE",
                LocalDateTime.of(2026, 2, 20, 14, 0, 0),
                "SUCCEEDED",
                null,
                IMPACT_CTA
        );
        SummaryCardsDto summaryCards = new SummaryCardsDto(changesSummary, impactSummary);
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                summaryCards,
                null,
                null,
                null,
                null
        );
    }

    /**
     * Builds a ScenarioDetailDto with summaryCards where exceptionsCount is zero.
     */
    private ScenarioDetailDto buildDetailDtoWithSummaryCardsZeroExceptions() {
        ChangesSummaryDto changesSummary = new ChangesSummaryDto(8, 5, 3, CHANGES_CTA);
        ImpactSummaryDto impactSummary = new ImpactSummaryDto(
                "MODERATE",
                LocalDateTime.of(2026, 2, 20, 14, 0, 0),
                "SUCCEEDED",
                0,
                IMPACT_CTA
        );
        SummaryCardsDto summaryCards = new SummaryCardsDto(changesSummary, impactSummary);
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                summaryCards,
                null,
                null,
                null,
                null
        );
    }

    /**
     * Builds a ScenarioDetailDto with summaryCards where both CTAs are null.
     * Used to verify that null cta fields are omitted from JSON via @JsonInclude(NON_NULL).
     */
    private ScenarioDetailDto buildDetailDtoWithSummaryCardsNoCtas() {
        ChangesSummaryDto changesSummary = new ChangesSummaryDto(8, 5, 3, null);
        ImpactSummaryDto impactSummary = new ImpactSummaryDto(
                "MODERATE",
                LocalDateTime.of(2026, 2, 20, 14, 0, 0),
                "SUCCEEDED",
                3,
                null
        );
        SummaryCardsDto summaryCards = new SummaryCardsDto(changesSummary, impactSummary);
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                summaryCards,
                null,
                null,
                null,
                null
        );
    }

    /**
     * Builds a ScenarioDetailDto with summaryCards in a mixed CTA state:
     * changesSummary has a CTA present, impactSummary has CTA null (omitted from JSON).
     */
    private ScenarioDetailDto buildDetailDtoWithSummaryCardsMixedCtas() {
        ChangesSummaryDto changesSummary = new ChangesSummaryDto(8, 5, 3, CHANGES_CTA);
        ImpactSummaryDto impactSummary = new ImpactSummaryDto(
                "MODERATE",
                LocalDateTime.of(2026, 2, 20, 14, 0, 0),
                "SUCCEEDED",
                3,
                null
        );
        SummaryCardsDto summaryCards = new SummaryCardsDto(changesSummary, impactSummary);
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                summaryCards,
                null,
                null,
                null,
                null
        );
    }

    // ========================================================================
    // Builder helpers for reviewApproval test fixtures
    // ========================================================================

    /**
     * Builds a sample ReviewApprovalDto with workflow (SIGNOFF_IN_PROGRESS, progress 3/5),
     * 2 messages, and 3 events.
     */
    private ReviewApprovalDto buildReviewApprovalDto() {
        ProgressDto progress = new ProgressDto(3, 5);
        WorkflowDto workflow = new WorkflowDto("SIGNOFF_IN_PROGRESS", "Sign-off In Progress", progress);

        List<MessageDto> messages = List.of(
                new MessageDto(
                        UUID.fromString("aaaa1111-1111-1111-1111-111111111111"),
                        "Alice Smith",
                        LocalDateTime.of(2026, 2, 19, 9, 0, 0),
                        "Please review the updated curve data."
                ),
                new MessageDto(
                        UUID.fromString("aaaa2222-2222-2222-2222-222222222222"),
                        "Bob Jones",
                        LocalDateTime.of(2026, 2, 19, 10, 30, 0),
                        "Reviewed and looks good."
                )
        );

        List<EventDto> events = List.of(
                new EventDto(
                        UUID.fromString("bbbb1111-1111-1111-1111-111111111111"),
                        LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                        "System",
                        "SCENARIO_CREATED",
                        "Scenario created",
                        null
                ),
                new EventDto(
                        UUID.fromString("bbbb2222-2222-2222-2222-222222222222"),
                        LocalDateTime.of(2026, 2, 19, 8, 0, 0),
                        "System",
                        "IMPACT_COMPLETED",
                        "Impact assessment completed",
                        null
                ),
                new EventDto(
                        UUID.fromString("bbbb3333-3333-3333-3333-333333333333"),
                        LocalDateTime.of(2026, 2, 19, 11, 0, 0),
                        "Alice Smith",
                        "SIGNOFF_COMMENCED",
                        "Sign-off commenced",
                        null
                )
        );

        return new ReviewApprovalDto(workflow, messages, events, null, null);
    }

    /**
     * Builds a ReviewApprovalDto containing a RECALL event with relatedMessageId populated.
     * Used to verify that non-null relatedMessageId appears in JSON.
     */
    private ReviewApprovalDto buildReviewApprovalDtoWithRelatedMessageId() {
        ProgressDto progress = new ProgressDto(1, 5);
        WorkflowDto workflow = new WorkflowDto("DRAFT", "Draft", progress);

        UUID relatedMsgId = UUID.fromString("dddd1111-1111-1111-1111-111111111111");

        List<MessageDto> messages = List.of(
                new MessageDto(
                        relatedMsgId,
                        "Alice Smith",
                        LocalDateTime.of(2026, 2, 20, 12, 0, 0),
                        "Recalling because of data issue."
                )
        );

        List<EventDto> events = List.of(
                new EventDto(
                        UUID.fromString("bbbb1111-1111-1111-1111-111111111111"),
                        LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                        "System",
                        "SCENARIO_CREATED",
                        "Scenario created",
                        null
                ),
                new EventDto(
                        UUID.fromString("bbbb4444-4444-4444-4444-444444444444"),
                        LocalDateTime.of(2026, 2, 20, 12, 0, 0),
                        "Alice Smith",
                        "SCENARIO_RECALLED",
                        "Scenario recalled",
                        relatedMsgId
                )
        );

        return new ReviewApprovalDto(workflow, messages, events, null, null);
    }

    /**
     * Builds a ScenarioDetailDto with only the reviewApproval section populated.
     * Header and summaryCards are null.
     */
    private ScenarioDetailDto buildDetailDtoWithReviewApproval() {
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                null,
                buildReviewApprovalDto(),
                null,
                null,
                null
        );
    }

    /**
     * Builds a ScenarioDetailDto with all three expand sections populated:
     * header, summaryCards, and reviewApproval.
     */
    private ScenarioDetailDto buildDetailDtoWithAllSections() {
        ScenarioHeaderDto header = new ScenarioHeaderDto(
                "SIGNOFF_IN_PROGRESS",
                "MODERATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null
        );
        ChangesSummaryDto changesSummary = new ChangesSummaryDto(8, 5, 3, CHANGES_CTA);
        ImpactSummaryDto impactSummary = new ImpactSummaryDto(
                "MODERATE",
                LocalDateTime.of(2026, 2, 20, 14, 0, 0),
                "SUCCEEDED",
                3,
                IMPACT_CTA
        );
        SummaryCardsDto summaryCards = new SummaryCardsDto(changesSummary, impactSummary);
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                header,
                summaryCards,
                buildReviewApprovalDto(),
                null,
                null,
                null
        );
    }

    /**
     * Builds a ScenarioDetailDto with reviewApproval containing empty messages and events arrays.
     */
    private ScenarioDetailDto buildDetailDtoWithEmptyReviewApproval() {
        ProgressDto progress = new ProgressDto(2, 5);
        WorkflowDto workflow = new WorkflowDto("IMPACT_AVAILABLE", "Impact Available", progress);
        ReviewApprovalDto reviewApproval = new ReviewApprovalDto(workflow, List.of(), List.of(), null, null);
        return new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                null,
                reviewApproval,
                null,
                null,
                null
        );
    }

    // ========================================================================
    // Existing tests (updated to mock ScenarioDetailService instead of repository)
    // ========================================================================

    @Test
    void getScenario_noExpandParam_returnsBaseFieldsOnly() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Collections.emptySet()))
                .thenReturn(Optional.of(buildBaseDetailDto()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(SCENARIO_ID.toString())))
                .andExpect(jsonPath("$.name", is("Rate Shock Scenario")))
                .andExpect(jsonPath("$.scenarioTypeCode", is("INTEREST_RATE")))
                .andExpect(jsonPath("$.ownerDisplayName", is("John Doe")))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists())
                .andExpect(jsonPath("$.header").doesNotExist());
    }

    @Test
    void getScenario_expandHeader_returnsBaseFieldsPlusHeader() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("header")))
                .thenReturn(Optional.of(buildDetailDtoWithHeader()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "header"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(SCENARIO_ID.toString())))
                .andExpect(jsonPath("$.name", is("Rate Shock Scenario")))
                .andExpect(jsonPath("$.scenarioTypeCode", is("INTEREST_RATE")))
                .andExpect(jsonPath("$.ownerDisplayName", is("John Doe")))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists())
                .andExpect(jsonPath("$.header.workflowState", is("SIGNOFF_IN_PROGRESS")))
                .andExpect(jsonPath("$.header.impact", is("MODERATE")))
                .andExpect(jsonPath("$.header.ownerDisplayName", is("John Doe")))
                .andExpect(jsonPath("$.header.createdAt").exists())
                .andExpect(jsonPath("$.header.updatedAt").exists());
    }

    @Test
    void getScenario_expandHeaderWithUnknownSection_returnsHeaderIgnoresUnknown() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("header", "unknownSection")))
                .thenReturn(Optional.of(buildDetailDtoWithHeader()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "header,unknownSection"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(SCENARIO_ID.toString())))
                .andExpect(jsonPath("$.name", is("Rate Shock Scenario")))
                .andExpect(jsonPath("$.header.workflowState", is("SIGNOFF_IN_PROGRESS")))
                .andExpect(jsonPath("$.header.impact", is("MODERATE")))
                .andExpect(jsonPath("$.unknownSection").doesNotExist());
    }

    @Test
    void getScenario_unknownId_returns404() throws Exception {
        UUID unknownId = UUID.fromString("99999999-9999-9999-9999-999999999999");
        when(scenarioDetailService.getScenarioDetail(unknownId, Collections.emptySet()))
                .thenReturn(Optional.empty());

        mockMvc.perform(get("/scenarios/{id}", unknownId))
                .andExpect(status().isNotFound());
    }

    // ========================================================================
    // New tests for summaryCards expand
    // ========================================================================

    @Test
    void getScenario_expandSummaryCards_returnsSummaryCardsWithCorrectFields() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("summaryCards")))
                .thenReturn(Optional.of(buildDetailDtoWithSummaryCards()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "summaryCards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(SCENARIO_ID.toString())))
                .andExpect(jsonPath("$.name", is("Rate Shock Scenario")))
                .andExpect(jsonPath("$.header").doesNotExist())
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesTotal", is(8)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesDirect", is(5)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesIndirect", is(3)))
                .andExpect(jsonPath("$.summaryCards.impactSummary.impact", is("MODERATE")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.lastRunAt").exists())
                .andExpect(jsonPath("$.summaryCards.impactSummary.latestRunStatus", is("SUCCEEDED")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.exceptionsCount", is(3)));
    }

    @Test
    void getScenario_expandHeaderAndSummaryCards_returnsBothSections() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("header", "summaryCards")))
                .thenReturn(Optional.of(buildDetailDtoWithHeaderAndSummaryCards()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "header,summaryCards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(SCENARIO_ID.toString())))
                .andExpect(jsonPath("$.name", is("Rate Shock Scenario")))
                .andExpect(jsonPath("$.header.workflowState", is("SIGNOFF_IN_PROGRESS")))
                .andExpect(jsonPath("$.header.impact", is("MODERATE")))
                .andExpect(jsonPath("$.header.ownerDisplayName", is("John Doe")))
                .andExpect(jsonPath("$.header.createdAt").exists())
                .andExpect(jsonPath("$.header.updatedAt").exists())
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesTotal", is(8)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesDirect", is(5)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesIndirect", is(3)))
                .andExpect(jsonPath("$.summaryCards.impactSummary.impact", is("MODERATE")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.lastRunAt").exists())
                .andExpect(jsonPath("$.summaryCards.impactSummary.latestRunStatus", is("SUCCEEDED")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.exceptionsCount", is(3)));
    }

    @Test
    void getScenario_noExpandParam_returnsNeitherHeaderNorSummaryCards() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Collections.emptySet()))
                .thenReturn(Optional.of(buildBaseDetailDto()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(SCENARIO_ID.toString())))
                .andExpect(jsonPath("$.name", is("Rate Shock Scenario")))
                .andExpect(jsonPath("$.header").doesNotExist())
                .andExpect(jsonPath("$.summaryCards").doesNotExist());
    }

    @Test
    void getScenario_expandSummaryCards_noImpactRun_returnsNullRunFields() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("summaryCards")))
                .thenReturn(Optional.of(buildDetailDtoWithSummaryCardsNoImpactRun()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "summaryCards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesTotal", is(8)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesDirect", is(5)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesIndirect", is(3)))
                .andExpect(jsonPath("$.summaryCards.impactSummary.impact", is("MODERATE")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.lastRunAt").doesNotExist())
                .andExpect(jsonPath("$.summaryCards.impactSummary.latestRunStatus").doesNotExist())
                .andExpect(jsonPath("$.summaryCards.impactSummary.exceptionsCount", is(3)));
    }

    @Test
    void getScenario_expandSummaryCards_nullExceptionsCount_serializesAsJsonNull() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("summaryCards")))
                .thenReturn(Optional.of(buildDetailDtoWithSummaryCardsNullExceptions()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "summaryCards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summaryCards.impactSummary.impact", is("MODERATE")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.lastRunAt").exists())
                .andExpect(jsonPath("$.summaryCards.impactSummary.latestRunStatus", is("SUCCEEDED")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.exceptionsCount").doesNotExist());
    }

    // ========================================================================
    // Gap test: exceptionsCount serializes as integer 0 (not null)
    // ========================================================================

    @Test
    void getScenario_expandSummaryCards_zeroExceptionsCount_serializesAsIntegerZero() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("summaryCards")))
                .thenReturn(Optional.of(buildDetailDtoWithSummaryCardsZeroExceptions()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "summaryCards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summaryCards.impactSummary.exceptionsCount", is(0)))
                .andExpect(jsonPath("$.summaryCards.impactSummary.impact", is("MODERATE")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.latestRunStatus", is("SUCCEEDED")));
    }

    // ========================================================================
    // New tests for CTA fields in summaryCards
    // ========================================================================

    @Test
    void getScenario_expandSummaryCards_withCtas_returnsCtaFieldsInJson() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("summaryCards")))
                .thenReturn(Optional.of(buildDetailDtoWithSummaryCards()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "summaryCards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summaryCards.changesSummary.cta.label",
                        is("Open in Market Data UI \u2192")))
                .andExpect(jsonPath("$.summaryCards.changesSummary.cta.url",
                        is("https://marketdata.example.com/changes")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.cta.label",
                        is("View all impact reports \u2192")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.cta.url",
                        is("https://marketdata.example.com/impacts")));
    }

    @Test
    void getScenario_expandSummaryCards_withoutCtas_ctaFieldsOmittedFromJson() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("summaryCards")))
                .thenReturn(Optional.of(buildDetailDtoWithSummaryCardsNoCtas()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "summaryCards"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesTotal", is(8)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesDirect", is(5)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesIndirect", is(3)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.cta").doesNotExist())
                .andExpect(jsonPath("$.summaryCards.impactSummary.impact", is("MODERATE")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.lastRunAt").exists())
                .andExpect(jsonPath("$.summaryCards.impactSummary.latestRunStatus", is("SUCCEEDED")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.exceptionsCount", is(3)))
                .andExpect(jsonPath("$.summaryCards.impactSummary.cta").doesNotExist());
    }

    // ========================================================================
    // Gap test: mixed CTA state -- changesSummary has CTA, impactSummary does not
    // ========================================================================

    @Test
    void getScenario_expandSummaryCards_mixedCtaState_changesSummaryHasCtaImpactSummaryDoesNot() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("summaryCards")))
                .thenReturn(Optional.of(buildDetailDtoWithSummaryCardsMixedCtas()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "summaryCards"))
                .andExpect(status().isOk())
                // changesSummary should have CTA present
                .andExpect(jsonPath("$.summaryCards.changesSummary.cta.label",
                        is("Open in Market Data UI \u2192")))
                .andExpect(jsonPath("$.summaryCards.changesSummary.cta.url",
                        is("https://marketdata.example.com/changes")))
                // impactSummary should have CTA omitted (null)
                .andExpect(jsonPath("$.summaryCards.impactSummary.cta").doesNotExist())
                // Verify other fields still present
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesTotal", is(8)))
                .andExpect(jsonPath("$.summaryCards.impactSummary.impact", is("MODERATE")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.exceptionsCount", is(3)));
    }

    // ========================================================================
    // New tests for reviewApproval expand
    // ========================================================================

    @Test
    void getScenario_expandReviewApproval_returnsWorkflowAndMessagesAndEvents() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("reviewApproval")))
                .thenReturn(Optional.of(buildDetailDtoWithReviewApproval()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "reviewApproval"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(SCENARIO_ID.toString())))
                .andExpect(jsonPath("$.name", is("Rate Shock Scenario")))
                // Workflow assertions
                .andExpect(jsonPath("$.reviewApproval.workflow.workflowState", is("SIGNOFF_IN_PROGRESS")))
                .andExpect(jsonPath("$.reviewApproval.workflow.workflowStateLabel", is("Sign-off In Progress")))
                .andExpect(jsonPath("$.reviewApproval.workflow.progress.current", is(3)))
                .andExpect(jsonPath("$.reviewApproval.workflow.progress.total", is(5)))
                // Messages assertions
                .andExpect(jsonPath("$.reviewApproval.messages", hasSize(2)))
                .andExpect(jsonPath("$.reviewApproval.messages[0].authorDisplayName", is("Alice Smith")))
                .andExpect(jsonPath("$.reviewApproval.messages[0].text", is("Please review the updated curve data.")))
                .andExpect(jsonPath("$.reviewApproval.messages[0].createdAt").exists())
                .andExpect(jsonPath("$.reviewApproval.messages[1].authorDisplayName", is("Bob Jones")))
                .andExpect(jsonPath("$.reviewApproval.messages[1].text", is("Reviewed and looks good.")))
                // Events assertions
                .andExpect(jsonPath("$.reviewApproval.events", hasSize(3)))
                .andExpect(jsonPath("$.reviewApproval.events[0].eventLabel", is("Scenario created")))
                .andExpect(jsonPath("$.reviewApproval.events[0].actorDisplayName", is("System")))
                .andExpect(jsonPath("$.reviewApproval.events[0].eventType", is("SCENARIO_CREATED")))
                .andExpect(jsonPath("$.reviewApproval.events[0].createdAt").exists())
                .andExpect(jsonPath("$.reviewApproval.events[1].eventLabel", is("Impact assessment completed")))
                .andExpect(jsonPath("$.reviewApproval.events[2].eventLabel", is("Sign-off commenced")))
                // Header and summaryCards should be absent
                .andExpect(jsonPath("$.header").doesNotExist())
                .andExpect(jsonPath("$.summaryCards").doesNotExist());
    }

    @Test
    void getScenario_expandAllSections_returnsHeaderAndSummaryCardsAndReviewApproval() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("header", "summaryCards", "reviewApproval")))
                .thenReturn(Optional.of(buildDetailDtoWithAllSections()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "header,summaryCards,reviewApproval"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(SCENARIO_ID.toString())))
                // Header section present
                .andExpect(jsonPath("$.header.workflowState", is("SIGNOFF_IN_PROGRESS")))
                .andExpect(jsonPath("$.header.impact", is("MODERATE")))
                .andExpect(jsonPath("$.header.ownerDisplayName", is("John Doe")))
                .andExpect(jsonPath("$.header.createdAt").exists())
                .andExpect(jsonPath("$.header.updatedAt").exists())
                // SummaryCards section present
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesTotal", is(8)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesDirect", is(5)))
                .andExpect(jsonPath("$.summaryCards.changesSummary.changesIndirect", is(3)))
                .andExpect(jsonPath("$.summaryCards.impactSummary.impact", is("MODERATE")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.latestRunStatus", is("SUCCEEDED")))
                .andExpect(jsonPath("$.summaryCards.impactSummary.exceptionsCount", is(3)))
                // ReviewApproval section present
                .andExpect(jsonPath("$.reviewApproval.workflow.workflowState", is("SIGNOFF_IN_PROGRESS")))
                .andExpect(jsonPath("$.reviewApproval.workflow.workflowStateLabel", is("Sign-off In Progress")))
                .andExpect(jsonPath("$.reviewApproval.workflow.progress.current", is(3)))
                .andExpect(jsonPath("$.reviewApproval.workflow.progress.total", is(5)))
                .andExpect(jsonPath("$.reviewApproval.messages", hasSize(2)))
                .andExpect(jsonPath("$.reviewApproval.events", hasSize(3)));
    }

    @Test
    void getScenario_expandReviewApproval_emptyMessagesAndEvents_returnsEmptyArrays() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("reviewApproval")))
                .thenReturn(Optional.of(buildDetailDtoWithEmptyReviewApproval()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "reviewApproval"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewApproval.workflow.workflowState", is("IMPACT_AVAILABLE")))
                .andExpect(jsonPath("$.reviewApproval.workflow.workflowStateLabel", is("Impact Available")))
                .andExpect(jsonPath("$.reviewApproval.workflow.progress.current", is(2)))
                .andExpect(jsonPath("$.reviewApproval.workflow.progress.total", is(5)))
                .andExpect(jsonPath("$.reviewApproval.messages", hasSize(0)))
                .andExpect(jsonPath("$.reviewApproval.events", hasSize(0)));
    }

    @Test
    void getScenario_noExpand_doesNotIncludeReviewApproval() throws Exception {
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Collections.emptySet()))
                .thenReturn(Optional.of(buildBaseDetailDto()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(SCENARIO_ID.toString())))
                .andExpect(jsonPath("$.name", is("Rate Shock Scenario")))
                .andExpect(jsonPath("$.header").doesNotExist())
                .andExpect(jsonPath("$.summaryCards").doesNotExist())
                .andExpect(jsonPath("$.reviewApproval").doesNotExist());
    }

    // ========================================================================
    // New tests for POST /scenarios/{id}/messages endpoint
    // ========================================================================

    @Test
    void postMessage_validScenario_returns201WithMessageDto() throws Exception {
        UUID messageId = UUID.fromString("cccc1111-1111-1111-1111-111111111111");
        MessageDto createdMessage = new MessageDto(
                messageId,
                "Current User",
                LocalDateTime.of(2026, 2, 21, 12, 0, 0),
                "Test message"
        );

        when(scenarioDetailService.postMessage(eq(SCENARIO_ID), eq("Test message"), isNull()))
                .thenReturn(createdMessage);

        mockMvc.perform(post("/scenarios/{id}/messages", SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Test message\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(messageId.toString())))
                .andExpect(jsonPath("$.authorDisplayName", is("Current User")))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.text", is("Test message")));
    }

    @Test
    void postMessage_unknownScenario_returns404() throws Exception {
        UUID unknownId = UUID.fromString("99999999-9999-9999-9999-999999999999");

        when(scenarioDetailService.postMessage(eq(unknownId), eq("Test message"), isNull()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Scenario not found"));

        mockMvc.perform(post("/scenarios/{id}/messages", unknownId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Test message\"}"))
                .andExpect(status().isNotFound());
    }

    // ========================================================================
    // Tests for POST /scenarios/{id}/events endpoint (updated for new signature)
    // ========================================================================

    @Test
    void postEvent_signoff_returns200() throws Exception {
        doNothing().when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"SIGNOFF\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string(""));
    }

    @Test
    void postEvent_recall_returns200() throws Exception {
        doNothing().when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"RECALL\",\"message\":\"Recalling for review\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string(""));
    }

    @Test
    void postEvent_reject_returns200() throws Exception {
        doNothing().when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"REJECT\",\"message\":\"Data quality issue\"}"))
                .andExpect(status().isOk())
                .andExpect(content().string(""));
    }

    @Test
    void postEvent_unknownScenario_returns404() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Scenario not found"))
                .when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"SIGNOFF\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void postEvent_missingMessage_returns400() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required for RECALL"))
                .when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"RECALL\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postEvent_invalidTransition_returns409() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.CONFLICT, "SIGNOFF is not allowed from state: SIGNED_OFF"))
                .when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"SIGNOFF\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void postEvent_withActorIdHeader_passesActorIdToService() throws Exception {
        doNothing().when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"SIGNOFF\"}")
                        .header("X-Actor-Id", "approver-1"))
                .andExpect(status().isOk());

        verify(scenarioDetailService).processEvent(
                eq(EVENT_SCENARIO_ID), any(PostEventRequestDto.class), isNull(), eq("approver-1"));
    }

    @Test
    void postEvent_withoutActorIdHeader_passesNullToService() throws Exception {
        doNothing().when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"SIGNOFF\"}"))
                .andExpect(status().isOk());

        verify(scenarioDetailService).processEvent(
                eq(EVENT_SCENARIO_ID), any(PostEventRequestDto.class), isNull(), isNull());
    }

    // ========================================================================
    // Increment 9: System event tests (Task Group 6)
    // ========================================================================

    @Test
    void postEvent_impactCompleted_systemActor_returns200() throws Exception {
        doNothing().when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Actor", "System")
                        .content("{\"type\":\"IMPACT_COMPLETED\",\"impactRun\":{\"finishedAt\":\"2026-02-22T10:00:00\",\"status\":\"COMPLETED\"}}"))
                .andExpect(status().isOk());
    }

    @Test
    void postEvent_impactDataRefreshed_systemActor_returns200() throws Exception {
        doNothing().when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Actor", "System")
                        .content("{\"type\":\"IMPACT_DATA_REFRESHED\",\"impactRun\":{\"finishedAt\":\"2026-02-22T11:00:00\",\"status\":\"SUCCEEDED\"}}"))
                .andExpect(status().isOk());
    }

    @Test
    void postEvent_impactInvalidated_systemActor_returns200() throws Exception {
        doNothing().when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Actor", "System")
                        .content("{\"type\":\"IMPACT_INVALIDATED\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void postEvent_promotionCompleted_systemActor_returns200() throws Exception {
        doNothing().when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Actor", "System")
                        .content("{\"type\":\"PROMOTION_COMPLETED\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void postEvent_impactCompleted_invalidState_returns409() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.CONFLICT, "IMPACT_COMPLETED is not allowed from state: SIGNED_OFF"))
                .when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Actor", "System")
                        .content("{\"type\":\"IMPACT_COMPLETED\",\"impactRun\":{\"finishedAt\":\"2026-02-22T10:00:00\",\"status\":\"COMPLETED\"}}"))
                .andExpect(status().isConflict());
    }

    @Test
    void postEvent_impactCompleted_missingPayload_returns400() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "impactRun payload is required for IMPACT_COMPLETED"))
                .when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Actor", "System")
                        .content("{\"type\":\"IMPACT_COMPLETED\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void postEvent_promotedState_returns409() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Cannot perform actions on a promoted scenario"))
                .when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Actor", "System")
                        .content("{\"type\":\"IMPACT_COMPLETED\",\"impactRun\":{\"finishedAt\":\"2026-02-22T10:00:00\",\"status\":\"COMPLETED\"}}"))
                .andExpect(status().isConflict());
    }

    @Test
    void postEvent_systemActorHeader_routesToSystemHandler() throws Exception {
        doNothing().when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Actor", "System")
                        .content("{\"type\":\"IMPACT_COMPLETED\",\"impactRun\":{\"finishedAt\":\"2026-02-22T10:00:00\",\"status\":\"COMPLETED\"}}"))
                .andExpect(status().isOk());

        verify(scenarioDetailService).processEvent(
                eq(EVENT_SCENARIO_ID), any(PostEventRequestDto.class), eq("System"), isNull());
    }

    // ========================================================================
    // Increment 9 Gap Tests (Task Group 9) -- strategic coverage for genuinely missing paths
    // ========================================================================

    @Test
    void getScenario_expandReviewApproval_eventWithRelatedMessageId_includesRelatedMessageIdInJson() throws Exception {
        ScenarioDetailDto dto = new ScenarioDetailDto(
                SCENARIO_ID,
                "Rate Shock Scenario",
                "INTEREST_RATE",
                "John Doe",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                null,
                null,
                buildReviewApprovalDtoWithRelatedMessageId(),
                null,
                null,
                null
        );

        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("reviewApproval")))
                .thenReturn(Optional.of(dto));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "reviewApproval"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewApproval.events", hasSize(2)))
                // First event (SCENARIO_CREATED) has null relatedMessageId -- should be omitted
                .andExpect(jsonPath("$.reviewApproval.events[0].eventType", is("SCENARIO_CREATED")))
                .andExpect(jsonPath("$.reviewApproval.events[0].relatedMessageId").doesNotExist())
                // Second event (SCENARIO_RECALLED) has non-null relatedMessageId -- should be present
                .andExpect(jsonPath("$.reviewApproval.events[1].eventType", is("SCENARIO_RECALLED")))
                .andExpect(jsonPath("$.reviewApproval.events[1].relatedMessageId",
                        is("dddd1111-1111-1111-1111-111111111111")))
                .andExpect(jsonPath("$.reviewApproval.events[1].actorDisplayName", is("Alice Smith")))
                .andExpect(jsonPath("$.reviewApproval.events[1].eventLabel", is("Scenario recalled")));
    }

    @Test
    void postEvent_promotedState_userActor_returns409() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Cannot perform actions on a promoted scenario"))
                .when(scenarioDetailService)
                .processEvent(any(UUID.class), any(PostEventRequestDto.class), any(), any());

        // User event (no X-Actor header) should also be blocked by the PROMOTED terminal guard
        mockMvc.perform(post("/scenarios/{id}/events", EVENT_SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"SIGNOFF\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void getScenario_expandReviewApproval_eventsWithNullRelatedMessageId_omitsFieldFromJson() throws Exception {
        // All events in the standard fixture have null relatedMessageId
        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("reviewApproval")))
                .thenReturn(Optional.of(buildDetailDtoWithReviewApproval()));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "reviewApproval"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewApproval.events", hasSize(3)))
                // None of the events should have relatedMessageId in JSON
                .andExpect(jsonPath("$.reviewApproval.events[0].relatedMessageId").doesNotExist())
                .andExpect(jsonPath("$.reviewApproval.events[1].relatedMessageId").doesNotExist())
                .andExpect(jsonPath("$.reviewApproval.events[2].relatedMessageId").doesNotExist());
    }

    // ========================================================================
    // Increment 10 Task Group 3: Tests for ScenarioType in header, X-Actor-Id
    // on POST /messages, and actor resolution via UserRef
    // ========================================================================

    // Test 1: Header with scenarioType block includes correct fields
    @Test
    void getScenario_expandHeader_withScenarioType_returnsScenarioTypeBlockInHeader() throws Exception {
        ScenarioTypeDto scenarioTypeDto = new ScenarioTypeDto(
                "MARKET_DATA", "Market Data", "ChartMultiple", "LINK_OUT", "LINK_OUT"
        );
        ScenarioHeaderDto header = new ScenarioHeaderDto(
                "IMPACT_AVAILABLE",
                "MODERATE",
                "Alice Johnson",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                scenarioTypeDto
        );
        ScenarioDetailDto dto = new ScenarioDetailDto(
                SCENARIO_ID,
                "FX Curve Recalibration",
                "MARKET_DATA",
                "Alice Johnson",
                LocalDateTime.of(2026, 2, 18, 8, 0, 0),
                LocalDateTime.of(2026, 2, 20, 14, 30, 0),
                header,
                null,
                null,
                null,
                null,
                null
        );

        when(scenarioDetailService.getScenarioDetail(SCENARIO_ID, Set.of("header")))
                .thenReturn(Optional.of(dto));

        mockMvc.perform(get("/scenarios/{id}", SCENARIO_ID).param("expand", "header"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.header.scenarioType.code", is("MARKET_DATA")))
                .andExpect(jsonPath("$.header.scenarioType.name", is("Market Data")))
                .andExpect(jsonPath("$.header.scenarioType.icon", is("ChartMultiple")))
                .andExpect(jsonPath("$.header.scenarioType.directChangesMode", is("LINK_OUT")))
                .andExpect(jsonPath("$.header.scenarioType.impactDataMode", is("LINK_OUT")));
    }

    // Test 4: POST /messages with X-Actor-Id header passes actorId to service
    @Test
    void postMessage_withActorIdHeader_passesActorIdToService() throws Exception {
        UUID messageId = UUID.fromString("cccc2222-2222-2222-2222-222222222222");
        MessageDto createdMessage = new MessageDto(
                messageId,
                "Jane Smith",
                LocalDateTime.of(2026, 2, 22, 12, 0, 0),
                "Test message with actor"
        );

        when(scenarioDetailService.postMessage(eq(SCENARIO_ID), eq("Test message with actor"), eq("approver-1")))
                .thenReturn(createdMessage);

        mockMvc.perform(post("/scenarios/{id}/messages", SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Test message with actor\"}")
                        .header("X-Actor-Id", "approver-1"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(messageId.toString())))
                .andExpect(jsonPath("$.authorDisplayName", is("Jane Smith")))
                .andExpect(jsonPath("$.text", is("Test message with actor")));

        verify(scenarioDetailService).postMessage(eq(SCENARIO_ID), eq("Test message with actor"), eq("approver-1"));
    }

    // Test 5: POST /messages without X-Actor-Id header passes null actorId to service
    @Test
    void postMessage_withoutActorIdHeader_passesNullActorIdToService() throws Exception {
        UUID messageId = UUID.fromString("cccc3333-3333-3333-3333-333333333333");
        MessageDto createdMessage = new MessageDto(
                messageId,
                "Current User",
                LocalDateTime.of(2026, 2, 22, 12, 0, 0),
                "Test message no actor"
        );

        when(scenarioDetailService.postMessage(eq(SCENARIO_ID), eq("Test message no actor"), isNull()))
                .thenReturn(createdMessage);

        mockMvc.perform(post("/scenarios/{id}/messages", SCENARIO_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"Test message no actor\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(messageId.toString())))
                .andExpect(jsonPath("$.authorDisplayName", is("Current User")))
                .andExpect(jsonPath("$.text", is("Test message no actor")));

        verify(scenarioDetailService).postMessage(eq(SCENARIO_ID), eq("Test message no actor"), isNull());
    }

    // ========================================================================
    // Increment 11 Task Group 3: Tests for directChanges/impactData expand
    // ========================================================================

    // Test: GET /scenarios/{saId}?expand=directChanges returns 200 with grid JSON structure
    @Test
    void getScenario_expandDirectChanges_gridModeScenario_returns200WithGridJsonStructure() throws Exception {
        UUID saScenarioId = UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");

        List<GridRowDto> rows = List.of(
                new GridRowDto(UUID.fromString("cc000001-0001-4001-8001-000000000001"),
                        Map.of("Risk Factor", "FX_USDJPY", "Risk Class", "FX", "Delta", 0.03)),
                new GridRowDto(UUID.fromString("cc000002-0002-4002-8002-000000000002"),
                        Map.of("Risk Factor", "FX_EURUSD", "Risk Class", "FX", "Delta", 0.03))
        );
        DirectChangesDto directChanges = new DirectChangesDto(
                List.of("Risk Factor", "Risk Class", "Sensitivity Type", "Current Value", "Proposed Value", "Delta"),
                rows
        );

        ScenarioDetailDto dto = new ScenarioDetailDto(
                saScenarioId,
                "SA Capital Recalculation",
                "FRTB_SA",
                "Risk Manager",
                LocalDateTime.of(2026, 2, 21, 9, 0, 0),
                LocalDateTime.of(2026, 2, 21, 15, 0, 0),
                null,
                null,
                null,
                null,
                directChanges,
                null
        );

        when(scenarioDetailService.getScenarioDetail(saScenarioId, Set.of("directChanges")))
                .thenReturn(Optional.of(dto));

        mockMvc.perform(get("/scenarios/{id}", saScenarioId).param("expand", "directChanges"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.directChanges.columns", hasSize(6)))
                .andExpect(jsonPath("$.directChanges.columns[0]", is("Risk Factor")))
                .andExpect(jsonPath("$.directChanges.rows", hasSize(2)))
                .andExpect(jsonPath("$.directChanges.rows[0].rowId", is("cc000001-0001-4001-8001-000000000001")))
                .andExpect(jsonPath("$.directChanges.rows[0].payload.Delta", is(0.03)));
    }

    // Test: GET /scenarios/{mdId}?expand=directChanges returns 400 status
    @Test
    void getScenario_expandDirectChanges_linkOutModeScenario_returns400() throws Exception {
        UUID mdScenarioId = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

        when(scenarioDetailService.getScenarioDetail(mdScenarioId, Set.of("directChanges")))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "directChanges expand not supported for LINK_OUT mode"));

        mockMvc.perform(get("/scenarios/{id}", mdScenarioId).param("expand", "directChanges"))
                .andExpect(status().isBadRequest());
    }

    // ========================================================================
    // Increment 11 Task Group 6 Gap Test: GET /scenarios/{saId}?expand=impactData
    // returns 200 with compareCta in response body
    // ========================================================================

    @Test
    void getScenario_expandImpactData_gridModeScenario_returns200WithCompareCtaInResponseBody() throws Exception {
        UUID saScenarioId = UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");

        List<GridRowDto> rows = List.of(
                new GridRowDto(UUID.fromString("dd000001-0001-4001-8001-000000000001"),
                        Map.of("Risk Class", "FX", "Risk Measure", "IMCC", "Base Value", 1200000,
                                "Stressed Value", 1500000, "Capital Charge", 300000)),
                new GridRowDto(UUID.fromString("dd000002-0002-4002-8002-000000000002"),
                        Map.of("Risk Class", "IR", "Risk Measure", "SBA", "Base Value", 800000,
                                "Stressed Value", 950000, "Capital Charge", 150000))
        );
        CtaDto compareCta = new CtaDto("Compare results", "https://compare.example.com/sa-results");
        ImpactDataDto impactData = new ImpactDataDto(
                List.of("Risk Class", "Risk Measure", "Base Value", "Stressed Value", "Capital Charge"),
                rows,
                compareCta
        );

        ScenarioDetailDto dto = new ScenarioDetailDto(
                saScenarioId,
                "SA Capital Recalculation",
                "FRTB_SA",
                "Risk Manager",
                LocalDateTime.of(2026, 2, 21, 9, 0, 0),
                LocalDateTime.of(2026, 2, 21, 15, 0, 0),
                null,
                null,
                null,
                null,
                null,
                impactData
        );

        when(scenarioDetailService.getScenarioDetail(saScenarioId, Set.of("impactData")))
                .thenReturn(Optional.of(dto));

        mockMvc.perform(get("/scenarios/{id}", saScenarioId).param("expand", "impactData"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.impactData.columns", hasSize(5)))
                .andExpect(jsonPath("$.impactData.columns[0]", is("Risk Class")))
                .andExpect(jsonPath("$.impactData.columns[1]", is("Risk Measure")))
                .andExpect(jsonPath("$.impactData.rows", hasSize(2)))
                .andExpect(jsonPath("$.impactData.rows[0].rowId", is("dd000001-0001-4001-8001-000000000001")))
                .andExpect(jsonPath("$.impactData.rows[0].payload.['Risk Class']", is("FX")))
                .andExpect(jsonPath("$.impactData.rows[0].payload.['Risk Measure']", is("IMCC")))
                .andExpect(jsonPath("$.impactData.rows[0].payload.['Capital Charge']", is(300000)))
                .andExpect(jsonPath("$.impactData.compareCta.label", is("Compare results")))
                .andExpect(jsonPath("$.impactData.compareCta.url", is("https://compare.example.com/sa-results")))
                // Verify directChanges is not present when only impactData is expanded
                .andExpect(jsonPath("$.directChanges").doesNotExist());
    }
}
