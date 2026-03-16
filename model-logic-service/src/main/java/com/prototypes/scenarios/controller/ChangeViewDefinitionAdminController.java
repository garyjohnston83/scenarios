package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.ChangeViewDefinitionDetailDto;
import com.prototypes.scenarios.dto.ChangeViewDefinitionListItemDto;
import com.prototypes.scenarios.dto.CreateChangeViewDefinitionRequest;
import com.prototypes.scenarios.service.ChangeViewDefinitionAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/scenario-types/{code}/change-view-definitions")
public class ChangeViewDefinitionAdminController {

    private final ChangeViewDefinitionAdminService service;

    public ChangeViewDefinitionAdminController(ChangeViewDefinitionAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ChangeViewDefinitionListItemDto>> listDefinitions(
            @PathVariable String code) {
        List<ChangeViewDefinitionListItemDto> result = service.listDefinitions(code);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChangeViewDefinitionDetailDto> getDefinition(
            @PathVariable String code,
            @PathVariable UUID id) {
        ChangeViewDefinitionDetailDto result = service.getDefinition(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<ChangeViewDefinitionDetailDto> createDefinition(
            @PathVariable String code,
            @RequestBody CreateChangeViewDefinitionRequest request) {
        ChangeViewDefinitionDetailDto result = service.createDefinition(code, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<ChangeViewDefinitionDetailDto> activateDefinition(
            @PathVariable String code,
            @PathVariable UUID id) {
        ChangeViewDefinitionDetailDto result = service.activateDefinition(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<ChangeViewDefinitionDetailDto> deactivateDefinition(
            @PathVariable String code,
            @PathVariable UUID id) {
        ChangeViewDefinitionDetailDto result = service.deactivateDefinition(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/preview")
    public ResponseEntity<Map<String, Object>> previewDefinition(
            @PathVariable String code,
            @RequestBody String definitionJson) {
        Map<String, Object> result = service.generatePreview(definitionJson);
        return ResponseEntity.ok(result);
    }
}
