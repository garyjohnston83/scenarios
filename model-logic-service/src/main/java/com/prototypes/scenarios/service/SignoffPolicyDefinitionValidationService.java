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
public class SignoffPolicyDefinitionValidationService {

    private static final Pattern POLICY_KEY_PATTERN = Pattern.compile("^[a-z0-9_]+$");
    private static final Pattern SCENARIO_TYPE_PATTERN = Pattern.compile("^[A-Z0-9_]+$");
    private static final Set<String> VALID_APPROVAL_MODES = Set.of("UNORDERED", "SEQUENTIAL");
    private static final Set<String> VALID_APPROVER_TYPES = Set.of("FIXED_ROLE", "DYNAMIC_ROLE");

    private final ObjectMapper objectMapper;

    public SignoffPolicyDefinitionValidationService(ObjectMapper objectMapper) {
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
        validateRules(root, errors);

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

        // Validate policy_key
        JsonNode policyKeyNode = root.get("policy_key");
        if (policyKeyNode == null || policyKeyNode.isNull()) {
            errors.add("policy_key: must be present");
        } else if (!policyKeyNode.isTextual() || policyKeyNode.asText().isEmpty()) {
            errors.add("policy_key: must be a non-empty string");
        } else if (!POLICY_KEY_PATTERN.matcher(policyKeyNode.asText()).matches()) {
            errors.add("policy_key: must match pattern [a-z0-9_]+, got '" + policyKeyNode.asText() + "'");
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
    }

    private void validateRules(JsonNode root, List<String> errors) {
        JsonNode rulesNode = root.get("rules");
        if (rulesNode == null || rulesNode.isNull()) {
            errors.add("rules: must be present");
            return;
        }
        if (!rulesNode.isArray()) {
            errors.add("rules: must be a non-empty array");
            return;
        }
        if (rulesNode.isEmpty()) {
            errors.add("rules: must be a non-empty array");
            return;
        }

        Set<String> ruleKeys = new HashSet<>();

        for (int i = 0; i < rulesNode.size(); i++) {
            JsonNode rule = rulesNode.get(i);
            String prefix = "rules[" + i + "]";

            // Validate rule_key
            JsonNode ruleKeyNode = rule.get("rule_key");
            if (ruleKeyNode == null || ruleKeyNode.isNull() || !ruleKeyNode.isTextual() || ruleKeyNode.asText().isEmpty()) {
                errors.add(prefix + ".rule_key: must be a non-empty string");
            } else {
                String ruleKey = ruleKeyNode.asText();
                if (!ruleKeys.add(ruleKey)) {
                    errors.add("Duplicate rule_key: '" + ruleKey + "'");
                }
            }

            // Validate name
            JsonNode nameNode = rule.get("name");
            if (nameNode == null || nameNode.isNull() || !nameNode.isTextual() || nameNode.asText().isEmpty()) {
                errors.add(prefix + ".name: must be a non-empty string");
            }

            // Validate priority
            JsonNode priorityNode = rule.get("priority");
            if (priorityNode == null || priorityNode.isNull()) {
                errors.add(prefix + ".priority: must be present");
            } else if (!priorityNode.isInt()) {
                errors.add(prefix + ".priority: must be an integer >= 1");
            } else if (priorityNode.asInt() < 1) {
                errors.add(prefix + ".priority: must be an integer >= 1, got " + priorityNode.asInt());
            }

            // Validate is_enabled
            JsonNode isEnabledNode = rule.get("is_enabled");
            if (isEnabledNode == null || isEnabledNode.isNull()) {
                errors.add(prefix + ".is_enabled: must be present");
            } else if (!isEnabledNode.isBoolean()) {
                errors.add(prefix + ".is_enabled: must be a boolean");
            }

            // Validate condition
            JsonNode conditionNode = rule.get("condition");
            if (conditionNode == null || conditionNode.isNull()) {
                errors.add(prefix + ".condition: must be present");
            } else {
                validateCondition(conditionNode, prefix + ".condition", errors);
            }

            // Validate effect
            JsonNode effectNode = rule.get("effect");
            if (effectNode == null || effectNode.isNull()) {
                errors.add(prefix + ".effect: must be present");
            } else {
                validateEffect(effectNode, prefix + ".effect", errors);
            }
        }
    }

    private void validateCondition(JsonNode conditionNode, String prefix, List<String> errors) {
        // Determine node type from the JSON structure
        JsonNode typeNode = conditionNode.get("type");
        if (typeNode == null || typeNode.isNull() || !typeNode.isTextual() || typeNode.asText().isEmpty()) {
            errors.add(prefix + ".type: must be a non-empty string ('GROUP' or 'FACT')");
            return;
        }

        String type = typeNode.asText();
        switch (type) {
            case "GROUP" -> validateGroupNode(conditionNode, prefix, errors);
            case "FACT" -> validateFactNode(conditionNode, prefix, errors);
            default -> errors.add(prefix + ".type: must be 'GROUP' or 'FACT', got '" + type + "'");
        }
    }

    private void validateGroupNode(JsonNode groupNode, String prefix, List<String> errors) {
        // Validate operator
        JsonNode operatorNode = groupNode.get("operator");
        if (operatorNode == null || operatorNode.isNull() || !operatorNode.isTextual() || operatorNode.asText().isEmpty()) {
            errors.add(prefix + ".operator: must be 'AND' or 'OR'");
        } else {
            String operator = operatorNode.asText();
            if (!"AND".equals(operator) && !"OR".equals(operator)) {
                errors.add(prefix + ".operator: must be 'AND' or 'OR', got '" + operator + "'");
            }
        }

        // Validate children
        JsonNode childrenNode = groupNode.get("children");
        if (childrenNode == null || childrenNode.isNull()) {
            errors.add(prefix + ".children: must be a non-empty array");
            return;
        }
        if (!childrenNode.isArray()) {
            errors.add(prefix + ".children: must be a non-empty array");
            return;
        }
        if (childrenNode.isEmpty()) {
            errors.add(prefix + ".children: must be a non-empty array");
            return;
        }

        // Recursively validate each child
        for (int i = 0; i < childrenNode.size(); i++) {
            validateCondition(childrenNode.get(i), prefix + ".children[" + i + "]", errors);
        }
    }

    private void validateFactNode(JsonNode factNode, String prefix, List<String> errors) {
        // Validate factType
        JsonNode factTypeNode = factNode.get("factType");
        if (factTypeNode == null || factTypeNode.isNull() || !factTypeNode.isTextual() || factTypeNode.asText().isEmpty()) {
            errors.add(prefix + ".factType: must be a non-empty string");
        }

        // Validate operator
        JsonNode operatorNode = factNode.get("operator");
        if (operatorNode == null || operatorNode.isNull() || !operatorNode.isTextual() || operatorNode.asText().isEmpty()) {
            errors.add(prefix + ".operator: must be a non-empty string");
        }

        // Validate value (must be present and non-null)
        JsonNode valueNode = factNode.get("value");
        if (valueNode == null || valueNode.isNull()) {
            errors.add(prefix + ".value: must be present");
        }
    }

    private void validateEffect(JsonNode effectNode, String prefix, List<String> errors) {
        // Validate requiredApproverCount
        JsonNode countNode = effectNode.get("requiredApproverCount");
        if (countNode == null || countNode.isNull()) {
            errors.add(prefix + ".requiredApproverCount: must be present");
        } else if (!countNode.isInt()) {
            errors.add(prefix + ".requiredApproverCount: must be an integer >= 1");
        } else if (countNode.asInt() < 1) {
            errors.add(prefix + ".requiredApproverCount: must be an integer >= 1, got " + countNode.asInt());
        }

        // Validate approvalMode
        JsonNode modeNode = effectNode.get("approvalMode");
        if (modeNode == null || modeNode.isNull() || !modeNode.isTextual() || modeNode.asText().isEmpty()) {
            errors.add(prefix + ".approvalMode: must be 'UNORDERED' or 'SEQUENTIAL'");
        } else if (!VALID_APPROVAL_MODES.contains(modeNode.asText())) {
            errors.add(prefix + ".approvalMode: must be 'UNORDERED' or 'SEQUENTIAL', got '" + modeNode.asText() + "'");
        }

        // Validate approvers
        JsonNode approversNode = effectNode.get("approvers");
        if (approversNode == null || approversNode.isNull()) {
            errors.add(prefix + ".approvers: must be a non-empty array");
            return;
        }
        if (!approversNode.isArray()) {
            errors.add(prefix + ".approvers: must be a non-empty array");
            return;
        }
        if (approversNode.isEmpty()) {
            errors.add(prefix + ".approvers: must be a non-empty array");
            return;
        }

        for (int i = 0; i < approversNode.size(); i++) {
            JsonNode approver = approversNode.get(i);
            String approverPrefix = prefix + ".approvers[" + i + "]";

            // Validate type
            JsonNode typeNode = approver.get("type");
            if (typeNode == null || typeNode.isNull() || !typeNode.isTextual() || typeNode.asText().isEmpty()) {
                errors.add(approverPrefix + ".type: must be 'FIXED_ROLE' or 'DYNAMIC_ROLE'");
            } else if (!VALID_APPROVER_TYPES.contains(typeNode.asText())) {
                errors.add(approverPrefix + ".type: must be 'FIXED_ROLE' or 'DYNAMIC_ROLE', got '" + typeNode.asText() + "'");
            }

            // Validate roleKey
            JsonNode roleKeyNode = approver.get("roleKey");
            if (roleKeyNode == null || roleKeyNode.isNull() || !roleKeyNode.isTextual() || roleKeyNode.asText().isEmpty()) {
                errors.add(approverPrefix + ".roleKey: must be a non-empty string");
            }
        }
    }
}
