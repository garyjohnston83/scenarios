package com.prototypes.scenarios.dto;

public record ImpactExecutionSummaryDto(
        boolean providerRegistered,
        String providerName,
        String providerClassName
) {
}
