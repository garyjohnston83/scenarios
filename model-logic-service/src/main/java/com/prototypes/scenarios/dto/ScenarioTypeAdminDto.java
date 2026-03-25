package com.prototypes.scenarios.dto;

public record ScenarioTypeAdminDto(
        String code,
        String name,
        String icon,
        String directChangesMode,
        String impactDataMode,
        String directChangesInternalRenderMode,
        boolean isEnabled,
        Integer sortOrder
) {
}
