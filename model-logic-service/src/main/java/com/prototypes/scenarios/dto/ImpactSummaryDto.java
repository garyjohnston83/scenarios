package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ImpactSummaryDto(
        String impact,
        LocalDateTime lastRunAt,
        String latestRunStatus,
        Integer exceptionsCount,
        CtaDto cta
) {
}
