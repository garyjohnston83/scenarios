package com.prototypes.scenarios.dto;

public record CreateReportDefinitionRequestDto(
        String scenarioTypeCode,
        String reportKey,
        String definition
) {
}
