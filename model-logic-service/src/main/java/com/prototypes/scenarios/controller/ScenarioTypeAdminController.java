package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.ImpactExecutionSummaryDto;
import com.prototypes.scenarios.dto.ScenarioTypeAdminDetailDto;
import com.prototypes.scenarios.dto.ScenarioTypeAdminDto;
import com.prototypes.scenarios.dto.UpdateNavigationViewModeRequest;
import com.prototypes.scenarios.dto.UpdateScenarioTypeRequest;
import com.prototypes.scenarios.service.ScenarioTypeAdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ScenarioTypeAdminController {

    private final ScenarioTypeAdminService scenarioTypeAdminService;

    public ScenarioTypeAdminController(ScenarioTypeAdminService scenarioTypeAdminService) {
        this.scenarioTypeAdminService = scenarioTypeAdminService;
    }

    @GetMapping("/admin/scenario-types")
    public ResponseEntity<List<ScenarioTypeAdminDto>> listScenarioTypes() {
        List<ScenarioTypeAdminDto> result = scenarioTypeAdminService.listAll();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/admin/scenario-types/{code}")
    public ResponseEntity<ScenarioTypeAdminDetailDto> getScenarioTypeDetail(@PathVariable String code) {
        ScenarioTypeAdminDetailDto result = scenarioTypeAdminService.getDetail(code);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/admin/scenario-types/{code}")
    public ResponseEntity<ScenarioTypeAdminDetailDto> updateScenarioType(
            @PathVariable String code,
            @RequestBody UpdateScenarioTypeRequest request) {
        ScenarioTypeAdminDetailDto result = scenarioTypeAdminService.update(code, request);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/admin/scenario-types/{code}/navigation-view-mode")
    public ResponseEntity<ScenarioTypeAdminDetailDto> updateNavigationViewMode(
            @PathVariable String code,
            @RequestBody UpdateNavigationViewModeRequest request) {
        ScenarioTypeAdminDetailDto result = scenarioTypeAdminService.updateNavigationViewMode(code, request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/admin/scenario-types/{code}/impact-execution-summary")
    public ResponseEntity<ImpactExecutionSummaryDto> getImpactExecutionSummary(@PathVariable String code) {
        ImpactExecutionSummaryDto result = scenarioTypeAdminService.getImpactExecutionSummary(code);
        return ResponseEntity.ok(result);
    }
}
