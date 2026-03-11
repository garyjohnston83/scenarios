package com.prototypes.scenarios.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for ReportDefinitionValidationService.
 * Plain JUnit 5 -- no Spring context required.
 */
class ReportDefinitionValidationServiceTest {

    private ReportDefinitionValidationService validationService;

    @BeforeEach
    void setUp() {
        validationService = new ReportDefinitionValidationService(new ObjectMapper());
    }

    // ========================================================================
    // Helper: builds a valid complete definition JSON string
    // ========================================================================

    private String validDefinitionJson() {
        return """
            {
              "schema_version": "1.0",
              "report_key": "sa_capital_summary",
              "scenario_type": "FRTB_SA",
              "display_name": "SA Capital Charge Summary",
              "description": "Summary of SA capital charges.",
              "sections": [
                {
                  "key": "delta_sensitivity",
                  "title": "Delta Sensitivity",
                  "order": 1,
                  "metrics": [
                    {
                      "key": "girr_delta",
                      "label": "GIRR Delta",
                      "source_field": "risk_charges.girr.delta",
                      "format": "currency",
                      "unit": "USD"
                    },
                    {
                      "key": "fx_delta",
                      "label": "FX Delta",
                      "source_field": "risk_charges.fx.delta",
                      "format": "currency",
                      "unit": "USD"
                    }
                  ]
                },
                {
                  "key": "vega_risk",
                  "title": "Vega Risk",
                  "order": 2,
                  "metrics": [
                    {
                      "key": "girr_vega",
                      "label": "GIRR Vega",
                      "source_field": "risk_charges.girr.vega",
                      "format": "currency"
                    }
                  ]
                }
              ],
              "metadata": {
                "author": "system",
                "tags": ["frtb", "sa"]
              }
            }
            """;
    }

    // ========================================================================
    // Test 1: Valid complete definition returns empty error list
    // ========================================================================

    @Test
    void validate_validCompleteDefinition_returnsEmptyErrorList() {
        List<String> errors = validationService.validate(validDefinitionJson());

        assertTrue(errors.isEmpty(),
                "A valid definition should produce no errors, but got: " + errors);
    }

    // ========================================================================
    // Test 2: Invalid JSON string returns single parse error
    // ========================================================================

    @Test
    void validate_invalidJson_returnsSingleParseError() {
        String invalidJson = "{ this is not valid json }";

        List<String> errors = validationService.validate(invalidJson);

        assertEquals(1, errors.size(), "Should return exactly one error for invalid JSON");
        assertTrue(errors.get(0).startsWith("Invalid JSON:"),
                "Error message should start with 'Invalid JSON:', got: " + errors.get(0));
    }

    // ========================================================================
    // Test 3: Missing/wrong schema_version returns error
    // ========================================================================

    @Test
    void validate_missingOrWrongSchemaVersion_returnsError() {
        // Missing schema_version
        String missingVersion = """
            {
              "report_key": "test_report",
              "scenario_type": "FRTB_SA",
              "display_name": "Test",
              "sections": [
                {
                  "key": "s1",
                  "title": "Section 1",
                  "order": 1,
                  "metrics": [
                    {"key": "m1", "label": "Metric 1", "source_field": "a.b", "format": "number"}
                  ]
                }
              ]
            }
            """;

        List<String> errorsMissing = validationService.validate(missingVersion);
        assertTrue(errorsMissing.stream().anyMatch(e -> e.contains("schema_version") && e.contains("must be present")),
                "Should report missing schema_version, got: " + errorsMissing);

        // Wrong schema_version value
        String wrongVersion = """
            {
              "schema_version": "2.0",
              "report_key": "test_report",
              "scenario_type": "FRTB_SA",
              "display_name": "Test",
              "sections": [
                {
                  "key": "s1",
                  "title": "Section 1",
                  "order": 1,
                  "metrics": [
                    {"key": "m1", "label": "Metric 1", "source_field": "a.b", "format": "number"}
                  ]
                }
              ]
            }
            """;

        List<String> errorsWrong = validationService.validate(wrongVersion);
        assertTrue(errorsWrong.stream().anyMatch(e -> e.contains("schema_version") && e.contains("1.0")),
                "Should report wrong schema_version, got: " + errorsWrong);
    }

    // ========================================================================
    // Test 4: Missing/invalid report_key returns error
    // ========================================================================

    @Test
    void validate_missingOrInvalidReportKey_returnsError() {
        // Missing report_key
        String missingKey = """
            {
              "schema_version": "1.0",
              "scenario_type": "FRTB_SA",
              "display_name": "Test",
              "sections": [
                {
                  "key": "s1",
                  "title": "Section 1",
                  "order": 1,
                  "metrics": [
                    {"key": "m1", "label": "Metric 1", "source_field": "a.b", "format": "number"}
                  ]
                }
              ]
            }
            """;

        List<String> errorsMissing = validationService.validate(missingKey);
        assertTrue(errorsMissing.stream().anyMatch(e -> e.contains("report_key") && e.contains("must be present")),
                "Should report missing report_key, got: " + errorsMissing);

        // Invalid report_key (uppercase letters)
        String invalidKey = """
            {
              "schema_version": "1.0",
              "report_key": "InvalidKey!",
              "scenario_type": "FRTB_SA",
              "display_name": "Test",
              "sections": [
                {
                  "key": "s1",
                  "title": "Section 1",
                  "order": 1,
                  "metrics": [
                    {"key": "m1", "label": "Metric 1", "source_field": "a.b", "format": "number"}
                  ]
                }
              ]
            }
            """;

        List<String> errorsInvalid = validationService.validate(invalidKey);
        assertTrue(errorsInvalid.stream().anyMatch(e -> e.contains("report_key") && e.contains("pattern")),
                "Should report invalid report_key pattern, got: " + errorsInvalid);
    }

    // ========================================================================
    // Test 5: Missing/invalid scenario_type returns error
    // ========================================================================

    @Test
    void validate_missingOrInvalidScenarioType_returnsError() {
        // Missing scenario_type
        String missingType = """
            {
              "schema_version": "1.0",
              "report_key": "test_report",
              "display_name": "Test",
              "sections": [
                {
                  "key": "s1",
                  "title": "Section 1",
                  "order": 1,
                  "metrics": [
                    {"key": "m1", "label": "Metric 1", "source_field": "a.b", "format": "number"}
                  ]
                }
              ]
            }
            """;

        List<String> errorsMissing = validationService.validate(missingType);
        assertTrue(errorsMissing.stream().anyMatch(e -> e.contains("scenario_type") && e.contains("must be present")),
                "Should report missing scenario_type, got: " + errorsMissing);

        // Invalid scenario_type (lowercase)
        String invalidType = """
            {
              "schema_version": "1.0",
              "report_key": "test_report",
              "scenario_type": "invalid_lowercase",
              "display_name": "Test",
              "sections": [
                {
                  "key": "s1",
                  "title": "Section 1",
                  "order": 1,
                  "metrics": [
                    {"key": "m1", "label": "Metric 1", "source_field": "a.b", "format": "number"}
                  ]
                }
              ]
            }
            """;

        List<String> errorsInvalid = validationService.validate(invalidType);
        assertTrue(errorsInvalid.stream().anyMatch(e -> e.contains("scenario_type") && e.contains("pattern")),
                "Should report invalid scenario_type pattern, got: " + errorsInvalid);
    }

    // ========================================================================
    // Test 6: Empty sections array or section missing required fields
    // ========================================================================

    @Test
    void validate_emptySectionsOrSectionMissingFields_returnsErrors() {
        // Empty sections array
        String emptySections = """
            {
              "schema_version": "1.0",
              "report_key": "test_report",
              "scenario_type": "FRTB_SA",
              "display_name": "Test",
              "sections": []
            }
            """;

        List<String> errorsEmpty = validationService.validate(emptySections);
        assertTrue(errorsEmpty.stream().anyMatch(e -> e.contains("sections") && e.contains("non-empty")),
                "Should report empty sections array, got: " + errorsEmpty);

        // Section missing key, title, order, and metrics
        String sectionMissingFields = """
            {
              "schema_version": "1.0",
              "report_key": "test_report",
              "scenario_type": "FRTB_SA",
              "display_name": "Test",
              "sections": [
                {}
              ]
            }
            """;

        List<String> errorsMissing = validationService.validate(sectionMissingFields);
        assertTrue(errorsMissing.stream().anyMatch(e -> e.contains("sections[0].key")),
                "Should report missing section key, got: " + errorsMissing);
        assertTrue(errorsMissing.stream().anyMatch(e -> e.contains("sections[0].title")),
                "Should report missing section title, got: " + errorsMissing);
        assertTrue(errorsMissing.stream().anyMatch(e -> e.contains("sections[0].order")),
                "Should report missing section order, got: " + errorsMissing);
        assertTrue(errorsMissing.stream().anyMatch(e -> e.contains("sections[0].metrics")),
                "Should report missing section metrics, got: " + errorsMissing);
    }

    // ========================================================================
    // Test 7: Duplicate section keys and duplicate metric keys return errors
    // ========================================================================

    @Test
    void validate_duplicateSectionKeysOrDuplicateMetricKeys_returnsErrors() {
        // Duplicate section keys
        String duplicateSectionKeys = """
            {
              "schema_version": "1.0",
              "report_key": "test_report",
              "scenario_type": "FRTB_SA",
              "display_name": "Test",
              "sections": [
                {
                  "key": "same_key",
                  "title": "Section 1",
                  "order": 1,
                  "metrics": [
                    {"key": "m1", "label": "Metric 1", "source_field": "a.b", "format": "number"}
                  ]
                },
                {
                  "key": "same_key",
                  "title": "Section 2",
                  "order": 2,
                  "metrics": [
                    {"key": "m2", "label": "Metric 2", "source_field": "c.d", "format": "currency"}
                  ]
                }
              ]
            }
            """;

        List<String> sectionErrors = validationService.validate(duplicateSectionKeys);
        assertTrue(sectionErrors.stream().anyMatch(e -> e.contains("Duplicate section key") && e.contains("same_key")),
                "Should report duplicate section key, got: " + sectionErrors);

        // Duplicate metric keys within a section
        String duplicateMetricKeys = """
            {
              "schema_version": "1.0",
              "report_key": "test_report",
              "scenario_type": "FRTB_SA",
              "display_name": "Test",
              "sections": [
                {
                  "key": "section_one",
                  "title": "Section 1",
                  "order": 1,
                  "metrics": [
                    {"key": "dup_metric", "label": "Metric A", "source_field": "a.b", "format": "number"},
                    {"key": "dup_metric", "label": "Metric B", "source_field": "c.d", "format": "currency"}
                  ]
                }
              ]
            }
            """;

        List<String> metricErrors = validationService.validate(duplicateMetricKeys);
        assertTrue(metricErrors.stream().anyMatch(e -> e.contains("Duplicate metric key") && e.contains("dup_metric") && e.contains("section_one")),
                "Should report duplicate metric key in section, got: " + metricErrors);
    }

    // ========================================================================
    // Test 8: Metric with invalid format returns error with path
    // ========================================================================

    @Test
    void validate_metricWithInvalidFormat_returnsErrorWithPath() {
        String invalidFormat = """
            {
              "schema_version": "1.0",
              "report_key": "test_report",
              "scenario_type": "FRTB_SA",
              "display_name": "Test",
              "sections": [
                {
                  "key": "section_one",
                  "title": "Section 1",
                  "order": 1,
                  "metrics": [
                    {"key": "m1", "label": "Metric 1", "source_field": "a.b", "format": "number"},
                    {"key": "m2", "label": "Metric 2", "source_field": "c.d", "format": "currency"},
                    {"key": "m3", "label": "Metric 3", "source_field": "e.f", "format": "invalid"}
                  ]
                }
              ]
            }
            """;

        List<String> errors = validationService.validate(invalidFormat);

        assertEquals(1, errors.size(), "Should return exactly one error for the invalid format, got: " + errors);
        String error = errors.get(0);
        assertTrue(error.contains("sections[0].metrics[2].format"),
                "Error should include the field path 'sections[0].metrics[2].format', got: " + error);
        assertTrue(error.contains("must be one of [number, currency, percentage, text]"),
                "Error should list valid formats, got: " + error);
        assertTrue(error.contains("'invalid'"),
                "Error should include the invalid value, got: " + error);
    }
}
