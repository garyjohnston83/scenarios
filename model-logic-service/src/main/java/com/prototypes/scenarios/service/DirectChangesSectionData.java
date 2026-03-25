package com.prototypes.scenarios.service;

import java.util.List;
import java.util.Map;

/**
 * Container for section data returned by a {@link DirectChangesViewDataProvider}.
 * Each instance represents the raw data for one dataType section.
 *
 * <ul>
 *   <li>{@code rows} being {@code null} signals NO_DATA (section is omitted from the response)</li>
 *   <li>{@code rows} being an empty list means no changes for this section (section is omitted from the response)</li>
 *   <li>{@code rows} being a non-empty list means data is present and should be included</li>
 * </ul>
 *
 * @param rows the list of row maps keyed by dataAttribute names, or null for NO_DATA
 * @param externalLink optional external link URL for this section (nullable)
 */
public record DirectChangesSectionData(
        List<Map<String, Object>> rows,
        String externalLink
) {
}
