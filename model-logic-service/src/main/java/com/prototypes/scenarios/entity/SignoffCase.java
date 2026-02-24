package com.prototypes.scenarios.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "signoff_case")
public class SignoffCase {

    @Id
    @Column(nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scenario_id", nullable = false)
    private Scenario scenario;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "commenced_at")
    private LocalDateTime commencedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "required_approvals", nullable = false)
    private int requiredApprovals;

    @Column(name = "approvals_received", nullable = false)
    private int approvalsReceived;

    @Column(name = "policy_id")
    private UUID policyId;

    public SignoffCase() {
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCommencedAt() {
        return commencedAt;
    }

    public void setCommencedAt(LocalDateTime commencedAt) {
        this.commencedAt = commencedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public int getRequiredApprovals() {
        return requiredApprovals;
    }

    public void setRequiredApprovals(int requiredApprovals) {
        this.requiredApprovals = requiredApprovals;
    }

    public int getApprovalsReceived() {
        return approvalsReceived;
    }

    public void setApprovalsReceived(int approvalsReceived) {
        this.approvalsReceived = approvalsReceived;
    }

    public UUID getPolicyId() {
        return policyId;
    }

    public void setPolicyId(UUID policyId) {
        this.policyId = policyId;
    }
}
