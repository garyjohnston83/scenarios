package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ScenarioTypeDataTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScenarioTypeDataTemplateRepository extends JpaRepository<ScenarioTypeDataTemplate, UUID> {

    List<ScenarioTypeDataTemplate> findAllByScenarioTypeCodeOrderByVersionDesc(String scenarioTypeCode);

    Optional<ScenarioTypeDataTemplate> findByScenarioTypeCodeAndIsActiveTrue(String scenarioTypeCode);

    @Query("SELECT MAX(t.version) FROM ScenarioTypeDataTemplate t WHERE t.scenarioTypeCode = :scenarioTypeCode")
    Optional<Integer> findMaxVersion(@Param("scenarioTypeCode") String scenarioTypeCode);
}
