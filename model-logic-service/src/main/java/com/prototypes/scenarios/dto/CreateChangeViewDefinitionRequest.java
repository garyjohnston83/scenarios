package com.prototypes.scenarios.dto;

public record CreateChangeViewDefinitionRequest(
        String templateKey,
        String definition
) {
}
