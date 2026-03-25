package com.prototypes.scenarios.service;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Stub data provider for Direct Changes views.
 * Returns realistic hardcoded mock data for DELTA_BY_UNIQUE_ID sections,
 * designed to be swappable for a real implementation later.
 *
 * <p>Supports the following dataTypeId values:</p>
 * <ul>
 *   <li>{@code "timeSeriesValues"} -- 6 rows with 3 distinct tsName values</li>
 *   <li>{@code "timeSeriesMetaData"} -- 4 rows with 2 distinct tsName values</li>
 *   <li>{@code "riskFactorMetaData"} -- 12 rows with 4 distinct rfName values</li>
 *   <li>{@code "mappingChanges"} -- 2 rows</li>
 *   <li>{@code "formulaChanges"} -- 1 row</li>
 * </ul>
 *
 * <p>For unknown dataTypeId values, returns a {@link DirectChangesSectionData}
 * with null rows (NO_DATA signal).</p>
 */
@Component
public class StubDirectChangesViewDataProvider implements DirectChangesViewDataProvider {

    @Override
    public DirectChangesSectionData getSectionData(UUID scenarioId, String scenarioTypeCode, String dataTypeId) {
        return switch (dataTypeId) {
            case "timeSeriesValues" -> buildTimeSeriesValuesData();
            case "timeSeriesMetaData" -> buildTimeSeriesMetaData();
            case "riskFactorMetaData" -> buildRiskFactorMetaData();
            case "mappingChanges" -> buildMappingChangesData();
            case "formulaChanges" -> buildFormulaChangesData();
            default -> new DirectChangesSectionData(null, null);
        };
    }

    // ========================================================================
    // Time-Series Values: 6 rows, 3 distinct tsName values
    // ========================================================================

    private DirectChangesSectionData buildTimeSeriesValuesData() {
        List<Map<String, Object>> rows = new ArrayList<>();

        rows.add(tsRow("USD LIBOR 3M", "13/10/2025", 5.25, 5.35));
        rows.add(tsRow("USD LIBOR 3M", "14/10/2025", 5.28, 5.40));
        rows.add(tsRow("EUR EURIBOR 6M", "13/10/2025", 3.85, 3.92));
        rows.add(tsRow("EUR EURIBOR 6M", "14/10/2025", 3.87, 3.95));
        rows.add(tsRow("GBP SONIA ON", "13/10/2025", 4.50, 4.60));
        rows.add(tsRow("GBP SONIA ON", "15/10/2025", 4.55, 4.65));

        return new DirectChangesSectionData(rows, "https://marketdata.example.com/timeseries/values");
    }

    private Map<String, Object> tsRow(String tsName, String date, double cur, double newVal) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("tsName", tsName);
        row.put("date", date);
        row.put("cur", cur);
        row.put("new", newVal);
        return row;
    }

    // ========================================================================
    // Time-Series Meta-Data: 4 rows, 2 distinct tsName values
    // ========================================================================

    private DirectChangesSectionData buildTimeSeriesMetaData() {
        List<Map<String, Object>> rows = new ArrayList<>();

        rows.add(metaRow("USD LIBOR 3M", "Currency", "USD", "EUR"));
        rows.add(metaRow("USD LIBOR 3M", "Day Count Convention", "ACT/360", "ACT/365"));
        rows.add(metaRow("EUR EURIBOR 6M", "Fixing Frequency", "Daily", "Weekly"));
        rows.add(metaRow("EUR EURIBOR 6M", "Source", "Bloomberg", "Refinitiv"));

        return new DirectChangesSectionData(rows, "https://marketdata.example.com/timeseries/metadata");
    }

    private Map<String, Object> metaRow(String tsName, String attribute, String currentValue, String newValue) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("tsName", tsName);
        row.put("attribute", attribute);
        row.put("currentValue", currentValue);
        row.put("newValue", newValue);
        return row;
    }

    // ========================================================================
    // Risk Factor Meta-Data: 12 rows, 4 distinct rfName values
    // ========================================================================

    private DirectChangesSectionData buildRiskFactorMetaData() {
        List<Map<String, Object>> rows = new ArrayList<>();

        rows.add(rfMetaRow("USD.LIBOR.3M", "Risk Class", "Interest Rate", "Interest Rate (Amended)"));
        rows.add(rfMetaRow("USD.LIBOR.3M", "Bucket", "Bucket 3", "Bucket 4"));
        rows.add(rfMetaRow("USD.LIBOR.3M", "Sensitivity Type", "Delta", "Vega"));
        rows.add(rfMetaRow("EUR.EURIBOR.6M", "Risk Class", "Interest Rate", "Interest Rate"));
        rows.add(rfMetaRow("EUR.EURIBOR.6M", "Bucket", "Bucket 2", "Bucket 3"));
        rows.add(rfMetaRow("EUR.EURIBOR.6M", "Risk Weight", "1.5%", "2.0%"));
        rows.add(rfMetaRow("GBP.SONIA.ON", "Risk Class", "Interest Rate", "Interest Rate"));
        rows.add(rfMetaRow("GBP.SONIA.ON", "Correlation Group", "Group A", "Group B"));
        rows.add(rfMetaRow("GBP.SONIA.ON", "Liquidity Horizon", "20 days", "40 days"));
        rows.add(rfMetaRow("EURUSD.FX.SPOT", "Risk Class", "FX", "FX"));
        rows.add(rfMetaRow("EURUSD.FX.SPOT", "Bucket", "Bucket 1", "Bucket 2"));
        rows.add(rfMetaRow("EURUSD.FX.SPOT", "Sensitivity Type", "Delta", "Curvature"));

        return new DirectChangesSectionData(rows, "https://marketdata.example.com/riskfactors/metadata");
    }

    private Map<String, Object> rfMetaRow(String rfName, String attribute, String currentValue, String newValue) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("rfName", rfName);
        row.put("attribute", attribute);
        row.put("currentValue", currentValue);
        row.put("newValue", newValue);
        return row;
    }

    // ========================================================================
    // Mapping Changes: 2 rows
    // ========================================================================

    private DirectChangesSectionData buildMappingChangesData() {
        List<Map<String, Object>> rows = new ArrayList<>();

        rows.add(mappingRow("USD.LIBOR.3M", "USD LIBOR 3M", "USD SOFR 3M"));
        rows.add(mappingRow("EUR.EURIBOR.6M", "EUR EURIBOR 6M", "EUR ESTR 6M"));

        return new DirectChangesSectionData(rows, "https://marketdata.example.com/mappings");
    }

    private Map<String, Object> mappingRow(String riskFactor, String currentTs, String newTs) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("riskFactor", riskFactor);
        row.put("currentMappedTs", currentTs);
        row.put("newMappedTs", newTs);
        return row;
    }

    // ========================================================================
    // Formula Changes: 1 row
    // ========================================================================

    private DirectChangesSectionData buildFormulaChangesData() {
        List<Map<String, Object>> rows = new ArrayList<>();

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("formulaTsName", "EURUSD RFR");
        row.put("currentFormula", "(EUR EURIBOR 6M+USD LIBOR 6M)/2");
        row.put("newFormula", "(EUR EURIBOR 6M+USD LIBOR 6M)/2*1.1");
        rows.add(row);

        return new DirectChangesSectionData(rows, "https://marketdata.example.com/formulas");
    }
}
