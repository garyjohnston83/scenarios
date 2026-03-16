package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record SignoffPolicyDefinitionListItemDto(
        UUID id,
        String scenarioTypeCode,
        String policyKey,
        String displayName,
        int version,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
