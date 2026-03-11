package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ReportDefinitionDto(
        UUID id,
        String scenarioTypeCode,
        String reportKey,
        int version,
        String definition,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
