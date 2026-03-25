package com.prototypes.scenarios.dto;

import java.util.List;

/**
 * Top-level response DTO for the Direct Changes runtime API endpoint.
 * Contains an array of data sections, each representing one dataType
 * from the active DELTA_BY_UNIQUE_ID Change View Definition.
 *
 * @param dataChanged the list of direct changes data sections
 */
public record DirectChangesRuntimeResponseDto(
        List<DirectChangesDataSection> dataChanged
) {
}
