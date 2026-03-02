package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ScenarioGridDataset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScenarioGridDatasetRepository extends JpaRepository<ScenarioGridDataset, UUID> {

    Optional<ScenarioGridDataset> findByScenarioIdAndDatasetType(UUID scenarioId, String datasetType);

    List<ScenarioGridDataset> findByScenarioIdAndDatasetTypeOrderByCreatedAtAsc(UUID scenarioId, String datasetType);
}
