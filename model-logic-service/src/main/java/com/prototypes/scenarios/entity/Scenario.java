package com.prototypes.scenarios.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "scenario")
public class Scenario {

    @Id
    @Column(nullable = false)
    private UUID id;

    @Column(name = "scenario_type_code", nullable = false, length = 50)
    private String scenarioTypeCode;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "owner_display_name", nullable = false, length = 255)
    private String ownerDisplayName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToOne(mappedBy = "scenario", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private ScenarioSummary summary;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "scenario_type_code", referencedColumnName = "code", insertable = false, updatable = false)
    private ScenarioType scenarioType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private UserRef ownerUser;

    public Scenario() {
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

    public String getOwnerDisplayName() {
        return ownerDisplayName;
    }

    public void setOwnerDisplayName(String ownerDisplayName) {
        this.ownerDisplayName = ownerDisplayName;
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

    public ScenarioSummary getSummary() {
        return summary;
    }

    public void setSummary(ScenarioSummary summary) {
        this.summary = summary;
    }

    public ScenarioType getScenarioType() {
        return scenarioType;
    }

    public UserRef getOwnerUser() {
        return ownerUser;
    }

    public void setOwnerUser(UserRef ownerUser) {
        this.ownerUser = ownerUser;
    }
}
