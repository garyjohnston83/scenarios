package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.CreateReportDefinitionRequestDto;
import com.prototypes.scenarios.dto.ReportDefinitionDto;
import com.prototypes.scenarios.entity.ReportDefinition;
import com.prototypes.scenarios.repository.ReportDefinitionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Task Group 5: ReportDefinitionService integration tests.
 *
 * Uses the full Spring context with H2 in PostgreSQL compatibility mode
 * so that all Liquibase changesets and seed data are available.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class ReportDefinitionServiceTest {

    @Autowired
    private ReportDefinitionService reportDefinitionService;

    @Autowired
    private ReportDefinitionRepository reportDefinitionRepository;

    private static final String VALID_DEFINITION = """
            {
              "schema_version": "1.0",
              "report_key": "test_report",
              "scenario_type": "FRTB_SA",
              "display_name": "Test Report",
              "description": "A test report definition.",
              "sections": [
                {
                  "key": "section_one",
                  "title": "Section One",
                  "order": 1,
                  "metrics": [
                    {
                      "key": "metric_a",
                      "label": "Metric A",
                      "source_field": "data.metric_a",
                      "format": "currency",
                      "unit": "USD"
                    }
                  ]
                }
              ],
              "metadata": {
                "author": "test",
                "tags": ["test"]
              }
            }
            """;

    private static final String INVALID_DEFINITION = """
            {
              "report_key": "test_report",
              "scenario_type": "FRTB_SA",
              "display_name": "Test Report"
            }
            """;

    // ========================================================================
    // Test 1: listDefinitions(null) returns all active definitions
    // ========================================================================

    @Test
    void listDefinitions_withNull_returnsAllActive() {
        // Insert an active and an inactive definition
        ReportDefinition active = new ReportDefinition();
        active.setId(UUID.randomUUID());
        active.setScenarioTypeCode("MARKET_DATA");
        active.setReportKey("test_active");
        active.setVersion(1);
        active.setDefinition(VALID_DEFINITION);
        active.setActive(true);
        active.setCreatedAt(LocalDateTime.now());
        active.setUpdatedAt(LocalDateTime.now());
        reportDefinitionRepository.saveAndFlush(active);

        ReportDefinition inactive = new ReportDefinition();
        inactive.setId(UUID.randomUUID());
        inactive.setScenarioTypeCode("MARKET_DATA");
        inactive.setReportKey("test_inactive");
        inactive.setVersion(1);
        inactive.setDefinition(VALID_DEFINITION);
        inactive.setActive(false);
        inactive.setCreatedAt(LocalDateTime.now());
        inactive.setUpdatedAt(LocalDateTime.now());
        reportDefinitionRepository.saveAndFlush(inactive);

        List<ReportDefinitionDto> results = reportDefinitionService.listDefinitions(null);

        // Should include seed data + our active definition, but NOT the inactive one
        assertTrue(results.stream().allMatch(ReportDefinitionDto::isActive),
                "All returned definitions should be active");
        assertTrue(results.stream().anyMatch(d -> "test_active".equals(d.reportKey())),
                "Should include our active test definition");
        assertTrue(results.stream().noneMatch(d -> "test_inactive".equals(d.reportKey())),
                "Should not include our inactive test definition");
    }

    // ========================================================================
    // Test 2: listDefinitions("FRTB_SA") returns only active FRTB_SA definitions
    // ========================================================================

    @Test
    void listDefinitions_withScenarioTypeCode_returnsOnlyMatchingActive() {
        List<ReportDefinitionDto> results = reportDefinitionService.listDefinitions("FRTB_SA");

        assertFalse(results.isEmpty(), "Should return at least the seed FRTB_SA definition");
        assertTrue(results.stream().allMatch(d -> "FRTB_SA".equals(d.scenarioTypeCode())),
                "All returned definitions should be for FRTB_SA");
        assertTrue(results.stream().allMatch(ReportDefinitionDto::isActive),
                "All returned definitions should be active");
    }

    // ========================================================================
    // Test 3: createDefinition persists version 1, second create gets version 2
    // ========================================================================

    @Test
    void createDefinition_validRequest_autoIncrementsVersion() {
        CreateReportDefinitionRequestDto request = new CreateReportDefinitionRequestDto(
                "FRTB_SA", "new_test_report", VALID_DEFINITION);

        // First create: should be version 1
        ReportDefinitionDto first = reportDefinitionService.createDefinition(request);
        assertNotNull(first.id());
        assertEquals("FRTB_SA", first.scenarioTypeCode());
        assertEquals("new_test_report", first.reportKey());
        assertEquals(1, first.version());
        assertTrue(first.isActive());
        assertNotNull(first.createdAt());
        assertNotNull(first.updatedAt());

        // Second create for same (scenarioTypeCode, reportKey): should be version 2
        ReportDefinitionDto second = reportDefinitionService.createDefinition(request);
        assertEquals(2, second.version());
        assertEquals("new_test_report", second.reportKey());
    }

    // ========================================================================
    // Test 4: createDefinition with invalid definition throws 422
    // ========================================================================

    @Test
    void createDefinition_invalidDefinition_throws422() {
        CreateReportDefinitionRequestDto request = new CreateReportDefinitionRequestDto(
                "FRTB_SA", "bad_report", INVALID_DEFINITION);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> reportDefinitionService.createDefinition(request));

        assertEquals(422, exception.getStatusCode().value(),
                "Should return 422 UNPROCESSABLE_ENTITY for invalid definition JSON");
    }

    // ========================================================================
    // Test 5: deactivateDefinition sets isActive to false
    // ========================================================================

    @Test
    void deactivateDefinition_setsIsActiveFalse() {
        // Create a definition first
        CreateReportDefinitionRequestDto request = new CreateReportDefinitionRequestDto(
                "FRTB_SA", "deactivate_test", VALID_DEFINITION);
        ReportDefinitionDto created = reportDefinitionService.createDefinition(request);
        assertTrue(created.isActive());

        // Deactivate it
        ReportDefinitionDto deactivated = reportDefinitionService.deactivateDefinition(created.id());

        assertFalse(deactivated.isActive(), "isActive should be false after deactivation");
        assertEquals(created.id(), deactivated.id());
        assertNotNull(deactivated.updatedAt());
    }

    // ========================================================================
    // Test 6: deactivateDefinition with nonexistent ID throws 404
    // ========================================================================

    @Test
    void deactivateDefinition_nonExistentId_throws404() {
        UUID nonExistentId = UUID.fromString("00000000-0000-0000-0000-000000000099");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> reportDefinitionService.deactivateDefinition(nonExistentId));

        assertEquals(404, exception.getStatusCode().value(),
                "Should return 404 NOT_FOUND for nonexistent definition ID");
    }
}
