package com.prototypes.scenarios.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "signoff_policy")
public class SignoffPolicy {

    @Id
    @Column(nullable = false)
    private UUID id;

    @Column(name = "scenario_type_code", nullable = false, length = 50)
    private String scenarioTypeCode;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "required_approver_count", nullable = false)
    private int requiredApproverCount;

    @Column(name = "is_enabled", nullable = false)
    private boolean isEnabled;

    @Column(nullable = false)
    private int priority;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public SignoffPolicy() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getScenarioTypeCode() {
        return scenarioTypeCode;
    }

    public void setScenarioTypeCode(String scenarioTypeCode) {
        this.scenarioTypeCode = scenarioTypeCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getRequiredApproverCount() {
        return requiredApproverCount;
    }

    public void setRequiredApproverCount(int requiredApproverCount) {
        this.requiredApproverCount = requiredApproverCount;
    }

    public boolean isEnabled() {
        return isEnabled;
    }

    public void setEnabled(boolean enabled) {
        isEnabled = enabled;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
