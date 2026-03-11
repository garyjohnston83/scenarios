package com.prototypes.scenarios.service.reporting;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Pure static utility class for delta calculations, value formatting,
 * source field resolution, and format rule evaluation used during
 * impact report snapshot generation.
 *
 * <p>All numeric values are rounded to 2 decimal places using
 * {@link BigDecimal#setScale(int, RoundingMode)} with {@link RoundingMode#HALF_UP}.</p>
 */
public final class ReportCalculationUtils {

    private ReportCalculationUtils() {
        // Prevent instantiation
    }

    /**
     * Traverses a nested map structure using a dot-notation path.
     *
     * <p>For example, the path {@code "risk_charges.girr.delta"} navigates through
     * {@code map.get("risk_charges")} -> {@code innerMap.get("girr")} -> {@code innerMap.get("delta")}.</p>
     *
     * @param dotNotationPath the dot-separated path to the target value
     * @param dataMap         the nested map structure to traverse
     * @return the leaf value, or {@code null} if any segment is missing or the path is invalid
     */
    @SuppressWarnings("unchecked")
    public static Object resolveSourceField(String dotNotationPath, Map<String, Object> dataMap) {
        if (dotNotationPath == null || dotNotationPath.isEmpty() || dataMap == null) {
            return null;
        }

        String[] segments = dotNotationPath.split("\\.");
        Object current = dataMap;

        for (String segment : segments) {
            if (!(current instanceof Map)) {
                return null;
            }
            current = ((Map<String, Object>) current).get(segment);
            if (current == null) {
                return null;
            }
        }

        return current;
    }

    /**
     * Calculates the delta value between scenario and production values.
     *
     * @param productionValue the production (baseline) value
     * @param scenarioValue   the scenario value
     * @return {@code scenarioValue - productionValue} rounded to 2 decimal places,
     *         or {@code null} if either value is null
     */
    public static BigDecimal calculateDeltaValue(Number productionValue, Number scenarioValue) {
        if (productionValue == null || scenarioValue == null) {
            return null;
        }

        BigDecimal production = toBigDecimal(productionValue);
        BigDecimal scenario = toBigDecimal(scenarioValue);

        return scenario.subtract(production).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Calculates the delta percentage between scenario and production values.
     *
     * <p>Formula: {@code ((scenarioValue - productionValue) / productionValue) * 100}</p>
     *
     * @param productionValue the production (baseline) value
     * @param scenarioValue   the scenario value
     * @return the delta percentage rounded to 2 decimal places,
     *         or {@code null} if production value is 0 or if either value is null
     */
    public static BigDecimal calculateDeltaPct(Number productionValue, Number scenarioValue) {
        if (productionValue == null || scenarioValue == null) {
            return null;
        }

        BigDecimal production = toBigDecimal(productionValue);
        BigDecimal scenario = toBigDecimal(scenarioValue);

        if (production.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }

        return scenario.subtract(production)
                .divide(production, 10, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Formats a numeric value with commas, 2 decimal places, and an optional unit suffix.
     *
     * <p>Example: {@code formatValue(1250000, "currency", "USD")} returns {@code "1,250,000.00 USD"}.</p>
     *
     * @param value  the numeric value to format
     * @param format the format type (e.g., "currency", "number", "percentage")
     * @param unit   the unit suffix to append (e.g., "USD", "%"); may be null
     * @return the formatted string, or {@code "N/A"} if the value is null
     */
    public static String formatValue(Number value, String format, String unit) {
        if (value == null) {
            return "N/A";
        }

        BigDecimal bd = toBigDecimal(value).setScale(2, RoundingMode.HALF_UP);
        String formatted = formatWithCommas(bd);

        if (unit != null && !unit.isEmpty()) {
            return formatted + " " + unit;
        }
        return formatted;
    }

    /**
     * Formats a delta value with a "+" prefix for positive values and an optional unit suffix.
     *
     * <p>Examples:
     * <ul>
     *   <li>{@code formatDelta(40000, "USD")} returns {@code "+40,000.00 USD"}</li>
     *   <li>{@code formatDelta(-10000, "USD")} returns {@code "-10,000.00 USD"}</li>
     * </ul></p>
     *
     * @param deltaValue the delta value to format
     * @param unit       the unit suffix to append; may be null
     * @return the formatted delta string, or {@code "N/A"} if the value is null
     */
    public static String formatDelta(Number deltaValue, String unit) {
        if (deltaValue == null) {
            return "N/A";
        }

        BigDecimal bd = toBigDecimal(deltaValue).setScale(2, RoundingMode.HALF_UP);
        String prefix = bd.compareTo(BigDecimal.ZERO) > 0 ? "+" : "";
        String formatted = prefix + formatWithCommas(bd);

        if (unit != null && !unit.isEmpty()) {
            return formatted + " " + unit;
        }
        return formatted;
    }

    /**
     * Evaluates a delta percentage against a list of format rules and returns
     * the matching semantic token.
     *
     * <p>Each rule defines a range [{@code min}, {@code max}] (inclusive) and a token string.
     * A null {@code min} indicates an unbounded lower range; a null {@code max} indicates
     * an unbounded upper range. The first matching rule's token is returned.</p>
     *
     * @param deltaPct the delta percentage value to evaluate
     * @param rules    the list of format rules to check against
     * @return the token from the first matching rule, or {@code "neutral"} if no rules exist,
     *         the list is null, or no range matches
     */
    public static String applyFormatRules(Number deltaPct, List<FormatRule> rules) {
        if (deltaPct == null || rules == null || rules.isEmpty()) {
            return "neutral";
        }

        double value = deltaPct.doubleValue();

        for (FormatRule rule : rules) {
            boolean aboveMin = (rule.min() == null) || (value >= rule.min());
            boolean belowMax = (rule.max() == null) || (value <= rule.max());

            if (aboveMin && belowMax) {
                return rule.token();
            }
        }

        return "neutral";
    }

    // ========================================================================
    // Internal helpers
    // ========================================================================

    private static BigDecimal toBigDecimal(Number value) {
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        return BigDecimal.valueOf(value.doubleValue());
    }

    private static String formatWithCommas(BigDecimal value) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.US);
        DecimalFormat df = new DecimalFormat("#,##0.00", symbols);
        return df.format(value);
    }
}
