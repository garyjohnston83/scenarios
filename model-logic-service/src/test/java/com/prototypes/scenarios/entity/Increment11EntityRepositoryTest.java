package com.prototypes.scenarios.entity;

import com.prototypes.scenarios.repository.ScenarioGridDatasetRepository;
import com.prototypes.scenarios.repository.ScenarioGridRowRepository;
import com.prototypes.scenarios.repository.ScenarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for Increment 11 JPA entity and repository layer (Task Group 1).
 * Boots the full Spring context with H2 in PostgreSQL compatibility mode so that
 * all Liquibase changesets are applied and seed data is available, then verifies
 * ScenarioGridDataset and ScenarioGridRow entity mappings and repository functionality.
 *
 * Uses @Transactional to keep the Hibernate session open during each test method,
 * allowing lazy-loaded relationships to be accessed.
 */
@SpringBootTest
@ActiveProfiles("integration")
@Transactional
class Increment11EntityRepositoryTest {

    @Autowired
    private ScenarioGridDatasetRepository scenarioGridDatasetRepository;

    @Autowired
    private ScenarioGridRowRepository scenarioGridRowRepository;

    @Autowired
    private ScenarioRepository scenarioRepository;

    // SA scenario seeded in changeset 017
    private static final UUID SA_SCENARIO_ID = UUID.fromString("d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80");

    // Direct Changes dataset seeded in changeset 018
    private static final UUID DIRECT_CHANGES_DATASET_ID = UUID.fromString("aa111111-1111-4111-8111-111111111111");

    // Impact Data dataset seeded in changeset 018
    private static final UUID IMPACT_DATA_DATASET_ID = UUID.fromString("bb222222-2222-4222-8222-222222222222");

    // ========================================================================
    // Test 1: ScenarioGridDataset entity can be persisted with all fields
    //         (scenario FK, datasetType, columnsJson, createdAt)
    // ========================================================================

    @Test
    void scenarioGridDataset_canBePersistedWithAllFields() {
        Scenario scenario = scenarioRepository.findById(SA_SCENARIO_ID).orElseThrow();

        ScenarioGridDataset dataset = new ScenarioGridDataset();
        dataset.setId(UUID.randomUUID());
        dataset.setScenario(scenario);
        dataset.setDatasetType("TEST_TYPE");
        dataset.setColumnsJson("[\"Col1\",\"Col2\"]");
        dataset.setCreatedAt(LocalDateTime.of(2026, 2, 22, 10, 0, 0));

        ScenarioGridDataset saved = scenarioGridDatasetRepository.save(dataset);
        scenarioGridDatasetRepository.flush();

        ScenarioGridDataset fetched = scenarioGridDatasetRepository.findById(saved.getId()).orElseThrow();
        assertEquals("TEST_TYPE", fetched.getDatasetType());
        assertEquals("[\"Col1\",\"Col2\"]", fetched.getColumnsJson());
        assertNotNull(fetched.getCreatedAt());
        assertNotNull(fetched.getScenario());
        assertEquals(SA_SCENARIO_ID, fetched.getScenario().getId());
    }

    // ========================================================================
    // Test 2: ScenarioGridRow entity can be persisted with all fields
    //         (dataset FK, rowPayloadJson, createdAt)
    // ========================================================================

    @Test
    void scenarioGridRow_canBePersistedWithAllFields() {
        ScenarioGridDataset dataset = scenarioGridDatasetRepository.findById(DIRECT_CHANGES_DATASET_ID).orElseThrow();

        ScenarioGridRow row = new ScenarioGridRow();
        row.setId(UUID.randomUUID());
        row.setDataset(dataset);
        row.setRowPayloadJson("{\"Risk Factor\":\"TEST_RF\",\"Current Value\":99.9}");
        row.setCreatedAt(LocalDateTime.of(2026, 2, 22, 11, 0, 0));

        ScenarioGridRow saved = scenarioGridRowRepository.save(row);
        scenarioGridRowRepository.flush();

        ScenarioGridRow fetched = scenarioGridRowRepository.findById(saved.getId()).orElseThrow();
        assertEquals("{\"Risk Factor\":\"TEST_RF\",\"Current Value\":99.9}", fetched.getRowPayloadJson());
        assertNotNull(fetched.getCreatedAt());
        assertNotNull(fetched.getDataset());
        assertEquals(DIRECT_CHANGES_DATASET_ID, fetched.getDataset().getId());
    }

    // ========================================================================
    // Test 3: ScenarioGridDatasetRepository.findByScenarioIdAndDatasetType
    //         returns correct dataset for DIRECT_CHANGES
    // ========================================================================

    @Test
    void findByScenarioIdAndDatasetType_returnsCorrectDatasetForDirectChanges() {
        Optional<ScenarioGridDataset> result = scenarioGridDatasetRepository
                .findByScenarioIdAndDatasetType(SA_SCENARIO_ID, "DIRECT_CHANGES");

        assertTrue(result.isPresent(), "Should find DIRECT_CHANGES dataset for SA scenario");
        ScenarioGridDataset dataset = result.get();
        assertEquals(DIRECT_CHANGES_DATASET_ID, dataset.getId());
        assertEquals("DIRECT_CHANGES", dataset.getDatasetType());
        assertTrue(dataset.getColumnsJson().contains("Risk Factor"),
                "columns_json should contain 'Risk Factor'");
        assertTrue(dataset.getColumnsJson().contains("Delta"),
                "columns_json should contain 'Delta'");
    }

    // ========================================================================
    // Test 4: ScenarioGridDatasetRepository.findByScenarioIdAndDatasetType
    //         returns correct dataset for IMPACT_DATA
    // ========================================================================

    @Test
    void findByScenarioIdAndDatasetType_returnsCorrectDatasetForImpactData() {
        Optional<ScenarioGridDataset> result = scenarioGridDatasetRepository
                .findByScenarioIdAndDatasetType(SA_SCENARIO_ID, "IMPACT_DATA");

        assertTrue(result.isPresent(), "Should find IMPACT_DATA dataset for SA scenario");
        ScenarioGridDataset dataset = result.get();
        assertEquals(IMPACT_DATA_DATASET_ID, dataset.getId());
        assertEquals("IMPACT_DATA", dataset.getDatasetType());
        assertTrue(dataset.getColumnsJson().contains("Risk Class"),
                "columns_json should contain 'Risk Class'");
        assertTrue(dataset.getColumnsJson().contains("Capital Charge"),
                "columns_json should contain 'Capital Charge'");
    }

    // ========================================================================
    // Test 5: ScenarioGridRowRepository.findByDatasetIdOrderByCreatedAtAsc
    //         returns rows in correct order
    // ========================================================================

    @Test
    void findByDatasetIdOrderByCreatedAtAsc_returnsRowsInCorrectOrder() {
        List<ScenarioGridRow> rows = scenarioGridRowRepository
                .findByDatasetIdOrderByCreatedAtAsc(DIRECT_CHANGES_DATASET_ID);

        assertEquals(5, rows.size(), "Should have 5 rows for DIRECT_CHANGES dataset");

        // Verify ordering by created_at ascending
        for (int i = 1; i < rows.size(); i++) {
            assertTrue(
                    rows.get(i).getCreatedAt().isAfter(rows.get(i - 1).getCreatedAt())
                            || rows.get(i).getCreatedAt().isEqual(rows.get(i - 1).getCreatedAt()),
                    "Rows should be ordered by createdAt ascending");
        }

        // Verify first row contains expected seed data
        String firstPayload = rows.get(0).getRowPayloadJson();
        assertTrue(firstPayload.contains("FX_USDJPY"),
                "First row should contain FX_USDJPY risk factor");
    }

    // ========================================================================
    // Test 6: ScenarioGridDatasetRepository.findByScenarioIdAndDatasetType
    //         returns empty Optional for non-existent combination
    // ========================================================================

    @Test
    void findByScenarioIdAndDatasetType_returnsEmptyForNonExistentCombination() {
        // Use the FX Curve Recalibration scenario which has no grid datasets
        UUID fxCurveScenarioId = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

        Optional<ScenarioGridDataset> result = scenarioGridDatasetRepository
                .findByScenarioIdAndDatasetType(fxCurveScenarioId, "DIRECT_CHANGES");

        assertFalse(result.isPresent(),
                "Should return empty Optional for scenario with no grid datasets");
    }
}
