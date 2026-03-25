package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChangeViewDefinitionDetailDto(
        UUID id,
        String scenarioTypeCode,
        String templateKey,
        String displayName,
        int version,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String definition,
        String schemaVersion,
        String renderMode
) {
}
