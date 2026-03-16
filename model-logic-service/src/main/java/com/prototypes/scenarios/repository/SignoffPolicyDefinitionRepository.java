package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.SignoffPolicyDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SignoffPolicyDefinitionRepository extends JpaRepository<SignoffPolicyDefinition, UUID> {

    List<SignoffPolicyDefinition> findAllByScenarioTypeCodeOrderByPolicyKeyAscVersionDesc(String scenarioTypeCode);

    @Query("SELECT MAX(spd.version) FROM SignoffPolicyDefinition spd WHERE spd.scenarioTypeCode = :scenarioTypeCode AND spd.policyKey = :policyKey")
    Optional<Integer> findMaxVersion(@Param("scenarioTypeCode") String scenarioTypeCode,
                                     @Param("policyKey") String policyKey);

    long countByScenarioTypeCodeAndIsActiveTrue(String scenarioTypeCode);

    Optional<SignoffPolicyDefinition> findFirstByScenarioTypeCodeAndPolicyKeyAndIsActiveTrueOrderByVersionDesc(
            String scenarioTypeCode, String policyKey);
}
