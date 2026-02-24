package com.prototypes.scenarios.controller;

import com.prototypes.scenarios.dto.CreateSignoffPolicyRequestDto;
import com.prototypes.scenarios.dto.SignoffPolicyDto;
import com.prototypes.scenarios.dto.UpdateSignoffPolicyRequestDto;
import com.prototypes.scenarios.entity.SignoffPolicy;
import com.prototypes.scenarios.repository.ScenarioTypeRepository;
import com.prototypes.scenarios.repository.SignoffPolicyRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
public class AdminController {

    private final SignoffPolicyRepository signoffPolicyRepository;
    private final ScenarioTypeRepository scenarioTypeRepository;

    public AdminController(SignoffPolicyRepository signoffPolicyRepository,
                           ScenarioTypeRepository scenarioTypeRepository) {
        this.signoffPolicyRepository = signoffPolicyRepository;
        this.scenarioTypeRepository = scenarioTypeRepository;
    }

    @GetMapping("/admin/signoff-policies")
    public ResponseEntity<List<SignoffPolicyDto>> getSignoffPolicies(
            @RequestParam(required = false) String scenarioTypeCode) {
        List<SignoffPolicy> policies;
        if (scenarioTypeCode != null && !scenarioTypeCode.isBlank()) {
            policies = signoffPolicyRepository.findAllByScenarioTypeCode(scenarioTypeCode);
        } else {
            policies = signoffPolicyRepository.findAll();
        }
        List<SignoffPolicyDto> dtos = policies.stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/admin/signoff-policies")
    public ResponseEntity<SignoffPolicyDto> createSignoffPolicy(
            @RequestBody CreateSignoffPolicyRequestDto request) {
        if (!scenarioTypeRepository.existsById(request.scenarioTypeCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid scenarioTypeCode: " + request.scenarioTypeCode());
        }

        SignoffPolicy policy = new SignoffPolicy();
        policy.setId(UUID.randomUUID());
        policy.setName(request.name());
        policy.setScenarioTypeCode(request.scenarioTypeCode());
        policy.setRequiredApproverCount(request.requiredApproverCount());
        policy.setEnabled(request.isEnabled());
        policy.setPriority(request.priority());

        LocalDateTime now = LocalDateTime.now();
        policy.setCreatedAt(now);
        policy.setUpdatedAt(now);

        SignoffPolicy saved = signoffPolicyRepository.save(policy);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(saved));
    }

    @PutMapping("/admin/signoff-policies/{id}")
    public ResponseEntity<SignoffPolicyDto> updateSignoffPolicy(
            @PathVariable UUID id,
            @RequestBody UpdateSignoffPolicyRequestDto request) {
        SignoffPolicy policy = signoffPolicyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Signoff policy not found: " + id));

        policy.setName(request.name());
        policy.setRequiredApproverCount(request.requiredApproverCount());
        policy.setEnabled(request.isEnabled());
        policy.setPriority(request.priority());
        policy.setUpdatedAt(LocalDateTime.now());

        SignoffPolicy saved = signoffPolicyRepository.save(policy);
        return ResponseEntity.ok(toDto(saved));
    }

    private SignoffPolicyDto toDto(SignoffPolicy policy) {
        return new SignoffPolicyDto(
                policy.getId(),
                policy.getScenarioTypeCode(),
                policy.getName(),
                policy.getRequiredApproverCount(),
                policy.isEnabled(),
                policy.getPriority(),
                policy.getCreatedAt(),
                policy.getUpdatedAt()
        );
    }
}
