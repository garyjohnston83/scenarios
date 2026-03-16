package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.CreateImpactReportDefinitionRequest;
import com.prototypes.scenarios.dto.ImpactReportDefinitionDetailDto;
import com.prototypes.scenarios.dto.ImpactReportDefinitionListItemDto;
import com.prototypes.scenarios.entity.ReportDefinition;
import com.prototypes.scenarios.repository.ReportDefinitionRepository;
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
public class ImpactReportDefinitionAdminService {

    private static final Logger logger = LoggerFactory.getLogger(ImpactReportDefinitionAdminService.class);

    private final ReportDefinitionRepository reportDefinitionRepository;
    private final ReportDefinitionValidationService validationService;
    private final ScenarioTypeRepository scenarioTypeRepository;
    private final ObjectMapper objectMapper;

    public ImpactReportDefinitionAdminService(ReportDefinitionRepository reportDefinitionRepository,
                                               ReportDefinitionValidationService validationService,
                                               ScenarioTypeRepository scenarioTypeRepository,
                                               ObjectMapper objectMapper) {
        this.reportDefinitionRepository = reportDefinitionRepository;
        this.validationService = validationService;
        this.scenarioTypeRepository = scenarioTypeRepository;
        this.objectMapper = objectMapper;
    }

    // ========================================================================
    // Public operations
    // ========================================================================

    /**
     * Lists all report definitions (active and inactive) for a scenario type,
     * ordered by reportKey ascending then version descending.
     */
    public List<ImpactReportDefinitionListItemDto> listDefinitions(String scenarioTypeCode) {
        if (!scenarioTypeRepository.existsById(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Scenario type not found: " + scenarioTypeCode);
        }

        // Return only the latest version per reportKey.
        // Results are ordered by reportKey ASC, version DESC — so first per key is latest.
        return reportDefinitionRepository
                .findAllByScenarioTypeCodeOrderByReportKeyAscVersionDesc(scenarioTypeCode)
                .stream()
                .filter(new java.util.function.Predicate<ReportDefinition>() {
                    private final java.util.Set<String> seen = new java.util.HashSet<>();
                    @Override
                    public boolean test(ReportDefinition rd) {
                        return seen.add(rd.getReportKey());
                    }
                })
                .map(this::toListItemDto)
                .toList();
    }

    /**
     * Gets a single report definition by ID.
     */
    public ImpactReportDefinitionDetailDto getDefinition(UUID id) {
        ReportDefinition entity = reportDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Report definition not found: " + id));
        return toDetailDto(entity);
    }

    /**
     * Creates a new report definition with validation, version computation,
     * and retry on concurrent version conflict.
     */
    public ImpactReportDefinitionDetailDto createDefinition(String scenarioTypeCode,
                                                             CreateImpactReportDefinitionRequest request) {
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

        // 3. Extract scenario_type and report_key from JSON to enforce consistency
        JsonNode root;
        try {
            root = objectMapper.readTree(request.definition());
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Invalid JSON: " + e.getMessage());
        }

        String jsonScenarioType = root.has("scenario_type") ? root.get("scenario_type").asText() : null;
        String jsonReportKey = root.has("report_key") ? root.get("report_key").asText() : null;

        if (jsonScenarioType != null && !jsonScenarioType.equals(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "scenario_type in JSON ('" + jsonScenarioType + "') does not match path parameter ('" + scenarioTypeCode + "')");
        }

        if (jsonReportKey != null && !jsonReportKey.equals(request.reportKey())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "report_key in JSON ('" + jsonReportKey + "') does not match request body reportKey ('" + request.reportKey() + "')");
        }

        // 4. Compute next version
        Optional<Integer> maxVersion = reportDefinitionRepository.findMaxVersion(
                scenarioTypeCode, request.reportKey());
        int nextVersion = maxVersion.orElse(0) + 1;

        // 5. Build entity
        ReportDefinition entity = buildEntity(scenarioTypeCode, request, nextVersion);

        // 6. Save with optimistic concurrency retry
        try {
            ReportDefinition saved = reportDefinitionRepository.save(entity);
            return toDetailDto(saved);
        } catch (DataIntegrityViolationException e) {
            // Retry: re-query max version, recompute, and save (up to 2 more attempts)
            for (int attempt = 0; attempt < 2; attempt++) {
                try {
                    Optional<Integer> retryMaxVersion = reportDefinitionRepository.findMaxVersion(
                            scenarioTypeCode, request.reportKey());
                    int retryNextVersion = retryMaxVersion.orElse(0) + 1;

                    ReportDefinition retryEntity = buildEntity(scenarioTypeCode, request, retryNextVersion);
                    ReportDefinition saved = reportDefinitionRepository.save(retryEntity);
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
     * Activates a report definition. Auto-deactivates any currently active definition
     * of the same (scenarioTypeCode, reportKey) combination.
     */
    @Transactional
    public ImpactReportDefinitionDetailDto activateDefinition(UUID id) {
        ReportDefinition definition = reportDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Report definition not found: " + id));

        // Find currently active definition for the same (scenarioTypeCode, reportKey)
        Optional<ReportDefinition> currentlyActive =
                reportDefinitionRepository.findFirstByScenarioTypeCodeAndReportKeyAndIsActiveTrueOrderByVersionDesc(
                        definition.getScenarioTypeCode(), definition.getReportKey());

        if (currentlyActive.isPresent() && !currentlyActive.get().getId().equals(id)) {
            ReportDefinition activeDefinition = currentlyActive.get();
            activeDefinition.setActive(false);
            activeDefinition.setUpdatedAt(LocalDateTime.now());
            reportDefinitionRepository.save(activeDefinition);
        }

        definition.setActive(true);
        definition.setUpdatedAt(LocalDateTime.now());
        ReportDefinition saved = reportDefinitionRepository.save(definition);
        return toDetailDto(saved);
    }

    /**
     * Deletes a report definition by ID.
     */
    public void deleteDefinition(String scenarioTypeCode, UUID id) {
        ReportDefinition definition = reportDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Report definition not found: " + id));
        if (!definition.getScenarioTypeCode().equals(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Report definition not found for scenario type: " + scenarioTypeCode);
        }
        reportDefinitionRepository.delete(definition);
    }

    /**
     * Deactivates a report definition.
     */
    public ImpactReportDefinitionDetailDto deactivateDefinition(UUID id) {
        ReportDefinition definition = reportDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Report definition not found: " + id));

        definition.setActive(false);
        definition.setUpdatedAt(LocalDateTime.now());
        ReportDefinition saved = reportDefinitionRepository.save(definition);
        return toDetailDto(saved);
    }

    /**
     * Updates sample data for a report definition.
     * Sample data is metadata about the definition, not the definition itself,
     * so updating it does not create a new version.
     */
    @Transactional
    public void updateSampleData(String scenarioTypeCode, UUID id, String sampleData) {
        ReportDefinition entity = reportDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Report definition not found: " + id));
        if (!entity.getScenarioTypeCode().equals(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Report definition not found for scenario type: " + scenarioTypeCode);
        }
        entity.setSampleData(sampleData);
        entity.setUpdatedAt(LocalDateTime.now());
        reportDefinitionRepository.save(entity);
    }

    /**
     * Generates a preview by parsing definition JSON and building a mock RenderedReport
     * structure with placeholder values. References the ImpactReportSnapshotGenerator's
     * buildRenderedReport() structure but uses static placeholders instead of resolved data.
     *
     * If sampleDataJson is provided, uses it to resolve metric values and table rows.
     */
    public Map<String, Object> generatePreview(String definitionJson) {
        return generatePreview(definitionJson, null);
    }

    /**
     * Generates a preview with optional sample data for resolving values.
     */
    public Map<String, Object> generatePreview(String definitionJson, String sampleDataJson) {
        JsonNode root;
        try {
            root = objectMapper.readTree(definitionJson);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Invalid JSON: " + e.getMessage());
        }

        // Parse sample data if provided
        JsonNode sampleDataRoot = null;
        if (sampleDataJson != null && !sampleDataJson.isBlank()) {
            try {
                sampleDataRoot = objectMapper.readTree(sampleDataJson);
            } catch (JsonProcessingException e) {
                logger.warn("Failed to parse sample data JSON, ignoring: {}", e.getMessage());
            }
        }

        // Build top-level report structure with placeholder values
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("reportKey", getTextOrDefault(root, "report_key", "preview_report"));
        report.put("reportName", getTextOrDefault(root, "display_name", "Preview Report"));
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
                Map<String, Object> section = buildPreviewSection(sectionNode, i + 1, sampleDataRoot);
                sections.add(section);
            }
        }
        report.put("sections", sections);

        return report;
    }

    // ========================================================================
    // Private helpers: entity building
    // ========================================================================

    private ReportDefinition buildEntity(String scenarioTypeCode,
                                          CreateImpactReportDefinitionRequest request,
                                          int version) {
        ReportDefinition entity = new ReportDefinition();
        entity.setId(UUID.randomUUID());
        entity.setScenarioTypeCode(scenarioTypeCode);
        entity.setReportKey(request.reportKey());
        entity.setVersion(version);
        entity.setDefinition(request.definition());
        entity.setSampleData(request.sampleData());
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
     * Maps a ReportDefinition entity to ImpactReportDefinitionListItemDto.
     * Extracts displayName from the definition JSON; falls back to reportKey on parse failure.
     */
    private ImpactReportDefinitionListItemDto toListItemDto(ReportDefinition entity) {
        String displayName = entity.getReportKey(); // fallback
        try {
            JsonNode root = objectMapper.readTree(entity.getDefinition());
            JsonNode displayNameNode = root.get("display_name");
            if (displayNameNode != null && displayNameNode.isTextual() && !displayNameNode.asText().isEmpty()) {
                displayName = displayNameNode.asText();
            }
        } catch (JsonProcessingException e) {
            logger.warn("Failed to parse definition JSON for displayName extraction, falling back to reportKey: {}",
                    entity.getReportKey());
        }

        return new ImpactReportDefinitionListItemDto(
                entity.getId(),
                entity.getScenarioTypeCode(),
                entity.getReportKey(),
                displayName,
                entity.getVersion(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    /**
     * Maps a ReportDefinition entity to ImpactReportDefinitionDetailDto.
     * Extracts displayName and schemaVersion from the definition JSON.
     */
    private ImpactReportDefinitionDetailDto toDetailDto(ReportDefinition entity) {
        String displayName = entity.getReportKey(); // fallback
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
            logger.warn("Failed to parse definition JSON for DTO extraction, falling back to reportKey: {}",
                    entity.getReportKey());
        }

        return new ImpactReportDefinitionDetailDto(
                entity.getId(),
                entity.getScenarioTypeCode(),
                entity.getReportKey(),
                displayName,
                entity.getVersion(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getDefinition(),
                schemaVersion,
                entity.getSampleData()
        );
    }

    // ========================================================================
    // Private helpers: preview rendering
    // ========================================================================

    private Map<String, Object> buildPreviewSection(JsonNode sectionNode, int defaultOrder, JsonNode sampleData) {
        Map<String, Object> section = new LinkedHashMap<>();
        section.put("sectionKey", getTextOrDefault(sectionNode, "key", "section_" + defaultOrder));
        section.put("sectionTitle", getTextOrDefault(sectionNode, "title", "Section " + defaultOrder));

        int order = defaultOrder;
        JsonNode orderNode = sectionNode.get("order");
        if (orderNode != null && orderNode.isInt()) {
            order = orderNode.asInt();
        }
        section.put("order", order);

        // Build content blocks -- handle BOTH metrics[] and contentBlocks[] formats
        List<Map<String, Object>> contentBlocks = new ArrayList<>();

        // Check for contentBlocks[] format first (new format)
        JsonNode contentBlocksNode = sectionNode.get("contentBlocks");
        if (contentBlocksNode != null && contentBlocksNode.isArray()) {
            for (int i = 0; i < contentBlocksNode.size(); i++) {
                JsonNode blockNode = contentBlocksNode.get(i);
                Map<String, Object> block = buildPreviewContentBlock(blockNode, i + 1, sampleData);
                if (block != null) {
                    contentBlocks.add(block);
                }
            }
        }

        // Check for metrics[] format (backward compatibility)
        JsonNode metricsNode = sectionNode.get("metrics");
        if (metricsNode != null && metricsNode.isArray()) {
            for (int i = 0; i < metricsNode.size(); i++) {
                JsonNode metricNode = metricsNode.get(i);
                Map<String, Object> metricBlock = buildPreviewMetricBlock(metricNode, contentBlocks.size() + i + 1, sampleData);
                contentBlocks.add(metricBlock);
            }
        }

        section.put("contentBlocks", contentBlocks);
        return section;
    }

    private Map<String, Object> buildPreviewContentBlock(JsonNode blockNode, int defaultOrder, JsonNode sampleData) {
        String blockType = getTextOrDefault(blockNode, "blockType", "metric");

        return switch (blockType) {
            case "metric" -> buildPreviewMetricBlock(blockNode, defaultOrder, sampleData);
            case "text" -> buildPreviewTextBlock(blockNode, defaultOrder);
            case "table" -> buildPreviewTableBlock(blockNode, defaultOrder, sampleData);
            default -> buildPreviewMetricBlock(blockNode, defaultOrder, sampleData);
        };
    }

    private Map<String, Object> buildPreviewMetricBlock(JsonNode metricNode, int order, JsonNode sampleData) {
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("blockType", "metric");
        block.put("order", order);

        String metricKey = getTextOrDefault(metricNode, "key", "metric_" + order);
        String label = getTextOrDefault(metricNode, "label", metricKey);
        String sourceField = getTextOrDefault(metricNode, "source_field", "");
        String format = getTextOrDefault(metricNode, "format", "number");
        String unit = getTextOrDefault(metricNode, "unit", null);

        block.put("metricKey", metricKey);
        block.put("label", label);
        block.put("sourceField", sourceField);
        block.put("format", format);
        block.put("unit", unit);

        // Resolve values from sample data if available
        String resolvedValue = resolveMetricValue(sourceField, sampleData);
        block.put("productionValue", resolvedValue);
        block.put("scenarioValue", resolvedValue);
        block.put("deltaValue", "N/A");
        block.put("deltaPct", "N/A");
        block.put("formattedProductionValue", resolvedValue);
        block.put("formattedScenarioValue", resolvedValue);
        block.put("formattedDelta", "N/A");
        block.put("formatToken", "neutral");

        return block;
    }

    /**
     * Resolves a metric value from sample data. Looks up source_field in sampleData.metrics map.
     */
    private String resolveMetricValue(String sourceField, JsonNode sampleData) {
        if (sampleData == null || sourceField == null || sourceField.isEmpty()) {
            return "N/A";
        }
        JsonNode metricsNode = sampleData.get("metrics");
        if (metricsNode != null && metricsNode.isObject()) {
            JsonNode valueNode = metricsNode.get(sourceField);
            if (valueNode != null && !valueNode.isNull()) {
                return valueNode.asText();
            }
        }
        return "N/A";
    }

    private Map<String, Object> buildPreviewTextBlock(JsonNode textNode, int order) {
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("blockType", "text");
        block.put("order", order);
        block.put("textKey", getTextOrDefault(textNode, "key", "text_" + order));
        block.put("content", getTextOrDefault(textNode, "content", ""));
        return block;
    }

    private Map<String, Object> buildPreviewTableBlock(JsonNode tableNode, int order, JsonNode sampleData) {
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("blockType", "table");
        block.put("order", order);

        String tableKey = getTextOrDefault(tableNode, "key", "table_" + order);
        block.put("tableKey", tableKey);
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
                String rcWidth = getTextOrDefault(rcNode, "width", null);
                if (rcWidth != null) {
                    rc.put("width", rcWidth);
                }
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
                        String colWidth = getTextOrDefault(colNode, "width", null);
                        if (colWidth != null) {
                            colDef.put("width", colWidth);
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

        // Build rows from sample data only — rows are not part of the template definition
        List<Map<String, Object>> rows = new ArrayList<>();

        List<Map<String, Object>> sampleRows = resolveTableRows(tableKey, sampleData);
        if (sampleRows != null) {
            rows.addAll(sampleRows);
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

    /**
     * Resolves table rows from sample data. Looks up tableKey in sampleData.tables map.
     * Returns null if sample data doesn't have rows for this table.
     */
    private List<Map<String, Object>> resolveTableRows(String tableKey, JsonNode sampleData) {
        if (sampleData == null || tableKey == null || tableKey.isEmpty()) {
            return null;
        }
        JsonNode tablesNode = sampleData.get("tables");
        if (tablesNode == null || !tablesNode.isObject()) {
            return null;
        }
        JsonNode tableRowsNode = tablesNode.get(tableKey);
        if (tableRowsNode == null || !tableRowsNode.isArray()) {
            return null;
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < tableRowsNode.size(); i++) {
            JsonNode rowNode = tableRowsNode.get(i);
            if (!rowNode.isObject()) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            Map<String, Object> cells = new LinkedHashMap<>();

            // Detect format: nested {rowId, cells: {...}} vs flat {colKey: value}
            JsonNode cellsNode = rowNode.get("cells");
            if (cellsNode != null && cellsNode.isObject()) {
                // Nested format: { rowId: "...", cells: { colKey: { value, formatToken } } }
                row.put("rowId", getTextOrDefault(rowNode, "rowId", "sample_row_" + (i + 1)));
                var cellFieldNames = cellsNode.fieldNames();
                while (cellFieldNames.hasNext()) {
                    String fieldName = cellFieldNames.next();
                    JsonNode cellValue = cellsNode.get(fieldName);
                    Map<String, Object> cell = new LinkedHashMap<>();
                    if (cellValue.isObject()) {
                        cell.put("value", getTextOrDefault(cellValue, "value", ""));
                        String formatToken = getTextOrDefault(cellValue, "formatToken", null);
                        if (formatToken != null) {
                            cell.put("formatToken", formatToken);
                        }
                    } else {
                        cell.put("value", cellValue.asText());
                    }
                    cells.put(fieldName, cell);
                }
            } else {
                // Flat format: { colKey: value_or_cell_object, ... }
                row.put("rowId", "sample_row_" + (i + 1));
                var fieldNames = rowNode.fieldNames();
                while (fieldNames.hasNext()) {
                    String fieldName = fieldNames.next();
                    JsonNode cellValue = rowNode.get(fieldName);
                    Map<String, Object> cell = new LinkedHashMap<>();
                    if (cellValue.isObject()) {
                        cell.put("value", getTextOrDefault(cellValue, "value", ""));
                        String formatToken = getTextOrDefault(cellValue, "formatToken", null);
                        if (formatToken != null) {
                            cell.put("formatToken", formatToken);
                        }
                    } else {
                        cell.put("value", cellValue.asText());
                    }
                    cells.put(fieldName, cell);
                }
            }

            row.put("cells", cells);
            rows.add(row);
        }

        return rows;
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
