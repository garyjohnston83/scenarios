package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.CreateImpactReportDefinitionRequest;
import com.prototypes.scenarios.dto.ImpactReportDefinitionDetailDto;
import com.prototypes.scenarios.dto.ImpactReportDefinitionListItemDto;
import com.prototypes.scenarios.service.ImpactReportDefinitionAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/scenario-types/{code}/impact-report-definitions")
public class ImpactReportDefinitionAdminController {

    private final ImpactReportDefinitionAdminService service;

    public ImpactReportDefinitionAdminController(ImpactReportDefinitionAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ImpactReportDefinitionListItemDto>> listDefinitions(
            @PathVariable String code) {
        List<ImpactReportDefinitionListItemDto> result = service.listDefinitions(code);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ImpactReportDefinitionDetailDto> getDefinition(
            @PathVariable String code,
            @PathVariable UUID id) {
        ImpactReportDefinitionDetailDto result = service.getDefinition(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<ImpactReportDefinitionDetailDto> createDefinition(
            @PathVariable String code,
            @RequestBody CreateImpactReportDefinitionRequest request) {
        ImpactReportDefinitionDetailDto result = service.createDefinition(code, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ImpactReportDefinitionDetailDto> activateDefinition(
            @PathVariable String code,
            @PathVariable UUID id) {
        ImpactReportDefinitionDetailDto result = service.activateDefinition(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ImpactReportDefinitionDetailDto> deactivateDefinition(
            @PathVariable String code,
            @PathVariable UUID id) {
        ImpactReportDefinitionDetailDto result = service.deactivateDefinition(id);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDefinition(
            @PathVariable String code,
            @PathVariable UUID id) {
        service.deleteDefinition(code, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/preview")
    public ResponseEntity<Map<String, Object>> previewDefinition(
            @PathVariable String code,
            @RequestBody String definitionJson) {
        Map<String, Object> result = service.generatePreview(definitionJson);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}/sample-data")
    public ResponseEntity<Void> updateSampleData(
            @PathVariable String code,
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        service.updateSampleData(code, id, body.get("sampleData"));
        return ResponseEntity.noContent().build();
    }
}
