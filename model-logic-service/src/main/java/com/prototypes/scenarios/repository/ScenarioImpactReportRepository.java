package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ScenarioImpactReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScenarioImpactReportRepository extends JpaRepository<ScenarioImpactReport, UUID> {

    List<ScenarioImpactReport> findAllByScenarioIdOrderByGeneratedAtDesc(UUID scenarioId);

    Optional<ScenarioImpactReport> findFirstByScenarioIdAndReportKeyOrderByGeneratedAtDesc(UUID scenarioId, String reportKey);

    List<ScenarioImpactReport> findAllByScenarioId(UUID scenarioId);

    List<ScenarioImpactReport> findAllByScenarioIdOrderByGeneratedAtAsc(UUID scenarioId);

    Optional<ScenarioImpactReport> findByIdAndScenarioId(UUID id, UUID scenarioId);
}
