package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReviewApprovalDto(WorkflowDto workflow, List<MessageDto> messages, List<EventDto> events,
                                Integer approvalsReceived, Integer approvalsRequired) {
}
