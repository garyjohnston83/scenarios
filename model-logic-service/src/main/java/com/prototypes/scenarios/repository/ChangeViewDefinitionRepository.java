package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ChangeViewDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChangeViewDefinitionRepository extends JpaRepository<ChangeViewDefinition, UUID> {

    List<ChangeViewDefinition> findAllByScenarioTypeCodeOrderByTemplateKeyAscVersionDesc(String scenarioTypeCode);

    @Query("SELECT MAX(cvd.version) FROM ChangeViewDefinition cvd WHERE cvd.scenarioTypeCode = :scenarioTypeCode AND cvd.templateKey = :templateKey")
    Optional<Integer> findMaxVersion(@Param("scenarioTypeCode") String scenarioTypeCode,
                                     @Param("templateKey") String templateKey);

    long countByScenarioTypeCodeAndIsActiveTrue(String scenarioTypeCode);

    Optional<ChangeViewDefinition> findFirstByScenarioTypeCodeAndTemplateKeyAndIsActiveTrueOrderByVersionDesc(
            String scenarioTypeCode, String templateKey);
}
