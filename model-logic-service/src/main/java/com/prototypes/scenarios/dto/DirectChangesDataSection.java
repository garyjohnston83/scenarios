package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;
import java.util.Map;

/**
 * A single section within the Direct Changes runtime API response.
 * Each section represents one dataType from the active Change View Definition.
 *
 * @param dataType the data type identifier (e.g., "timeSeriesValues", "curvePoints")
 * @param dataTypeTitle the human-readable title of the data type (e.g., "Time-Series Values")
 * @param header the rendered header text with substituted placeholders
 * @param externalLink optional external link URL for this section (nullable)
 * @param totalDataChanges the total number of data changes (row count) in this section
 * @param renderState the render state: "ROWS", "OVERFLOW", or "NO_DATA"
 * @param columnDefinitions the column definitions describing the data shape
 * @param data the row data (null when renderState is OVERFLOW or NO_DATA)
 * @param groupByEntityIdColumn when true, the UI groups rows into sub-accordions by the isEntityId column
 */
public record DirectChangesDataSection(
        String dataType,
        String dataTypeTitle,
        String header,
        String externalLink,
        int totalDataChanges,
        String renderState,
        List<DirectChangesColumnDefinition> columnDefinitions,
        List<Map<String, Object>> data,
        @JsonInclude(JsonInclude.Include.NON_NULL) Boolean groupByEntityIdColumn
) {
}
