package com.prototypes.scenarios.service.reporting;

import java.util.UUID;

/**
 * Interface for providing report data for a given scenario.
 * Implementations return nested map structures matching the dot-notation
 * source_field paths used in report definitions (e.g., "risk_charges.girr.delta").
 *
 * Designed to be swappable -- stub implementations return hardcoded data;
 * future real implementations can read from actual impact calculation results.
 */
public interface ReportDataProvider {

    /**
     * Retrieve report data for the given scenario.
     *
     * @param scenarioId the UUID of the scenario
     * @param scenarioTypeCode the scenario type code (e.g., "FRTB_SA", "MARKET_DATA", "RISK_FACTOR")
     * @return a ReportData record containing production and scenario data maps
     */
    ReportData getReportData(UUID scenarioId, String scenarioTypeCode);
}
