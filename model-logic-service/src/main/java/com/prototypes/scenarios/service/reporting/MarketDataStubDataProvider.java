package com.prototypes.scenarios.service.reporting;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Stub data provider for MARKET_DATA scenario type.
 * Returns realistic hardcoded market risk data matching all source_field paths
 * from the MARKET_DATA seed report definition (changeset 029).
 *
 * Source fields covered:
 * - market_risk.var_99, market_risk.var_97_5, market_risk.stressed_var
 * - exposure.gross, exposure.net, exposure.notional
 */
@Component
public class MarketDataStubDataProvider implements ReportDataProvider {

    @Override
    public ReportData getReportData(UUID scenarioId, String scenarioTypeCode) {
        return new ReportData(buildProductionData(), buildScenarioData());
    }

    private Map<String, Object> buildProductionData() {
        Map<String, Object> marketRisk = new HashMap<>();
        marketRisk.put("var_99", 2450000.00);
        marketRisk.put("var_97_5", 1980000.00);
        marketRisk.put("stressed_var", 3200000.00);

        Map<String, Object> exposure = new HashMap<>();
        exposure.put("gross", 85000000.00);
        exposure.put("net", 42000000.00);
        exposure.put("notional", 150000000.00);

        Map<String, Object> data = new HashMap<>();
        data.put("market_risk", marketRisk);
        data.put("exposure", exposure);
        return data;
    }

    private Map<String, Object> buildScenarioData() {
        Map<String, Object> marketRisk = new HashMap<>();
        marketRisk.put("var_99", 2680000.00);
        marketRisk.put("var_97_5", 2150000.00);
        marketRisk.put("stressed_var", 3520000.00);

        Map<String, Object> exposure = new HashMap<>();
        exposure.put("gross", 88500000.00);
        exposure.put("net", 44100000.00);
        exposure.put("notional", 155000000.00);

        Map<String, Object> data = new HashMap<>();
        data.put("market_risk", marketRisk);
        data.put("exposure", exposure);
        return data;
    }
}
