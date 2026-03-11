package com.prototypes.scenarios.service;

import com.prototypes.scenarios.entity.ReportDefinition;
import com.prototypes.scenarios.entity.Scenario;
import com.prototypes.scenarios.repository.ReportDefinitionRepository;
import com.prototypes.scenarios.repository.ScenarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Orchestrates impact report snapshot generation for a scenario.
 * For each active report definition matching the scenario's type,
 * delegates to {@link ImpactReportSnapshotGenerator} which runs
 * each report generation in its own REQUIRES_NEW transaction.
 *
 * <p>This ensures that one failing report does not block other reports
 * from being generated, and failures do not roll back the caller's transaction.</p>
 */
@Service
public class ImpactReportGenerationService {

    private static final Logger logger = LoggerFactory.getLogger(ImpactReportGenerationService.class);

    private final ScenarioRepository scenarioRepository;
    private final ReportDefinitionRepository reportDefinitionRepository;
    private final ImpactReportSnapshotGenerator snapshotGenerator;

    public ImpactReportGenerationService(ScenarioRepository scenarioRepository,
                                          ReportDefinitionRepository reportDefinitionRepository,
                                          ImpactReportSnapshotGenerator snapshotGenerator) {
        this.scenarioRepository = scenarioRepository;
        this.reportDefinitionRepository = reportDefinitionRepository;
        this.snapshotGenerator = snapshotGenerator;
    }

    /**
     * Generates impact report snapshots for all active report definitions
     * matching the given scenario's type.
     *
     * @param scenarioId the UUID of the scenario to generate reports for
     * @throws ResponseStatusException with 404 status if the scenario is not found
     */
    public void generateReportsForScenario(UUID scenarioId) {
        // 1. Fetch scenario entity
        Scenario scenario = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Scenario not found: " + scenarioId));

        // 2. Resolve scenario type code
        String scenarioTypeCode = scenario.getScenarioTypeCode();

        // 3. Query active report definitions for this scenario type
        List<ReportDefinition> activeDefinitions =
                reportDefinitionRepository.findAllByScenarioTypeCodeAndIsActiveTrue(scenarioTypeCode);

        if (activeDefinitions.isEmpty()) {
            logger.warn("No active report definitions found for scenario type: {}", scenarioTypeCode);
            return;
        }

        // 4. Generate reports for each definition
        int generated = 0;
        int failed = 0;

        for (ReportDefinition definition : activeDefinitions) {
            try {
                snapshotGenerator.generateSingleReport(scenario, definition);
                generated++;
            } catch (Exception e) {
                logger.error("Failed to generate report {} for scenario {}: {}",
                        definition.getReportKey(), scenarioId, e.getMessage());
                try {
                    snapshotGenerator.saveFailedReport(scenario, definition, e.getMessage());
                } catch (Exception saveError) {
                    logger.error("Failed to save error report for {}: {}",
                            definition.getReportKey(), saveError.getMessage());
                }
                failed++;
            }
        }

        // 5. Log summary
        int total = activeDefinitions.size();
        logger.info("Generated {} of {} reports for scenario {} ({} failed)",
                generated, total, scenarioId, failed);
    }
}
