package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.ImpactExecutionSummaryDto;
import com.prototypes.scenarios.dto.ScenarioTypeAdminDetailDto;
import com.prototypes.scenarios.dto.ScenarioTypeAdminDto;
import com.prototypes.scenarios.dto.UpdateNavigationViewModeRequest;
import com.prototypes.scenarios.dto.UpdateScenarioTypeRequest;
import com.prototypes.scenarios.entity.ScenarioType;
import com.prototypes.scenarios.repository.ChangeViewDefinitionRepository;
import com.prototypes.scenarios.repository.ReportDefinitionRepository;
import com.prototypes.scenarios.repository.ScenarioTypeRepository;
import com.prototypes.scenarios.repository.SignoffPolicyDefinitionRepository;
import com.prototypes.scenarios.repository.SignoffPolicyRepository;
import com.prototypes.scenarios.service.reporting.ReportDataProvider;
import com.prototypes.scenarios.service.reporting.ReportDataProviderRegistry;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class ScenarioTypeAdminService {

    private final ScenarioTypeRepository scenarioTypeRepository;
    private final ReportDefinitionRepository reportDefinitionRepository;
    private final SignoffPolicyRepository signoffPolicyRepository;
    private final ChangeViewDefinitionRepository changeViewDefinitionRepository;
    private final SignoffPolicyDefinitionRepository signoffPolicyDefinitionRepository;
    private final ReportDataProviderRegistry reportDataProviderRegistry;

    public ScenarioTypeAdminService(ScenarioTypeRepository scenarioTypeRepository,
                                    ReportDefinitionRepository reportDefinitionRepository,
                                    SignoffPolicyRepository signoffPolicyRepository,
                                    ChangeViewDefinitionRepository changeViewDefinitionRepository,
                                    SignoffPolicyDefinitionRepository signoffPolicyDefinitionRepository,
                                    ReportDataProviderRegistry reportDataProviderRegistry) {
        this.scenarioTypeRepository = scenarioTypeRepository;
        this.reportDefinitionRepository = reportDefinitionRepository;
        this.signoffPolicyRepository = signoffPolicyRepository;
        this.changeViewDefinitionRepository = changeViewDefinitionRepository;
        this.signoffPolicyDefinitionRepository = signoffPolicyDefinitionRepository;
        this.reportDataProviderRegistry = reportDataProviderRegistry;
    }

    public List<ScenarioTypeAdminDto> listAll() {
        return scenarioTypeRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toDto)
                .toList();
    }

    public ScenarioTypeAdminDetailDto getDetail(String code) {
        ScenarioType entity = scenarioTypeRepository.findById(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Scenario type not found: " + code));

        long reportCount = reportDefinitionRepository.countByScenarioTypeCodeAndIsActiveTrue(code);
        long policyCount = signoffPolicyRepository.countByScenarioTypeCodeAndIsEnabledTrue(code);
        long changeViewCount = changeViewDefinitionRepository.countByScenarioTypeCodeAndIsActiveTrue(code);
        long signoffPolicyDefinitionCount = signoffPolicyDefinitionRepository.countByScenarioTypeCodeAndIsActiveTrue(code);

        return toDetailDto(entity, reportCount, policyCount, changeViewCount, signoffPolicyDefinitionCount);
    }

    public ScenarioTypeAdminDetailDto update(String code, UpdateScenarioTypeRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }

        ScenarioType entity = scenarioTypeRepository.findById(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Scenario type not found: " + code));

        entity.setName(request.name());
        entity.setIcon(request.icon());
        entity.setEnabled(request.isEnabled());
        entity.setSortOrder(request.sortOrder());

        scenarioTypeRepository.save(entity);

        long reportCount = reportDefinitionRepository.countByScenarioTypeCodeAndIsActiveTrue(code);
        long policyCount = signoffPolicyRepository.countByScenarioTypeCodeAndIsEnabledTrue(code);
        long changeViewCount = changeViewDefinitionRepository.countByScenarioTypeCodeAndIsActiveTrue(code);
        long signoffPolicyDefinitionCount = signoffPolicyDefinitionRepository.countByScenarioTypeCodeAndIsActiveTrue(code);

        return toDetailDto(entity, reportCount, policyCount, changeViewCount, signoffPolicyDefinitionCount);
    }

    public ScenarioTypeAdminDetailDto updateNavigationViewMode(String code, UpdateNavigationViewModeRequest request) {
        if (!isValidMode(request.directChangesMode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid mode value for directChangesMode: must be INTERNAL or EXTERNAL");
        }
        if (!isValidMode(request.impactDataMode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid mode value for impactDataMode: must be INTERNAL or EXTERNAL");
        }

        if ("EXTERNAL".equals(request.directChangesMode())
                && (request.directChangesExternalUrlTemplate() == null || request.directChangesExternalUrlTemplate().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "URL template is required when mode is EXTERNAL");
        }
        if ("EXTERNAL".equals(request.impactDataMode())
                && (request.impactExternalUrlTemplate() == null || request.impactExternalUrlTemplate().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "URL template is required when mode is EXTERNAL");
        }

        // Validate directChangesInternalRenderMode when directChangesMode is INTERNAL
        String internalRenderMode = request.directChangesInternalRenderMode();
        if ("INTERNAL".equals(request.directChangesMode())) {
            if (internalRenderMode == null || internalRenderMode.isBlank()) {
                internalRenderMode = "FULL_DATA_CHANGES";
            } else if (!isValidInternalRenderMode(internalRenderMode)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid value for directChangesInternalRenderMode: must be FULL_DATA_CHANGES or DELTA_BY_UNIQUE_ID");
            }
        }

        ScenarioType entity = scenarioTypeRepository.findById(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Scenario type not found: " + code));

        entity.setDirectChangesMode(request.directChangesMode());
        entity.setImpactDataMode(request.impactDataMode());
        entity.setDirectChangesExternalUrlTemplate(request.directChangesExternalUrlTemplate());
        entity.setImpactExternalUrlTemplate(request.impactExternalUrlTemplate());
        entity.setDirectChangesInternalRenderMode(internalRenderMode);

        scenarioTypeRepository.save(entity);

        long reportCount = reportDefinitionRepository.countByScenarioTypeCodeAndIsActiveTrue(code);
        long policyCount = signoffPolicyRepository.countByScenarioTypeCodeAndIsEnabledTrue(code);
        long changeViewCount = changeViewDefinitionRepository.countByScenarioTypeCodeAndIsActiveTrue(code);
        long signoffPolicyDefinitionCount = signoffPolicyDefinitionRepository.countByScenarioTypeCodeAndIsActiveTrue(code);

        return toDetailDto(entity, reportCount, policyCount, changeViewCount, signoffPolicyDefinitionCount);
    }

    public ImpactExecutionSummaryDto getImpactExecutionSummary(String code) {
        scenarioTypeRepository.findById(code)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Scenario type not found: " + code));

        Optional<ReportDataProvider> provider = reportDataProviderRegistry.getProvider(code);

        if (provider.isPresent()) {
            return new ImpactExecutionSummaryDto(
                    true,
                    provider.get().getClass().getSimpleName(),
                    provider.get().getClass().getName()
            );
        } else {
            return new ImpactExecutionSummaryDto(false, null, null);
        }
    }

    private boolean isValidMode(String mode) {
        return "INTERNAL".equals(mode) || "EXTERNAL".equals(mode);
    }

    private boolean isValidInternalRenderMode(String mode) {
        return "FULL_DATA_CHANGES".equals(mode) || "DELTA_BY_UNIQUE_ID".equals(mode);
    }

    private ScenarioTypeAdminDto toDto(ScenarioType entity) {
        return new ScenarioTypeAdminDto(
                entity.getCode(),
                entity.getName(),
                entity.getIcon(),
                entity.getDirectChangesMode(),
                entity.getImpactDataMode(),
                entity.getDirectChangesInternalRenderMode(),
                entity.isEnabled(),
                entity.getSortOrder()
        );
    }

    private ScenarioTypeAdminDetailDto toDetailDto(ScenarioType entity, long reportCount, long policyCount,
                                                    long changeViewCount, long signoffPolicyDefinitionCount) {
        return new ScenarioTypeAdminDetailDto(
                entity.getCode(),
                entity.getName(),
                entity.getIcon(),
                entity.getDirectChangesMode(),
                entity.getImpactDataMode(),
                entity.getDirectChangesExternalUrlTemplate(),
                entity.getImpactExternalUrlTemplate(),
                entity.getDirectChangesInternalRenderMode(),
                entity.isEnabled(),
                entity.getSortOrder(),
                reportCount,
                policyCount,
                changeViewCount,
                signoffPolicyDefinitionCount
        );
    }
}
