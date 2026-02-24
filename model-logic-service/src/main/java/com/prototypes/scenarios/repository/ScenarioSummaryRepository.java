package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ScenarioSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ScenarioSummaryRepository extends JpaRepository<ScenarioSummary, UUID> {
}
