package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.ImpactReportDetailDto;
import com.prototypes.scenarios.dto.ImpactReportSummaryDto;
import com.prototypes.scenarios.service.ImpactReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class ImpactReportController {

    private final ImpactReportService impactReportService;

    public ImpactReportController(ImpactReportService impactReportService) {
        this.impactReportService = impactReportService;
    }

    @GetMapping("/scenarios/{scenarioId}/impact-reports")
    public ResponseEntity<List<ImpactReportSummaryDto>> getImpactReports(
            @PathVariable UUID scenarioId) {
        List<ImpactReportSummaryDto> reports = impactReportService.getReportsForScenario(scenarioId);
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/scenarios/{scenarioId}/impact-reports/{reportId}")
    public ResponseEntity<ImpactReportDetailDto> getImpactReport(
            @PathVariable UUID scenarioId,
            @PathVariable UUID reportId) {
        ImpactReportDetailDto detail = impactReportService.getReportDetail(scenarioId, reportId);
        return ResponseEntity.ok(detail);
    }
}
