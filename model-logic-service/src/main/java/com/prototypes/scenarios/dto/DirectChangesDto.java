package com.prototypes.scenarios.dto;

import java.util.List;

public record DirectChangesDto(List<String> columns, List<GridRowDto> rows) {
}
