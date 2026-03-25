package com.prototypes.scenarios.entity;

import com.prototypes.scenarios.repository.ChangeViewDefinitionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for the new ChangeViewDefinitionRepository query method
 * findAllByScenarioTypeCodeAndIsActiveTrue().
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode so that
 * all Liquibase changesets are applied and seed data is available.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class ChangeViewDefinitionRepositoryQueryTest {

    @Autowired
    private ChangeViewDefinitionRepository changeViewDefinitionRepository;

    // ========================================================================
    // Test 1: findAllByScenarioTypeCodeAndIsActiveTrue returns only active
    //         definitions for the given scenario type code
    // ========================================================================

    @Test
    void findAllByScenarioTypeCodeAndIsActiveTrue_returnsOnlyActiveDefinitionsForGivenType() {
        // Insert an inactive definition for MARKET_DATA to verify filtering
        ChangeViewDefinition inactive = new ChangeViewDefinition();
        inactive.setId(UUID.fromString("dddddddd-dddd-4ddd-8ddd-dddddddddd01"));
        inactive.setScenarioTypeCode("MARKET_DATA");
        inactive.setTemplateKey("market_data_inactive_test");
        inactive.setVersion(1);
        inactive.setDefinition("{\"renderMode\":\"FULL_DATA_CHANGES\"}");
        inactive.setActive(false);
        inactive.setCreatedAt(LocalDateTime.now());
        inactive.setUpdatedAt(LocalDateTime.now());
        changeViewDefinitionRepository.save(inactive);

        // Insert a second active definition for MARKET_DATA
        ChangeViewDefinition active2 = new ChangeViewDefinition();
        active2.setId(UUID.fromString("dddddddd-dddd-4ddd-8ddd-dddddddddd02"));
        active2.setScenarioTypeCode("MARKET_DATA");
        active2.setTemplateKey("market_data_active_test");
        active2.setVersion(1);
        active2.setDefinition("{\"renderMode\":\"DELTA_BY_UNIQUE_ID\"}");
        active2.setActive(true);
        active2.setCreatedAt(LocalDateTime.now());
        active2.setUpdatedAt(LocalDateTime.now());
        changeViewDefinitionRepository.save(active2);

        changeViewDefinitionRepository.flush();

        // Query for active MARKET_DATA definitions
        List<ChangeViewDefinition> results =
                changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue("MARKET_DATA");

        // Should include the original seed definition (cccccccc-cccc-4ccc-8ccc-ccccccccc002) + the new active one
        // but NOT the inactive one
        assertTrue(results.size() >= 2, "Should return at least 2 active definitions for MARKET_DATA");

        // Verify all returned definitions are active and have the correct scenario type code
        for (ChangeViewDefinition def : results) {
            assertTrue(def.isActive(), "Every returned definition should be active");
            assertEquals("MARKET_DATA", def.getScenarioTypeCode(),
                    "Every returned definition should be for MARKET_DATA");
        }

        // Verify the inactive definition is NOT in the results
        boolean containsInactive = results.stream()
                .anyMatch(d -> d.getId().equals(UUID.fromString("dddddddd-dddd-4ddd-8ddd-dddddddddd01")));
        assertTrue(!containsInactive, "Results should NOT contain the inactive definition");
    }

    // ========================================================================
    // Test 2: findAllByScenarioTypeCodeAndIsActiveTrue returns empty list
    //         when no active definitions exist
    // ========================================================================

    @Test
    void findAllByScenarioTypeCodeAndIsActiveTrue_returnsEmptyListWhenNoActiveDefinitionsExist() {
        // Use a scenario type code that has no definitions at all
        List<ChangeViewDefinition> results =
                changeViewDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue("NONEXISTENT_TYPE");

        assertTrue(results.isEmpty(), "Should return empty list for a scenario type code with no active definitions");
    }
}
