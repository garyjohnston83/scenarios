package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class ReportDefinitionValidationService {

    private static final Logger logger = LoggerFactory.getLogger(ReportDefinitionValidationService.class);

    private static final Pattern REPORT_KEY_PATTERN = Pattern.compile("^[a-z0-9_]+$");
    private static final Pattern SCENARIO_TYPE_PATTERN = Pattern.compile("^[A-Z0-9_]+$");
    private static final Set<String> VALID_FORMATS = Set.of("number", "currency", "percentage", "text");
    private static final Set<String> VALID_FORMAT_TOKENS = Set.of("positive", "warning", "negative", "neutral");

    private final ObjectMapper objectMapper;

    public ReportDefinitionValidationService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<String> validate(String definitionJson) {
        logger.debug("validate: parsing report definition JSON");
        JsonNode root;
        try {
            root = objectMapper.readTree(definitionJson);
        } catch (JsonProcessingException e) {
            logger.warn("validate: invalid JSON input: {}", e.getMessage());
            return List.of("Invalid JSON: " + e.getMessage());
        }

        List<String> errors = new ArrayList<>();

        // Validate schema_version
        JsonNode schemaVersionNode = root.get("schema_version");
        if (schemaVersionNode == null || schemaVersionNode.isNull()) {
            errors.add("schema_version: must be present");
        } else if (!schemaVersionNode.isTextual()) {
            errors.add("schema_version: must be a string");
        } else if (!"1.0".equals(schemaVersionNode.asText())) {
            errors.add("schema_version: must be '1.0', got '" + schemaVersionNode.asText() + "'");
        }

        // Validate report_key
        JsonNode reportKeyNode = root.get("report_key");
        if (reportKeyNode == null || reportKeyNode.isNull()) {
            errors.add("report_key: must be present");
        } else if (!reportKeyNode.isTextual() || reportKeyNode.asText().isEmpty()) {
            errors.add("report_key: must be a non-empty string");
        } else if (!REPORT_KEY_PATTERN.matcher(reportKeyNode.asText()).matches()) {
            errors.add("report_key: must match pattern [a-z0-9_]+, got '" + reportKeyNode.asText() + "'");
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

        // Validate sections
        JsonNode sectionsNode = root.get("sections");
        if (sectionsNode == null || sectionsNode.isNull()) {
            errors.add("sections: must be present");
        } else if (!sectionsNode.isArray()) {
            errors.add("sections: must be a non-empty array");
        } else if (sectionsNode.isEmpty()) {
            errors.add("sections: must be a non-empty array");
        } else {
            validateSections(sectionsNode, errors);
        }

        if (!errors.isEmpty()) {
            logger.warn("validate: report definition validation failed with {} error(s)", errors.size());
        }

        return errors;
    }

    private void validateSections(JsonNode sectionsNode, List<String> errors) {
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

            // Detect section format: contentBlocks or metrics
            JsonNode contentBlocksNode = section.get("contentBlocks");
            JsonNode metricsNode = section.get("metrics");

            if (contentBlocksNode != null && contentBlocksNode.isArray()) {
                // Format B: contentBlocks
                if (contentBlocksNode.isEmpty()) {
                    errors.add(prefix + ".contentBlocks: must be a non-empty array");
                } else {
                    validateContentBlocks(contentBlocksNode, prefix, sectionKey, errors);
                }
            } else if (metricsNode != null && !metricsNode.isNull()) {
                // Format A: metrics (backward compatibility)
                if (!metricsNode.isArray()) {
                    errors.add(prefix + ".metrics: must be a non-empty array");
                } else if (metricsNode.isEmpty()) {
                    errors.add(prefix + ".metrics: must be a non-empty array");
                } else {
                    validateMetrics(metricsNode, prefix, sectionKey, errors);
                }
            } else {
                errors.add(prefix + ": must have either 'metrics' or 'contentBlocks' array");
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
                case "metric" -> validateMetricBlock(block, prefix, errors);
                case "text" -> validateTextBlock(block, prefix, errors);
                case "table" -> validateTableBlock(block, prefix, errors);
                default -> errors.add(prefix + ".blockType: unknown block type '" + blockType + "', must be one of [metric, text, table]");
            }
        }
    }

    private void validateMetricBlock(JsonNode block, String prefix, List<String> errors) {
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

        // Required: source_field
        JsonNode sourceFieldNode = block.get("source_field");
        if (sourceFieldNode == null || sourceFieldNode.isNull() || !sourceFieldNode.isTextual() || sourceFieldNode.asText().isEmpty()) {
            errors.add(prefix + ".source_field: must be a non-empty string");
        }

        // Required: format
        JsonNode formatNode = block.get("format");
        if (formatNode == null || formatNode.isNull()) {
            errors.add(prefix + ".format: must be present");
        } else if (!formatNode.isTextual()) {
            errors.add(prefix + ".format: must be one of [number, currency, percentage, text]");
        } else if (!VALID_FORMATS.contains(formatNode.asText())) {
            errors.add(prefix + ".format: must be one of [number, currency, percentage, text], got '" + formatNode.asText() + "'");
        }

        // Optional: formatRules
        JsonNode formatRulesNode = block.get("formatRules");
        if (formatRulesNode != null && !formatRulesNode.isNull()) {
            if (!formatRulesNode.isArray()) {
                errors.add(prefix + ".formatRules: must be an array");
            } else {
                for (int r = 0; r < formatRulesNode.size(); r++) {
                    JsonNode rule = formatRulesNode.get(r);
                    String rulePrefix = prefix + ".formatRules[" + r + "]";

                    // Required: token
                    JsonNode tokenNode = rule.get("token");
                    if (tokenNode == null || tokenNode.isNull() || !tokenNode.isTextual() || tokenNode.asText().isEmpty()) {
                        errors.add(rulePrefix + ".token: must be a non-empty string");
                    }

                    // Optional: min (nullable number)
                    JsonNode minNode = rule.get("min");
                    if (minNode != null && !minNode.isNull() && !minNode.isNumber()) {
                        errors.add(rulePrefix + ".min: must be a number or null");
                    }

                    // Optional: max (nullable number)
                    JsonNode maxNode = rule.get("max");
                    if (maxNode != null && !maxNode.isNull() && !maxNode.isNumber()) {
                        errors.add(rulePrefix + ".max: must be a number or null");
                    }
                }
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
                if (groupLabelNode == null || groupLabelNode.isNull() || !groupLabelNode.isTextual()) {
                    errors.add(groupPrefix + ".groupLabel: must be a string (empty string allowed for ungrouped columns)");
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

        // Reject rows in template definition — rows are data, not template.
        // Row data should be stored in sample_data instead.
        JsonNode rowsNode = block.get("rows");
        if (rowsNode != null && !rowsNode.isNull()) {
            errors.add(prefix + ".rows: rows are not allowed in the template definition; use sample data instead");
        }
    }

    private void validateMetrics(JsonNode metricsNode, String sectionPrefix, String sectionKey, List<String> errors) {
        Set<String> metricKeys = new HashSet<>();

        for (int j = 0; j < metricsNode.size(); j++) {
            JsonNode metric = metricsNode.get(j);
            String prefix = sectionPrefix + ".metrics[" + j + "]";

            // Validate metric key
            JsonNode keyNode = metric.get("key");
            if (keyNode == null || keyNode.isNull() || !keyNode.isTextual() || keyNode.asText().isEmpty()) {
                errors.add(prefix + ".key: must be a non-empty string");
            } else {
                String metricKey = keyNode.asText();
                if (!metricKeys.add(metricKey)) {
                    errors.add("Duplicate metric key '" + metricKey + "' in section '" + (sectionKey != null ? sectionKey : "unknown") + "'");
                }
            }

            // Validate metric label
            JsonNode labelNode = metric.get("label");
            if (labelNode == null || labelNode.isNull() || !labelNode.isTextual() || labelNode.asText().isEmpty()) {
                errors.add(prefix + ".label: must be a non-empty string");
            }

            // Validate metric source_field
            JsonNode sourceFieldNode = metric.get("source_field");
            if (sourceFieldNode == null || sourceFieldNode.isNull() || !sourceFieldNode.isTextual() || sourceFieldNode.asText().isEmpty()) {
                errors.add(prefix + ".source_field: must be a non-empty string");
            }

            // Validate metric format
            JsonNode formatNode = metric.get("format");
            if (formatNode == null || formatNode.isNull()) {
                errors.add(prefix + ".format: must be present");
            } else if (!formatNode.isTextual()) {
                errors.add(prefix + ".format: must be one of [number, currency, percentage, text]");
            } else if (!VALID_FORMATS.contains(formatNode.asText())) {
                errors.add(prefix + ".format: must be one of [number, currency, percentage, text], got '" + formatNode.asText() + "'");
            }
        }
    }
}
