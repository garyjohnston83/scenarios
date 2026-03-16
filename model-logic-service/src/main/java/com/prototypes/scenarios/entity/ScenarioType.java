package com.prototypes.scenarios.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "scenario_type")
public class ScenarioType {

    @Id
    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 100)
    private String icon;

    @Column(name = "direct_changes_mode", length = 50)
    private String directChangesMode;

    @Column(name = "impact_data_mode", length = 50)
    private String impactDataMode;

    @Column(name = "direct_changes_external_url_template", length = 500)
    private String directChangesExternalUrlTemplate;

    @Column(name = "impact_external_url_template", length = 500)
    private String impactExternalUrlTemplate;

    @Column(name = "is_enabled", nullable = false)
    private boolean isEnabled;

    @Column(name = "sort_order")
    private Integer sortOrder;

    public ScenarioType() {
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getDirectChangesMode() {
        return directChangesMode;
    }

    public void setDirectChangesMode(String directChangesMode) {
        this.directChangesMode = directChangesMode;
    }

    public String getImpactDataMode() {
        return impactDataMode;
    }

    public void setImpactDataMode(String impactDataMode) {
        this.impactDataMode = impactDataMode;
    }

    public String getDirectChangesExternalUrlTemplate() {
        return directChangesExternalUrlTemplate;
    }

    public void setDirectChangesExternalUrlTemplate(String directChangesExternalUrlTemplate) {
        this.directChangesExternalUrlTemplate = directChangesExternalUrlTemplate;
    }

    public String getImpactExternalUrlTemplate() {
        return impactExternalUrlTemplate;
    }

    public void setImpactExternalUrlTemplate(String impactExternalUrlTemplate) {
        this.impactExternalUrlTemplate = impactExternalUrlTemplate;
    }

    public boolean isEnabled() {
        return isEnabled;
    }

    public void setEnabled(boolean enabled) {
        isEnabled = enabled;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
