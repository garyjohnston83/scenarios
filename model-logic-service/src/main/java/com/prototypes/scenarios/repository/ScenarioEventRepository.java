package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ScenarioEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ScenarioEventRepository extends JpaRepository<ScenarioEvent, UUID> {

    List<ScenarioEvent> findByScenarioIdOrderByCreatedAtAsc(UUID scenarioId);
}
