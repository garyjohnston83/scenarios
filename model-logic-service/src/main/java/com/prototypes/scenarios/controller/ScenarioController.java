package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.CombineScenariosRequestDto;
import com.prototypes.scenarios.dto.MessageDto;
import com.prototypes.scenarios.dto.PostEventRequestDto;
import com.prototypes.scenarios.dto.PostMessageRequestDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import com.prototypes.scenarios.dto.ScenarioListItemDto;
import com.prototypes.scenarios.entity.Scenario;
import com.prototypes.scenarios.entity.ScenarioSummary;
import com.prototypes.scenarios.repository.ScenarioRepository;
import com.prototypes.scenarios.service.ScenarioDetailService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
public class ScenarioController {

    private final ScenarioRepository scenarioRepository;
    private final ScenarioDetailService scenarioDetailService;

    public ScenarioController(ScenarioRepository scenarioRepository,
                              ScenarioDetailService scenarioDetailService) {
        this.scenarioRepository = scenarioRepository;
        this.scenarioDetailService = scenarioDetailService;
    }

    @GetMapping("/scenarios")
    public List<ScenarioListItemDto> listScenarios() {
        return scenarioRepository.findAllWithSummary().stream()
                .map(this::toListItemDto)
                .toList();
    }

    @GetMapping("/scenarios/{id}")
    public ResponseEntity<ScenarioDetailDto> getScenario(
            @PathVariable UUID id,
            @RequestParam(required = false) String expand) {
        Set<String> expandSections = parseExpand(expand);
        return scenarioDetailService.getScenarioDetail(id, expandSections)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/scenarios/{id}/messages")
    public ResponseEntity<MessageDto> postMessage(
            @PathVariable UUID id,
            @RequestBody PostMessageRequestDto request,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorId) {
        MessageDto messageDto = scenarioDetailService.postMessage(id, request.text(), actorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(messageDto);
    }

    @PostMapping("/scenarios/{id}/events")
    public ResponseEntity<Void> postEvent(
            @PathVariable UUID id,
            @RequestBody PostEventRequestDto request,
            @RequestHeader(value = "X-Actor", required = false) String actor,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorId) {
        scenarioDetailService.processEvent(id, request, actor, actorId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/scenarios/combine")
    public ResponseEntity<ScenarioListItemDto> combineScenarios(
            @RequestBody CombineScenariosRequestDto request,
            @RequestHeader(value = "X-Actor-Id", required = false) String actorId) {
        ScenarioListItemDto result = scenarioDetailService.combineScenarios(request, actorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    private Set<String> parseExpand(String expand) {
        if (expand == null || expand.isBlank()) {
            return Collections.emptySet();
        }
        return Arrays.stream(expand.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    private ScenarioListItemDto toListItemDto(Scenario scenario) {
        ScenarioSummary summary = scenario.getSummary();
        return new ScenarioListItemDto(
                scenario.getId(),
                scenario.getName(),
                scenario.getScenarioTypeCode(),
                summary.getWorkflowState(),
                summary.getImpact(),
                scenario.getUpdatedAt()
        );
    }
}
