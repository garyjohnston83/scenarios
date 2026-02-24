package com.prototypes.scenarios.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MessageDto(UUID id, String authorDisplayName, LocalDateTime createdAt, String text) {
}
