package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SignoffPolicyDefinitionDetailDto(
        UUID id,
        String scenarioTypeCode,
        String policyKey,
        String displayName,
        int version,
        boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String definition,
        String schemaVersion,
        List<RuleSummaryDto> ruleSummaries
) {
}
