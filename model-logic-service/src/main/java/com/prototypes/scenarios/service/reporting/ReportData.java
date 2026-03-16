package com.prototypes.scenarios.service.reporting;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Container for report data used in impact report generation.
 * Both maps use nested {@code Map<String, Object>} for hierarchical data access
 * matching dot-notation source_field paths (e.g., "risk_charges.girr.delta").
 *
 * @param productionData nested map of production (baseline) values
 * @param scenarioData nested map of scenario (stressed) values
 * @param tableData map of table key to list of row maps (each row is {rowId, cells:{colKey:{value,formatToken}}})
 */
public record ReportData(Map<String, Object> productionData,
                         Map<String, Object> scenarioData,
                         Map<String, List<Map<String, Object>>> tableData) {

    /**
     * Backward-compatible constructor for providers that don't supply table data.
     */
    public ReportData(Map<String, Object> productionData, Map<String, Object> scenarioData) {
        this(productionData, scenarioData, Collections.emptyMap());
    }
}
