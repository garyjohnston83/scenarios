package com.prototypes.scenarios.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "scenario_summary")
public class ScenarioSummary {

    @Id
    @Column(nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "id")
    private Scenario scenario;

    @Column(name = "workflow_state", nullable = false, length = 50)
    private String workflowState;

    @Column(nullable = false, length = 50)
    private String impact;

    @Column(name = "last_impact_at")
    private LocalDateTime lastImpactAt;

    @Column(name = "impact_run_ref", length = 255)
    private String impactRunRef;

    @Column(name = "headline_delta_text", length = 255)
    private String headlineDeltaText;

    @Column(name = "changes_total", nullable = false)
    private int changesTotal;

    @Column(name = "changes_direct", nullable = false)
    private int changesDirect;

    @Column(name = "changes_indirect", nullable = false)
    private int changesIndirect;

    @Column(name = "entities_summary", nullable = false, length = 255)
    private String entitiesSummary;

    @Column(name = "validation_status", nullable = false, length = 50)
    private String validationStatus;

    @Column(name = "exceptions_count")
    private Integer exceptionsCount;

    public ScenarioSummary() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Scenario getScenario() {
        return scenario;
    }

    public void setScenario(Scenario scenario) {
        this.scenario = scenario;
    }

    public String getWorkflowState() {
        return workflowState;
    }

    public void setWorkflowState(String workflowState) {
        this.workflowState = workflowState;
    }

    public String getImpact() {
        return impact;
    }

    public void setImpact(String impact) {
        this.impact = impact;
    }

    public LocalDateTime getLastImpactAt() {
        return lastImpactAt;
    }

    public void setLastImpactAt(LocalDateTime lastImpactAt) {
        this.lastImpactAt = lastImpactAt;
    }

    public String getImpactRunRef() {
        return impactRunRef;
    }

    public void setImpactRunRef(String impactRunRef) {
        this.impactRunRef = impactRunRef;
    }

    public String getHeadlineDeltaText() {
        return headlineDeltaText;
    }

    public void setHeadlineDeltaText(String headlineDeltaText) {
        this.headlineDeltaText = headlineDeltaText;
    }

    public int getChangesTotal() {
        return changesTotal;
    }

    public void setChangesTotal(int changesTotal) {
        this.changesTotal = changesTotal;
    }

    public int getChangesDirect() {
        return changesDirect;
    }

    public void setChangesDirect(int changesDirect) {
        this.changesDirect = changesDirect;
    }

    public int getChangesIndirect() {
        return changesIndirect;
    }

    public void setChangesIndirect(int changesIndirect) {
        this.changesIndirect = changesIndirect;
    }

    public String getEntitiesSummary() {
        return entitiesSummary;
    }

    public void setEntitiesSummary(String entitiesSummary) {
        this.entitiesSummary = entitiesSummary;
    }

    public String getValidationStatus() {
        return validationStatus;
    }

    public void setValidationStatus(String validationStatus) {
        this.validationStatus = validationStatus;
    }

    public Integer getExceptionsCount() {
        return exceptionsCount;
    }

    public void setExceptionsCount(Integer exceptionsCount) {
        this.exceptionsCount = exceptionsCount;
    }
}
