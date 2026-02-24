package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record EventDto(UUID id, LocalDateTime createdAt, String actorDisplayName, String eventType, String eventLabel, UUID relatedMessageId) {
}
