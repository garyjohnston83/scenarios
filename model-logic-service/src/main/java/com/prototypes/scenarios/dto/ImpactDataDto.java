package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ImpactDataDto(List<ImpactReportDto> reports) {
}
