package com.prototypes.scenarios.service;

import com.prototypes.scenarios.dto.FactTypeCatalogEntry;
import com.prototypes.scenarios.dto.RoleCatalogEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Provides reference-data catalogs for the signoff rules editor.
 * Fact types define the available condition attributes and their valid operators.
 * Roles define the available approver roles for effect models.
 *
 * This service is backed by static configuration for now but can be extended
 * to load from a database or external configuration without frontend redeployment.
 */
@Service
public class SignoffRulesCatalogService {

    private static final Logger logger = LoggerFactory.getLogger(SignoffRulesCatalogService.class);

    private static final List<String> EQUALS_NOT_EQUALS_IN = List.of("EQUALS", "NOT_EQUALS", "IN");
    private static final List<String> EQUALS_NOT_EQUALS = List.of("EQUALS", "NOT_EQUALS");

    private final List<FactTypeCatalogEntry> factTypes;
    private final List<RoleCatalogEntry> roles;

    public SignoffRulesCatalogService() {
        this.factTypes = buildFactTypes();
        this.roles = buildRoles();
        logger.info("SignoffRulesCatalogService initialized with {} fact types and {} roles", factTypes.size(), roles.size());
    }

    public List<FactTypeCatalogEntry> getFactTypes() {
        logger.info("getFactTypes returning {} entries", factTypes.size());
        return factTypes;
    }

    public List<RoleCatalogEntry> getRoles() {
        logger.info("getRoles returning {} entries", roles.size());
        return roles;
    }

    private List<FactTypeCatalogEntry> buildFactTypes() {
        return List.of(
                new FactTypeCatalogEntry(
                        "scenario.desk",
                        "Desk",
                        EQUALS_NOT_EQUALS_IN,
                        "string",
                        null
                ),
                new FactTypeCatalogEntry(
                        "scenario.region",
                        "Region",
                        EQUALS_NOT_EQUALS_IN,
                        "string",
                        null
                ),
                new FactTypeCatalogEntry(
                        "change.assetClass",
                        "Asset Class",
                        EQUALS_NOT_EQUALS_IN,
                        "string",
                        null
                ),
                new FactTypeCatalogEntry(
                        "change.riskClass",
                        "Risk Class",
                        EQUALS_NOT_EQUALS_IN,
                        "string",
                        null
                ),
                new FactTypeCatalogEntry(
                        "change.notionalCurrency",
                        "Notional Currency",
                        EQUALS_NOT_EQUALS_IN,
                        "string",
                        null
                ),
                new FactTypeCatalogEntry(
                        "scenario.status",
                        "Status",
                        EQUALS_NOT_EQUALS,
                        "enum",
                        List.of(
                                new FactTypeCatalogEntry.EnumValue("DRAFT", "Draft"),
                                new FactTypeCatalogEntry.EnumValue("PENDING_REVIEW", "Pending Review"),
                                new FactTypeCatalogEntry.EnumValue("APPROVED", "Approved"),
                                new FactTypeCatalogEntry.EnumValue("REJECTED", "Rejected"),
                                new FactTypeCatalogEntry.EnumValue("ACTIVE", "Active")
                        )
                )
        );
    }

    private List<RoleCatalogEntry> buildRoles() {
        return List.of(
                new RoleCatalogEntry("SENIOR_RISK_MANAGER", "Senior Risk Manager"),
                new RoleCatalogEntry("HEAD_OF_DESK", "Head of Desk"),
                new RoleCatalogEntry("RISK_CONTROLLER", "Risk Controller"),
                new RoleCatalogEntry("COMPLIANCE_OFFICER", "Compliance Officer")
        );
    }
}
