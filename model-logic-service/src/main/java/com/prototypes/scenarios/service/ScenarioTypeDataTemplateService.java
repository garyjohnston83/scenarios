package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.DataTemplateDto;
import com.prototypes.scenarios.entity.ScenarioTypeDataTemplate;
import com.prototypes.scenarios.repository.ScenarioTypeDataTemplateRepository;
import com.prototypes.scenarios.repository.ScenarioTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class ScenarioTypeDataTemplateService {

    private static final Logger logger = LoggerFactory.getLogger(ScenarioTypeDataTemplateService.class);

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "text/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
    );

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private final ScenarioTypeDataTemplateRepository dataTemplateRepository;
    private final ScenarioTypeRepository scenarioTypeRepository;

    public ScenarioTypeDataTemplateService(ScenarioTypeDataTemplateRepository dataTemplateRepository,
                                           ScenarioTypeRepository scenarioTypeRepository) {
        this.dataTemplateRepository = dataTemplateRepository;
        this.scenarioTypeRepository = scenarioTypeRepository;
    }

    public List<DataTemplateDto> listTemplates(String scenarioTypeCode) {
        logger.info("listTemplates scenarioTypeCode={}", scenarioTypeCode);
        if (!scenarioTypeRepository.existsById(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Scenario type not found: " + scenarioTypeCode);
        }

        return dataTemplateRepository.findAllByScenarioTypeCodeOrderByVersionDesc(scenarioTypeCode).stream()
                .map(this::toDto)
                .toList();
    }

    public DataTemplateDto uploadTemplate(String scenarioTypeCode, String name, MultipartFile file) {
        logger.info("uploadTemplate scenarioTypeCode={} name={} fileSize={}", scenarioTypeCode, name, file != null ? file.getSize() : 0);
        // Validate scenario type exists
        if (!scenarioTypeRepository.existsById(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Scenario type not found: " + scenarioTypeCode);
        }

        // Validate file is not empty
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }

        // Validate file content type
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid file type. Only CSV and XLSX files are supported.");
        }

        // Validate file extension
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !hasValidExtension(originalFilename)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid file type. Only CSV and XLSX files are supported.");
        }

        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "File exceeds maximum size of 5 MB");
        }

        // Compute next version
        Optional<Integer> maxVersion = dataTemplateRepository.findMaxVersion(scenarioTypeCode);
        int nextVersion = maxVersion.orElse(0) + 1;
        logger.debug("uploadTemplate computed nextVersion={}", nextVersion);

        // Validate name
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template name is required");
        }

        // Build entity
        ScenarioTypeDataTemplate entity = buildEntity(scenarioTypeCode, name, file, nextVersion);

        // Save with optimistic concurrency retry
        try {
            ScenarioTypeDataTemplate saved = dataTemplateRepository.save(entity);
            logger.info("uploadTemplate saved id={} version={}", saved.getId(), saved.getVersion());
            return toDto(saved);
        } catch (DataIntegrityViolationException e) {
            logger.warn("uploadTemplate version conflict, retrying for scenarioTypeCode={}", scenarioTypeCode);
            // Retry: re-query max version, recompute, and save (up to 2 more attempts)
            for (int attempt = 0; attempt < 2; attempt++) {
                try {
                    Optional<Integer> retryMaxVersion = dataTemplateRepository.findMaxVersion(scenarioTypeCode);
                    int retryNextVersion = retryMaxVersion.orElse(0) + 1;

                    ScenarioTypeDataTemplate retryEntity = buildEntity(scenarioTypeCode, name, file, retryNextVersion);
                    ScenarioTypeDataTemplate saved = dataTemplateRepository.save(retryEntity);
                    logger.info("uploadTemplate retry saved id={} version={}", saved.getId(), saved.getVersion());
                    return toDto(saved);
                } catch (DataIntegrityViolationException retryException) {
                    // Continue to next retry attempt
                }
            }
            logger.error("uploadTemplate failed after retries for scenarioTypeCode={}", scenarioTypeCode);
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Unable to save template due to concurrent version conflict");
        }
    }

    @Transactional
    public DataTemplateDto activateTemplate(UUID id) {
        logger.info("activateTemplate id={}", id);
        ScenarioTypeDataTemplate template = dataTemplateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Template not found: " + id));

        // Find currently active template for same scenario type
        Optional<ScenarioTypeDataTemplate> currentlyActive =
                dataTemplateRepository.findByScenarioTypeCodeAndIsActiveTrue(template.getScenarioTypeCode());

        if (currentlyActive.isPresent() && !currentlyActive.get().getId().equals(id)) {
            ScenarioTypeDataTemplate activeTemplate = currentlyActive.get();
            activeTemplate.setActive(false);
            activeTemplate.setUpdatedAt(LocalDateTime.now());
            dataTemplateRepository.save(activeTemplate);
            logger.debug("activateTemplate deactivated previous template id={}", activeTemplate.getId());
        }

        template.setActive(true);
        template.setUpdatedAt(LocalDateTime.now());
        ScenarioTypeDataTemplate saved = dataTemplateRepository.save(template);
        logger.info("activateTemplate completed for id={}", id);
        return toDto(saved);
    }

    public DataTemplateDto deactivateTemplate(UUID id) {
        logger.info("deactivateTemplate id={}", id);
        ScenarioTypeDataTemplate template = dataTemplateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Template not found: " + id));

        if (!template.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Template is not currently active");
        }

        template.setActive(false);
        template.setUpdatedAt(LocalDateTime.now());
        ScenarioTypeDataTemplate saved = dataTemplateRepository.save(template);
        logger.info("deactivateTemplate completed for id={}", id);
        return toDto(saved);
    }

    public ScenarioTypeDataTemplate downloadTemplate(UUID id) {
        logger.info("downloadTemplate id={}", id);
        return dataTemplateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Template not found: " + id));
    }

    private boolean hasValidExtension(String filename) {
        String lowerFilename = filename.toLowerCase();
        return lowerFilename.endsWith(".csv") || lowerFilename.endsWith(".xlsx") || lowerFilename.endsWith(".xls");
    }

    private ScenarioTypeDataTemplate buildEntity(String scenarioTypeCode, String name, MultipartFile file, int version) {
        ScenarioTypeDataTemplate entity = new ScenarioTypeDataTemplate();
        entity.setId(UUID.randomUUID());
        entity.setScenarioTypeCode(scenarioTypeCode);
        entity.setVersion(version);
        entity.setName(name);
        entity.setOriginalFilename(file.getOriginalFilename());
        entity.setContentType(file.getContentType());
        entity.setFileSize(file.getSize());
        entity.setActive(false);

        try {
            entity.setFileData(file.getBytes());
        } catch (IOException e) {
            logger.error("Failed to read file data for template upload: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to read file data");
        }

        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        return entity;
    }

    private DataTemplateDto toDto(ScenarioTypeDataTemplate entity) {
        return new DataTemplateDto(
                entity.getId(),
                entity.getScenarioTypeCode(),
                entity.getVersion(),
                entity.getName(),
                entity.getOriginalFilename(),
                entity.getContentType(),
                entity.getFileSize(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
