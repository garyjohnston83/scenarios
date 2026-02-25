package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ScenarioDetailDto(
        UUID id,
        String name,
        String scenarioTypeCode,
        String ownerDisplayName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        ScenarioHeaderDto header,
        SummaryCardsDto summaryCards,
        ReviewApprovalDto reviewApproval,
        ActivityStreamDto events,
        DirectChangesDto directChanges,
        ImpactDataDto impactData
) {
}
