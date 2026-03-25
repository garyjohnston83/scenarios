package com.prototypes.scenarios.service;

import java.util.UUID;

/**
 * Interface for providing section data for Direct Changes views.
 * Implementations return raw row data for a given dataType section,
 * which the runtime service then sorts, applies thresholds to, and
 * assembles into the response.
 *
 * <p>Designed to be swappable -- stub implementations return hardcoded data;
 * future real implementations can read from actual data sources.</p>
 *
 * <p>Return contract:</p>
 * <ul>
 *   <li>{@code rows} being {@code null} signals NO_DATA (section will be omitted)</li>
 *   <li>{@code rows} being an empty list means no changes for this section (section will be omitted)</li>
 *   <li>{@code rows} being a non-empty list means data is present and should be included</li>
 * </ul>
 */
public interface DirectChangesViewDataProvider {

    /**
     * Retrieve section data for the given scenario and dataType.
     *
     * @param scenarioId the UUID of the scenario
     * @param scenarioTypeCode the scenario type code (e.g., "MARKET_DATA")
     * @param dataTypeId the data type identifier within the change view definition (e.g., "timeSeriesValues")
     * @return a DirectChangesSectionData record containing rows and optional external link
     */
    DirectChangesSectionData getSectionData(UUID scenarioId, String scenarioTypeCode, String dataTypeId);
}
