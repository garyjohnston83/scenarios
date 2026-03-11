package com.prototypes.scenarios.service.reporting;

/**
 * Represents a format rule that maps a numeric range to a semantic token.
 * Used by report generation to assign format tokens (neutral, warning, critical)
 * based on delta percentage values.
 *
 * <p>A null {@code min} indicates an unbounded lower range.
 * A null {@code max} indicates an unbounded upper range.</p>
 */
public record FormatRule(Double min, Double max, String token) {
}
