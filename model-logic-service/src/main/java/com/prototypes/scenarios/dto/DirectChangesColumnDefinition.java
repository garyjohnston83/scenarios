package com.prototypes.scenarios.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Column definition for a Direct Changes section in the runtime API response.
 * Each entry describes one column of data in the section's row data.
 *
 * @param dataAttribute the data attribute key used in row maps
 * @param type the column data type (string, number, date, boolean)
 * @param display the display label for the column header
 * @param isEntityId when true, marks this column as the entity identifier for changedEntitiesCount computation; omitted from JSON when null
 */
public record DirectChangesColumnDefinition(
        String dataAttribute,
        String type,
        String display,
        @JsonInclude(JsonInclude.Include.NON_NULL) Boolean isEntityId
) {
}
