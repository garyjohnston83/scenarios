package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ScenarioLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ScenarioLinkRepository extends JpaRepository<ScenarioLink, UUID> {

    Optional<ScenarioLink> findByScenarioIdAndLinkType(UUID scenarioId, String linkType);
}
