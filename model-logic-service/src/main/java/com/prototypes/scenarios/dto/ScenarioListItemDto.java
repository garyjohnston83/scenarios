package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ScenarioListItemDto(
        UUID id,
        String name,
        String scenarioTypeCode,
        String workflowState,
        String impact,
        LocalDateTime updatedAt
) {
}
