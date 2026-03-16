package com.prototypes.scenarios.dto;

public record CreateSignoffPolicyDefinitionRequest(
        String policyKey,
        String definition
) {
}
