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
 * Liquibase custom change that migrates embedded row data from the definition JSON
 * into the sample_data column, and strips rows from the definition.
 *
 * This enforces the separation: definition = template only, sample_data = data.
 */
public class MigrateRowsToSampleData implements CustomTaskChange {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void execute(Database database) throws CustomChangeException {
        try {
            JdbcConnection conn = (JdbcConnection) database.getConnection();

            // Find all report definitions that have rows embedded in their definition
            // Cast to text for LIKE — definition may be JSONB in PostgreSQL
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery(
                    "SELECT id, definition, sample_data FROM report_definition WHERE CAST(definition AS TEXT) LIKE '%\"rows\"%'");

            while (rs.next()) {
                String id = rs.getString("id");
                String definition = rs.getString("definition");
                String existingSampleData = rs.getString("sample_data");

                if (definition == null || definition.isBlank()) {
                    continue;
                }

                JsonNode root = objectMapper.readTree(definition);
                JsonNode sections = root.get("sections");
                if (sections == null || !sections.isArray()) {
                    continue;
                }

                // Build sample data from extracted rows
                ObjectNode sampleDataRoot;
                if (existingSampleData != null && !existingSampleData.isBlank()) {
                    sampleDataRoot = (ObjectNode) objectMapper.readTree(existingSampleData);
                } else {
                    sampleDataRoot = objectMapper.createObjectNode();
                }

                ObjectNode tablesNode = sampleDataRoot.has("tables")
                        ? (ObjectNode) sampleDataRoot.get("tables")
                        : objectMapper.createObjectNode();

                boolean hasRows = false;

                for (JsonNode section : sections) {
                    JsonNode contentBlocks = section.get("contentBlocks");
                    if (contentBlocks == null || !contentBlocks.isArray()) {
                        continue;
                    }

                    for (int i = 0; i < contentBlocks.size(); i++) {
                        JsonNode block = contentBlocks.get(i);
                        JsonNode blockType = block.get("blockType");
                        if (blockType == null || !"table".equals(blockType.asText())) {
                            continue;
                        }

                        JsonNode rows = block.get("rows");
                        if (rows == null || !rows.isArray() || rows.isEmpty()) {
                            continue;
                        }

                        JsonNode keyNode = block.get("key");
                        String tableKey = (keyNode != null) ? keyNode.asText() : "table_" + i;

                        // Copy rows into sample data tables
                        tablesNode.set(tableKey, rows);
                        hasRows = true;

                        // Remove rows from the block
                        ((ObjectNode) block).remove("rows");
                    }
                }

                if (hasRows) {
                    sampleDataRoot.set("tables", tablesNode);
                    String cleanedDefinition = objectMapper.writeValueAsString(root);
                    String newSampleData = objectMapper.writeValueAsString(sampleDataRoot);

                    PreparedStatement update = conn.prepareStatement(
                            "UPDATE report_definition SET definition = CAST(? AS JSONB), sample_data = ? WHERE id = CAST(? AS UUID)");
                    update.setString(1, cleanedDefinition);
                    update.setString(2, newSampleData);
                    update.setString(3, id);
                    update.executeUpdate();
                    update.close();
                }
            }

            rs.close();
            stmt.close();

        } catch (Exception e) {
            throw new CustomChangeException("Failed to migrate rows to sample_data: " + e.getMessage(), e);
        }
    }

    @Override
    public String getConfirmationMessage() {
        return "Migrated embedded rows from definition JSON to sample_data column";
    }

    @Override
    public void setUp() throws SetupException {
        // No setup needed
    }

    @Override
    public void setFileOpener(ResourceAccessor resourceAccessor) {
        // Not needed
    }

    @Override
    public ValidationErrors validate(Database database) {
        return new ValidationErrors();
    }
}
