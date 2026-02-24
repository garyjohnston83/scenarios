package com.prototypes.scenarios.dto;

import java.util.Map;
import java.util.UUID;

public record GridRowDto(UUID rowId, Map<String, Object> payload) {
}
