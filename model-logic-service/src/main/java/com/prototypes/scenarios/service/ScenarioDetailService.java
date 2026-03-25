package com.prototypes.scenarios.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prototypes.scenarios.dto.ActivityRowDto;
import com.prototypes.scenarios.dto.ActivityStreamDto;
import com.prototypes.scenarios.dto.ChangesSummaryDto;
import com.prototypes.scenarios.dto.CombineScenariosRequestDto;
import com.prototypes.scenarios.dto.CtaDto;
import com.prototypes.scenarios.dto.DatasetDto;
import com.prototypes.scenarios.dto.DirectChangesDto;
import com.prototypes.scenarios.dto.EventDto;
import com.prototypes.scenarios.dto.GridRowDto;
import com.prototypes.scenarios.dto.ImpactDataDto;
import com.prototypes.scenarios.dto.ImpactReportDto;
import com.prototypes.scenarios.dto.ImpactRunPayload;
import com.prototypes.scenarios.dto.ImpactSummaryDto;
import com.prototypes.scenarios.dto.MessageDto;
import com.prototypes.scenarios.dto.PostEventRequestDto;
import com.prototypes.scenarios.dto.ProgressDto;
import com.prototypes.scenarios.dto.ReviewApprovalDto;
import com.prototypes.scenarios.dto.ScenarioDetailDto;
import com.prototypes.scenarios.dto.ScenarioHeaderDto;
import com.prototypes.scenarios.dto.ScenarioListItemDto;
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
import com.prototypes.scenarios.repository.ScenarioSummaryRepository;
import com.prototypes.scenarios.repository.SignoffApprovalRepository;
import com.prototypes.scenarios.repository.SignoffCaseRepository;
import com.prototypes.scenarios.repository.SignoffPolicyRepository;
import com.prototypes.scenarios.repository.UserRefRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger logger = LoggerFactory.getLogger(ScenarioDetailService.class);
    private static final String DEFAULT_DIRECT_CHANGES_LABEL = "View Changes \u2192";
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
            "DRAFT", "IMPACT_PENDING", "IMPACT_AVAILABLE", "SIGNOFF_IN_PROGRESS"
    );

    private static final Set<String> REJECT_ALLOWED_STATES = Set.of(
            "DRAFT", "IMPACT_PENDING", "IMPACT_AVAILABLE", "SIGNOFF_IN_PROGRESS"
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

    private static final Set<String> MESSAGE_DETAIL_EVENT_TYPES = Set.of(
            "MESSAGE_POSTED", "SCENARIO_RECALLED", "SCENARIO_REJECTED"
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
    private final ScenarioSummaryRepository scenarioSummaryRepository;
    private final ImpactReportGenerationService impactReportGenerationService;

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
                                 SignoffApprovalRepository signoffApprovalRepository,
                                 ScenarioSummaryRepository scenarioSummaryRepository,
                                 ImpactReportGenerationService impactReportGenerationService) {
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
        this.scenarioSummaryRepository = scenarioSummaryRepository;
        this.impactReportGenerationService = impactReportGenerationService;
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

        LocalDateTime now = LocalDateTime.now();

        ScenarioMessage message = new ScenarioMessage();
        message.setId(UUID.randomUUID());
        message.setScenario(scenario);
        message.setAuthorDisplayName(displayName);
        message.setAuthorUser(authorUser);
        message.setText(text);
        message.setCreatedAt(now);

        ScenarioMessage savedMessage = scenarioMessageRepository.save(message);

        // Create MESSAGE_POSTED ScenarioEvent linked to the saved message
        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("MESSAGE_POSTED");
        event.setActorDisplayName(displayName);
        event.setActorUser(authorUser);
        event.setCreatedAt(now);
        event.setRelatedMessage(savedMessage);
        scenarioEventRepository.save(event);

        return new MessageDto(
                message.getId(),
                message.getAuthorDisplayName(),
                message.getCreatedAt(),
                message.getText()
        );
    }

    @Transactional
    public ScenarioListItemDto combineScenarios(CombineScenariosRequestDto request, String actorId) {
        // Validate request
        if (request.name() == null || request.name().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        if (request.sourceScenarioIds() == null || request.sourceScenarioIds().size() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least 2 source scenario IDs are required");
        }
        if (request.scenarioTypeCode() == null || request.scenarioTypeCode().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Scenario type code is required");
        }

        // Load source scenarios
        List<Scenario> sources = scenarioRepository.findAllWithSummaryByIds(request.sourceScenarioIds());
        if (sources.size() != request.sourceScenarioIds().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more source scenarios not found");
        }

        // Validate all sources have the same scenario type code
        for (Scenario source : sources) {
            if (!request.scenarioTypeCode().equals(source.getScenarioTypeCode())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "All source scenarios must have the same scenario type code: " + request.scenarioTypeCode());
            }
        }

        // Aggregate changes totals
        int totalChangesTotal = 0;
        int totalChangesDirect = 0;
        int totalChangesIndirect = 0;
        for (Scenario source : sources) {
            ScenarioSummary srcSummary = source.getSummary();
            totalChangesTotal += srcSummary.getChangesTotal();
            totalChangesDirect += srcSummary.getChangesDirect();
            totalChangesIndirect += srcSummary.getChangesIndirect();
        }

        // Resolve actor
        String displayName = resolveActorDisplayName(actorId);
        UserRef ownerUser = resolveUserRef(actorId);

        LocalDateTime now = LocalDateTime.now();

        // Create Scenario + ScenarioSummary together.
        // Summary uses @MapsId so its ID is derived from the Scenario.
        // Scenario has cascade = CascadeType.ALL on summary, so we link
        // both sides and save only the Scenario — the cascade persists
        // the summary automatically, avoiding StaleObjectStateException.
        Scenario scenario = new Scenario();
        UUID scenarioId = UUID.randomUUID();
        scenario.setId(scenarioId);
        scenario.setName(request.name());
        scenario.setScenarioTypeCode(request.scenarioTypeCode());
        scenario.setOwnerDisplayName(displayName);
        scenario.setOwnerUser(ownerUser);
        scenario.setCreatedAt(now);
        scenario.setUpdatedAt(now);

        ScenarioSummary summary = new ScenarioSummary();
        summary.setScenario(scenario);
        summary.setWorkflowState("IMPACT_PENDING");
        summary.setImpact("NONE");
        summary.setChangesTotal(totalChangesTotal);
        summary.setChangesDirect(totalChangesDirect);
        summary.setChangesIndirect(totalChangesIndirect);
        summary.setEntitiesSummary("");
        summary.setValidationStatus("PASS");
        summary.setExceptionsCount(0);
        scenario.setSummary(summary);

        scenarioRepository.saveAndFlush(scenario);

        // Create ScenarioLink (DIRECT_CHANGES CTA)
        ScenarioLink link = new ScenarioLink();
        link.setId(UUID.randomUUID());
        link.setScenario(scenario);
        link.setLinkType("DIRECT_CHANGES");
        link.setLabel("View Changes \u2192");
        link.setUrl("/scenarios/" + scenarioId + "/analysis?initial-tab=direct-changes");
        link.setCreatedAt(now);
        scenarioLinkRepository.save(link);

        // Create ScenarioEvent (SCENARIO_CREATED)
        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("SCENARIO_CREATED");
        event.setActorDisplayName(displayName);
        event.setActorUser(ownerUser);
        event.setCreatedAt(now);
        event.setPayloadJson(buildPayloadJson("IMPACT_PENDING", "IMPACT_PENDING"));
        scenarioEventRepository.save(event);

        return new ScenarioListItemDto(
                scenario.getId(),
                scenario.getName(),
                scenario.getScenarioTypeCode(),
                summary.getWorkflowState(),
                summary.getImpact(),
                scenario.getUpdatedAt()
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

    private String buildPayloadJson(String oldState, String newState) {
        try {
            return objectMapper.writeValueAsString(Map.of("oldState", oldState, "newState", newState));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize state transition payload", e);
        }
    }

    /**
     * Normalizes a payloadJson string that may be double-encoded by H2's jsonb column type.
     * H2 in PostgreSQL mode can return jsonb values as escaped JSON strings (e.g.,
     * "{\"oldState\":\"DRAFT\"}" instead of {"oldState":"DRAFT"}).
     * This method unwraps the outer string encoding if present, so the result is always
     * a plain JSON object string ready for deserialization.
     */
    private String normalizePayloadJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String trimmed = raw.trim();
        // If the string starts with a quote but not a brace, it is a JSON-encoded string
        // that wraps the actual JSON object. Unwrap it.
        if (trimmed.startsWith("\"") && !trimmed.startsWith("{")) {
            try {
                // Use ObjectMapper to decode the JSON string value into a plain string
                return objectMapper.readValue(trimmed, String.class);
            } catch (Exception e) {
                // Fall through to return the raw value
            }
        }
        return trimmed;
    }

    private void handleRecall(Scenario scenario, String workflowState, String message,
                              String actorDisplayName, UserRef actorUser) {
        if (message == null || message.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required for RECALL");
        }
        if (!RECALL_ALLOWED_STATES.contains(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "RECALL is not allowed from state: " + workflowState);
        }

        String oldState = workflowState;

        ScenarioMessage scenarioMessage = new ScenarioMessage();
        scenarioMessage.setId(UUID.randomUUID());
        scenarioMessage.setScenario(scenario);
        scenarioMessage.setAuthorDisplayName(actorDisplayName);
        scenarioMessage.setAuthorUser(actorUser);
        scenarioMessage.setText(message);
        scenarioMessage.setCreatedAt(LocalDateTime.now());
        ScenarioMessage savedMessage = scenarioMessageRepository.save(scenarioMessage);

        scenario.getSummary().setWorkflowState("DRAFT");

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("SCENARIO_RECALLED");
        event.setActorDisplayName(actorDisplayName);
        event.setActorUser(actorUser);
        event.setCreatedAt(LocalDateTime.now());
        event.setRelatedMessage(savedMessage);
        event.setPayloadJson(buildPayloadJson(oldState, "DRAFT"));
        scenarioEventRepository.save(event);
    }

    private void handleReject(Scenario scenario, String workflowState, String message,
                              String actorDisplayName, UserRef actorUser) {
        if (message == null || message.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required for REJECT");
        }
        if (!REJECT_ALLOWED_STATES.contains(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "REJECT is not allowed from state: " + workflowState);
        }

        String oldState = workflowState;

        ScenarioMessage scenarioMessage = new ScenarioMessage();
        scenarioMessage.setId(UUID.randomUUID());
        scenarioMessage.setScenario(scenario);
        scenarioMessage.setAuthorDisplayName(actorDisplayName);
        scenarioMessage.setAuthorUser(actorUser);
        scenarioMessage.setText(message);
        scenarioMessage.setCreatedAt(LocalDateTime.now());
        ScenarioMessage savedMessage = scenarioMessageRepository.save(scenarioMessage);

        scenario.getSummary().setWorkflowState("REJECTED");

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("SCENARIO_REJECTED");
        event.setActorDisplayName(actorDisplayName);
        event.setActorUser(actorUser);
        event.setCreatedAt(LocalDateTime.now());
        event.setRelatedMessage(savedMessage);
        event.setPayloadJson(buildPayloadJson(oldState, "REJECTED"));
        scenarioEventRepository.save(event);
    }

    private void handleSignoff(Scenario scenario, UUID scenarioId, String workflowState,
                               String actorDisplayName, UserRef actorUser) {
        if (!SIGNOFF_ALLOWED_STATES.contains(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SIGNOFF is not allowed from state: " + workflowState);
        }

        String oldState = workflowState;
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
        String newState;
        if (signoffCase.getApprovalsReceived() == 1) {
            eventType = "SIGNOFF_STARTED";
            newState = "SIGNOFF_IN_PROGRESS";
            scenario.getSummary().setWorkflowState(newState);
        } else if (signoffCase.getApprovalsReceived() < requiredApprovals) {
            eventType = "SIGNOFF_APPROVAL_RECORDED";
            newState = workflowState; // stay at SIGNOFF_IN_PROGRESS
        } else {
            eventType = "SIGNOFF_COMPLETED";
            newState = "SIGNED_OFF";
            scenario.getSummary().setWorkflowState(newState);
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
        event.setPayloadJson(buildPayloadJson(oldState, newState));
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

        String oldState = workflowState;

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
        event.setPayloadJson(buildPayloadJson(oldState, "IMPACT_AVAILABLE"));
        scenarioEventRepository.save(event);

        // Generate impact report snapshots
        try {
            impactReportGenerationService.generateReportsForScenario(scenario.getId());
        } catch (Exception e) {
            // Report generation failure must NOT affect the main impact completion flow
            logger.warn("Impact report generation failed for scenario {}: {}", scenario.getId(), e.getMessage());
        }
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

        String oldState = workflowState;

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
        event.setPayloadJson(buildPayloadJson(oldState, "IMPACT_AVAILABLE"));
        scenarioEventRepository.save(event);

        // Regenerate impact report snapshots on data refresh
        try {
            impactReportGenerationService.generateReportsForScenario(scenario.getId());
        } catch (Exception e) {
            // Report generation failure must NOT affect the main data refresh flow
            logger.warn("Impact report generation failed for scenario {}: {}", scenario.getId(), e.getMessage());
        }
    }

    private void handleImpactInvalidated(Scenario scenario, String workflowState) {
        if (!IMPACT_INVALIDATED_ALLOWED_STATES.contains(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "IMPACT_INVALIDATED is not allowed from state: " + workflowState);
        }

        String oldState = workflowState;

        scenario.getSummary().setWorkflowState("IMPACT_EXPIRED");

        UserRef systemUser = userRefRepository.findById("system").orElse(null);

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("IMPACT_INVALIDATED");
        event.setActorDisplayName("System");
        event.setActorUser(systemUser);
        event.setCreatedAt(LocalDateTime.now());
        event.setPayloadJson(buildPayloadJson(oldState, "IMPACT_EXPIRED"));
        scenarioEventRepository.save(event);
    }

    private void handlePromotionCompleted(Scenario scenario, String workflowState) {
        if (!"SIGNED_OFF".equals(workflowState)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "PROMOTION_COMPLETED is not allowed from state: " + workflowState);
        }

        String oldState = workflowState;

        scenario.getSummary().setWorkflowState("PROMOTED");

        UserRef systemUser = userRefRepository.findById("system").orElse(null);

        ScenarioEvent event = new ScenarioEvent();
        event.setId(UUID.randomUUID());
        event.setScenario(scenario);
        event.setEventType("PROMOTION_COMPLETED");
        event.setActorDisplayName("System");
        event.setActorUser(systemUser);
        event.setCreatedAt(LocalDateTime.now());
        event.setPayloadJson(buildPayloadJson(oldState, "PROMOTED"));
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
                        scenarioType.getImpactDataMode(),
                        scenarioType.getDirectChangesInternalRenderMode()
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

        ActivityStreamDto events = null;
        if (expandSections.contains("events")) {
            events = buildActivityStream(scenario);
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
                events,
                directChanges,
                impactData
        );
    }

    private ActivityStreamDto buildActivityStream(Scenario scenario) {
        UUID scenarioId = scenario.getId();

        List<ScenarioEvent> scenarioEvents = scenarioEventRepository
                .findByScenarioIdOrderByCreatedAtAsc(scenarioId);

        List<ActivityRowDto> rows = scenarioEvents.stream()
                .map(this::mapEventToActivityRow)
                .toList();

        // Query SignoffCase for approval progress (same pattern as buildReviewApproval)
        Optional<SignoffCase> signoffCaseOpt = signoffCaseRepository.findByScenarioId(scenarioId);
        Integer approvalsReceived = signoffCaseOpt.map(SignoffCase::getApprovalsReceived).orElse(null);
        Integer approvalsRequired = signoffCaseOpt.map(SignoffCase::getRequiredApprovals).orElse(null);

        return new ActivityStreamDto(rows, approvalsReceived, approvalsRequired);
    }

    private ActivityRowDto mapEventToActivityRow(ScenarioEvent evt) {
        String eventType = evt.getEventType();

        // Classify bucketType
        String bucketType;
        if ("MESSAGE_POSTED".equals(eventType)) {
            bucketType = "MESSAGE";
        } else if (evt.getActorUser() != null && "system".equals(evt.getActorUser().getId())) {
            bucketType = "SYSTEM";
        } else {
            bucketType = "USER";
        }

        // Derive details
        String details;
        if (MESSAGE_DETAIL_EVENT_TYPES.contains(eventType) && evt.getRelatedMessage() != null) {
            details = evt.getRelatedMessage().getText();
        } else {
            details = EVENT_LABELS.getOrDefault(eventType, eventType);
        }

        // Derive statusTransition from payloadJson
        String statusTransition = null;
        String normalizedPayload = normalizePayloadJson(evt.getPayloadJson());
        if (normalizedPayload != null && !normalizedPayload.isBlank()) {
            try {
                Map<String, String> payload = objectMapper.readValue(
                        normalizedPayload, new TypeReference<Map<String, String>>() {});
                String oldState = payload.get("oldState");
                String newState = payload.get("newState");
                if (oldState != null && newState != null) {
                    String oldLabel = oldState.equals(newState)
                            ? "[Start]"
                            : WORKFLOW_STATE_LABELS.getOrDefault(oldState, oldState);
                    String newLabel = WORKFLOW_STATE_LABELS.getOrDefault(newState, newState);
                    statusTransition = oldLabel + " -> " + newLabel;
                }
            } catch (Exception e) {
                // If payload cannot be parsed, leave statusTransition as null
            }
        }

        return new ActivityRowDto(
                evt.getId(),
                bucketType,
                evt.getCreatedAt(),
                evt.getActorDisplayName(),
                details,
                statusTransition
        );
    }

    private DirectChangesDto buildDirectChanges(Scenario scenario) {
        ScenarioType scenarioType = scenario.getScenarioType();
        String dcMode = scenarioType != null ? scenarioType.getDirectChangesMode() : null;
        if ("LINK_OUT".equals(dcMode) || "EXTERNAL".equals(dcMode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "directChanges expand not supported for EXTERNAL mode");
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
        // Guard: reject EXTERNAL mode
        ScenarioType scenarioType = scenario.getScenarioType();
        String idMode = scenarioType != null ? scenarioType.getImpactDataMode() : null;
        if ("LINK_OUT".equals(idMode) || "EXTERNAL".equals(idMode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "impactData expand not supported for EXTERNAL mode");
        }

        UUID scenarioId = scenario.getId();

        // Fetch all IMPACT_DATA datasets, ordered by createdAt ASC
        List<ScenarioGridDataset> datasets = scenarioGridDatasetRepository
                .findByScenarioIdAndDatasetTypeOrderByCreatedAtAsc(scenarioId, "IMPACT_DATA");

        // Fetch optional COMPARE link (shared across reports)
        CtaDto compareCta = scenarioLinkRepository
                .findByScenarioIdAndLinkType(scenarioId, "COMPARE")
                .map(link -> new CtaDto(link.getLabel(), link.getUrl()))
                .orElse(null);

        if (datasets.isEmpty()) {
            return new ImpactDataDto(List.of());
        }

        List<ImpactReportDto> reports = datasets.stream()
                .map(dataset -> buildSingleReport(dataset, compareCta))
                .toList();

        return new ImpactDataDto(reports);
    }

    private ImpactReportDto buildSingleReport(ScenarioGridDataset dataset, CtaDto compareCta) {
        ImpactRun impactRun = dataset.getImpactRun();

        String impactRunId = impactRun != null ? impactRun.getId().toString() : dataset.getId().toString();
        String name = impactRun != null ? impactRun.getRunRef() : "Impact Report";
        String createdAt = impactRun != null
                ? impactRun.getStartedAt().toString()
                : dataset.getCreatedAt().toString();

        List<String> columns;
        try {
            columns = objectMapper.readValue(
                    dataset.getColumnsJson(), new TypeReference<List<String>>() {});
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize columns JSON", e);
        }

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

        DatasetDto datasetDto = new DatasetDto(columns, gridRows);
        return new ImpactReportDto(impactRunId, name, createdAt, datasetDto, compareCta);
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
