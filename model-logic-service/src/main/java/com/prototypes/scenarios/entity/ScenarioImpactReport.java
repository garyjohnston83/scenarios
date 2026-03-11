package com.prototypes.scenarios.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "scenario_impact_report")
public class ScenarioImpactReport {

    @Id
    @Column(nullable = false)
    private UUID id;

    @Column(name = "scenario_id", nullable = false)
    private UUID scenarioId;

    @Column(name = "report_definition_id", nullable = false)
    private UUID reportDefinitionId;

    @Column(name = "definition_version", nullable = false)
    private int definitionVersion;

    @Column(name = "report_key", nullable = false, length = 100)
    private String reportKey;

    @Column(name = "report_name", nullable = false, length = 255)
    private String reportName;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "rendered_report", columnDefinition = "text")
    private String renderedReport;

    @Column(name = "error_message", length = 2000)
    private String errorMessage;

    public ScenarioImpactReport() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getScenarioId() {
        return scenarioId;
    }

    public void setScenarioId(UUID scenarioId) {
        this.scenarioId = scenarioId;
    }

    public UUID getReportDefinitionId() {
        return reportDefinitionId;
    }

    public void setReportDefinitionId(UUID reportDefinitionId) {
        this.reportDefinitionId = reportDefinitionId;
    }

    public int getDefinitionVersion() {
        return definitionVersion;
    }

    public void setDefinitionVersion(int definitionVersion) {
        this.definitionVersion = definitionVersion;
    }

    public String getReportKey() {
        return reportKey;
    }

    public void setReportKey(String reportKey) {
        this.reportKey = reportKey;
    }

    public String getReportName() {
        return reportName;
    }

    public void setReportName(String reportName) {
        this.reportName = reportName;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRenderedReport() {
        return renderedReport;
    }

    public void setRenderedReport(String renderedReport) {
        this.renderedReport = renderedReport;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
