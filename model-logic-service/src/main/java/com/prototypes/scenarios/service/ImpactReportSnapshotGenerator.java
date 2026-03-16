package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.entity.ReportDefinition;
import com.prototypes.scenarios.entity.Scenario;
import com.prototypes.scenarios.entity.ScenarioImpactReport;
import com.prototypes.scenarios.repository.ScenarioImpactReportRepository;
import com.prototypes.scenarios.service.reporting.FormatRule;
import com.prototypes.scenarios.service.reporting.ReportCalculationUtils;
import com.prototypes.scenarios.service.reporting.ReportData;
import com.prototypes.scenarios.service.reporting.ReportDataProvider;
import com.prototypes.scenarios.service.reporting.ReportDataProviderRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Separate Spring bean responsible for generating a single impact report snapshot
 * within a REQUIRES_NEW transaction. This MUST be a separate bean from the caller
 * (ImpactReportGenerationService) so that Spring's transaction proxy intercepts
 * the REQUIRES_NEW propagation correctly.
 */
@Service
public class ImpactReportSnapshotGenerator {

    private static final Logger logger = LoggerFactory.getLogger(ImpactReportSnapshotGenerator.class);

    private final ScenarioImpactReportRepository scenarioImpactReportRepository;
    private final ReportDataProviderRegistry reportDataProviderRegistry;
    private final ObjectMapper objectMapper;

    public ImpactReportSnapshotGenerator(ScenarioImpactReportRepository scenarioImpactReportRepository,
                                          ReportDataProviderRegistry reportDataProviderRegistry,
                                          ObjectMapper objectMapper) {
        this.scenarioImpactReportRepository = scenarioImpactReportRepository;
        this.reportDataProviderRegistry = reportDataProviderRegistry;
        this.objectMapper = objectMapper;
    }

    /**
     * Generates a single impact report snapshot for the given scenario and report definition.
     * Runs in its own REQUIRES_NEW transaction so that failures do not affect other reports
     * or the caller's transaction.
     *
     * @param scenario   the scenario entity
     * @param definition the report definition entity
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void generateSingleReport(Scenario scenario, ReportDefinition definition) {
        String scenarioTypeCode = scenario.getScenarioTypeCode();

        // 1. Look up data provider
        ReportDataProvider provider = reportDataProviderRegistry.getProvider(scenarioTypeCode)
                .orElseThrow(() -> new RuntimeException("No data provider for type: " + scenarioTypeCode));

        // 2. Fetch report data
        ReportData reportData = provider.getReportData(scenario.getId(), scenarioTypeCode);

        // 3. Parse definition JSON
        JsonNode definitionRoot;
        try {
            definitionRoot = objectMapper.readTree(definition.getDefinition());
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse definition JSON for " + definition.getReportKey() + ": " + e.getMessage(), e);
        }

        // 4. Extract display name from definition JSON
        String reportName = extractDisplayName(definitionRoot, definition.getReportKey());

        // 5. Build the rendered report structure
        LocalDateTime generatedAt = LocalDateTime.now();
        Map<String, Object> renderedReport = buildRenderedReport(
                scenario, definition, definitionRoot, reportData, reportName, generatedAt);

        // 6. Serialize rendered report to JSON string
        String renderedReportJson;
        try {
            renderedReportJson = objectMapper.writeValueAsString(renderedReport);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize rendered report JSON: " + e.getMessage(), e);
        }

        // 7. Build and persist the ScenarioImpactReport entity
        ScenarioImpactReport entity = new ScenarioImpactReport();
        entity.setId(UUID.randomUUID());
        entity.setScenarioId(scenario.getId());
        entity.setReportDefinitionId(definition.getId());
        entity.setDefinitionVersion(definition.getVersion());
        entity.setReportKey(definition.getReportKey());
        entity.setReportName(reportName);
        entity.setGeneratedAt(generatedAt);
        entity.setStatus("GENERATED");
        entity.setRenderedReport(renderedReportJson);
        entity.setErrorMessage(null);

        scenarioImpactReportRepository.save(entity);
        logger.debug("Generated report '{}' for scenario {}", definition.getReportKey(), scenario.getId());
    }

    /**
     * Saves a FAILED report entry when generation fails. Also runs in its own
     * REQUIRES_NEW transaction so the failure record persists independently.
     *
     * @param scenario     the scenario entity
     * @param definition   the report definition entity
     * @param errorMessage the error message (will be truncated to 2000 chars)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveFailedReport(Scenario scenario, ReportDefinition definition, String errorMessage) {
        String reportName;
        try {
            JsonNode definitionRoot = objectMapper.readTree(definition.getDefinition());
            reportName = extractDisplayName(definitionRoot, definition.getReportKey());
        } catch (Exception e) {
            reportName = definition.getReportKey();
        }

        ScenarioImpactReport entity = new ScenarioImpactReport();
        entity.setId(UUID.randomUUID());
        entity.setScenarioId(scenario.getId());
        entity.setReportDefinitionId(definition.getId());
        entity.setDefinitionVersion(definition.getVersion());
        entity.setReportKey(definition.getReportKey());
        entity.setReportName(reportName);
        entity.setGeneratedAt(LocalDateTime.now());
        entity.setStatus("FAILED");
        entity.setRenderedReport(null);
        entity.setErrorMessage(truncate(errorMessage, 2000));

        scenarioImpactReportRepository.save(entity);
        logger.debug("Saved FAILED report '{}' for scenario {}", definition.getReportKey(), scenario.getId());
    }

    // ========================================================================
    // Internal helpers
    // ========================================================================

    private String extractDisplayName(JsonNode definitionRoot, String fallback) {
        JsonNode displayNameNode = definitionRoot.get("display_name");
        if (displayNameNode != null && displayNameNode.isTextual() && !displayNameNode.asText().isEmpty()) {
            return displayNameNode.asText();
        }
        return fallback;
    }

    private Map<String, Object> buildRenderedReport(Scenario scenario,
                                                     ReportDefinition definition,
                                                     JsonNode definitionRoot,
                                                     ReportData reportData,
                                                     String reportName,
                                                     LocalDateTime generatedAt) {
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("reportKey", definition.getReportKey());
        report.put("reportName", reportName);
        report.put("definitionVersion", definition.getVersion());
        report.put("generatedAt", generatedAt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        report.put("scenarioId", scenario.getId().toString());
        report.put("scenarioName", scenario.getName());
        report.put("scenarioTypeCode", scenario.getScenarioTypeCode());

        // Parse sections
        List<Map<String, Object>> sections = new ArrayList<>();
        JsonNode sectionsNode = definitionRoot.get("sections");
        if (sectionsNode != null && sectionsNode.isArray()) {
            for (int i = 0; i < sectionsNode.size(); i++) {
                JsonNode sectionNode = sectionsNode.get(i);
                Map<String, Object> section = buildSection(sectionNode, i + 1, reportData);
                sections.add(section);
            }
        }
        report.put("sections", sections);

        return report;
    }

    private Map<String, Object> buildSection(JsonNode sectionNode, int defaultOrder, ReportData reportData) {
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
                Map<String, Object> block = buildContentBlock(blockNode, i + 1, reportData);
                if (block != null) {
                    contentBlocks.add(block);
                }
            }
        }

        // Check for metrics[] format (backward compatibility with seed data)
        JsonNode metricsNode = sectionNode.get("metrics");
        if (metricsNode != null && metricsNode.isArray()) {
            for (int i = 0; i < metricsNode.size(); i++) {
                JsonNode metricNode = metricsNode.get(i);
                Map<String, Object> metricBlock = buildMetricBlock(metricNode, contentBlocks.size() + i + 1, reportData);
                contentBlocks.add(metricBlock);
            }
        }

        section.put("contentBlocks", contentBlocks);
        return section;
    }

    private Map<String, Object> buildContentBlock(JsonNode blockNode, int defaultOrder, ReportData reportData) {
        String blockType = getTextOrDefault(blockNode, "blockType", "metric");

        return switch (blockType) {
            case "metric" -> buildMetricBlock(blockNode, defaultOrder, reportData);
            case "text" -> buildTextBlock(blockNode, defaultOrder);
            case "table" -> buildTableBlock(blockNode, defaultOrder, reportData);
            default -> buildMetricBlock(blockNode, defaultOrder, reportData);
        };
    }

    private Map<String, Object> buildMetricBlock(JsonNode metricNode, int order, ReportData reportData) {
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

        // Resolve production and scenario values from data maps
        Object rawProductionValue = ReportCalculationUtils.resolveSourceField(sourceField, reportData.productionData());
        Object rawScenarioValue = ReportCalculationUtils.resolveSourceField(sourceField, reportData.scenarioData());

        Number productionValue = toNumber(rawProductionValue);
        Number scenarioValue = toNumber(rawScenarioValue);

        // Calculate delta values
        BigDecimal deltaValue = ReportCalculationUtils.calculateDeltaValue(productionValue, scenarioValue);
        BigDecimal deltaPct = ReportCalculationUtils.calculateDeltaPct(productionValue, scenarioValue);

        // Store numeric values (or "N/A" for nulls)
        block.put("productionValue", productionValue != null ? roundToDouble(productionValue) : "N/A");
        block.put("scenarioValue", scenarioValue != null ? roundToDouble(scenarioValue) : "N/A");
        block.put("deltaValue", deltaValue != null ? deltaValue.doubleValue() : "N/A");
        block.put("deltaPct", deltaPct != null ? deltaPct.doubleValue() : "N/A");

        // Formatted values
        block.put("formattedProductionValue", ReportCalculationUtils.formatValue(productionValue, format, unit));
        block.put("formattedScenarioValue", ReportCalculationUtils.formatValue(scenarioValue, format, unit));
        block.put("formattedDelta", ReportCalculationUtils.formatDelta(deltaValue, unit));

        // Apply format rules
        List<FormatRule> formatRules = parseFormatRules(metricNode);
        String formatToken = ReportCalculationUtils.applyFormatRules(deltaPct, formatRules);
        block.put("formatToken", formatToken);

        return block;
    }

    private Map<String, Object> buildTextBlock(JsonNode textNode, int order) {
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("blockType", "text");
        block.put("order", order);
        block.put("textKey", getTextOrDefault(textNode, "key", "text_" + order));
        block.put("content", getTextOrDefault(textNode, "content", ""));
        return block;
    }

    /**
     * Builds a table content block with columnLayout structure.
     *
     * The columnLayout contains:
     * - rowColumns: array of {key, header} for row-identifying columns (leftmost label columns)
     * - columnGroups: array of {groupLabel, columns: [{key, header, formatToken?}]} for grouped data columns
     *
     * If the definition has no explicit columnGroups, all columns are placed in a single unnamed group
     * for backward compatibility.
     *
     * Rows are produced as {rowId, cells} objects where cells is a map keyed by column key.
     */
    private Map<String, Object> buildTableBlock(JsonNode tableNode, int order, ReportData reportData) {
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("blockType", "table");
        block.put("order", order);
        block.put("tableKey", getTextOrDefault(tableNode, "key", "table_" + order));
        block.put("label", getTextOrDefault(tableNode, "label", "Table " + order));

        // Build columnLayout structure
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

        // Fallback: if no columnGroups defined, parse flat columns and place in a single unnamed group
        if (columnGroups.isEmpty()) {
            JsonNode columnsNode = tableNode.get("columns");
            if (columnsNode != null && columnsNode.isArray()) {
                // If no rowColumns were explicitly defined either, treat the first column as a rowColumn
                // only if there are multiple columns. Otherwise all columns go into the flat group.
                List<Map<String, Object>> flatColumns = new ArrayList<>();

                for (int i = 0; i < columnsNode.size(); i++) {
                    JsonNode col = columnsNode.get(i);
                    String key;
                    String header;

                    if (col.isObject()) {
                        key = getTextOrDefault(col, "key", "col_" + (i + 1));
                        header = getTextOrDefault(col, "header", "Column " + (i + 1));
                    } else if (col.isTextual()) {
                        key = "col_" + (i + 1);
                        header = col.asText();
                    } else {
                        key = "col_" + (i + 1);
                        header = "Column " + (i + 1);
                    }

                    Map<String, Object> colDef = new LinkedHashMap<>();
                    colDef.put("key", key);
                    colDef.put("header", header);

                    if (col.isObject()) {
                        String formatToken = getTextOrDefault(col, "formatToken", null);
                        if (formatToken != null) {
                            colDef.put("formatToken", formatToken);
                        }
                    }

                    flatColumns.add(colDef);
                }

                // Place all columns in a single unnamed group
                if (!flatColumns.isEmpty()) {
                    Map<String, Object> defaultGroup = new LinkedHashMap<>();
                    defaultGroup.put("groupLabel", "");
                    defaultGroup.put("columns", flatColumns);
                    columnGroups.add(defaultGroup);
                }
            }
        }

        columnLayout.put("rowColumns", rowColumns);
        columnLayout.put("columnGroups", columnGroups);
        block.put("columnLayout", columnLayout);

        // Build rows from reportData.tableData() keyed by table key
        String tableKey = getTextOrDefault(tableNode, "key", "table_" + order);
        List<Map<String, Object>> rows = new ArrayList<>();

        Map<String, List<Map<String, Object>>> tableDataMap = reportData.tableData();
        if (tableDataMap != null) {
            List<Map<String, Object>> dataRows = tableDataMap.get(tableKey);
            if (dataRows != null) {
                rows.addAll(dataRows);
            }
        }
        block.put("rows", rows);

        // Keep backward-compatible flat columns for legacy consumers
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

    private List<FormatRule> parseFormatRules(JsonNode metricNode) {
        List<FormatRule> rules = new ArrayList<>();
        JsonNode formatRulesNode = metricNode.get("formatRules");
        if (formatRulesNode != null && formatRulesNode.isArray()) {
            for (JsonNode ruleNode : formatRulesNode) {
                Double min = ruleNode.has("min") && !ruleNode.get("min").isNull()
                        ? ruleNode.get("min").asDouble() : null;
                Double max = ruleNode.has("max") && !ruleNode.get("max").isNull()
                        ? ruleNode.get("max").asDouble() : null;
                String token = getTextOrDefault(ruleNode, "token", "neutral");
                rules.add(new FormatRule(min, max, token));
            }
        }
        return rules;
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

    private Number toNumber(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return (Number) value;
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private double roundToDouble(Number value) {
        return BigDecimal.valueOf(value.doubleValue())
                .setScale(2, java.math.RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() > maxLength ? value.substring(0, maxLength) : value;
    }
}
