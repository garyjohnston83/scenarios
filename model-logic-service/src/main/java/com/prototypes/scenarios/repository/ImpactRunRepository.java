package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ImpactRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ImpactRunRepository extends JpaRepository<ImpactRun, UUID> {

    Optional<ImpactRun> findTopByScenarioIdOrderByStartedAtDesc(UUID scenarioId);
}
