package com.prototypes.scenarios.dto;

import java.util.List;

public record DatasetDto(List<String> columns, List<GridRowDto> rows) {
}
