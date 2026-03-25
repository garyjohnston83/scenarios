package com.prototypes.scenarios.dto;

public record ScenarioTypeDto(
        String code,
        String name,
        String icon,
        String directChangesMode,
        String impactDataMode,
        String directChangesInternalRenderMode
) {
}
