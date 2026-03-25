package com.prototypes.scenarios.dto;

public record ScenarioTypeAdminDetailDto(
        String code,
        String name,
        String icon,
        String directChangesMode,
        String impactDataMode,
        String directChangesExternalUrlTemplate,
        String impactExternalUrlTemplate,
        String directChangesInternalRenderMode,
        boolean isEnabled,
        Integer sortOrder,
        long activeReportDefinitionCount,
        long activeSignoffPolicyCount,
        long activeChangeViewDefinitionCount,
        long activeSignoffPolicyDefinitionCount
) {
}
