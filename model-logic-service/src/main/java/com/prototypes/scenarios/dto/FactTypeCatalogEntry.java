package com.prototypes.scenarios.dto;

import java.util.List;

public record FactTypeCatalogEntry(
        String key,
        String label,
        List<String> operators,
        String valueType,
        List<EnumValue> enumValues
) {

    public record EnumValue(
            String key,
            String label
    ) {
    }
}
