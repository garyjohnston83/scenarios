package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.SignoffPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SignoffPolicyRepository extends JpaRepository<SignoffPolicy, UUID> {

    Optional<SignoffPolicy> findFirstByScenarioTypeCodeAndIsEnabledTrueOrderByPriorityAscUpdatedAtDesc(String scenarioTypeCode);

    List<SignoffPolicy> findAllByScenarioTypeCode(String scenarioTypeCode);
}
