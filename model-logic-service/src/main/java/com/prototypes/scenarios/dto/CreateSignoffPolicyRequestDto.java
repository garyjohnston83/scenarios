package com.prototypes.scenarios.dto;

public record CreateSignoffPolicyRequestDto(
        String name,
        String scenarioTypeCode,
        int requiredApproverCount,
        boolean isEnabled,
        int priority
) {
}
