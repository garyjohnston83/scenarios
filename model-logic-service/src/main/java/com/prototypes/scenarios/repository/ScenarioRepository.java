package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.Scenario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScenarioRepository extends JpaRepository<Scenario, UUID> {

    @Query("SELECT s FROM Scenario s JOIN FETCH s.summary")
    List<Scenario> findAllWithSummary();

    @Query("SELECT s FROM Scenario s JOIN FETCH s.summary JOIN FETCH s.scenarioType WHERE s.id = :id")
    Optional<Scenario> findByIdWithSummary(@Param("id") UUID id);

    @Query("SELECT s FROM Scenario s JOIN FETCH s.summary WHERE s.id IN :ids")
    List<Scenario> findAllWithSummaryByIds(@Param("ids") List<UUID> ids);
}
