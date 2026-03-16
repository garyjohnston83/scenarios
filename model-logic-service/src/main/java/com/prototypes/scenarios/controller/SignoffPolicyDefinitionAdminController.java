package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.CreateSignoffPolicyDefinitionRequest;
import com.prototypes.scenarios.dto.SignoffPolicyDefinitionDetailDto;
import com.prototypes.scenarios.dto.SignoffPolicyDefinitionListItemDto;
import com.prototypes.scenarios.service.SignoffPolicyDefinitionAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/scenario-types/{code}/signoff-policy-definitions")
public class SignoffPolicyDefinitionAdminController {

    private final SignoffPolicyDefinitionAdminService service;

    public SignoffPolicyDefinitionAdminController(SignoffPolicyDefinitionAdminService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<SignoffPolicyDefinitionListItemDto>> listDefinitions(
            @PathVariable String code) {
        List<SignoffPolicyDefinitionListItemDto> result = service.listDefinitions(code);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SignoffPolicyDefinitionDetailDto> getDefinition(
            @PathVariable String code,
            @PathVariable UUID id) {
        SignoffPolicyDefinitionDetailDto result = service.getDefinition(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<SignoffPolicyDefinitionDetailDto> createDefinition(
            @PathVariable String code,
            @RequestBody CreateSignoffPolicyDefinitionRequest request) {
        SignoffPolicyDefinitionDetailDto result = service.createDefinition(code, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<SignoffPolicyDefinitionDetailDto> activateDefinition(
            @PathVariable String code,
            @PathVariable UUID id) {
        SignoffPolicyDefinitionDetailDto result = service.activateDefinition(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<SignoffPolicyDefinitionDetailDto> deactivateDefinition(
            @PathVariable String code,
            @PathVariable UUID id) {
        SignoffPolicyDefinitionDetailDto result = service.deactivateDefinition(id);
        return ResponseEntity.ok(result);
    }
}
