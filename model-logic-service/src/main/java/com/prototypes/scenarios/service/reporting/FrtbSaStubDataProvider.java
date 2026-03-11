package com.prototypes.scenarios.service.reporting;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Stub data provider for FRTB_SA scenario type.
 * Returns realistic hardcoded financial data matching all source_field paths
 * from the FRTB_SA seed report definition (changeset 029).
 *
 * Source fields covered:
 * - risk_charges.girr.delta, risk_charges.csr_nonsec.delta, risk_charges.fx.delta,
 *   risk_charges.equity.delta, risk_charges.commodity.delta
 * - risk_charges.girr.vega, risk_charges.fx.vega, risk_charges.equity.vega
 * - risk_charges.girr.curvature, risk_charges.fx.curvature
 * - risk_charges.total_sa_charge, risk_charges.drc_charge, risk_charges.rrao_charge
 */
@Component
public class FrtbSaStubDataProvider implements ReportDataProvider {

    @Override
    public ReportData getReportData(UUID scenarioId, String scenarioTypeCode) {
        return new ReportData(buildProductionData(), buildScenarioData());
    }

    private Map<String, Object> buildProductionData() {
        Map<String, Object> girr = new HashMap<>();
        girr.put("delta", 1250000.00);
        girr.put("vega", 320000.00);
        girr.put("curvature", 85000.00);

        Map<String, Object> csrNonsec = new HashMap<>();
        csrNonsec.put("delta", 780000.00);

        Map<String, Object> fx = new HashMap<>();
        fx.put("delta", 450000.00);
        fx.put("vega", 125000.00);
        fx.put("curvature", 42000.00);

        Map<String, Object> equity = new HashMap<>();
        equity.put("delta", 620000.00);
        equity.put("vega", 210000.00);

        Map<String, Object> commodity = new HashMap<>();
        commodity.put("delta", 180000.00);

        Map<String, Object> riskCharges = new HashMap<>();
        riskCharges.put("girr", girr);
        riskCharges.put("csr_nonsec", csrNonsec);
        riskCharges.put("fx", fx);
        riskCharges.put("equity", equity);
        riskCharges.put("commodity", commodity);
        riskCharges.put("total_sa_charge", 3850000.00);
        riskCharges.put("drc_charge", 520000.00);
        riskCharges.put("rrao_charge", 95000.00);

        Map<String, Object> data = new HashMap<>();
        data.put("risk_charges", riskCharges);
        return data;
    }

    private Map<String, Object> buildScenarioData() {
        Map<String, Object> girr = new HashMap<>();
        girr.put("delta", 1290000.00);
        girr.put("vega", 335000.00);
        girr.put("curvature", 91000.00);

        Map<String, Object> csrNonsec = new HashMap<>();
        csrNonsec.put("delta", 812000.00);

        Map<String, Object> fx = new HashMap<>();
        fx.put("delta", 478000.00);
        fx.put("vega", 132000.00);
        fx.put("curvature", 45500.00);

        Map<String, Object> equity = new HashMap<>();
        equity.put("delta", 655000.00);
        equity.put("vega", 224000.00);

        Map<String, Object> commodity = new HashMap<>();
        commodity.put("delta", 195000.00);

        Map<String, Object> riskCharges = new HashMap<>();
        riskCharges.put("girr", girr);
        riskCharges.put("csr_nonsec", csrNonsec);
        riskCharges.put("fx", fx);
        riskCharges.put("equity", equity);
        riskCharges.put("commodity", commodity);
        riskCharges.put("total_sa_charge", 4120000.00);
        riskCharges.put("drc_charge", 548000.00);
        riskCharges.put("rrao_charge", 102000.00);

        Map<String, Object> data = new HashMap<>();
        data.put("risk_charges", riskCharges);
        return data;
    }
}
