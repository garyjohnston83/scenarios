package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChangeViewDefinitionValidationService {

    private static final Pattern TEMPLATE_KEY_PATTERN = Pattern.compile("^[a-z0-9_]+$");
    private static final Pattern SCENARIO_TYPE_PATTERN = Pattern.compile("^[A-Z0-9_]+$");
    private static final Set<String> VALID_FORMAT_TOKENS = Set.of("positive", "warning", "negative", "neutral");
    private static final Set<String> VALID_COLUMN_TYPES = Set.of("string", "number", "date", "boolean");
    private static final Set<String> VALID_SORT_DIRECTIONS = Set.of("ASC", "DESC");
    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\$\\{([^}]+)}");
    private static final Set<String> VALID_PLACEHOLDERS = Set.of("changedValuesCount", "changedEntitiesCount");

    private final ObjectMapper objectMapper;

    public ChangeViewDefinitionValidationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<String> validate(String definitionJson) {
        JsonNode root;
        try {
            root = objectMapper.readTree(definitionJson);
        } catch (JsonProcessingException e) {
            return List.of("Invalid JSON: " + e.getMessage());
        }

        List<String> errors = new ArrayList<>();

        validateTopLevelFields(root, errors);

        // Branch validation by renderMode
        JsonNode renderModeNode = root.get("renderMode");
        String renderMode = (renderModeNode != null && renderModeNode.isTextual() && !renderModeNode.asText().isEmpty())
                ? renderModeNode.asText()
                : null;

        if (renderMode == null || "FULL_DATA_CHANGES".equals(renderMode)) {
            validateSections(root, errors);
        } else if ("DELTA_BY_UNIQUE_ID".equals(renderMode)) {
            validateDeltaByUniqueIdDefinition(root, errors);
        } else {
            errors.add("renderMode: must be 'FULL_DATA_CHANGES' or 'DELTA_BY_UNIQUE_ID'");
        }

        return errors;
    }

    private void validateTopLevelFields(JsonNode root, List<String> errors) {
        // Validate schema_version
        JsonNode schemaVersionNode = root.get("schema_version");
        if (schemaVersionNode == null || schemaVersionNode.isNull()) {
            errors.add("schema_version: must be present");
        } else if (!schemaVersionNode.isTextual()) {
            errors.add("schema_version: must be a string");
        } else if (!"1.0".equals(schemaVersionNode.asText())) {
            errors.add("schema_version: must be '1.0', got '" + schemaVersionNode.asText() + "'");
        }

        // Validate template_key
        JsonNode templateKeyNode = root.get("template_key");
        if (templateKeyNode == null || templateKeyNode.isNull()) {
            errors.add("template_key: must be present");
        } else if (!templateKeyNode.isTextual() || templateKeyNode.asText().isEmpty()) {
            errors.add("template_key: must be a non-empty string");
        } else if (!TEMPLATE_KEY_PATTERN.matcher(templateKeyNode.asText()).matches()) {
            errors.add("template_key: must match pattern [a-z0-9_]+, got '" + templateKeyNode.asText() + "'");
        }

        // Validate scenario_type
        JsonNode scenarioTypeNode = root.get("scenario_type");
        if (scenarioTypeNode == null || scenarioTypeNode.isNull()) {
            errors.add("scenario_type: must be present");
        } else if (!scenarioTypeNode.isTextual() || scenarioTypeNode.asText().isEmpty()) {
            errors.add("scenario_type: must be a non-empty string");
        } else if (!SCENARIO_TYPE_PATTERN.matcher(scenarioTypeNode.asText()).matches()) {
            errors.add("scenario_type: must match pattern [A-Z0-9_]+, got '" + scenarioTypeNode.asText() + "'");
        }

        // Validate display_name
        JsonNode displayNameNode = root.get("display_name");
        if (displayNameNode == null || displayNameNode.isNull()) {
            errors.add("display_name: must be present");
        } else if (!displayNameNode.isTextual() || displayNameNode.asText().isEmpty()) {
            errors.add("display_name: must be a non-empty string");
        }

        // Optional: description (string if present)
        JsonNode descriptionNode = root.get("description");
        if (descriptionNode != null && !descriptionNode.isNull() && !descriptionNode.isTextual()) {
            errors.add("description: must be a string");
        }

        // Optional: metadata (object if present)
        JsonNode metadataNode = root.get("metadata");
        if (metadataNode != null && !metadataNode.isNull()) {
            if (!metadataNode.isObject()) {
                errors.add("metadata: must be an object");
            } else {
                // Optional: metadata.author (string if present)
                JsonNode authorNode = metadataNode.get("author");
                if (authorNode != null && !authorNode.isNull() && !authorNode.isTextual()) {
                    errors.add("metadata.author: must be a string");
                }

                // Optional: metadata.tags (array if present)
                JsonNode tagsNode = metadataNode.get("tags");
                if (tagsNode != null && !tagsNode.isNull() && !tagsNode.isArray()) {
                    errors.add("metadata.tags: must be an array");
                }
            }
        }
    }

    private void validateSections(JsonNode root, List<String> errors) {
        JsonNode sectionsNode = root.get("sections");
        if (sectionsNode == null || sectionsNode.isNull()) {
            errors.add("sections: must be present");
            return;
        }
        if (!sectionsNode.isArray()) {
            errors.add("sections: must be a non-empty array");
            return;
        }
        if (sectionsNode.isEmpty()) {
            errors.add("sections: must be a non-empty array");
            return;
        }

        Set<String> sectionKeys = new HashSet<>();

        for (int i = 0; i < sectionsNode.size(); i++) {
            JsonNode section = sectionsNode.get(i);
            String prefix = "sections[" + i + "]";

            // Validate section key
            JsonNode keyNode = section.get("key");
            String sectionKey = null;
            if (keyNode == null || keyNode.isNull() || !keyNode.isTextual() || keyNode.asText().isEmpty()) {
                errors.add(prefix + ".key: must be a non-empty string");
            } else {
                sectionKey = keyNode.asText();
                if (!sectionKeys.add(sectionKey)) {
                    errors.add("Duplicate section key: '" + sectionKey + "'");
                }
            }

            // Validate section title
            JsonNode titleNode = section.get("title");
            if (titleNode == null || titleNode.isNull() || !titleNode.isTextual() || titleNode.asText().isEmpty()) {
                errors.add(prefix + ".title: must be a non-empty string");
            }

            // Validate section order
            JsonNode orderNode = section.get("order");
            if (orderNode == null || orderNode.isNull()) {
                errors.add(prefix + ".order: must be present");
            } else if (!orderNode.isInt()) {
                errors.add(prefix + ".order: must be an integer >= 1");
            } else if (orderNode.asInt() < 1) {
                errors.add(prefix + ".order: must be an integer >= 1, got " + orderNode.asInt());
            }

            // Check for legacy metrics format -- not supported in Change View definitions
            JsonNode metricsNode = section.get("metrics");
            if (metricsNode != null && !metricsNode.isNull()) {
                errors.add(prefix + ": Change View definitions do not support 'metrics' format. Use 'contentBlocks' instead.");
            }

            // Validate contentBlocks
            JsonNode contentBlocksNode = section.get("contentBlocks");
            if (contentBlocksNode == null || contentBlocksNode.isNull()) {
                // Only add missing contentBlocks error if metrics wasn't present (to avoid double error)
                if (metricsNode == null || metricsNode.isNull()) {
                    errors.add(prefix + ".contentBlocks: must be present");
                }
            } else if (!contentBlocksNode.isArray()) {
                errors.add(prefix + ".contentBlocks: must be a non-empty array");
            } else if (contentBlocksNode.isEmpty()) {
                errors.add(prefix + ".contentBlocks: must be a non-empty array");
            } else {
                validateContentBlocks(contentBlocksNode, prefix, sectionKey, errors);
            }
        }
    }

    private void validateContentBlocks(JsonNode contentBlocksNode, String sectionPrefix, String sectionKey, List<String> errors) {
        Set<String> blockKeys = new HashSet<>();

        for (int j = 0; j < contentBlocksNode.size(); j++) {
            JsonNode block = contentBlocksNode.get(j);
            String prefix = sectionPrefix + ".contentBlocks[" + j + "]";

            // Validate blockType
            JsonNode blockTypeNode = block.get("blockType");
            if (blockTypeNode == null || blockTypeNode.isNull() || !blockTypeNode.isTextual() || blockTypeNode.asText().isEmpty()) {
                errors.add(prefix + ".blockType: must be a non-empty string");
                continue;
            }

            // Check for duplicate block keys
            JsonNode keyNode = block.get("key");
            if (keyNode != null && keyNode.isTextual() && !keyNode.asText().isEmpty()) {
                String blockKey = keyNode.asText();
                if (!blockKeys.add(blockKey)) {
                    errors.add("Duplicate content block key '" + blockKey + "' in section '" + (sectionKey != null ? sectionKey : "unknown") + "'");
                }
            }

            String blockType = blockTypeNode.asText();
            switch (blockType) {
                case "metric" -> errors.add(prefix + ".blockType: 'metric' blocks are not supported in Change View definitions");
                case "text" -> validateTextBlock(block, prefix, errors);
                case "table" -> validateTableBlock(block, prefix, errors);
                default -> errors.add(prefix + ".blockType: unsupported block type '" + blockType + "'");
            }
        }
    }

    private void validateTextBlock(JsonNode block, String prefix, List<String> errors) {
        // Required: key
        JsonNode keyNode = block.get("key");
        if (keyNode == null || keyNode.isNull() || !keyNode.isTextual() || keyNode.asText().isEmpty()) {
            errors.add(prefix + ".key: must be a non-empty string");
        }

        // Required: content
        JsonNode contentNode = block.get("content");
        if (contentNode == null || contentNode.isNull() || !contentNode.isTextual() || contentNode.asText().isEmpty()) {
            errors.add(prefix + ".content: must be a non-empty string");
        }
    }

    private void validateTableBlock(JsonNode block, String prefix, List<String> errors) {
        // Required: key
        JsonNode keyNode = block.get("key");
        if (keyNode == null || keyNode.isNull() || !keyNode.isTextual() || keyNode.asText().isEmpty()) {
            errors.add(prefix + ".key: must be a non-empty string");
        }

        // Required: label
        JsonNode labelNode = block.get("label");
        if (labelNode == null || labelNode.isNull() || !labelNode.isTextual() || labelNode.asText().isEmpty()) {
            errors.add(prefix + ".label: must be a non-empty string");
        }

        // Required: rowColumns (non-empty array)
        JsonNode rowColumnsNode = block.get("rowColumns");
        if (rowColumnsNode == null || rowColumnsNode.isNull()) {
            errors.add(prefix + ".rowColumns: must be present");
        } else if (!rowColumnsNode.isArray()) {
            errors.add(prefix + ".rowColumns: must be a non-empty array");
        } else if (rowColumnsNode.isEmpty()) {
            errors.add(prefix + ".rowColumns: must be a non-empty array");
        } else {
            for (int rc = 0; rc < rowColumnsNode.size(); rc++) {
                JsonNode rcNode = rowColumnsNode.get(rc);
                String rcPrefix = prefix + ".rowColumns[" + rc + "]";

                JsonNode rcKeyNode = rcNode.get("key");
                if (rcKeyNode == null || rcKeyNode.isNull() || !rcKeyNode.isTextual() || rcKeyNode.asText().isEmpty()) {
                    errors.add(rcPrefix + ".key: must be a non-empty string");
                }

                JsonNode rcHeaderNode = rcNode.get("header");
                if (rcHeaderNode == null || rcHeaderNode.isNull() || !rcHeaderNode.isTextual() || rcHeaderNode.asText().isEmpty()) {
                    errors.add(rcPrefix + ".header: must be a non-empty string");
                }
            }
        }

        // Required: columnGroups (non-empty array)
        JsonNode columnGroupsNode = block.get("columnGroups");
        if (columnGroupsNode == null || columnGroupsNode.isNull()) {
            errors.add(prefix + ".columnGroups: must be present");
        } else if (!columnGroupsNode.isArray()) {
            errors.add(prefix + ".columnGroups: must be a non-empty array");
        } else if (columnGroupsNode.isEmpty()) {
            errors.add(prefix + ".columnGroups: must be a non-empty array");
        } else {
            for (int g = 0; g < columnGroupsNode.size(); g++) {
                JsonNode groupNode = columnGroupsNode.get(g);
                String groupPrefix = prefix + ".columnGroups[" + g + "]";

                JsonNode groupLabelNode = groupNode.get("groupLabel");
                if (groupLabelNode == null || groupLabelNode.isNull() || !groupLabelNode.isTextual() || groupLabelNode.asText().isEmpty()) {
                    errors.add(groupPrefix + ".groupLabel: must be a non-empty string");
                }

                JsonNode columnsNode = groupNode.get("columns");
                if (columnsNode == null || columnsNode.isNull()) {
                    errors.add(groupPrefix + ".columns: must be present");
                } else if (!columnsNode.isArray()) {
                    errors.add(groupPrefix + ".columns: must be a non-empty array");
                } else if (columnsNode.isEmpty()) {
                    errors.add(groupPrefix + ".columns: must be a non-empty array");
                } else {
                    for (int c = 0; c < columnsNode.size(); c++) {
                        JsonNode colNode = columnsNode.get(c);
                        String colPrefix = groupPrefix + ".columns[" + c + "]";

                        JsonNode colKeyNode = colNode.get("key");
                        if (colKeyNode == null || colKeyNode.isNull() || !colKeyNode.isTextual() || colKeyNode.asText().isEmpty()) {
                            errors.add(colPrefix + ".key: must be a non-empty string");
                        }

                        JsonNode colHeaderNode = colNode.get("header");
                        if (colHeaderNode == null || colHeaderNode.isNull() || !colHeaderNode.isTextual() || colHeaderNode.asText().isEmpty()) {
                            errors.add(colPrefix + ".header: must be a non-empty string");
                        }
                    }
                }
            }
        }

        // Optional: rows
        JsonNode rowsNode = block.get("rows");
        if (rowsNode != null && !rowsNode.isNull()) {
            if (!rowsNode.isArray()) {
                errors.add(prefix + ".rows: must be an array");
            } else {
                for (int r = 0; r < rowsNode.size(); r++) {
                    JsonNode rowNode = rowsNode.get(r);
                    String rowPrefix = prefix + ".rows[" + r + "]";

                    // Required: rowId
                    JsonNode rowIdNode = rowNode.get("rowId");
                    if (rowIdNode == null || rowIdNode.isNull() || !rowIdNode.isTextual() || rowIdNode.asText().isEmpty()) {
                        errors.add(rowPrefix + ".rowId: must be a non-empty string");
                    }

                    // Required: cells (object)
                    JsonNode cellsNode = rowNode.get("cells");
                    if (cellsNode == null || cellsNode.isNull()) {
                        errors.add(rowPrefix + ".cells: must be present");
                    } else if (!cellsNode.isObject()) {
                        errors.add(rowPrefix + ".cells: must be an object");
                    } else {
                        // Validate each cell
                        var fieldNames = cellsNode.fieldNames();
                        while (fieldNames.hasNext()) {
                            String fieldName = fieldNames.next();
                            JsonNode cellNode = cellsNode.get(fieldName);
                            String cellPrefix = rowPrefix + ".cells." + fieldName;

                            if (!cellNode.isObject()) {
                                errors.add(cellPrefix + ": must be an object");
                            } else {
                                // Required: value
                                JsonNode valueNode = cellNode.get("value");
                                if (valueNode == null || valueNode.isNull()) {
                                    errors.add(cellPrefix + ".value: must be present");
                                }

                                // Optional: formatToken
                                JsonNode formatTokenNode = cellNode.get("formatToken");
                                if (formatTokenNode != null && !formatTokenNode.isNull()) {
                                    if (!formatTokenNode.isTextual() || !VALID_FORMAT_TOKENS.contains(formatTokenNode.asText())) {
                                        errors.add(cellPrefix + ".formatToken: must be one of [positive, warning, negative, neutral], got '" + formatTokenNode.asText() + "'");
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ========================================================================
    // DELTA_BY_UNIQUE_ID validation
    // ========================================================================

    private void validateDeltaByUniqueIdDefinition(JsonNode root, List<String> errors) {
        // Validate dataTypes array: required, non-empty
        JsonNode dataTypesNode = root.get("dataTypes");
        if (dataTypesNode == null || dataTypesNode.isNull()) {
            errors.add("dataTypes: must be present");
            return;
        }
        if (!dataTypesNode.isArray()) {
            errors.add("dataTypes: must be a non-empty array");
            return;
        }
        if (dataTypesNode.isEmpty()) {
            errors.add("dataTypes: must be a non-empty array");
            return;
        }

        Set<String> allDataTypeIds = new HashSet<>();

        for (int i = 0; i < dataTypesNode.size(); i++) {
            JsonNode dataType = dataTypesNode.get(i);
            String prefix = "dataTypes[" + i + "]";

            // Validate dataTypeId (required string, unique across template)
            JsonNode dataTypeIdNode = dataType.get("dataTypeId");
            String dataTypeId = null;
            if (dataTypeIdNode == null || dataTypeIdNode.isNull() || !dataTypeIdNode.isTextual() || dataTypeIdNode.asText().isEmpty()) {
                errors.add(prefix + ".dataTypeId: must be a non-empty string");
            } else {
                dataTypeId = dataTypeIdNode.asText();
                if (!allDataTypeIds.add(dataTypeId)) {
                    errors.add("Duplicate dataTypeId: '" + dataTypeId + "'");
                }
            }

            // Validate dataTypeTitle (required string)
            JsonNode dataTypeTitleNode = dataType.get("dataTypeTitle");
            if (dataTypeTitleNode == null || dataTypeTitleNode.isNull() || !dataTypeTitleNode.isTextual() || dataTypeTitleNode.asText().isEmpty()) {
                errors.add(prefix + ".dataTypeTitle: must be a non-empty string");
            }

            // Validate headerSummaryTextTemplate (optional string; only specific placeholders allowed)
            JsonNode headerSummaryNode = dataType.get("headerSummaryTextTemplate");
            if (headerSummaryNode != null && !headerSummaryNode.isNull()) {
                if (!headerSummaryNode.isTextual()) {
                    errors.add(prefix + ".headerSummaryTextTemplate: must be a string");
                } else {
                    String template = headerSummaryNode.asText();
                    Matcher matcher = PLACEHOLDER_PATTERN.matcher(template);
                    while (matcher.find()) {
                        String placeholder = matcher.group(1);
                        if (!VALID_PLACEHOLDERS.contains(placeholder)) {
                            errors.add(prefix + ".headerSummaryTextTemplate: invalid placeholder '${" + placeholder + "}'; allowed placeholders are ${changedValuesCount} and ${changedEntitiesCount}");
                        }
                    }
                }
            }

            // Validate columnDefinitions: non-empty array
            JsonNode columnDefsNode = dataType.get("columnDefinitions");
            Set<String> dataAttributes = new HashSet<>();
            if (columnDefsNode == null || columnDefsNode.isNull()) {
                errors.add(prefix + ".columnDefinitions: must be present");
            } else if (!columnDefsNode.isArray()) {
                errors.add(prefix + ".columnDefinitions: must be a non-empty array");
            } else if (columnDefsNode.isEmpty()) {
                errors.add(prefix + ".columnDefinitions: must be a non-empty array");
            } else {
                int entityIdCount = 0;

                for (int j = 0; j < columnDefsNode.size(); j++) {
                    JsonNode colDef = columnDefsNode.get(j);
                    String colPrefix = prefix + ".columnDefinitions[" + j + "]";

                    // Required: dataAttribute (unique within dataType)
                    JsonNode dataAttributeNode = colDef.get("dataAttribute");
                    if (dataAttributeNode == null || dataAttributeNode.isNull() || !dataAttributeNode.isTextual() || dataAttributeNode.asText().isEmpty()) {
                        errors.add(colPrefix + ".dataAttribute: must be a non-empty string");
                    } else {
                        String dataAttribute = dataAttributeNode.asText();
                        if (!dataAttributes.add(dataAttribute)) {
                            errors.add(colPrefix + ".dataAttribute: duplicate value '" + dataAttribute + "' within dataType" + (dataTypeId != null ? " '" + dataTypeId + "'" : ""));
                        }
                    }

                    // Required: type (one of: string, number, date, boolean)
                    JsonNode typeNode = colDef.get("type");
                    if (typeNode == null || typeNode.isNull() || !typeNode.isTextual() || typeNode.asText().isEmpty()) {
                        errors.add(colPrefix + ".type: must be a non-empty string");
                    } else if (!VALID_COLUMN_TYPES.contains(typeNode.asText())) {
                        errors.add(colPrefix + ".type: must be one of [string, number, date, boolean], got '" + typeNode.asText() + "'");
                    }

                    // Required: display
                    JsonNode displayNode = colDef.get("display");
                    if (displayNode == null || displayNode.isNull() || !displayNode.isTextual() || displayNode.asText().isEmpty()) {
                        errors.add(colPrefix + ".display: must be a non-empty string");
                    }

                    // Optional: isEntityId (boolean)
                    JsonNode isEntityIdNode = colDef.get("isEntityId");
                    if (isEntityIdNode != null && !isEntityIdNode.isNull()) {
                        if (!isEntityIdNode.isBoolean()) {
                            errors.add(colPrefix + ".isEntityId: must be a boolean");
                        } else if (isEntityIdNode.asBoolean()) {
                            entityIdCount++;
                        }
                    }
                }

                // Exactly one column with isEntityId: true per dataType
                if (entityIdCount == 0) {
                    errors.add(prefix + ".columnDefinitions: exactly one column must have isEntityId: true");
                } else if (entityIdCount > 1) {
                    errors.add(prefix + ".columnDefinitions: exactly one column must have isEntityId: true, found " + entityIdCount);
                }
            }

            // Validate optional sortOrdering
            JsonNode sortOrderingNode = dataType.get("sortOrdering");
            if (sortOrderingNode != null && !sortOrderingNode.isNull()) {
                if (!sortOrderingNode.isObject()) {
                    errors.add(prefix + ".sortOrdering: must be an object");
                } else {
                    // dataAttribute must reference an existing columnDefinition
                    JsonNode sortDataAttrNode = sortOrderingNode.get("dataAttribute");
                    if (sortDataAttrNode == null || sortDataAttrNode.isNull() || !sortDataAttrNode.isTextual() || sortDataAttrNode.asText().isEmpty()) {
                        errors.add(prefix + ".sortOrdering.dataAttribute: must be a non-empty string");
                    } else if (!dataAttributes.contains(sortDataAttrNode.asText())) {
                        errors.add(prefix + ".sortOrdering.dataAttribute: '" + sortDataAttrNode.asText() + "' does not reference an existing columnDefinition");
                    }

                    // direction must be ASC or DESC
                    JsonNode directionNode = sortOrderingNode.get("direction");
                    if (directionNode == null || directionNode.isNull() || !directionNode.isTextual() || directionNode.asText().isEmpty()) {
                        errors.add(prefix + ".sortOrdering.direction: must be a non-empty string");
                    } else if (!VALID_SORT_DIRECTIONS.contains(directionNode.asText())) {
                        errors.add(prefix + ".sortOrdering.direction: must be 'ASC' or 'DESC', got '" + directionNode.asText() + "'");
                    }
                }
            }

            // Validate optional rowThreshold
            JsonNode rowThresholdNode = dataType.get("rowThreshold");
            if (rowThresholdNode != null && !rowThresholdNode.isNull()) {
                if (!rowThresholdNode.isInt() || rowThresholdNode.asInt() < 1) {
                    errors.add(prefix + ".rowThreshold: must be a positive integer");
                } else {
                    // overflowMessage required when rowThreshold is set
                    JsonNode overflowMessageNode = dataType.get("overflowMessage");
                    if (overflowMessageNode == null || overflowMessageNode.isNull() || !overflowMessageNode.isTextual() || overflowMessageNode.asText().isEmpty()) {
                        errors.add(prefix + ".overflowMessage: required when rowThreshold is set");
                    }
                }
            }
        }
    }
}
