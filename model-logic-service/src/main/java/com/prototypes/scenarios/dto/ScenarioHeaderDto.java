package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;

public record ScenarioHeaderDto(
        String workflowState,
        String impact,
        String ownerDisplayName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        ScenarioTypeDto scenarioType
) {
}
