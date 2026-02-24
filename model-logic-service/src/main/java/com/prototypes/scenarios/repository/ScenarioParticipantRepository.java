package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ScenarioParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScenarioParticipantRepository extends JpaRepository<ScenarioParticipant, UUID> {

    List<ScenarioParticipant> findByScenarioIdAndRole(UUID scenarioId, String role);

    Optional<ScenarioParticipant> findByScenarioIdAndUserId(UUID scenarioId, String userId);
}
