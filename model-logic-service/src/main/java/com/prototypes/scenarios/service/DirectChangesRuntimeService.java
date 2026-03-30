package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.DirectChangesColumnDefinition;
import com.prototypes.scenarios.dto.DirectChangesDataSection;
import com.prototypes.scenarios.dto.DirectChangesRuntimeResponseDto;
import com.prototypes.scenarios.entity.ChangeViewDefinition;
import com.prototypes.scenarios.entity.Scenario;
import com.prototypes.scenarios.entity.ScenarioType;
import com.prototypes.scenarios.repository.ChangeViewDefinitionRepository;
import com.prototypes.scenarios.repository.ScenarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Runtime service for the Direct Changes API endpoint.
 * Orchestrates: scenario loading, mode validation, active definition resolution,
 * provider invocation, header rendering, sorting, threshold enforcement, and response assembly.
 */
@Service
public class DirectChangesRuntimeService {

    private static final Logger logger = LoggerFactory.getLogger(DirectChangesRuntimeService.class);

    private final ScenarioRepository scenarioRepository;
    private final ChangeViewDefinitionRepository changeViewDefinitionRepository;
    private final ObjectMapper objectMapper;
    private final DirectChangesViewDataProvider provider;

    public DirectChangesRuntimeService(ScenarioRepository scenarioRepository,
                                       ChangeViewDefinitionRepository changeViewDefinitionRepository,
                                       ObjectMapper objectMapper,
                                       DirectChangesViewDataProvider provider) {
        this.scenarioRepository = scenarioRepository;
        this.changeViewDefinitionRepository = changeViewDefinitionRepository;
        this.objectMapper = objectMapper;
        this.provider = provider;
    }

    /**
     * Main entry point: loads the scenario, validates modes, resolves the active
     * DELTA_BY_UNIQUE_ID definition, invokes the provider per section, and assembles the response.
     *
     * @param scenarioId the UUID of the scenario
     * @return ResponseEntity containing the assembled DirectChangesRuntimeResponseDto, or 404 if scenario not found
     */
    public ResponseEntity<DirectChangesRuntimeResponseDto> getDirectChanges(UUID scenarioId) {
        // 1. Load scenario
        Optional<Scenario> scenarioOpt = scenarioRepository.findByIdWithSummary(scenarioId);
        if (scenarioOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Scenario scenario = scenarioOpt.get();
        ScenarioType scenarioType = scenario.getScenarioType();

        // 2. Mode guard
        validateMode(scenarioType);

        // 3. Resolve active DELTA_BY_UNIQUE_ID definition
        String scenarioTypeCode = scenario.getScenarioTypeCode();
        ChangeViewDefinition definition = resolveActiveDefinition(scenarioTypeCode);

        // 4. Parse definition and process sections
        try {
            JsonNode root = objectMapper.readTree(definition.getDefinition());
            JsonNode dataTypesNode = root.get("dataTypes");

            if (dataTypesNode == null || !dataTypesNode.isArray()) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Definition JSON missing or invalid 'dataTypes' array");
            }

            List<DirectChangesDataSection> sections = new ArrayList<>();

            for (JsonNode dataTypeNode : dataTypesNode) {
                DirectChangesDataSection section = processSection(dataTypeNode, scenarioId, scenarioTypeCode);
                if (section != null) {
                    sections.add(section);
                }
            }

            DirectChangesRuntimeResponseDto response = new DirectChangesRuntimeResponseDto(sections);
            return ResponseEntity.ok(response);

        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to process definition JSON", e);
        }
    }

    // ========================================================================
    // Mode validation
    // ========================================================================

    private void validateMode(ScenarioType scenarioType) {
        String dcMode = scenarioType != null ? scenarioType.getDirectChangesMode() : null;

        if ("EXTERNAL".equals(dcMode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Direct changes are configured as EXTERNAL for this scenario type.");
        }

        if ("INTERNAL".equals(dcMode)) {
            String renderMode = scenarioType.getDirectChangesInternalRenderMode();
            if (renderMode == null || renderMode.isBlank() || "FULL_DATA_CHANGES".equals(renderMode)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Direct changes use FULL_DATA_CHANGES and are provided by the existing grid endpoint.");
            }
            if (!"DELTA_BY_UNIQUE_ID".equals(renderMode)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Unsupported directChangesInternalRenderMode: " + renderMode);
            }
            // DELTA_BY_UNIQUE_ID -- proceed
        }
    }

    // ========================================================================
    // Active definition resolution
    // ========================================================================

    private ChangeViewDefinition resolveActiveDefinition(String scenarioTypeCode) {
        List<ChangeViewDefinition> activeDefinitions =
                changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(scenarioTypeCode);

        for (ChangeViewDefinition candidate : activeDefinitions) {
            try {
                JsonNode root = objectMapper.readTree(candidate.getDefinition());
                JsonNode renderModeNode = root.get("renderMode");
                if (renderModeNode != null && renderModeNode.isTextual()
                        && "DELTA_BY_UNIQUE_ID".equals(renderModeNode.asText())) {
                    return candidate;
                }
            } catch (Exception e) {
                logger.warn("Failed to parse definition JSON for change view definition {}: {}",
                        candidate.getId(), e.getMessage());
            }
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                "No active DELTA_BY_UNIQUE_ID change view definition found for scenario type: " + scenarioTypeCode);
    }

    // ========================================================================
    // Per-section processing
    // ========================================================================

    private DirectChangesDataSection processSection(JsonNode dataTypeNode, UUID scenarioId, String scenarioTypeCode) {
        String dataTypeId = textOrNull(dataTypeNode, "dataTypeId");
        String dataTypeTitle = textOrNull(dataTypeNode, "dataTypeTitle");
        String headerTemplate = textOrNull(dataTypeNode, "headerSummaryTextTemplate");
        JsonNode columnDefsNode = dataTypeNode.get("columnDefinitions");
        JsonNode sortOrderingNode = dataTypeNode.get("sortOrdering");
        Integer rowThreshold = intOrNull(dataTypeNode, "rowThreshold");
        Boolean groupByEntityIdColumn = booleanOrNull(dataTypeNode, "groupByEntityIdColumn");

        // Invoke provider
        DirectChangesSectionData sectionData = provider.getSectionData(scenarioId, scenarioTypeCode, dataTypeId);

        // Null rows or empty rows -> skip section
        if (sectionData == null || sectionData.rows() == null || sectionData.rows().isEmpty()) {
            return null;
        }

        List<Map<String, Object>> rows = new ArrayList<>(sectionData.rows());
        int totalDataChanges = rows.size();

        // Sort rows
        applySorting(rows, sortOrderingNode);

        // Build column definitions
        List<DirectChangesColumnDefinition> columnDefinitions = buildColumnDefinitions(columnDefsNode);

        // Compute header
        String header = renderHeader(headerTemplate, dataTypeTitle, totalDataChanges, rows, columnDefsNode);

        // Threshold enforcement
        String renderState;
        List<Map<String, Object>> data;
        if (rowThreshold != null && totalDataChanges > rowThreshold) {
            renderState = "OVERFLOW";
            data = null;
        } else {
            renderState = "ROWS";
            data = rows;
        }

        return new DirectChangesDataSection(
                dataTypeId,
                dataTypeTitle,
                header,
                sectionData.externalLink(),
                totalDataChanges,
                renderState,
                columnDefinitions,
                data,
                groupByEntityIdColumn
        );
    }

    // ========================================================================
    // Sorting
    // ========================================================================

    private void applySorting(List<Map<String, Object>> rows, JsonNode sortOrderingNode) {
        if (sortOrderingNode == null || sortOrderingNode.isNull() || sortOrderingNode.isMissingNode()) {
            return;
        }

        String dataAttribute = textOrNull(sortOrderingNode, "dataAttribute");
        String direction = textOrNull(sortOrderingNode, "direction");

        if (dataAttribute == null) {
            return;
        }

        Comparator<Map<String, Object>> comparator = (row1, row2) -> {
            Object val1 = row1.get(dataAttribute);
            Object val2 = row2.get(dataAttribute);

            // Nulls last
            if (val1 == null && val2 == null) return 0;
            if (val1 == null) return 1;
            if (val2 == null) return -1;

            // Numeric comparison
            if (val1 instanceof Number && val2 instanceof Number) {
                return Double.compare(((Number) val1).doubleValue(), ((Number) val2).doubleValue());
            }

            // String comparison (natural ordering)
            return val1.toString().compareTo(val2.toString());
        };

        if ("DESC".equalsIgnoreCase(direction)) {
            comparator = comparator.reversed().thenComparing((row1, row2) -> {
                // Maintain nulls-last even with reversed comparator
                Object val1 = row1.get(dataAttribute);
                Object val2 = row2.get(dataAttribute);
                if (val1 == null && val2 == null) return 0;
                if (val1 == null) return 1;
                if (val2 == null) return -1;
                return 0;
            });
        }

        rows.sort(comparator);
    }

    // ========================================================================
    // Header template rendering
    // ========================================================================

    private String renderHeader(String headerTemplate, String dataTypeTitle,
                                int totalDataChanges, List<Map<String, Object>> rows,
                                JsonNode columnDefsNode) {
        if (headerTemplate == null || headerTemplate.isBlank()) {
            return dataTypeTitle != null ? dataTypeTitle : "";
        }

        int changedValuesCount = totalDataChanges;
        int changedEntitiesCount = computeChangedEntitiesCount(rows, columnDefsNode);

        String header = headerTemplate;
        header = header.replace("${changedValuesCount}", String.valueOf(changedValuesCount));
        header = header.replace("${changedEntitiesCount}", String.valueOf(changedEntitiesCount));

        return header;
    }

    private int computeChangedEntitiesCount(List<Map<String, Object>> rows, JsonNode columnDefsNode) {
        if (columnDefsNode == null || !columnDefsNode.isArray()) {
            return 0;
        }

        // Find the column with isEntityId: true
        String entityIdAttribute = null;
        for (JsonNode colDef : columnDefsNode) {
            JsonNode isEntityIdNode = colDef.get("isEntityId");
            if (isEntityIdNode != null && isEntityIdNode.asBoolean(false)) {
                entityIdAttribute = textOrNull(colDef, "dataAttribute");
                break;
            }
        }

        if (entityIdAttribute == null) {
            return 0;
        }

        // Count distinct values
        Set<Object> distinctValues = new HashSet<>();
        for (Map<String, Object> row : rows) {
            Object value = row.get(entityIdAttribute);
            if (value != null) {
                distinctValues.add(value);
            }
        }

        return distinctValues.size();
    }

    // ========================================================================
    // Column definitions builder
    // ========================================================================

    private List<DirectChangesColumnDefinition> buildColumnDefinitions(JsonNode columnDefsNode) {
        List<DirectChangesColumnDefinition> result = new ArrayList<>();

        if (columnDefsNode == null || !columnDefsNode.isArray()) {
            return result;
        }

        for (JsonNode colDef : columnDefsNode) {
            String dataAttribute = textOrNull(colDef, "dataAttribute");
            String type = textOrNull(colDef, "type");
            String display = textOrNull(colDef, "display");

            Boolean isEntityId = null;
            JsonNode isEntityIdNode = colDef.get("isEntityId");
            if (isEntityIdNode != null && isEntityIdNode.asBoolean(false)) {
                isEntityId = true;
            }

            result.add(new DirectChangesColumnDefinition(dataAttribute, type, display, isEntityId));
        }

        return result;
    }

    // ========================================================================
    // JSON helpers
    // ========================================================================

    private String textOrNull(JsonNode parent, String fieldName) {
        JsonNode node = parent.get(fieldName);
        if (node != null && node.isTextual() && !node.asText().isEmpty()) {
            return node.asText();
        }
        return null;
    }

    private Integer intOrNull(JsonNode parent, String fieldName) {
        JsonNode node = parent.get(fieldName);
        if (node != null && node.isNumber()) {
            return node.asInt();
        }
        return null;
    }

    private Boolean booleanOrNull(JsonNode parent, String fieldName) {
        JsonNode node = parent.get(fieldName);
        if (node != null && node.isBoolean() && node.asBoolean()) {
            return true;
        }
        return null;
    }
}
