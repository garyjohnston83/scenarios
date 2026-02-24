package com.prototypes.scenarios.dto;

public record UpdateSignoffPolicyRequestDto(
        String name,
        int requiredApproverCount,
        boolean isEnabled,
        int priority
) {
}
