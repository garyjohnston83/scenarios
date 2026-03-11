package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class ReportDefinitionValidationService {

    private static final Pattern REPORT_KEY_PATTERN = Pattern.compile("^[a-z0-9_]+$");
    private static final Pattern SCENARIO_TYPE_PATTERN = Pattern.compile("^[A-Z0-9_]+$");
    private static final Set<String> VALID_FORMATS = Set.of("number", "currency", "percentage", "text");

    private final ObjectMapper objectMapper;

    public ReportDefinitionValidationService(ObjectMapper objectMapper) {
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

            // Validate metrics array
            JsonNode metricsNode = section.get("metrics");
            if (metricsNode == null || metricsNode.isNull()) {
                errors.add(prefix + ".metrics: must be present");
            } else if (!metricsNode.isArray()) {
                errors.add(prefix + ".metrics: must be a non-empty array");
            } else if (metricsNode.isEmpty()) {
                errors.add(prefix + ".metrics: must be a non-empty array");
            } else {
                validateMetrics(metricsNode, prefix, sectionKey, errors);
            }
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
