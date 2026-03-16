package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record DataTemplateDto(
        UUID id,
        String scenarioTypeCode,
        int version,
        String name,
        String originalFilename,
        String contentType,
        long fileSize,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
