package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ImpactReportDto(
    String impactRunId,
    String name,
    String createdAt,
    DatasetDto dataset,
    CtaDto compareCta
) {
}
