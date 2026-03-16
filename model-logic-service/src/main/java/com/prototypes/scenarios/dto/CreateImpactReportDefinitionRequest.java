package com.prototypes.scenarios.dto;

public record CreateImpactReportDefinitionRequest(
        String reportKey,
        String definition,
        String sampleData
) {
}
