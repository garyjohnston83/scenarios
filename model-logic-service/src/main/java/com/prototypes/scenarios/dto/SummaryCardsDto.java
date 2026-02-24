package com.prototypes.scenarios.dto;

public record SummaryCardsDto(
        ChangesSummaryDto changesSummary,
        ImpactSummaryDto impactSummary
) {
}
