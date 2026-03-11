package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.CreateReportDefinitionRequestDto;
import com.prototypes.scenarios.dto.ReportDefinitionDto;
import com.prototypes.scenarios.service.ReportDefinitionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class ReportDefinitionController {

    private final ReportDefinitionService reportDefinitionService;

    public ReportDefinitionController(ReportDefinitionService reportDefinitionService) {
        this.reportDefinitionService = reportDefinitionService;
    }

    @GetMapping("/report-definitions")
    public ResponseEntity<List<ReportDefinitionDto>> getReportDefinitions(
            @RequestParam(required = false) String scenarioType) {
        List<ReportDefinitionDto> definitions = reportDefinitionService.listDefinitions(scenarioType);
        return ResponseEntity.ok(definitions);
    }

    @GetMapping("/report-definitions/{reportKey}")
    public ResponseEntity<ReportDefinitionDto> getReportDefinition(
            @PathVariable String reportKey) {
        return reportDefinitionService.getLatestDefinition(reportKey)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/report-definitions/{reportKey}/versions")
    public ResponseEntity<List<ReportDefinitionDto>> getReportDefinitionVersions(
            @PathVariable String reportKey) {
        List<ReportDefinitionDto> versions = reportDefinitionService.listVersions(reportKey);
        return ResponseEntity.ok(versions);
    }

    @PostMapping("/report-definitions")
    public ResponseEntity<ReportDefinitionDto> createReportDefinition(
            @RequestBody CreateReportDefinitionRequestDto request) {
        ReportDefinitionDto created = reportDefinitionService.createDefinition(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/report-definitions/{id}/deactivate")
    public ResponseEntity<ReportDefinitionDto> deactivateReportDefinition(
            @PathVariable UUID id) {
        ReportDefinitionDto deactivated = reportDefinitionService.deactivateDefinition(id);
        return ResponseEntity.ok(deactivated);
    }
}
