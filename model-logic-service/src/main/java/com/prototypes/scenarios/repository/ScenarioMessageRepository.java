package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ScenarioMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ScenarioMessageRepository extends JpaRepository<ScenarioMessage, UUID> {

    List<ScenarioMessage> findByScenarioIdOrderByCreatedAtAsc(UUID scenarioId);
}
