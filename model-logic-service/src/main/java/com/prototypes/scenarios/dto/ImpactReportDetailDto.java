package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ImpactReportDetailDto(
        UUID id,
        UUID scenarioId,
        UUID reportDefinitionId,
        int definitionVersion,
        String reportKey,
        String reportName,
        LocalDateTime generatedAt,
        String status,
        Object renderedReport,
        String errorMessage
) {
}
