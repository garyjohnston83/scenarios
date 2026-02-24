package com.prototypes.scenarios.dto;

public record PostEventRequestDto(String type, String message, ImpactRunPayload impactRun, SummaryPatchPayload summaryPatch) {
}
