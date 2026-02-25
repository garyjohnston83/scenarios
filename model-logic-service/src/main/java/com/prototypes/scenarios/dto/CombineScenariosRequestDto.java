package com.prototypes.scenarios.dto;

import java.util.List;
import java.util.UUID;

public record CombineScenariosRequestDto(
        String name,
        String scenarioTypeCode,
        List<UUID> sourceScenarioIds
) {
}
