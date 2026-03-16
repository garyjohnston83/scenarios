package com.prototypes.scenarios.dto;

public record UpdateNavigationViewModeRequest(
        String directChangesMode,
        String impactDataMode,
        String directChangesExternalUrlTemplate,
        String impactExternalUrlTemplate
) {
}
