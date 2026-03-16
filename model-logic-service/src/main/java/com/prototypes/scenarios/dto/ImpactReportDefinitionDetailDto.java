package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ImpactReportDefinitionDetailDto(
        UUID id,
        String scenarioTypeCode,
        String reportKey,
        String displayName,
        int version,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String definition,
        String schemaVersion,
        String sampleData
) {
}
