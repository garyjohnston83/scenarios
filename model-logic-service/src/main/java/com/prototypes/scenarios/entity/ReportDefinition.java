package com.prototypes.scenarios.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "report_definition")
public class ReportDefinition {

    @Id
    @Column(nullable = false)
    private UUID id;

    @Column(name = "scenario_type_code", nullable = false, length = 50)
    private String scenarioTypeCode;

    @Column(name = "report_key", nullable = false, length = 100)
    private String reportKey;

    @Column(nullable = false)
    private int version;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String definition;

    @Column(name = "sample_data", columnDefinition = "text")
    private String sampleData;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public ReportDefinition() {
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

    public String getReportKey() {
        return reportKey;
    }

    public void setReportKey(String reportKey) {
        this.reportKey = reportKey;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public String getDefinition() {
        return definition;
    }

    public void setDefinition(String definition) {
        this.definition = definition;
    }

    public String getSampleData() {
        return sampleData;
    }

    public void setSampleData(String sampleData) {
        this.sampleData = sampleData;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
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
