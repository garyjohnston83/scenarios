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
 * within rendered reports (scenario_impact_report.rendered_report).
 *
 * Migration 045 added widths to report_definition.definition, but the already-generated
 * rendered reports still lack width values. This migration applies the same defaults:
 * - First rowColumn: 300px, subsequent rowColumns: 125px
 * - Columns in groups with empty groupLabel: 75px
 * - Columns in groups with non-empty groupLabel: 150px
 */
public class AddColumnWidthsToRenderedReports implements CustomTaskChange {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void execute(Database database) throws CustomChangeException {
        try {
            JdbcConnection conn = (JdbcConnection) database.getConnection();

            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(
                    "SELECT id, rendered_report FROM scenario_impact_report WHERE rendered_report IS NOT NULL");

            while (rs.next()) {
                String id = rs.getString("id");
                String renderedReport = rs.getString("rendered_report");

                if (renderedReport == null || renderedReport.isBlank()) {
                    continue;
                }

                JsonNode root = objectMapper.readTree(renderedReport);
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

                        JsonNode columnLayout = block.get("columnLayout");
                        if (columnLayout == null) {
                            continue;
                        }

                        // Add widths to rowColumns
                        JsonNode rowColumns = columnLayout.get("rowColumns");
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
                        JsonNode columnGroups = columnLayout.get("columnGroups");
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
                    String updatedRenderedReport = objectMapper.writeValueAsString(root);
                    PreparedStatement update = conn.prepareStatement(
                            "UPDATE scenario_impact_report SET rendered_report = CAST(? AS JSONB) WHERE id = CAST(? AS UUID)");
                    update.setString(1, updatedRenderedReport);
                    update.setString(2, id);
                    update.executeUpdate();
                    update.close();
                }
            }

            rs.close();
            stmt.close();

        } catch (Exception e) {
            throw new CustomChangeException("Failed to add column widths to rendered reports: " + e.getMessage(), e);
        }
    }

    @Override
    public String getConfirmationMessage() {
        return "Added default column widths to rendered report table column layouts";
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
