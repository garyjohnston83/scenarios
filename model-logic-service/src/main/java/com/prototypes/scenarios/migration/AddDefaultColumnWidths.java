package com.prototypes.scenarios.migration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import liquibase.change.custom.CustomTaskChange;
import liquibase.database.Database;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.CustomChangeException;
import liquibase.exception.SetupException;
import liquibase.exception.ValidationErrors;
import liquibase.resource.ResourceAccessor;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Liquibase custom change that adds explicit width values to table column definitions
 * that don't already have them. Uses the previously hardcoded defaults:
 * - First rowColumn: 300px, subsequent rowColumns: 125px
 * - Columns in groups with empty groupLabel: 75px
 * - Columns in groups with non-empty groupLabel: 150px
 */
public class AddDefaultColumnWidths implements CustomTaskChange {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void execute(Database database) throws CustomChangeException {
        try {
            JdbcConnection conn = (JdbcConnection) database.getConnection();

            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(
                    "SELECT id, CAST(definition AS TEXT) AS definition FROM report_definition");

            while (rs.next()) {
                String id = rs.getString("id");
                String definition = rs.getString("definition");

                if (definition == null || definition.isBlank()) {
                    continue;
                }

                JsonNode root = objectMapper.readTree(definition);
                JsonNode sections = root.get("sections");
                if (sections == null || !sections.isArray()) {
                    continue;
                }

                boolean modified = false;

                for (JsonNode section : sections) {
                    JsonNode contentBlocks = section.get("contentBlocks");
                    if (contentBlocks == null || !contentBlocks.isArray()) {
                        continue;
                    }

                    for (JsonNode block : contentBlocks) {
                        JsonNode blockType = block.get("blockType");
                        if (blockType == null || !"table".equals(blockType.asText())) {
                            continue;
                        }

                        // Add widths to rowColumns
                        JsonNode rowColumns = block.get("rowColumns");
                        if (rowColumns != null && rowColumns.isArray()) {
                            for (int i = 0; i < rowColumns.size(); i++) {
                                ObjectNode rc = (ObjectNode) rowColumns.get(i);
                                if (!rc.has("width") || rc.get("width").isNull() || rc.get("width").asText().isEmpty()) {
                                    rc.put("width", i == 0 ? "300px" : "125px");
                                    modified = true;
                                }
                            }
                        }

                        // Add widths to columnGroups columns
                        JsonNode columnGroups = block.get("columnGroups");
                        if (columnGroups != null && columnGroups.isArray()) {
                            for (JsonNode group : columnGroups) {
                                String groupLabel = "";
                                JsonNode groupLabelNode = group.get("groupLabel");
                                if (groupLabelNode != null && groupLabelNode.isTextual()) {
                                    groupLabel = groupLabelNode.asText();
                                }

                                JsonNode columns = group.get("columns");
                                if (columns != null && columns.isArray()) {
                                    for (JsonNode col : columns) {
                                        ObjectNode colObj = (ObjectNode) col;
                                        if (!colObj.has("width") || colObj.get("width").isNull() || colObj.get("width").asText().isEmpty()) {
                                            colObj.put("width", groupLabel.isEmpty() ? "75px" : "150px");
                                            modified = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (modified) {
                    String updatedDefinition = objectMapper.writeValueAsString(root);
                    PreparedStatement update = conn.prepareStatement(
                            "UPDATE report_definition SET definition = CAST(? AS JSONB) WHERE id = CAST(? AS UUID)");
                    update.setString(1, updatedDefinition);
                    update.setString(2, id);
                    update.executeUpdate();
                    update.close();
                }
            }

            rs.close();
            stmt.close();

        } catch (Exception e) {
            throw new CustomChangeException("Failed to add default column widths: " + e.getMessage(), e);
        }
    }

    @Override
    public String getConfirmationMessage() {
        return "Added default column widths to table definitions";
    }

    @Override
    public void setUp() throws SetupException {
    }

    @Override
    public void setFileOpener(ResourceAccessor resourceAccessor) {
    }

    @Override
    public ValidationErrors validate(Database database) {
        return new ValidationErrors();
    }
}
