package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ScenarioType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScenarioTypeRepository extends JpaRepository<ScenarioType, String> {
}
