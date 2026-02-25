package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ActivityRowDto(UUID id, String bucketType, LocalDateTime occurredAt, String authorDisplayName,
                              String details, String statusTransition) {
}
