package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ScenarioImpactReportDto(
        UUID id,
        UUID scenarioId,
        UUID reportDefinitionId,
        int definitionVersion,
        String reportKey,
        String reportName,
        LocalDateTime generatedAt,
        String status,
        String renderedReport,
        String errorMessage
) {
}
