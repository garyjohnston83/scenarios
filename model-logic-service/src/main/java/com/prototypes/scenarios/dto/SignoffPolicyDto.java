package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record SignoffPolicyDto(
        UUID id,
        String scenarioTypeCode,
        String name,
        int requiredApproverCount,
        boolean isEnabled,
        int priority,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
