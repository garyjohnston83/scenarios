package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.ChangesSummaryDto;
import com.prototypes.scenarios.dto.CtaDto;
import com.prototypes.scenarios.dto.DirectChangesDto;
import com.prototypes.scenarios.dto.EventDto;
import com.prototypes.scenarios.dto.GridRowDto;
import com.prototypes.scenarios.dto.ImpactDataDto;
import com.prototypes.scenarios.dto.ImpactRunPayload;
import com.prototypes.scenarios.dto.ImpactSummaryDto;
import com.prototypes.scenarios.dto.MessageDto;
import com.prototypes.scenarios.dto.PostEventRequestDto;
import com.prototypes.scenarios.dto.ProgressDto;
import com.prototypes.scenarios.dto.ReviewApprovalDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import com.prototypes.scenarios.dto.ScenarioHeaderDto;
import com.prototypes.scenarios.dto.ScenarioTypeDto;
import com.prototypes.scenarios.dto.SummaryCardsDto;
import com.prototypes.scenarios.dto.SummaryPatchPayload;
import com.prototypes.scenarios.dto.WorkflowDto;
import com.prototypes.scenarios.entity.ImpactRun;
import com.prototypes.scenarios.entity.Scenario;
import com.prototypes.scenarios.entity.ScenarioEvent;
import com.prototypes.scenarios.entity.ScenarioGridDataset;
import com.prototypes.scenarios.entity.ScenarioGridRow;
import com.prototypes.scenarios.entity.ScenarioLink;
import com.prototypes.scenarios.entity.ScenarioMessage;
import com.prototypes.scenarios.entity.ScenarioSummary;
import com.prototypes.scenarios.entity.ScenarioType;
import com.prototypes.scenarios.entity.SignoffApproval;
import com.prototypes.scenarios.entity.SignoffCase;
import com.prototypes.scenarios.entity.SignoffPolicy;
import com.prototypes.scenarios.entity.UserRef;
import com.prototypes.scenarios.repository.ImpactRunRepository;
import com.prototypes.scenarios.repository.ScenarioEventRepository;
import com.prototypes.scenarios.repository.ScenarioGridDatasetRepository;
import com.prototypes.scenarios.repository.ScenarioGridRowRepository;
import com.prototypes.scenarios.repository.ScenarioLinkRepository;
import com.prototypes.scenarios.repository.ScenarioMessageRepository;
import com.prototypes.scenarios.repository.ScenarioParticipantRepository;
import com.prototypes.scenarios.repository.ScenarioRepository;
import com.prototypes.scenarios.repository.SignoffApprovalRepository;
import com.prototypes.scenarios.repository.SignoffCaseRepository;
import com.prototypes.scenarios.repository.SignoffPolicyRepository;
import com.prototypes.scenarios.repository.UserRefRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class ScenarioDetailService {

    private static final String DEFAULT_DIRECT_CHANGES_LABEL = "Open in Market Data UI \u2192";
    private static final String DEFAULT_IMPACT_REPORTS_LABEL = "View all impact reports \u2192";

    private static final int PROGRESS_TOTAL = 5;

    private static final Map<String, String> WORKFLOW_STATE_LABELS = Map.of(
            "DRAFT", "Draft",
            "IMPACT_PENDING", "Impact Pending",
            "IMPACT_AVAILABLE", "Impact Available",
            "IMPACT_EXPIRED", "Impact Expired",
            "SIGNOFF_IN_PROGRESS", "Sign-off In Progress",
            "SIGNED_OFF", "Signed-off",
            "PROMOTED", "Promoted",
            "REJECTED", "Rejected"
    );

    private static final Map<String, String> EVENT_LABELS = Map.ofEntries(
            Map.entry("SCENARIO_CREATED", "Scenario created"),
            Map.entry("IMPACT_COMPLETED", "Impact assessment completed"),
            Map.entry("MESSAGE_POSTED", "Message posted"),
            Map.entry("SIGNOFF_COMMENCED", "Sign-off commenced"),
            Map.entry("SIGNOFF_APPROVED", "Scenario signed off"),
            Map.entry("SIGNOFF_REJECTED", "Scenario rejected"),
            Map.entry("SIGNOFF_STARTED", "Sign-off started"),
            Map.entry("SIGNOFF_APPROVAL_RECORDED", "Approval recorded"),
            Map.entry("SIGNOFF_COMPLETED", "Sign-off completed"),
            Map.entry("SCENARIO_RECALLED", "Scenario recalled"),
            Map.entry("SCENARIO_REJECTED", "Scenario rejected"),
            Map.entry("IMPACT_DATA_REFRESHED", "Impact data refreshed"),
            Map.entry("IMPACT_INVALIDATED", "Impact invalidated"),
            Map.entry("PROMOTION_COMPLETED", "Promotion completed")
    );

    private static final Map<String, Integer> PROGRESS_STEPS = Map.of(
            "DRAFT", 1,
            "IMPACT_PENDING", 2,
            "IMPACT_AVAILABLE", 2,
            "IMPACT_EXPIRED", 2,
            "SIGNOFF_IN_PROGRESS", 3,
            "SIGNED_OFF", 4,
            "PROMOTED", 5,
            "REJECTED", 5
    );

    private static final Set<String> RECALL_ALLOWED_STATES = Set.of(
            "DRAFT", "IMPACT_AVAILABLE", "SIGNOFF_IN_PROGRESS"
    );

    private static final Set<String> REJECT_ALLOWED_STATES = Set.of(
            "DRAFT", "IMPACT_AVAILABLE", "SIGNOFF_IN_PROGRESS"
    );

    private static final Set<String> SIGNOFF_ALLOWED_STATES = Set.of(
            "IMPACT_AVAILABLE", "SIGNOFF_IN_PROGRESS"
    );

    private static final Set<String> IMPACT_COMPLETED_ALLOWED_STATES = Set.of(
            "DRAFT", "IMPACT_PENDING"
    );

    private static final Set<String> IMPACT_DATA_REFRESHED_ALLOWED_STATES = Set.of(
            "IMPACT_AVAILABLE", "IMPACT_EXPIRED"
    );

    private static final Set<String> IMPACT_INVALIDATED_ALLOWED_STATES = Set.of(
            "IMPACT_AVAILABLE", "SIGNOFF_IN_PROGRESS", "SIGNED_OFF"
    );

    private final ScenarioRepository scenarioRepository;
    private final ImpactRunRepository impactRunRepository;
    private final ScenarioLinkRepository scenarioLinkRepository;
    private final ScenarioMessageRepository scenarioMessageRepository;
    private final ScenarioEventRepository scenarioEventRepository;
    private final SignoffCaseRepository signoffCaseRepository;
    private final ScenarioParticipantRepository scenarioParticipantRepository;
    private final UserRefRepository userRefRepository;
    private final ObjectMapper objectMapper;
    private final ScenarioGridDatasetRepository scenarioGridDatasetRepository;
    private final ScenarioGridRowRepository scenarioGridRowRepository;
    private final SignoffPolicyRepository signoffPolicyRepository;
    private final SignoffApprovalRepository signoffApprovalRepository;

    public ScenarioDetailService(ScenarioRepository scenarioRepository,
                                 ImpactRunRepository impactRunRepository,
                                 ScenarioLinkRepository scenarioLinkRepository,
                                 ScenarioMessageRepository scenarioMessageRepository,
                                 ScenarioEventRepository scenarioEventRepository,
                                 SignoffCaseRepository signoffCaseRepository,
                                 ScenarioParticipantRepository scenarioParticipantRepository,
                                 UserRefRepository userRefRepository,
                                 ObjectMapper objectMapper,
                                 ScenarioGridDatasetRepository scenarioGridDatasetRepository,
                                 ScenarioGridRowRepository scenarioGridRowRepository,
                                 SignoffPolicyRepository signoffPolicyRepository,
                                 SignoffApprovalRepository signoffApprovalRepository) {
        this.scenarioRepository = scenarioRepository;
        this.impactRunRepository = impactRunRepository;
        this.scenarioLinkRepository = scenarioLinkRepository;
        this.scenarioMessageRepository = scenarioMessageRepository;
        this.scenarioEventRepository = scenarioEventRepository;
        this.signoffCaseRepository = signoffCaseRepository;
        this.scenarioParticipantRepository = scenarioParticipantRepository;
        this.userRefRepository = userRefRepository;
        this.objectMapper = objectMapper;
        this.scenarioGridDatasetRepository = scenarioGridDatasetRepository;
        this.scenarioGridRowRepository = scenarioGridRowRepository;
        this.signoffPolicyRepository = signoffPolicyRepository;
        this.signoffApprovalRepository = signoffApprovalRepository;
    }

    @Transactional(readOnly = true)
    public Optional<ScenarioDetailDto> getScenarioDetail(UUID id, Set<String> expandSections) {
        return scenarioRepository.findByIdWithSummary(id)
                .map(scenario -> toDetailDto(scenario, expandSections));
    }

    @Transactional
    public MessageDto postMessage(UUID scenarioId, String text, String actorId) {
        Scenario scenario = scenarioRepository.findByIdWithSummary(scenarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Scenario not found"));

        String displayName = resolveActorDisplayName(actorId);
        UserRef authorUser = resolveUserRef(actorId);

        ScenarioMessage message = new ScenarioMessage();
        message.setId(UUID.randomUUID());
        message.setScenario(scenario);
        message.setAuthorDisplayName(displayName);
        message.setAuthorUser(authorUser);
        message.setText(text);
        message.setCreatedAt(LocalDateTime.now());

        scenarioMessageRepository.save(message);

        return new MessageDto(
                message.getId(),
                message.getAuthorDisplayName(),
                message.getCreatedAt(),
                message.getText()
        );
    }

    @Transactional
    public void processEvent(UUID scenarioId, PostEventRequestDto request, String actor, String actorId) {
        Scenario scenario = scenarioRepository.findByIdWithSummary(scenarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Scenario not found"));

        String type = request.type();
        String message = request.message();
        ImpactRunPayload impactRun = request.impactRun();
        SummaryPatchPayload summaryPatch = request.summaryPatch();

        String workflowState = scenario.getSummary().getWorkflowState();

        // PROMOTED terminal guard -- block all event types from PROMOTED state
        if ("PROMOTED".equals(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot perform actions on a promoted scenario");
        }

        if ("System".equals(actor)) {
            // System event routing
            switch (type) {
                case "IMPACT_COMPLETED" -> handleImpactCompleted(scenario, workflowState, impactRun, summaryPatch);
                case "IMPACT_DATA_REFRESHED" -> handleImpactDataRefreshed(scenario, workflowState, impactRun, summaryPatch);
                case "IMPACT_INVALIDATED" -> handleImpactInvalidated(scenario, workflowState);
                case "PROMOTION_COMPLETED" -> handlePromotionCompleted(scenario, workflowState);
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown system event type: " + type);
            }
        } else {
            // User event routing
            String actorDisplayName = resolveActorDisplayName(actorId);
            UserRef actorUser = resolveUserRef(actorId);
            switch (type) {
                case "RECALL" -> handleRecall(scenario, workflowState, message, actorDisplayName, actorUser);
                case "REJECT" -> handleReject(scenario, workflowState, message, actorDisplayName, actorUser);
                case "SIGNOFF" -> handleSignoff(scenario, scenarioId, workflowState, actorDisplayName, actorUser);
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown event type: " + type);
            }
        }

        scenario.setUpdatedAt(LocalDateTime.now());
    }

    String resolveActorDisplayName(String actorId) {
        if (actorId == null || actorId.isBlank()) {
            return "Current User";
        }
        return userRefRepository.findById(actorId)
                .map(UserRef::getDisplayName)
                .orElse("Current User");
    }

    UserRef resolveUserRef(String actorId) {
        if (actorId == null || actorId.isBlank()) {
            return userRefRepository.findById("current-user").orElse(null);
        }
        return userRefRepository.findById(actorId)
                .orElseGet(() -> userRefRepository.findById("current-user").orElse(null));
    }

    private void handleRecall(Scenario scenario, String workflowState, String message,
                              String actorDisplayName, UserRef actorUser) {
        if (message == null || message.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required for RECALL");
        }
        if (!RECALL_ALLOWED_STATES.contains(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "RECALL is not allowed from state: " + workflowState);
        }

        ScenarioMessage scenarioMessage = new ScenarioMessage();
        scenarioMessage.setId(UUID.randomUUID());
        scenarioMessage.setScenario(scenario);
        scenarioMessage.setAuthorDisplayName(actorDisplayName);
        scenarioMessage.setAuthorUser(actorUser);
        scenarioMessage.setText(message);
        scenarioMessage.setCreatedAt(LocalDateTime.now());
        ScenarioMessage savedMessage = scenarioMessageRepository.save(scenarioMessage);

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("SCENARIO_RECALLED");
        event.setActorDisplayName(actorDisplayName);
        event.setActorUser(actorUser);
        event.setCreatedAt(LocalDateTime.now());
        event.setRelatedMessage(savedMessage);
        scenarioEventRepository.save(event);

        scenario.getSummary().setWorkflowState("DRAFT");
    }

    private void handleReject(Scenario scenario, String workflowState, String message,
                              String actorDisplayName, UserRef actorUser) {
        if (message == null || message.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required for REJECT");
        }
        if (!REJECT_ALLOWED_STATES.contains(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "REJECT is not allowed from state: " + workflowState);
        }

        ScenarioMessage scenarioMessage = new ScenarioMessage();
        scenarioMessage.setId(UUID.randomUUID());
        scenarioMessage.setScenario(scenario);
        scenarioMessage.setAuthorDisplayName(actorDisplayName);
        scenarioMessage.setAuthorUser(actorUser);
        scenarioMessage.setText(message);
        scenarioMessage.setCreatedAt(LocalDateTime.now());
        ScenarioMessage savedMessage = scenarioMessageRepository.save(scenarioMessage);

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("SCENARIO_REJECTED");
        event.setActorDisplayName(actorDisplayName);
        event.setActorUser(actorUser);
        event.setCreatedAt(LocalDateTime.now());
        event.setRelatedMessage(savedMessage);
        scenarioEventRepository.save(event);

        scenario.getSummary().setWorkflowState("REJECTED");
    }

    private void handleSignoff(Scenario scenario, UUID scenarioId, String workflowState,
                               String actorDisplayName, UserRef actorUser) {
        if (!SIGNOFF_ALLOWED_STATES.contains(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SIGNOFF is not allowed from state: " + workflowState);
        }

        String scenarioTypeCode = scenario.getScenarioTypeCode();

        // Find or create the SignoffCase
        boolean isNewCase = false;
        SignoffCase signoffCase = signoffCaseRepository.findByScenarioId(scenarioId).orElse(null);

        if (signoffCase == null) {
            // First SIGNOFF: look up policy
            SignoffPolicy policy = signoffPolicyRepository
                    .findFirstByScenarioTypeCodeAndIsEnabledTrueOrderByPriorityAscUpdatedAtDesc(scenarioTypeCode)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                            "No enabled signoff policy found for scenario type: " + scenarioTypeCode));

            signoffCase = new SignoffCase();
            signoffCase.setId(UUID.randomUUID());
            signoffCase.setScenario(scenario);
            signoffCase.setStatus("IN_PROGRESS");
            signoffCase.setCommencedAt(LocalDateTime.now());
            signoffCase.setRequiredApprovals(policy.getRequiredApproverCount());
            signoffCase.setPolicyId(policy.getId());
            signoffCase.setApprovalsReceived(0);
            signoffCase = signoffCaseRepository.save(signoffCase);
            isNewCase = true;
        }

        // Insert SignoffApproval with duplicate detection
        String userId = actorUser != null ? actorUser.getId() : "current-user";
        SignoffApproval approval = new SignoffApproval();
        approval.setId(UUID.randomUUID());
        approval.setSignoffCase(signoffCase);
        approval.setUserId(userId);
        approval.setApprovedAt(LocalDateTime.now());

        try {
            signoffApprovalRepository.saveAndFlush(approval);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already approved this scenario.");
        }

        // Increment approvalsReceived only AFTER successful SignoffApproval insert
        signoffCase.setApprovalsReceived(signoffCase.getApprovalsReceived() + 1);

        int requiredApprovals = signoffCase.getRequiredApprovals();

        String eventType;
        if (signoffCase.getApprovalsReceived() == 1) {
            eventType = "SIGNOFF_STARTED";
            scenario.getSummary().setWorkflowState("SIGNOFF_IN_PROGRESS");
        } else if (signoffCase.getApprovalsReceived() < requiredApprovals) {
            eventType = "SIGNOFF_APPROVAL_RECORDED";
            // stay at SIGNOFF_IN_PROGRESS
        } else {
            eventType = "SIGNOFF_COMPLETED";
            scenario.getSummary().setWorkflowState("SIGNED_OFF");
            signoffCase.setStatus("COMPLETED");
            signoffCase.setCompletedAt(LocalDateTime.now());
        }

        signoffCaseRepository.save(signoffCase);

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType(eventType);
        event.setActorDisplayName(actorDisplayName);
        event.setActorUser(actorUser);
        event.setCreatedAt(LocalDateTime.now());
        scenarioEventRepository.save(event);
    }

    private void handleImpactCompleted(Scenario scenario, String workflowState,
                                       ImpactRunPayload impactRun, SummaryPatchPayload summaryPatch) {
        if (!IMPACT_COMPLETED_ALLOWED_STATES.contains(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "IMPACT_COMPLETED is not allowed from state: " + workflowState);
        }
        if (impactRun == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "impactRun payload is required for IMPACT_COMPLETED");
        }

        createImpactRun(scenario, impactRun);
        applySummaryPatch(scenario.getSummary(), summaryPatch);
        scenario.getSummary().setWorkflowState("IMPACT_AVAILABLE");

        UserRef systemUser = userRefRepository.findById("system").orElse(null);

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("IMPACT_COMPLETED");
        event.setActorDisplayName("System");
        event.setActorUser(systemUser);
        event.setCreatedAt(LocalDateTime.now());
        scenarioEventRepository.save(event);
    }

    private void handleImpactDataRefreshed(Scenario scenario, String workflowState,
                                           ImpactRunPayload impactRun, SummaryPatchPayload summaryPatch) {
        if (!IMPACT_DATA_REFRESHED_ALLOWED_STATES.contains(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "IMPACT_DATA_REFRESHED is not allowed from state: " + workflowState);
        }
        if (impactRun == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "impactRun payload is required for IMPACT_DATA_REFRESHED");
        }

        createImpactRun(scenario, impactRun);
        applySummaryPatch(scenario.getSummary(), summaryPatch);
        scenario.getSummary().setWorkflowState("IMPACT_AVAILABLE");

        UserRef systemUser = userRefRepository.findById("system").orElse(null);

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("IMPACT_DATA_REFRESHED");
        event.setActorDisplayName("System");
        event.setActorUser(systemUser);
        event.setCreatedAt(LocalDateTime.now());
        scenarioEventRepository.save(event);
    }

    private void handleImpactInvalidated(Scenario scenario, String workflowState) {
        if (!IMPACT_INVALIDATED_ALLOWED_STATES.contains(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "IMPACT_INVALIDATED is not allowed from state: " + workflowState);
        }

        scenario.getSummary().setWorkflowState("IMPACT_EXPIRED");

        UserRef systemUser = userRefRepository.findById("system").orElse(null);

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("IMPACT_INVALIDATED");
        event.setActorDisplayName("System");
        event.setActorUser(systemUser);
        event.setCreatedAt(LocalDateTime.now());
        scenarioEventRepository.save(event);
    }

    private void handlePromotionCompleted(Scenario scenario, String workflowState) {
        if (!"SIGNED_OFF".equals(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "PROMOTION_COMPLETED is not allowed from state: " + workflowState);
        }

        scenario.getSummary().setWorkflowState("PROMOTED");

        UserRef systemUser = userRefRepository.findById("system").orElse(null);

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("PROMOTION_COMPLETED");
        event.setActorDisplayName("System");
        event.setActorUser(systemUser);
        event.setCreatedAt(LocalDateTime.now());
        scenarioEventRepository.save(event);
    }

    private void createImpactRun(Scenario scenario, ImpactRunPayload impactRunPayload) {
        ImpactRun run = new ImpactRun();
        run.setId(UUID.randomUUID());
        run.setScenario(scenario);
        run.setRunRef("system-" + UUID.randomUUID().toString().substring(0, 8));
        run.setStartedAt(LocalDateTime.now());
        run.setCompletedAt(LocalDateTime.parse(impactRunPayload.finishedAt()));
        run.setStatus(impactRunPayload.status());
        impactRunRepository.save(run);
    }

    private void applySummaryPatch(ScenarioSummary summary, SummaryPatchPayload patch) {
        if (patch == null) {
            return;
        }
        if (patch.impact() != null) {
            summary.setImpact(patch.impact());
        }
        if (patch.headlineDeltaText() != null) {
            summary.setHeadlineDeltaText(patch.headlineDeltaText());
        }
        if (patch.exceptionsCount() != null) {
            summary.setExceptionsCount(patch.exceptionsCount());
        }
    }

    private ScenarioDetailDto toDetailDto(Scenario scenario, Set<String> expandSections) {
        ScenarioHeaderDto header = null;
        if (expandSections.contains("header")) {
            ScenarioSummary summary = scenario.getSummary();

            ScenarioTypeDto scenarioTypeDto = null;
            ScenarioType scenarioType = scenario.getScenarioType();
            if (scenarioType != null) {
                scenarioTypeDto = new ScenarioTypeDto(
                        scenarioType.getCode(),
                        scenarioType.getName(),
                        scenarioType.getIcon(),
                        scenarioType.getDirectChangesMode(),
                        scenarioType.getImpactDataMode()
                );
            }

            header = new ScenarioHeaderDto(
                    summary.getWorkflowState(),
                    summary.getImpact(),
                    scenario.getOwnerDisplayName(),
                    scenario.getCreatedAt(),
                    scenario.getUpdatedAt(),
                    scenarioTypeDto
            );
        }

        SummaryCardsDto summaryCards = null;
        if (expandSections.contains("summaryCards")) {
            summaryCards = buildSummaryCards(scenario);
        }

        ReviewApprovalDto reviewApproval = null;
        if (expandSections.contains("reviewApproval")) {
            reviewApproval = buildReviewApproval(scenario);
        }

        DirectChangesDto directChanges = null;
        if (expandSections.contains("directChanges")) {
            directChanges = buildDirectChanges(scenario);
        }

        ImpactDataDto impactData = null;
        if (expandSections.contains("impactData")) {
            impactData = buildImpactData(scenario);
        }

        return new ScenarioDetailDto(
                scenario.getId(),
                scenario.getName(),
                scenario.getScenarioTypeCode(),
                scenario.getOwnerDisplayName(),
                scenario.getCreatedAt(),
                scenario.getUpdatedAt(),
                header,
                summaryCards,
                reviewApproval,
                directChanges,
                impactData
        );
    }

    private DirectChangesDto buildDirectChanges(Scenario scenario) {
        ScenarioType scenarioType = scenario.getScenarioType();
        if (scenarioType != null && "LINK_OUT".equals(scenarioType.getDirectChangesMode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "directChanges expand not supported for LINK_OUT mode");
        }

        UUID scenarioId = scenario.getId();
        Optional<ScenarioGridDataset> datasetOpt = scenarioGridDatasetRepository
                .findByScenarioIdAndDatasetType(scenarioId, "DIRECT_CHANGES");

        if (datasetOpt.isEmpty()) {
            return new DirectChangesDto(List.of(), List.of());
        }

        ScenarioGridDataset dataset = datasetOpt.get();
        try {
            List<String> columns = objectMapper.readValue(
                    dataset.getColumnsJson(), new TypeReference<List<String>>() {});

            List<ScenarioGridRow> rows = scenarioGridRowRepository
                    .findByDatasetIdOrderByCreatedAtAsc(dataset.getId());

            List<GridRowDto> gridRows = rows.stream()
                    .map(row -> {
                        try {
                            Map<String, Object> payload = objectMapper.readValue(
                                    row.getRowPayloadJson(), new TypeReference<Map<String, Object>>() {});
                            return new GridRowDto(row.getId(), payload);
                        } catch (Exception e) {
                            throw new RuntimeException("Failed to deserialize row payload JSON", e);
                        }
                    })
                    .toList();

            return new DirectChangesDto(columns, gridRows);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize columns JSON", e);
        }
    }

    private ImpactDataDto buildImpactData(Scenario scenario) {
        ScenarioType scenarioType = scenario.getScenarioType();
        if (scenarioType != null && "LINK_OUT".equals(scenarioType.getImpactDataMode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "impactData expand not supported for LINK_OUT mode");
        }

        UUID scenarioId = scenario.getId();
        Optional<ScenarioGridDataset> datasetOpt = scenarioGridDatasetRepository
                .findByScenarioIdAndDatasetType(scenarioId, "IMPACT_DATA");

        CtaDto compareCta = scenarioLinkRepository
                .findByScenarioIdAndLinkType(scenarioId, "COMPARE")
                .map(link -> new CtaDto(link.getLabel(), link.getUrl()))
                .orElse(null);

        if (datasetOpt.isEmpty()) {
            return new ImpactDataDto(List.of(), List.of(), compareCta);
        }

        ScenarioGridDataset dataset = datasetOpt.get();
        try {
            List<String> columns = objectMapper.readValue(
                    dataset.getColumnsJson(), new TypeReference<List<String>>() {});

            List<ScenarioGridRow> rows = scenarioGridRowRepository
                    .findByDatasetIdOrderByCreatedAtAsc(dataset.getId());

            List<GridRowDto> gridRows = rows.stream()
                    .map(row -> {
                        try {
                            Map<String, Object> payload = objectMapper.readValue(
                                    row.getRowPayloadJson(), new TypeReference<Map<String, Object>>() {});
                            return new GridRowDto(row.getId(), payload);
                        } catch (Exception e) {
                            throw new RuntimeException("Failed to deserialize row payload JSON", e);
                        }
                    })
                    .toList();

            return new ImpactDataDto(columns, gridRows, compareCta);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize columns JSON", e);
        }
    }

    private ReviewApprovalDto buildReviewApproval(Scenario scenario) {
        ScenarioSummary summary = scenario.getSummary();
        String workflowState = summary.getWorkflowState();
        String workflowStateLabel = WORKFLOW_STATE_LABELS.getOrDefault(workflowState, workflowState);
        int progressCurrent = PROGRESS_STEPS.getOrDefault(workflowState, 1);
        ProgressDto progress = new ProgressDto(progressCurrent, PROGRESS_TOTAL);
        WorkflowDto workflow = new WorkflowDto(workflowState, workflowStateLabel, progress);

        UUID scenarioId = scenario.getId();

        List<MessageDto> messages = scenarioMessageRepository
                .findByScenarioIdOrderByCreatedAtAsc(scenarioId)
                .stream()
                .map(msg -> new MessageDto(
                        msg.getId(),
                        msg.getAuthorDisplayName(),
                        msg.getCreatedAt(),
                        msg.getText()
                ))
                .toList();

        List<EventDto> events = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(scenarioId)
                .stream()
                .map(evt -> new EventDto(
                        evt.getId(),
                        evt.getCreatedAt(),
                        evt.getActorDisplayName(),
                        evt.getEventType(),
                        EVENT_LABELS.getOrDefault(evt.getEventType(), evt.getEventType()),
                        evt.getRelatedMessage() != null ? evt.getRelatedMessage().getId() : null
                ))
                .toList();

        // Query SignoffCase to include approval progress data
        Optional<SignoffCase> signoffCaseOpt = signoffCaseRepository.findByScenarioId(scenarioId);
        Integer approvalsReceived = signoffCaseOpt.map(SignoffCase::getApprovalsReceived).orElse(null);
        Integer approvalsRequired = signoffCaseOpt.map(SignoffCase::getRequiredApprovals).orElse(null);

        return new ReviewApprovalDto(workflow, messages, events, approvalsReceived, approvalsRequired);
    }

    private SummaryCardsDto buildSummaryCards(Scenario scenario) {
        ScenarioSummary summary = scenario.getSummary();
        UUID scenarioId = scenario.getId();

        CtaDto changesCta = scenarioLinkRepository
                .findByScenarioIdAndLinkType(scenarioId, "DIRECT_CHANGES")
                .map(link -> new CtaDto(
                        link.getLabel() != null ? link.getLabel() : DEFAULT_DIRECT_CHANGES_LABEL,
                        link.getUrl()))
                .orElse(null);

        ChangesSummaryDto changesSummary = new ChangesSummaryDto(
                summary.getChangesTotal(),
                summary.getChangesDirect(),
                summary.getChangesIndirect(),
                changesCta
        );

        Optional<ImpactRun> latestRun = impactRunRepository
                .findTopByScenarioIdOrderByStartedAtDesc(scenarioId);

        LocalDateTime lastRunAt = latestRun.map(ImpactRun::getCompletedAt).orElse(null);
        String latestRunStatus = latestRun.map(ImpactRun::getStatus).orElse(null);

        CtaDto impactCta = scenarioLinkRepository
                .findByScenarioIdAndLinkType(scenarioId, "IMPACT_REPORTS")
                .map(link -> new CtaDto(
                        link.getLabel() != null ? link.getLabel() : DEFAULT_IMPACT_REPORTS_LABEL,
                        link.getUrl()))
                .orElse(null);

        ImpactSummaryDto impactSummary = new ImpactSummaryDto(
                summary.getImpact(),
                lastRunAt,
                latestRunStatus,
                summary.getExceptionsCount(),
                impactCta
        );

        return new SummaryCardsDto(changesSummary, impactSummary);
    }
}
