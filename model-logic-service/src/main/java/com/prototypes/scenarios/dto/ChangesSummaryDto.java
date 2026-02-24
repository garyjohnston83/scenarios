package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChangesSummaryDto(
        int changesTotal,
        int changesDirect,
        int changesIndirect,
        CtaDto cta
) {
}
