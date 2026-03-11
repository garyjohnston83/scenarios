package com.prototypes.scenarios.service.reporting;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Stub data provider for RISK_FACTOR scenario type.
 * Returns realistic hardcoded risk factor data matching all source_field paths
 * from the RISK_FACTOR seed report definition (changeset 029).
 *
 * Source fields covered:
 * - pnl.total_impact, pnl.first_order, pnl.second_order, pnl.unexplained
 * - shifts.ir_shift, shifts.credit_spread, shifts.fx_spot, shifts.equity_price
 */
@Component
public class RiskFactorStubDataProvider implements ReportDataProvider {

    @Override
    public ReportData getReportData(UUID scenarioId, String scenarioTypeCode) {
        return new ReportData(buildProductionData(), buildScenarioData());
    }

    private Map<String, Object> buildProductionData() {
        Map<String, Object> pnl = new HashMap<>();
        pnl.put("total_impact", -1500000.00);
        pnl.put("first_order", -1200000.00);
        pnl.put("second_order", -250000.00);
        pnl.put("unexplained", -50000.00);

        Map<String, Object> shifts = new HashMap<>();
        shifts.put("ir_shift", 25.00);
        shifts.put("credit_spread", 15.00);
        shifts.put("fx_spot", -2.50);
        shifts.put("equity_price", -5.00);

        Map<String, Object> data = new HashMap<>();
        data.put("pnl", pnl);
        data.put("shifts", shifts);
        return data;
    }

    private Map<String, Object> buildScenarioData() {
        Map<String, Object> pnl = new HashMap<>();
        pnl.put("total_impact", -1850000.00);
        pnl.put("first_order", -1480000.00);
        pnl.put("second_order", -310000.00);
        pnl.put("unexplained", -60000.00);

        Map<String, Object> shifts = new HashMap<>();
        shifts.put("ir_shift", 50.00);
        shifts.put("credit_spread", 25.00);
        shifts.put("fx_spot", -5.00);
        shifts.put("equity_price", -10.00);

        Map<String, Object> data = new HashMap<>();
        data.put("pnl", pnl);
        data.put("shifts", shifts);
        return data;
    }
}
