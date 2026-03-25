package com.prototypes.scenarios.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for StubDirectChangesViewDataProvider.
 * Plain JUnit 5 -- no Spring context required.
 */
class StubDirectChangesViewDataProviderTest {

    private StubDirectChangesViewDataProvider provider;
    private static final UUID TEST_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    @BeforeEach
    void setUp() {
        provider = new StubDirectChangesViewDataProvider();
    }

    // ========================================================================
    // Test 1: getSectionData returns non-null DirectChangesSectionData with
    //         non-empty rows for "timeSeriesValues"
    // ========================================================================

    @Test
    void getSectionData_returnsNonNullDataWithNonEmptyRowsForTimeSeriesValues() {
        DirectChangesSectionData result = provider.getSectionData(TEST_SCENARIO_ID, "MARKET_DATA", "timeSeriesValues");

        assertNotNull(result, "Result should not be null for timeSeriesValues");
        assertNotNull(result.rows(), "Rows should not be null for timeSeriesValues");
        assertFalse(result.rows().isEmpty(), "Rows should not be empty for timeSeriesValues");
        assertTrue(result.rows().size() >= 5, "Should have at least 5 rows for timeSeriesValues");

        // Verify rows have expected keys matching the dataAttribute names
        var firstRow = result.rows().get(0);
        assertTrue(firstRow.containsKey("tsName"), "Row should contain 'tsName' key");
        assertTrue(firstRow.containsKey("date"), "Row should contain 'date' key");
        assertTrue(firstRow.containsKey("cur"), "Row should contain 'cur' key");
        assertTrue(firstRow.containsKey("new"), "Row should contain 'new' key");

        // Verify there are at least 2-3 distinct tsName values
        long distinctTsNames = result.rows().stream()
                .map(row -> row.get("tsName"))
                .distinct()
                .count();
        assertTrue(distinctTsNames >= 2, "Should have at least 2 distinct tsName values");
    }

    // ========================================================================
    // Test 2: Stub returns data with an externalLink value for at least one
    //         section
    // ========================================================================

    @Test
    void getSectionData_returnsExternalLinkForAtLeastOneSection() {
        DirectChangesSectionData tsResult = provider.getSectionData(TEST_SCENARIO_ID, "MARKET_DATA", "timeSeriesValues");
        DirectChangesSectionData curveResult = provider.getSectionData(TEST_SCENARIO_ID, "MARKET_DATA", "curvePoints");

        // At least one section should have an externalLink
        boolean hasExternalLink = (tsResult.externalLink() != null && !tsResult.externalLink().isBlank())
                || (curveResult.externalLink() != null && !curveResult.externalLink().isBlank());

        assertTrue(hasExternalLink, "At least one section should have a non-null, non-blank externalLink");
    }

    // ========================================================================
    // Test 3: Stub returns DirectChangesSectionData with null rows for an
    //         unknown dataTypeId (graceful fallback)
    // ========================================================================

    @Test
    void getSectionData_returnsNullRowsForUnknownDataTypeId() {
        DirectChangesSectionData result = provider.getSectionData(TEST_SCENARIO_ID, "MARKET_DATA", "unknownDataType");

        assertNotNull(result, "Result should not be null even for unknown dataTypeId");
        assertNull(result.rows(), "Rows should be null for unknown dataTypeId (NO_DATA signal)");
    }
}
