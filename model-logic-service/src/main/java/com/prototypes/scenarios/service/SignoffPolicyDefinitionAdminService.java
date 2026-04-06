package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.CreateSignoffPolicyDefinitionRequest;
import com.prototypes.scenarios.dto.RuleSummaryDto;
import com.prototypes.scenarios.dto.SignoffPolicyDefinitionDetailDto;
import com.prototypes.scenarios.dto.SignoffPolicyDefinitionListItemDto;
import com.prototypes.scenarios.entity.SignoffPolicyDefinition;
import com.prototypes.scenarios.repository.SignoffPolicyDefinitionRepository;
import com.prototypes.scenarios.repository.ScenarioTypeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SignoffPolicyDefinitionAdminService {

    private static final Logger logger = LoggerFactory.getLogger(SignoffPolicyDefinitionAdminService.class);

    private final SignoffPolicyDefinitionRepository signoffPolicyDefinitionRepository;
    private final SignoffPolicyDefinitionValidationService validationService;
    private final ScenarioTypeRepository scenarioTypeRepository;
    private final ObjectMapper objectMapper;

    public SignoffPolicyDefinitionAdminService(SignoffPolicyDefinitionRepository signoffPolicyDefinitionRepository,
                                               SignoffPolicyDefinitionValidationService validationService,
                                               ScenarioTypeRepository scenarioTypeRepository,
                                               ObjectMapper objectMapper) {
        this.signoffPolicyDefinitionRepository = signoffPolicyDefinitionRepository;
        this.validationService = validationService;
        this.scenarioTypeRepository = scenarioTypeRepository;
        this.objectMapper = objectMapper;
    }

    // ========================================================================
    // Public operations
    // ========================================================================

    /**
     * Lists all signoff policy definitions (active and inactive) for a scenario type,
     * ordered by policyKey ascending then version descending.
     */
    public List<SignoffPolicyDefinitionListItemDto> listDefinitions(String scenarioTypeCode) {
        logger.info("listDefinitions scenarioTypeCode={}", scenarioTypeCode);
        if (!scenarioTypeRepository.existsById(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Scenario type not found: " + scenarioTypeCode);
        }

        return signoffPolicyDefinitionRepository
                .findAllByScenarioTypeCodeOrderByPolicyKeyAscVersionDesc(scenarioTypeCode)
                .stream()
                .map(this::toListItemDto)
                .toList();
    }

    /**
     * Gets a single signoff policy definition by ID.
     */
    public SignoffPolicyDefinitionDetailDto getDefinition(UUID id) {
        logger.info("getDefinition id={}", id);
        SignoffPolicyDefinition entity = signoffPolicyDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Signoff policy definition not found: " + id));
        return toDetailDto(entity);
    }

    /**
     * Creates a new signoff policy definition with validation, version computation,
     * and retry on concurrent version conflict.
     */
    public SignoffPolicyDefinitionDetailDto createDefinition(String scenarioTypeCode,
                                                              CreateSignoffPolicyDefinitionRequest request) {
        logger.info("createDefinition scenarioTypeCode={} policyKey={}", scenarioTypeCode, request.policyKey());
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

        // 3. Extract scenario_type and policy_key from JSON to enforce consistency
        JsonNode root;
        try {
            root = objectMapper.readTree(request.definition());
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Invalid JSON: " + e.getMessage());
        }

        String jsonScenarioType = root.has("scenario_type") ? root.get("scenario_type").asText() : null;
        String jsonPolicyKey = root.has("policy_key") ? root.get("policy_key").asText() : null;

        if (jsonScenarioType != null && !jsonScenarioType.equals(scenarioTypeCode)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "scenario_type in JSON ('" + jsonScenarioType + "') does not match path parameter ('" + scenarioTypeCode + "')");
        }

        if (jsonPolicyKey != null && !jsonPolicyKey.equals(request.policyKey())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "policy_key in JSON ('" + jsonPolicyKey + "') does not match request body policyKey ('" + request.policyKey() + "')");
        }

        // 4. Compute next version
        Optional<Integer> maxVersion = signoffPolicyDefinitionRepository.findMaxVersion(
                scenarioTypeCode, request.policyKey());
        int nextVersion = maxVersion.orElse(0) + 1;

        // 5. Build entity
        SignoffPolicyDefinition entity = buildEntity(scenarioTypeCode, request, nextVersion);

        // 6. Save with optimistic concurrency retry
        try {
            SignoffPolicyDefinition saved = signoffPolicyDefinitionRepository.save(entity);
            return toDetailDto(saved);
        } catch (DataIntegrityViolationException e) {
            // Retry: re-query max version, recompute, and save (up to 2 more attempts)
            for (int attempt = 0; attempt < 2; attempt++) {
                try {
                    Optional<Integer> retryMaxVersion = signoffPolicyDefinitionRepository.findMaxVersion(
                            scenarioTypeCode, request.policyKey());
                    int retryNextVersion = retryMaxVersion.orElse(0) + 1;

                    SignoffPolicyDefinition retryEntity = buildEntity(scenarioTypeCode, request, retryNextVersion);
                    SignoffPolicyDefinition saved = signoffPolicyDefinitionRepository.save(retryEntity);
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
     * Activates a signoff policy definition. Auto-deactivates any currently active definition
     * of the same (scenarioTypeCode, policyKey) combination.
     */
    @Transactional
    public SignoffPolicyDefinitionDetailDto activateDefinition(UUID id) {
        logger.info("activateDefinition id={}", id);
        SignoffPolicyDefinition definition = signoffPolicyDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Signoff policy definition not found: " + id));

        // Find currently active definition for the same (scenarioTypeCode, policyKey)
        Optional<SignoffPolicyDefinition> currentlyActive =
                signoffPolicyDefinitionRepository.findFirstByScenarioTypeCodeAndPolicyKeyAndIsActiveTrueOrderByVersionDesc(
                        definition.getScenarioTypeCode(), definition.getPolicyKey());

        if (currentlyActive.isPresent() && !currentlyActive.get().getId().equals(id)) {
            SignoffPolicyDefinition activeDefinition = currentlyActive.get();
            activeDefinition.setActive(false);
            activeDefinition.setUpdatedAt(LocalDateTime.now());
            signoffPolicyDefinitionRepository.save(activeDefinition);
        }

        definition.setActive(true);
        definition.setUpdatedAt(LocalDateTime.now());
        SignoffPolicyDefinition saved = signoffPolicyDefinitionRepository.save(definition);
        return toDetailDto(saved);
    }

    /**
     * Deactivates a signoff policy definition.
     */
    public SignoffPolicyDefinitionDetailDto deactivateDefinition(UUID id) {
        logger.info("deactivateDefinition id={}", id);
        SignoffPolicyDefinition definition = signoffPolicyDefinitionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Signoff policy definition not found: " + id));

        definition.setActive(false);
        definition.setUpdatedAt(LocalDateTime.now());
        SignoffPolicyDefinition saved = signoffPolicyDefinitionRepository.save(definition);
        return toDetailDto(saved);
    }

    // ========================================================================
    // Private helpers: entity building
    // ========================================================================

    private SignoffPolicyDefinition buildEntity(String scenarioTypeCode,
                                                 CreateSignoffPolicyDefinitionRequest request,
                                                 int version) {
        SignoffPolicyDefinition entity = new SignoffPolicyDefinition();
        entity.setId(UUID.randomUUID());
        entity.setScenarioTypeCode(scenarioTypeCode);
        entity.setPolicyKey(request.policyKey());
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
     * Maps a SignoffPolicyDefinition entity to SignoffPolicyDefinitionListItemDto.
     * Extracts displayName from the definition JSON; falls back to policyKey on parse failure.
     */
    private SignoffPolicyDefinitionListItemDto toListItemDto(SignoffPolicyDefinition entity) {
        String displayName = entity.getPolicyKey(); // fallback
        try {
            JsonNode root = objectMapper.readTree(entity.getDefinition());
            JsonNode displayNameNode = root.get("display_name");
            if (displayNameNode != null && displayNameNode.isTextual() && !displayNameNode.asText().isEmpty()) {
                displayName = displayNameNode.asText();
            }
        } catch (JsonProcessingException e) {
            logger.warn("Failed to parse definition JSON for displayName extraction, falling back to policyKey: {}",
                    entity.getPolicyKey());
        }

        return new SignoffPolicyDefinitionListItemDto(
                entity.getId(),
                entity.getScenarioTypeCode(),
                entity.getPolicyKey(),
                displayName,
                entity.getVersion(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    /**
     * Maps a SignoffPolicyDefinition entity to SignoffPolicyDefinitionDetailDto.
     * Extracts displayName, schemaVersion, and generates ruleSummaries from the definition JSON.
     */
    private SignoffPolicyDefinitionDetailDto toDetailDto(SignoffPolicyDefinition entity) {
        String displayName = entity.getPolicyKey(); // fallback
        String schemaVersion = null;
        List<RuleSummaryDto> ruleSummaries = Collections.emptyList();

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

            // Generate rule summaries from the rules array
            ruleSummaries = generateRuleSummaries(root);
        } catch (JsonProcessingException e) {
            logger.warn("Failed to parse definition JSON for DTO extraction, falling back to policyKey: {}",
                    entity.getPolicyKey());
        }

        return new SignoffPolicyDefinitionDetailDto(
                entity.getId(),
                entity.getScenarioTypeCode(),
                entity.getPolicyKey(),
                displayName,
                entity.getVersion(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getDefinition(),
                schemaVersion,
                ruleSummaries
        );
    }

    // ========================================================================
    // Private helpers: rule summary generation
    // ========================================================================

    /**
     * Walks the definition JSON to build a list of RuleSummaryDto for each rule
     * in the rules array. Handles JSON parse failures gracefully by returning
     * empty summaries rather than throwing.
     */
    private List<RuleSummaryDto> generateRuleSummaries(JsonNode root) {
        JsonNode rulesNode = root.get("rules");
        if (rulesNode == null || !rulesNode.isArray()) {
            return Collections.emptyList();
        }

        List<RuleSummaryDto> summaries = new ArrayList<>();
        for (int i = 0; i < rulesNode.size(); i++) {
            JsonNode ruleNode = rulesNode.get(i);
            try {
                String ruleKey = getTextOrDefault(ruleNode, "rule_key", "unknown");
                String ruleName = getTextOrDefault(ruleNode, "name", ruleKey);

                // Generate condition summary
                String conditionSummary = "";
                JsonNode conditionNode = ruleNode.get("condition");
                if (conditionNode != null && !conditionNode.isNull()) {
                    conditionSummary = summarizeCondition(conditionNode);
                }

                // Generate effect summary
                String effectSummary = "";
                JsonNode effectNode = ruleNode.get("effect");
                if (effectNode != null && !effectNode.isNull()) {
                    effectSummary = summarizeEffect(effectNode);
                }

                summaries.add(new RuleSummaryDto(ruleKey, ruleName, conditionSummary, effectSummary));
            } catch (Exception e) {
                // Handle gracefully -- add summary with empty strings rather than failing
                String ruleKey = getTextOrDefault(ruleNode, "rule_key", "unknown");
                String ruleName = getTextOrDefault(ruleNode, "name", ruleKey);
                logger.warn("Failed to generate summary for rule '{}': {}", ruleKey, e.getMessage());
                summaries.add(new RuleSummaryDto(ruleKey, ruleName, "", ""));
            }
        }

        return summaries;
    }

    /**
     * Recursively summarizes a condition tree node.
     * GROUP nodes produce "ALL of: [child1, child2, ...]" or "ANY of: [child1, child2, ...]".
     * FACT nodes produce "{factType} {operator} {value}".
     */
    private String summarizeCondition(JsonNode conditionNode) {
        String type = getTextOrDefault(conditionNode, "type", "");

        switch (type) {
            case "GROUP":
                return summarizeGroupCondition(conditionNode);
            case "FACT":
                return summarizeFactCondition(conditionNode);
            default:
                return "";
        }
    }

    /**
     * Summarizes a GROUP condition node.
     * AND operator produces "ALL of: [child1, child2, ...]"
     * OR operator produces "ANY of: [child1, child2, ...]"
     */
    private String summarizeGroupCondition(JsonNode groupNode) {
        String operator = getTextOrDefault(groupNode, "operator", "AND");
        String wrapper = "AND".equals(operator) ? "ALL of" : "ANY of";

        JsonNode childrenNode = groupNode.get("children");
        if (childrenNode == null || !childrenNode.isArray() || childrenNode.isEmpty()) {
            return wrapper + ": []";
        }

        List<String> childSummaries = new ArrayList<>();
        for (int i = 0; i < childrenNode.size(); i++) {
            String childSummary = summarizeCondition(childrenNode.get(i));
            if (!childSummary.isEmpty()) {
                childSummaries.add(childSummary);
            }
        }

        return wrapper + ": [" + String.join(", ", childSummaries) + "]";
    }

    /**
     * Summarizes a FACT condition node.
     * Produces "{factType} {operator} {value}" fragment.
     */
    private String summarizeFactCondition(JsonNode factNode) {
        String factType = getTextOrDefault(factNode, "factType", "unknown");
        String operator = getTextOrDefault(factNode, "operator", "?");
        String value = summarizeValue(factNode.get("value"));

        return factType + " " + operator + " " + value;
    }

    /**
     * Summarizes a value node. Handles strings, numbers, booleans, and arrays.
     */
    private String summarizeValue(JsonNode valueNode) {
        if (valueNode == null || valueNode.isNull()) {
            return "null";
        }
        if (valueNode.isArray()) {
            List<String> elements = new ArrayList<>();
            for (int i = 0; i < valueNode.size(); i++) {
                elements.add(summarizeValue(valueNode.get(i)));
            }
            return "[" + String.join(", ", elements) + "]";
        }
        if (valueNode.isTextual()) {
            return valueNode.asText();
        }
        if (valueNode.isNumber()) {
            return valueNode.asText();
        }
        if (valueNode.isBoolean()) {
            return String.valueOf(valueNode.asBoolean());
        }
        return valueNode.asText();
    }

    /**
     * Summarizes an effect node.
     * Produces "Require {count} approval(s) ({mode}) from {role1}, {role2}" text.
     */
    private String summarizeEffect(JsonNode effectNode) {
        int count = 1;
        JsonNode countNode = effectNode.get("requiredApproverCount");
        if (countNode != null && countNode.isInt()) {
            count = countNode.asInt();
        }

        String mode = getTextOrDefault(effectNode, "approvalMode", "UNORDERED");

        List<String> roleKeys = new ArrayList<>();
        JsonNode approversNode = effectNode.get("approvers");
        if (approversNode != null && approversNode.isArray()) {
            for (int i = 0; i < approversNode.size(); i++) {
                JsonNode approver = approversNode.get(i);
                String roleKey = getTextOrDefault(approver, "roleKey", "unknown");
                roleKeys.add(roleKey);
            }
        }

        String rolesText = roleKeys.isEmpty() ? "none" : String.join(", ", roleKeys);
        return "Require " + count + " approval(s) (" + mode + ") from " + rolesText;
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
