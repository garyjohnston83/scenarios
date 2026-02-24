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
@Table(name = "scenario_grid_row")
public class ScenarioGridRow {

    @Id
    @Column(nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dataset_id", nullable = false)
    private ScenarioGridDataset dataset;

    @Column(name = "row_payload_json", columnDefinition = "TEXT")
    private String rowPayloadJson;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public ScenarioGridRow() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public ScenarioGridDataset getDataset() {
        return dataset;
    }

    public void setDataset(ScenarioGridDataset dataset) {
        this.dataset = dataset;
    }

    public String getRowPayloadJson() {
        return rowPayloadJson;
    }

    public void setRowPayloadJson(String rowPayloadJson) {
        this.rowPayloadJson = rowPayloadJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
