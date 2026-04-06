package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.CreateReportDefinitionRequestDto;
import com.prototypes.scenarios.dto.ReportDefinitionDto;
import com.prototypes.scenarios.entity.ReportDefinition;
import com.prototypes.scenarios.repository.ReportDefinitionRepository;
import com.prototypes.scenarios.repository.ScenarioTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ReportDefinitionService {

    private static final Logger logger = LoggerFactory.getLogger(ReportDefinitionService.class);

    private final ReportDefinitionRepository reportDefinitionRepository;
    private final ReportDefinitionValidationService validationService;
    private final ScenarioTypeRepository scenarioTypeRepository;
    private final ObjectMapper objectMapper;

    public ReportDefinitionService(ReportDefinitionRepository reportDefinitionRepository,
                                   ReportDefinitionValidationService validationService,
                                   ScenarioTypeRepository scenarioTypeRepository,
                                   ObjectMapper objectMapper) {
        this.reportDefinitionRepository = reportDefinitionRepository;
        this.validationService = validationService;
        this.scenarioTypeRepository = scenarioTypeRepository;
        this.objectMapper = objectMapper;
    }

    public List<ReportDefinitionDto> listDefinitions(String scenarioTypeCode) {
        logger.info("listDefinitions scenarioTypeCode={}", scenarioTypeCode);
        List<ReportDefinition> definitions;
        if (scenarioTypeCode == null || scenarioTypeCode.isBlank()) {
            definitions = reportDefinitionRepository.findAllByIsActiveTrue();
        } else {
            definitions = reportDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(scenarioTypeCode);
        }
        logger.debug("listDefinitions returning {} definitions", definitions.size());
        return definitions.stream()
                .map(this::toDto)
                .toList();
    }

    public Optional<ReportDefinitionDto> getLatestDefinition(String reportKey) {
        logger.info("getLatestDefinition reportKey={}", reportKey);
        return reportDefinitionRepository.findFirstByReportKeyAndIsActiveTrueOrderByVersionDesc(reportKey)
                .map(this::toDto);
    }

    public List<ReportDefinitionDto> listVersions(String reportKey) {
        logger.info("listVersions reportKey={}", reportKey);
        return reportDefinitionRepository.findAllByReportKeyOrderByVersionDesc(reportKey).stream()
                .map(this::toDto)
                .toList();
    }

    public ReportDefinitionDto createDefinition(CreateReportDefinitionRequestDto request) {
        logger.info("createDefinition scenarioTypeCode={} reportKey={}", request.scenarioTypeCode(), request.reportKey());
        // 1. Validate JSON definition
        List<String> errors = validationService.validate(request.definition());
        if (!errors.isEmpty()) {
            logger.warn("createDefinition validation failed: {} errors", errors.size());
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    String.join("; ", errors));
        }

        // 2. Validate scenarioTypeCode exists
        if (!scenarioTypeRepository.existsById(request.scenarioTypeCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid scenarioTypeCode: " + request.scenarioTypeCode());
        }

        // 3. Compute next version
        Optional<Integer> maxVersion = reportDefinitionRepository.findMaxVersion(
                request.scenarioTypeCode(), request.reportKey());
        int nextVersion = maxVersion.orElse(0) + 1;
        logger.debug("createDefinition computed nextVersion={}", nextVersion);

        // 4. Build entity
        ReportDefinition entity = buildEntity(request, nextVersion);

        // 5. Save with optimistic concurrency retry
        try {
            ReportDefinition saved = reportDefinitionRepository.save(entity);
            logger.info("createDefinition saved id={} version={}", saved.getId(), saved.getVersion());
            return toDto(saved);
        } catch (DataIntegrityViolationException e) {
            logger.warn("createDefinition version conflict, retrying for reportKey={}", request.reportKey());
            // Retry once: re-query max version, recompute, and save
            Optional<Integer> retryMaxVersion = reportDefinitionRepository.findMaxVersion(
                    request.scenarioTypeCode(), request.reportKey());
            int retryNextVersion = retryMaxVersion.orElse(0) + 1;

            ReportDefinition retryEntity = buildEntity(request, retryNextVersion);
            ReportDefinition saved = reportDefinitionRepository.save(retryEntity);
            logger.info("createDefinition retry saved id={} version={}", saved.getId(), saved.getVersion());
            return toDto(saved);
        }
    }

    public ReportDefinitionDto deactivateDefinition(UUID id) {
        logger.info("deactivateDefinition id={}", id);
        ReportDefinition entity = reportDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Report definition not found: " + id));

        entity.setActive(false);
        entity.setUpdatedAt(LocalDateTime.now());

        ReportDefinition saved = reportDefinitionRepository.save(entity);
        logger.info("deactivateDefinition completed for id={}", id);
        return toDto(saved);
    }

    private ReportDefinition buildEntity(CreateReportDefinitionRequestDto request, int version) {
        ReportDefinition entity = new ReportDefinition();
        entity.setId(UUID.randomUUID());
        entity.setScenarioTypeCode(request.scenarioTypeCode());
        entity.setReportKey(request.reportKey());
        entity.setVersion(version);
        entity.setDefinition(request.definition());
        entity.setActive(true);

        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        return entity;
    }

    private ReportDefinitionDto toDto(ReportDefinition entity) {
        return new ReportDefinitionDto(
                entity.getId(),
                entity.getScenarioTypeCode(),
                entity.getReportKey(),
                entity.getVersion(),
                entity.getDefinition(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
