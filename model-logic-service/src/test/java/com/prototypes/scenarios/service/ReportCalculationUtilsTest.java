package com.prototypes.scenarios.service;

import com.prototypes.scenarios.service.reporting.FormatRule;
import com.prototypes.scenarios.service.reporting.ReportCalculationUtils;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Unit tests for ReportCalculationUtils.
 * Plain JUnit 5 -- no Spring context required.
 */
class ReportCalculationUtilsTest {

    // ========================================================================
    // Test 1: calculateDelta with normal values
    // calculateDelta(1250000, 1290000) returns deltaValue = 40000.00, deltaPct = 3.20
    // ========================================================================

    @Test
    void calculateDelta_normalValues_returnsCorrectDeltaAndPct() {
        BigDecimal deltaValue = ReportCalculationUtils.calculateDeltaValue(1_250_000, 1_290_000);
        BigDecimal deltaPct = ReportCalculationUtils.calculateDeltaPct(1_250_000, 1_290_000);

        assertNotNull(deltaValue, "deltaValue should not be null for valid inputs");
        assertNotNull(deltaPct, "deltaPct should not be null for valid inputs");
        assertEquals(new BigDecimal("40000.00"), deltaValue,
                "deltaValue should be 40000.00 (1290000 - 1250000)");
        assertEquals(new BigDecimal("3.20"), deltaPct,
                "deltaPct should be 3.20 ((40000 / 1250000) * 100)");
    }

    // ========================================================================
    // Test 2: calculateDelta with zero production value (division by zero)
    // calculateDelta(0, 50000) returns deltaValue = 50000.00, deltaPct = null (N/A)
    // ========================================================================

    @Test
    void calculateDelta_zeroProductionValue_returnsDeltaValueButNullPct() {
        BigDecimal deltaValue = ReportCalculationUtils.calculateDeltaValue(0, 50_000);
        BigDecimal deltaPct = ReportCalculationUtils.calculateDeltaPct(0, 50_000);

        assertNotNull(deltaValue, "deltaValue should not be null when production is zero");
        assertEquals(new BigDecimal("50000.00"), deltaValue,
                "deltaValue should be 50000.00 (50000 - 0)");
        assertNull(deltaPct,
                "deltaPct should be null when production value is zero (division by zero)");
    }

    // ========================================================================
    // Test 3: calculateDelta with null production value
    // calculateDelta(null, 1290000) returns productionValue = N/A, deltaValue = N/A, deltaPct = N/A
    // ========================================================================

    @Test
    void calculateDelta_nullProductionValue_returnsNullForAllCalculations() {
        BigDecimal deltaValue = ReportCalculationUtils.calculateDeltaValue(null, 1_290_000);
        BigDecimal deltaPct = ReportCalculationUtils.calculateDeltaPct(null, 1_290_000);

        assertNull(deltaValue,
                "deltaValue should be null when production value is null");
        assertNull(deltaPct,
                "deltaPct should be null when production value is null");

        // Also verify formatValue returns "N/A" for null
        String formattedProduction = ReportCalculationUtils.formatValue(null, "currency", "USD");
        assertEquals("N/A", formattedProduction,
                "formatValue should return 'N/A' for null value");

        // Verify formatDelta returns "N/A" for null
        String formattedDelta = ReportCalculationUtils.formatDelta(null, "USD");
        assertEquals("N/A", formattedDelta,
                "formatDelta should return 'N/A' for null delta value");
    }

    // ========================================================================
    // Test 4: Positive delta formatted value is prefixed with "+"
    // e.g., "+40,000.00 USD"
    // ========================================================================

    @Test
    void formatDelta_positiveValue_prefixedWithPlus() {
        String formatted = ReportCalculationUtils.formatDelta(40_000, "USD");

        assertEquals("+40,000.00 USD", formatted,
                "Positive delta should be formatted as '+40,000.00 USD'");
    }

    // ========================================================================
    // Test 5: Negative delta formatted value has no "+" prefix
    // e.g., "-10,000.00 USD"
    // ========================================================================

    @Test
    void formatDelta_negativeValue_noPlusPrefix() {
        String formatted = ReportCalculationUtils.formatDelta(-10_000, "USD");

        assertEquals("-10,000.00 USD", formatted,
                "Negative delta should be formatted as '-10,000.00 USD'");
    }

    // ========================================================================
    // Test 6: formatValue with currency format
    // formatValue(1250000, "currency", "USD") returns "1,250,000.00 USD"
    // ========================================================================

    @Test
    void formatValue_currencyFormat_returnsFormattedValueWithUnit() {
        String formatted = ReportCalculationUtils.formatValue(1_250_000, "currency", "USD");

        assertEquals("1,250,000.00 USD", formatted,
                "Currency-formatted value should be '1,250,000.00 USD'");
    }

    // ========================================================================
    // Test 7: applyFormatRules evaluates deltaPct against rules
    // deltaPct=3.2 with rule {min:0, max:5, token:"neutral"} returns "neutral";
    // no matching rule returns "neutral" as default
    // ========================================================================

    @Test
    void applyFormatRules_matchingAndNonMatchingRules_returnsCorrectTokenOrDefault() {
        List<FormatRule> rules = List.of(
                new FormatRule(0.0, 5.0, "neutral"),
                new FormatRule(5.01, 10.0, "warning"),
                new FormatRule(10.01, null, "critical")
        );

        // deltaPct 3.2 falls within [0, 5] -> "neutral"
        String token1 = ReportCalculationUtils.applyFormatRules(3.2, rules);
        assertEquals("neutral", token1,
                "deltaPct 3.2 should match rule [0, 5] and return 'neutral'");

        // deltaPct 7.5 falls within [5.01, 10] -> "warning"
        String token2 = ReportCalculationUtils.applyFormatRules(7.5, rules);
        assertEquals("warning", token2,
                "deltaPct 7.5 should match rule [5.01, 10] and return 'warning'");

        // deltaPct 15.0 falls within [10.01, unbounded] -> "critical"
        String token3 = ReportCalculationUtils.applyFormatRules(15.0, rules);
        assertEquals("critical", token3,
                "deltaPct 15.0 should match rule [10.01, null] and return 'critical'");

        // No matching rule (value is -5.0, below all ranges) -> default "neutral"
        String token4 = ReportCalculationUtils.applyFormatRules(-5.0, rules);
        assertEquals("neutral", token4,
                "deltaPct -5.0 should not match any rule and return default 'neutral'");

        // Null rules -> default "neutral"
        String token5 = ReportCalculationUtils.applyFormatRules(3.2, null);
        assertEquals("neutral", token5,
                "Null rules should return default 'neutral'");

        // Empty rules -> default "neutral"
        String token6 = ReportCalculationUtils.applyFormatRules(3.2, List.of());
        assertEquals("neutral", token6,
                "Empty rules should return default 'neutral'");

        // Null deltaPct -> default "neutral"
        String token7 = ReportCalculationUtils.applyFormatRules(null, rules);
        assertEquals("neutral", token7,
                "Null deltaPct should return default 'neutral'");
    }

    // ========================================================================
    // Test 8: resolveSourceField traverses nested map and returns value;
    // missing path returns null
    // ========================================================================

    @Test
    void resolveSourceField_nestedMapTraversal_returnsValueOrNullForMissing() {
        // Build nested map: risk_charges -> girr -> delta = 1250000
        Map<String, Object> grrMap = new HashMap<>();
        grrMap.put("delta", 1_250_000);
        grrMap.put("vega", 350_000);

        Map<String, Object> riskChargesMap = new HashMap<>();
        riskChargesMap.put("girr", grrMap);

        Map<String, Object> dataMap = new HashMap<>();
        dataMap.put("risk_charges", riskChargesMap);

        // Valid path returns the value
        Object value = ReportCalculationUtils.resolveSourceField("risk_charges.girr.delta", dataMap);
        assertNotNull(value, "Should resolve a valid nested path");
        assertEquals(1_250_000, value,
                "Should return 1250000 for path 'risk_charges.girr.delta'");

        // Another valid path
        Object vegaValue = ReportCalculationUtils.resolveSourceField("risk_charges.girr.vega", dataMap);
        assertNotNull(vegaValue, "Should resolve path 'risk_charges.girr.vega'");
        assertEquals(350_000, vegaValue,
                "Should return 350000 for path 'risk_charges.girr.vega'");

        // Missing intermediate segment returns null
        Object missing = ReportCalculationUtils.resolveSourceField("risk_charges.csr_nonsec.delta", dataMap);
        assertNull(missing,
                "Should return null for a path with missing intermediate segment");

        // Missing leaf segment returns null
        Object missingLeaf = ReportCalculationUtils.resolveSourceField("risk_charges.girr.curvature", dataMap);
        assertNull(missingLeaf,
                "Should return null for a path with missing leaf segment");

        // Completely unknown root returns null
        Object unknownRoot = ReportCalculationUtils.resolveSourceField("unknown.path.here", dataMap);
        assertNull(unknownRoot,
                "Should return null for a completely unknown root path");

        // Null path returns null
        Object nullPath = ReportCalculationUtils.resolveSourceField(null, dataMap);
        assertNull(nullPath,
                "Should return null for a null path");

        // Null map returns null
        Object nullMap = ReportCalculationUtils.resolveSourceField("risk_charges.girr.delta", null);
        assertNull(nullMap,
                "Should return null for a null data map");

        // Empty path returns null
        Object emptyPath = ReportCalculationUtils.resolveSourceField("", dataMap);
        assertNull(emptyPath,
                "Should return null for an empty path");
    }
}
