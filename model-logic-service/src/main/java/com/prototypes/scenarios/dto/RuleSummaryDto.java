package com.prototypes.scenarios.dto;

public record RuleSummaryDto(
        String ruleKey,
        String ruleName,
        String conditionSummary,
        String effectSummary
) {
}
