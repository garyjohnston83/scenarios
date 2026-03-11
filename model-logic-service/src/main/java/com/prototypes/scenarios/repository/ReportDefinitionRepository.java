package com.prototypes.scenarios.repository;

import com.prototypes.scenarios.entity.ReportDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReportDefinitionRepository extends JpaRepository<ReportDefinition, UUID> {

    List<ReportDefinition> findAllByIsActiveTrue();

    List<ReportDefinition> findAllByScenarioTypeCodeAndIsActiveTrue(String scenarioTypeCode);

    Optional<ReportDefinition> findFirstByReportKeyAndIsActiveTrueOrderByVersionDesc(String reportKey);

    List<ReportDefinition> findAllByReportKeyOrderByVersionDesc(String reportKey);

    @Query("SELECT MAX(rd.version) FROM ReportDefinition rd WHERE rd.scenarioTypeCode = :scenarioTypeCode AND rd.reportKey = :reportKey")
    Optional<Integer> findMaxVersion(@Param("scenarioTypeCode") String scenarioTypeCode,
                                     @Param("reportKey") String reportKey);
}
