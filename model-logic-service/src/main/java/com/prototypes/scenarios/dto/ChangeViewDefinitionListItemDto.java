package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChangeViewDefinitionListItemDto(
        UUID id,
        String scenarioTypeCode,
        String templateKey,
        String displayName,
        String renderMode,
        int version,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
