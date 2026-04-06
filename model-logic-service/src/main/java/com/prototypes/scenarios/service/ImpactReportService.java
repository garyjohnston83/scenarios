package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.ImpactReportDetailDto;
import com.prototypes.scenarios.dto.ImpactReportSummaryDto;
import com.prototypes.scenarios.entity.ScenarioImpactReport;
import com.prototypes.scenarios.repository.ScenarioImpactReportRepository;
import com.prototypes.scenarios.repository.ScenarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Service for retrieving persisted impact report snapshots.
 * Validates scenario existence, enforces report ownership,
 * and parses the renderedReport JSON string into a JsonNode
 * for native JSON serialization in the API response.
 */
@Service
public class ImpactReportService {

    private static final Logger logger = LoggerFactory.getLogger(ImpactReportService.class);

    private final ScenarioRepository scenarioRepository;
    private final ScenarioImpactReportRepository scenarioImpactReportRepository;
    private final ObjectMapper objectMapper;

    public ImpactReportService(ScenarioRepository scenarioRepository,
                               ScenarioImpactReportRepository scenarioImpactReportRepository,
                               ObjectMapper objectMapper) {
        this.scenarioRepository = scenarioRepository;
        this.scenarioImpactReportRepository = scenarioImpactReportRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Returns all impact report summaries for the given scenario,
     * ordered by generatedAt ascending (oldest first).
     *
     * @param scenarioId the UUID of the scenario
     * @return list of summary DTOs (may be empty if the scenario has no reports)
     * @throws ResponseStatusException with 404 status if the scenario does not exist
     */
    public List<ImpactReportSummaryDto> getReportsForScenario(UUID scenarioId) {
        logger.info("getReportsForScenario scenarioId={}", scenarioId);
        if (!scenarioRepository.existsById(scenarioId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Scenario not found: " + scenarioId);
        }

        List<ScenarioImpactReport> reports =
                scenarioImpactReportRepository.findAllByScenarioIdOrderByGeneratedAtAsc(scenarioId);

        return reports.stream()
                .map(this::toSummaryDto)
                .toList();
    }

    /**
     * Returns the full detail of a single impact report, including the
     * renderedReport parsed from a JSON string into a JsonNode and
     * the errorMessage (nullable).
     *
     * @param scenarioId the UUID of the scenario (for ownership validation)
     * @param reportId   the UUID of the impact report
     * @return detail DTO with parsed renderedReport and errorMessage
     * @throws ResponseStatusException with 404 status if the scenario or report does not exist,
     *                                 or if the report does not belong to the given scenario
     */
    public ImpactReportDetailDto getReportDetail(UUID scenarioId, UUID reportId) {
        logger.info("getReportDetail scenarioId={} reportId={}", scenarioId, reportId);
        if (!scenarioRepository.existsById(scenarioId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Scenario not found: " + scenarioId);
        }

        ScenarioImpactReport report = scenarioImpactReportRepository.findByIdAndScenarioId(reportId, scenarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Impact report not found: " + reportId));

        return toDetailDto(report);
    }

    private ImpactReportSummaryDto toSummaryDto(ScenarioImpactReport entity) {
        return new ImpactReportSummaryDto(
                entity.getId(),
                entity.getScenarioId(),
                entity.getReportDefinitionId(),
                entity.getDefinitionVersion(),
                entity.getReportKey(),
                entity.getReportName(),
                entity.getGeneratedAt(),
                entity.getStatus()
        );
    }

    private ImpactReportDetailDto toDetailDto(ScenarioImpactReport entity) {
        Object renderedReport = null;

        if (entity.getRenderedReport() != null) {
            try {
                renderedReport = objectMapper.readTree(entity.getRenderedReport());
            } catch (JsonProcessingException e) {
                logger.warn("Failed to parse renderedReport for report {}: {}", entity.getId(), e.getMessage());
            }
        }

        return new ImpactReportDetailDto(
                entity.getId(),
                entity.getScenarioId(),
                entity.getReportDefinitionId(),
                entity.getDefinitionVersion(),
                entity.getReportKey(),
                entity.getReportName(),
                entity.getGeneratedAt(),
                entity.getStatus(),
                renderedReport,
                entity.getErrorMessage()
        );
    }
}
