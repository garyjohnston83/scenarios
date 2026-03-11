package com.prototypes.scenarios.service.reporting;

import java.util.Map;

/**
 * Container for report data used in impact report generation.
 * Both maps use nested {@code Map<String, Object>} for hierarchical data access
 * matching dot-notation source_field paths (e.g., "risk_charges.girr.delta").
 *
 * @param productionData nested map of production (baseline) values
 * @param scenarioData nested map of scenario (stressed) values
 */
public record ReportData(Map<String, Object> productionData, Map<String, Object> scenarioData) {
}
