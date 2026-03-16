package com.prototypes.scenarios.dto;

public record UpdateScenarioTypeRequest(
        String name,
        String icon,
        boolean isEnabled,
        Integer sortOrder
) {
}
