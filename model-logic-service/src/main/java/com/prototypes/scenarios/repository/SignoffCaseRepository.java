package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.SignoffCase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SignoffCaseRepository extends JpaRepository<SignoffCase, UUID> {

    Optional<SignoffCase> findByScenarioId(UUID scenarioId);
}
