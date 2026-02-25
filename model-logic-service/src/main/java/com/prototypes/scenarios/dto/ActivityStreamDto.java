package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ActivityStreamDto(List<ActivityRowDto> rows, Integer approvalsReceived, Integer approvalsRequired) {
}
