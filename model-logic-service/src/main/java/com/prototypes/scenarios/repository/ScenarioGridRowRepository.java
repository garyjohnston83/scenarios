package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ScenarioGridRow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ScenarioGridRowRepository extends JpaRepository<ScenarioGridRow, UUID> {

    List<ScenarioGridRow> findByDatasetIdOrderByCreatedAtAsc(UUID datasetId);
}
