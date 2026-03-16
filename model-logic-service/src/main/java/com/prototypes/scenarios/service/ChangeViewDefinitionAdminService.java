package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.ChangeViewDefinitionDetailDto;
import com.prototypes.scenarios.dto.ChangeViewDefinitionListItemDto;
import com.prototypes.scenarios.dto.CreateChangeViewDefinitionRequest;
import com.prototypes.scenarios.entity.ChangeViewDefinition;
import com.prototypes.scenarios.repository.ChangeViewDefinitionRepository;
import com.prototypes.scenarios.repository.ScenarioTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class ChangeViewDefinitionAdminService {

    private static final Logger logger = LoggerFactory.getLogger(ChangeViewDefinitionAdminService.class);

    private final ChangeViewDefinitionRepository changeViewDefinitionRepository;
    private final ChangeViewDefinitionValidationService validationService;
    private final ScenarioTypeRepository scenarioTypeRepository;
    private final ObjectMapper objectMapper;

    public ChangeViewDefinitionAdminService(ChangeViewDefinitionRepository changeViewDefinitionRepository,
                                             ChangeViewDefinitionValidationService validationService,
                                             ScenarioTypeRepository scenarioTypeRepository,
                                             ObjectMapper objectMapper) {
        this.changeViewDefinitionRepository = changeViewDefinitionRepository;
        this.validationService = validationService;
        this.scenarioTypeRepository = scenarioTypeRepository;
        this.objectMapper = objectMapper;
    }

    // ========================================================================
    // Public operations
    // ========================================================================

    /**
     * Lists all change view definitions (active and inactive) for a scenario type,
     * ordered by templateKey ascending then version descending.
     */
    public List<ChangeViewDefinitionListItemDto> listDefinitions(String scenarioTypeCode) {
        if (!scenarioTypeRepository.existsById(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Scenario type not found: " + scenarioTypeCode);
        }

        return changeViewDefinitionRepository
                .findAllByScenarioTypeCodeOrderByTemplateKeyAscVersionDesc(scenarioTypeCode)
                .stream()
                .map(this::toListItemDto)
                .toList();
    }

    /**
     * Gets a single change view definition by ID.
     */
    public ChangeViewDefinitionDetailDto getDefinition(UUID id) {
        ChangeViewDefinition entity = changeViewDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Change view definition not found: " + id));
        return toDetailDto(entity);
    }

    /**
     * Creates a new change view definition with validation, version computation,
     * and retry on concurrent version conflict.
     */
    public ChangeViewDefinitionDetailDto createDefinition(String scenarioTypeCode,
                                                           CreateChangeViewDefinitionRequest request) {
        // 1. Validate definition JSON
        List<String> errors = validationService.validate(request.definition());
        if (!errors.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    String.join("; ", errors));
        }

        // 2. Validate scenario type exists
        if (!scenarioTypeRepository.existsById(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Scenario type not found: " + scenarioTypeCode);
        }

        // 3. Extract scenario_type and template_key from JSON to enforce consistency
        JsonNode root;
        try {
            root = objectMapper.readTree(request.definition());
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Invalid JSON: " + e.getMessage());
        }

        String jsonScenarioType = root.has("scenario_type") ? root.get("scenario_type").asText() : null;
        String jsonTemplateKey = root.has("template_key") ? root.get("template_key").asText() : null;

        if (jsonScenarioType != null && !jsonScenarioType.equals(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "scenario_type in JSON ('" + jsonScenarioType + "') does not match path parameter ('" + scenarioTypeCode + "')");
        }

        if (jsonTemplateKey != null && !jsonTemplateKey.equals(request.templateKey())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "template_key in JSON ('" + jsonTemplateKey + "') does not match request body templateKey ('" + request.templateKey() + "')");
        }

        // 4. Compute next version
        Optional<Integer> maxVersion = changeViewDefinitionRepository.findMaxVersion(
                scenarioTypeCode, request.templateKey());
        int nextVersion = maxVersion.orElse(0) + 1;

        // 5. Build entity
        ChangeViewDefinition entity = buildEntity(scenarioTypeCode, request, nextVersion);

        // 6. Save with optimistic concurrency retry
        try {
            ChangeViewDefinition saved = changeViewDefinitionRepository.save(entity);
            return toDetailDto(saved);
        } catch (DataIntegrityViolationException e) {
            // Retry: re-query max version, recompute, and save (up to 2 more attempts)
            for (int attempt = 0; attempt < 2; attempt++) {
                try {
                    Optional<Integer> retryMaxVersion = changeViewDefinitionRepository.findMaxVersion(
                            scenarioTypeCode, request.templateKey());
                    int retryNextVersion = retryMaxVersion.orElse(0) + 1;

                    ChangeViewDefinition retryEntity = buildEntity(scenarioTypeCode, request, retryNextVersion);
                    ChangeViewDefinition saved = changeViewDefinitionRepository.save(retryEntity);
                    return toDetailDto(saved);
                } catch (DataIntegrityViolationException retryException) {
                    // Continue to next retry attempt
                }
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Unable to save definition due to concurrent version conflict");
        }
    }

    /**
     * Activates a change view definition. Auto-deactivates any currently active definition
     * of the same (scenarioTypeCode, templateKey) combination.
     */
    @Transactional
    public ChangeViewDefinitionDetailDto activateDefinition(UUID id) {
        ChangeViewDefinition definition = changeViewDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Change view definition not found: " + id));

        // Find currently active definition for the same (scenarioTypeCode, templateKey)
        Optional<ChangeViewDefinition> currentlyActive =
                changeViewDefinitionRepository.findFirstByScenarioTypeCodeAndTemplateKeyAndIsActiveTrueOrderByVersionDesc(
                        definition.getScenarioTypeCode(), definition.getTemplateKey());

        if (currentlyActive.isPresent() && !currentlyActive.get().getId().equals(id)) {
            ChangeViewDefinition activeDefinition = currentlyActive.get();
            activeDefinition.setActive(false);
            activeDefinition.setUpdatedAt(LocalDateTime.now());
            changeViewDefinitionRepository.save(activeDefinition);
        }

        definition.setActive(true);
        definition.setUpdatedAt(LocalDateTime.now());
        ChangeViewDefinition saved = changeViewDefinitionRepository.save(definition);
        return toDetailDto(saved);
    }

    /**
     * Deactivates a change view definition.
     */
    public ChangeViewDefinitionDetailDto deactivateDefinition(UUID id) {
        ChangeViewDefinition definition = changeViewDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Change view definition not found: " + id));

        definition.setActive(false);
        definition.setUpdatedAt(LocalDateTime.now());
        ChangeViewDefinition saved = changeViewDefinitionRepository.save(definition);
        return toDetailDto(saved);
    }

    /**
     * Generates a preview by parsing definition JSON and building a mock RenderedReport
     * structure with placeholder values. Only handles text and table content blocks --
     * metric blocks are skipped entirely, and legacy metrics[] format is not supported.
     */
    public Map<String, Object> generatePreview(String definitionJson) {
        JsonNode root;
        try {
            root = objectMapper.readTree(definitionJson);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Invalid JSON: " + e.getMessage());
        }

        // Build top-level report structure with placeholder values
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("reportKey", getTextOrDefault(root, "template_key", "preview_change_view"));
        report.put("reportName", getTextOrDefault(root, "display_name", "Preview Change View"));
        report.put("definitionVersion", 0);
        report.put("generatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        report.put("scenarioId", "preview");
        report.put("scenarioName", "Preview Scenario");
        report.put("scenarioTypeCode", getTextOrDefault(root, "scenario_type", "PREVIEW"));

        // Build sections
        List<Map<String, Object>> sections = new ArrayList<>();
        JsonNode sectionsNode = root.get("sections");
        if (sectionsNode != null && sectionsNode.isArray()) {
            for (int i = 0; i < sectionsNode.size(); i++) {
                JsonNode sectionNode = sectionsNode.get(i);
                Map<String, Object> section = buildPreviewSection(sectionNode, i + 1);
                sections.add(section);
            }
        }
        report.put("sections", sections);

        return report;
    }

    // ========================================================================
    // Private helpers: entity building
    // ========================================================================

    private ChangeViewDefinition buildEntity(String scenarioTypeCode,
                                              CreateChangeViewDefinitionRequest request,
                                              int version) {
        ChangeViewDefinition entity = new ChangeViewDefinition();
        entity.setId(UUID.randomUUID());
        entity.setScenarioTypeCode(scenarioTypeCode);
        entity.setTemplateKey(request.templateKey());
        entity.setVersion(version);
        entity.setDefinition(request.definition());
        entity.setActive(true);

        LocalDateTime now = LocalDateTime.now();
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);

        return entity;
    }

    // ========================================================================
    // Private helpers: entity-to-DTO mapping
    // ========================================================================

    /**
     * Maps a ChangeViewDefinition entity to ChangeViewDefinitionListItemDto.
     * Extracts displayName from the definition JSON; falls back to templateKey on parse failure.
     */
    private ChangeViewDefinitionListItemDto toListItemDto(ChangeViewDefinition entity) {
        String displayName = entity.getTemplateKey(); // fallback
        try {
            JsonNode root = objectMapper.readTree(entity.getDefinition());
            JsonNode displayNameNode = root.get("display_name");
            if (displayNameNode != null && displayNameNode.isTextual() && !displayNameNode.asText().isEmpty()) {
                displayName = displayNameNode.asText();
            }
        } catch (JsonProcessingException e) {
            logger.warn("Failed to parse definition JSON for displayName extraction, falling back to templateKey: {}",
                    entity.getTemplateKey());
        }

        return new ChangeViewDefinitionListItemDto(
                entity.getId(),
                entity.getScenarioTypeCode(),
                entity.getTemplateKey(),
                displayName,
                entity.getVersion(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    /**
     * Maps a ChangeViewDefinition entity to ChangeViewDefinitionDetailDto.
     * Extracts displayName and schemaVersion from the definition JSON.
     */
    private ChangeViewDefinitionDetailDto toDetailDto(ChangeViewDefinition entity) {
        String displayName = entity.getTemplateKey(); // fallback
        String schemaVersion = null;
        try {
            JsonNode root = objectMapper.readTree(entity.getDefinition());
            JsonNode displayNameNode = root.get("display_name");
            if (displayNameNode != null && displayNameNode.isTextual() && !displayNameNode.asText().isEmpty()) {
                displayName = displayNameNode.asText();
            }
            JsonNode schemaVersionNode = root.get("schema_version");
            if (schemaVersionNode != null && schemaVersionNode.isTextual()) {
                schemaVersion = schemaVersionNode.asText();
            }
        } catch (JsonProcessingException e) {
            logger.warn("Failed to parse definition JSON for DTO extraction, falling back to templateKey: {}",
                    entity.getTemplateKey());
        }

        return new ChangeViewDefinitionDetailDto(
                entity.getId(),
                entity.getScenarioTypeCode(),
                entity.getTemplateKey(),
                displayName,
                entity.getVersion(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getDefinition(),
                schemaVersion
        );
    }

    // ========================================================================
    // Private helpers: preview rendering
    // ========================================================================

    private Map<String, Object> buildPreviewSection(JsonNode sectionNode, int defaultOrder) {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("sectionKey", getTextOrDefault(sectionNode, "key", "section_" + defaultOrder));
        section.put("sectionTitle", getTextOrDefault(sectionNode, "title", "Section " + defaultOrder));

        int order = defaultOrder;
        JsonNode orderNode = sectionNode.get("order");
        if (orderNode != null && orderNode.isInt()) {
            order = orderNode.asInt();
        }
        section.put("order", order);

        // Build content blocks -- only text and table blocks (no metrics support)
        List<Map<String, Object>> contentBlocks = new ArrayList<>();

        JsonNode contentBlocksNode = sectionNode.get("contentBlocks");
        if (contentBlocksNode != null && contentBlocksNode.isArray()) {
            for (int i = 0; i < contentBlocksNode.size(); i++) {
                JsonNode blockNode = contentBlocksNode.get(i);
                Map<String, Object> block = buildPreviewContentBlock(blockNode, i + 1);
                if (block != null) {
                    contentBlocks.add(block);
                }
            }
        }

        // Do NOT handle legacy metrics[] format -- only contentBlocks[] is supported

        section.put("contentBlocks", contentBlocks);
        return section;
    }

    private Map<String, Object> buildPreviewContentBlock(JsonNode blockNode, int defaultOrder) {
        String blockType = getTextOrDefault(blockNode, "blockType", null);

        if (blockType == null) {
            return null;
        }

        return switch (blockType) {
            case "text" -> buildPreviewTextBlock(blockNode, defaultOrder);
            case "table" -> buildPreviewTableBlock(blockNode, defaultOrder);
            default -> null; // Skip metric blocks and any other unsupported block types
        };
    }

    private Map<String, Object> buildPreviewTextBlock(JsonNode textNode, int order) {
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("blockType", "text");
        block.put("order", order);
        block.put("textKey", getTextOrDefault(textNode, "key", "text_" + order));
        block.put("content", getTextOrDefault(textNode, "content", ""));
        return block;
    }

    private Map<String, Object> buildPreviewTableBlock(JsonNode tableNode, int order) {
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("blockType", "table");
        block.put("order", order);
        block.put("tableKey", getTextOrDefault(tableNode, "key", "table_" + order));
        block.put("label", getTextOrDefault(tableNode, "label", "Table " + order));

        // Build columnLayout structure -- pass through from definition directly
        Map<String, Object> columnLayout = new LinkedHashMap<>();
        List<Map<String, String>> rowColumns = new ArrayList<>();
        List<Map<String, Object>> columnGroups = new ArrayList<>();

        // Check for explicit rowColumns definition
        JsonNode rowColumnsNode = tableNode.get("rowColumns");
        if (rowColumnsNode != null && rowColumnsNode.isArray()) {
            for (JsonNode rcNode : rowColumnsNode) {
                Map<String, String> rc = new LinkedHashMap<>();
                rc.put("key", getTextOrDefault(rcNode, "key", ""));
                rc.put("header", getTextOrDefault(rcNode, "header", ""));
                rowColumns.add(rc);
            }
        }

        // Check for explicit columnGroups definition
        JsonNode columnGroupsNode = tableNode.get("columnGroups");
        if (columnGroupsNode != null && columnGroupsNode.isArray()) {
            for (JsonNode groupNode : columnGroupsNode) {
                Map<String, Object> group = new LinkedHashMap<>();
                group.put("groupLabel", getTextOrDefault(groupNode, "groupLabel", ""));

                List<Map<String, Object>> groupColumns = new ArrayList<>();
                JsonNode groupColsNode = groupNode.get("columns");
                if (groupColsNode != null && groupColsNode.isArray()) {
                    for (JsonNode colNode : groupColsNode) {
                        Map<String, Object> colDef = new LinkedHashMap<>();
                        colDef.put("key", getTextOrDefault(colNode, "key", ""));
                        colDef.put("header", getTextOrDefault(colNode, "header", ""));
                        String formatToken = getTextOrDefault(colNode, "formatToken", null);
                        if (formatToken != null) {
                            colDef.put("formatToken", formatToken);
                        }
                        groupColumns.add(colDef);
                    }
                }
                group.put("columns", groupColumns);
                columnGroups.add(group);
            }
        }

        columnLayout.put("rowColumns", rowColumns);
        columnLayout.put("columnGroups", columnGroups);
        block.put("columnLayout", columnLayout);

        // Build rows -- pass through cell values from the definition directly
        List<Map<String, Object>> rows = new ArrayList<>();
        JsonNode rowsNode = tableNode.get("rows");
        if (rowsNode != null && rowsNode.isArray()) {
            for (int i = 0; i < rowsNode.size(); i++) {
                JsonNode rowNode = rowsNode.get(i);
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("rowId", getTextOrDefault(rowNode, "rowId", "row_" + (i + 1)));

                Map<String, Object> cells = new LinkedHashMap<>();
                JsonNode cellsNode = rowNode.get("cells");
                if (cellsNode != null && cellsNode.isObject()) {
                    var fieldNames = cellsNode.fieldNames();
                    while (fieldNames.hasNext()) {
                        String fieldName = fieldNames.next();
                        JsonNode cellNode = cellsNode.get(fieldName);
                        Map<String, Object> cell = new LinkedHashMap<>();
                        if (cellNode.isObject()) {
                            cell.put("value", getTextOrDefault(cellNode, "value", ""));
                            String cellFormatToken = getTextOrDefault(cellNode, "formatToken", null);
                            if (cellFormatToken != null) {
                                cell.put("formatToken", cellFormatToken);
                            }
                        } else {
                            cell.put("value", cellNode.asText());
                        }
                        cells.put(fieldName, cell);
                    }
                }

                row.put("cells", cells);
                rows.add(row);
            }
        }
        block.put("rows", rows);

        // Keep backward-compatible flat columns
        List<String> columnHeaders = new ArrayList<>();
        JsonNode columnsNode = tableNode.get("columns");
        if (columnsNode != null && columnsNode.isArray()) {
            for (JsonNode col : columnsNode) {
                if (col.isObject()) {
                    columnHeaders.add(getTextOrDefault(col, "header", ""));
                } else if (col.isTextual()) {
                    columnHeaders.add(col.asText());
                }
            }
        }
        block.put("columns", columnHeaders);

        return block;
    }

    private String getTextOrDefault(JsonNode node, String fieldName, String defaultValue) {
        if (node == null) {
            return defaultValue;
        }
        JsonNode fieldNode = node.get(fieldName);
        if (fieldNode != null && fieldNode.isTextual() && !fieldNode.asText().isEmpty()) {
            return fieldNode.asText();
        }
        return defaultValue;
    }
}
