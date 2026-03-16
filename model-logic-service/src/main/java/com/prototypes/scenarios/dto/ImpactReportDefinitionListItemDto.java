package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ImpactReportDefinitionListItemDto(
        UUID id,
        String scenarioTypeCode,
        String reportKey,
        String displayName,
        int version,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
