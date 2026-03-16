package com.prototypes.scenarios.service.reporting;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Stub data provider for MARKET_DATA scenario type.
 * Returns realistic hardcoded market risk data matching all source_field paths
 * from the MARKET_DATA seed report definition.
 *
 * Source fields covered:
 * - market_risk.var_99, market_risk.var_97_5, market_risk.stressed_var
 * - exposure.gross, exposure.net, exposure.notional
 *
 * Table data provided for:
 * - le_div_table (Legal Entity / Division)
 * - biz_table (Business)
 * - treasury_table (Treasury)
 */
@Component
public class MarketDataStubDataProvider implements ReportDataProvider {

    @Override
    public ReportData getReportData(UUID scenarioId, String scenarioTypeCode) {
        return new ReportData(buildProductionData(), buildScenarioData(), buildTableData());
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

    private Map<String, List<Map<String, Object>>> buildTableData() {
        Map<String, List<Map<String, Object>>> tables = new HashMap<>();
        tables.put("le_div_table", buildLeDivTableRows());
        tables.put("biz_table", buildBizTableRows());
        tables.put("treasury_table", buildTreasuryTableRows());
        return tables;
    }

    // ========================================================================
    // Legal Entity / Division table rows
    // ========================================================================

    private List<Map<String, Object>> buildLeDivTableRows() {
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(leDivRow("le_total", "Alpha Holdings Group", "AMBER", "warning", "1.24%", "positive", "0.87%", "positive", "1.62%", "warning", "2.34%", "warning", "3.15%", "warning", "0.45%", "positive", "0.34%", "positive", "0.92%", "positive", "0.12%", "positive", "0.18%", "positive"));
        rows.add(leDivRow("le_alpha_sec", "Alpha Securities Ltd", "AMBER", "warning", "0.45%", "positive", "0.32%", "positive", "0.78%", "positive", "1.15%", "positive", "1.82%", "warning", "0.23%", "positive", "0.15%", "positive", "0.56%", "positive", "0.08%", "positive", "0.09%", "positive"));
        rows.add(leDivRow("le_alpha_cap", "Alpha Capital Markets", "RED", "negative", "2.34%", "warning", "1.89%", "warning", "2.67%", "warning", "3.45%", "negative", "5.12%", "negative", "1.12%", "positive", "0.67%", "positive", "1.78%", "warning", "0.34%", "positive", "0.45%", "positive"));
        rows.add(leDivRow("le_beta", "Beta Financial Corp", "GREEN", "positive", "0.12%", "positive", "0.08%", "positive", "0.15%", "positive", "0.23%", "positive", "0.45%", "positive", "0.06%", "positive", "0.04%", "positive", "0.12%", "positive", "0.02%", "positive", "0.03%", "positive"));
        rows.add(leDivRow("le_gamma", "Gamma Investment Bank", "RED", "negative", "3.56%", "warning", "2.78%", "warning", "3.12%", "negative", "4.56%", "negative", "7.84%", "negative", "1.89%", "warning", "1.23%", "positive", "2.34%", "warning", "0.67%", "positive", "0.89%", "positive"));
        rows.add(leDivRow("le_delta", "Delta Asset Management", "GREEN", "positive", "0.78%", "positive", "0.56%", "positive", "0.92%", "positive", "1.34%", "positive", "1.45%", "positive", "0.34%", "positive", "0.23%", "positive", "0.67%", "positive", "0.15%", "positive", "0.11%", "positive"));
        rows.add(leDivRow("le_epsilon", "Epsilon Trading Partners", "AMBER", "warning", "1.67%", "warning", "1.23%", "positive", "1.89%", "warning", "2.12%", "warning", "4.23%", "warning", "0.78%", "positive", "0.45%", "positive", "1.23%", "positive", "0.28%", "positive", "0.34%", "positive"));
        rows.add(leDivRow("le_zeta", "Zeta Wealth Services", "GREEN", "positive", "0.34%", "positive", "0.21%", "positive", "0.45%", "positive", "0.67%", "positive", "0.89%", "positive", "0.15%", "positive", "0.12%", "positive", "0.34%", "positive", "0.05%", "positive", "0.06%", "positive"));
        return rows;
    }

    private Map<String, Object> leDivRow(String rowId, String entity,
                                          String impact, String impactFmt,
                                          String intVar1d, String intVar1dFmt,
                                          String regVar1d, String regVar1dFmt,
                                          String regVar10d, String regVar10dFmt,
                                          String dynSvar10d, String dynSvar10dFmt,
                                          String hst, String hstFmt,
                                          String cmInt, String cmIntFmt,
                                          String crInt, String crIntFmt,
                                          String eqInt, String eqIntFmt,
                                          String fxInt, String fxIntFmt,
                                          String irInt, String irIntFmt) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("rowId", rowId);
        Map<String, Object> cells = new LinkedHashMap<>();
        cells.put("entity", cell(entity, null));
        cells.put("impact", cell(impact, impactFmt));
        cells.put("int_var_1d", cell(intVar1d, intVar1dFmt));
        cells.put("reg_var_1d", cell(regVar1d, regVar1dFmt));
        cells.put("reg_var_10d", cell(regVar10d, regVar10dFmt));
        cells.put("dyn_svar_10d", cell(dynSvar10d, dynSvar10dFmt));
        cells.put("hst", cell(hst, hstFmt));
        cells.put("cm_int", cell(cmInt, cmIntFmt));
        cells.put("cr_int", cell(crInt, crIntFmt));
        cells.put("eq_int", cell(eqInt, eqIntFmt));
        cells.put("fx_int", cell(fxInt, fxIntFmt));
        cells.put("ir_int", cell(irInt, irIntFmt));
        row.put("cells", cells);
        return row;
    }

    // ========================================================================
    // Business table rows
    // ========================================================================

    private List<Map<String, Object>> buildBizTableRows() {
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(bizRow("biz_total", "Global Markets", "AMBER", "warning", "3.45%", "positive", "2.89%", "positive", "2.67%", "positive", "4.89%", "warning", "6.78%", "warning"));
        rows.add(bizRow("biz_equities", "Equities Trading", "AMBER", "warning", "5.67%", "warning", "4.56%", "warning", "4.23%", "positive", "7.45%", "warning", "8.90%", "warning"));
        rows.add(bizRow("biz_fi", "Fixed Income", "AMBER", "warning", "2.34%", "positive", "1.89%", "positive", "1.56%", "positive", "3.12%", "positive", "4.56%", "warning"));
        rows.add(bizRow("biz_fx", "FX & Rates", "GREEN", "positive", "1.23%", "positive", "0.98%", "positive", "0.89%", "positive", "1.45%", "positive", "2.34%", "positive"));
        rows.add(bizRow("biz_credit", "Credit Products", "RED", "negative", "8.90%", "warning", "7.23%", "warning", "6.78%", "warning", "11.23%", "negative", "16.45%", "negative"));
        rows.add(bizRow("biz_struct", "Structured Finance", "AMBER", "warning", "4.56%", "warning", "3.78%", "positive", "3.45%", "positive", "5.67%", "warning", "7.89%", "warning"));
        rows.add(bizRow("biz_prime", "Prime Services", "GREEN", "positive", "1.89%", "positive", "1.45%", "positive", "1.23%", "positive", "2.34%", "positive", "3.12%", "positive"));
        return rows;
    }

    private Map<String, Object> bizRow(String rowId, String business,
                                        String impact, String impactFmt,
                                        String grpIntVar, String grpIntVarFmt,
                                        String nodeIntVar, String nodeIntVarFmt,
                                        String nodeRegVar, String nodeRegVarFmt,
                                        String nodeDynSvar, String nodeDynSvarFmt,
                                        String nodeHst, String nodeHstFmt) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("rowId", rowId);
        Map<String, Object> cells = new LinkedHashMap<>();
        cells.put("business", cell(business, null));
        cells.put("impact", cell(impact, impactFmt));
        cells.put("grp_int_var", cell(grpIntVar, grpIntVarFmt));
        cells.put("node_int_var", cell(nodeIntVar, nodeIntVarFmt));
        cells.put("node_reg_var", cell(nodeRegVar, nodeRegVarFmt));
        cells.put("node_dyn_svar", cell(nodeDynSvar, nodeDynSvarFmt));
        cells.put("node_hst", cell(nodeHst, nodeHstFmt));
        row.put("cells", cells);
        return row;
    }

    // ========================================================================
    // Treasury table rows
    // ========================================================================

    private List<Map<String, Object>> buildTreasuryTableRows() {
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(treasuryRow("tr_total", "Group Treasury", "AMBER", "warning", "1.56%", "warning", "1.23%", "positive", "1.89%", "warning", "2.45%", "warning", "3.67%", "warning"));
        rows.add(treasuryRow("tr_nam", "Treasury - North America", "AMBER", "warning", "0.89%", "positive", "0.67%", "positive", "1.12%", "positive", "1.45%", "positive", "2.12%", "warning"));
        rows.add(treasuryRow("tr_eu", "Treasury - Europe", "RED", "negative", "2.45%", "warning", "2.12%", "warning", "2.78%", "warning", "3.56%", "negative", "5.23%", "negative"));
        rows.add(treasuryRow("tr_apac", "Treasury - Asia Pacific", "AMBER", "warning", "1.23%", "positive", "0.98%", "positive", "1.45%", "positive", "1.89%", "warning", "2.89%", "warning"));
        rows.add(treasuryRow("tr_gfx", "Treasury - Global FX", "GREEN", "positive", "0.45%", "positive", "0.34%", "positive", "0.67%", "positive", "0.89%", "positive", "1.23%", "positive"));
        rows.add(treasuryRow("tr_rates", "Treasury - Rates Trading", "AMBER", "warning", "1.78%", "warning", "1.45%", "positive", "2.12%", "warning", "2.67%", "warning", "4.12%", "warning"));
        rows.add(treasuryRow("tr_credit", "Treasury - Credit", "RED", "negative", "3.23%", "warning", "2.89%", "warning", "3.89%", "negative", "4.56%", "negative", "6.78%", "negative"));
        rows.add(treasuryRow("tr_collateral", "Treasury - Collateral Mgmt", "GREEN", "positive", "0.34%", "positive", "0.28%", "positive", "0.45%", "positive", "0.56%", "positive", "0.78%", "positive"));
        return rows;
    }

    private Map<String, Object> treasuryRow(String rowId, String desk,
                                             String impact, String impactFmt,
                                             String grpIntVar, String grpIntVarFmt,
                                             String nodeIntVar, String nodeIntVarFmt,
                                             String nodeRegVar, String nodeRegVarFmt,
                                             String nodeDynSvar, String nodeDynSvarFmt,
                                             String nodeHst, String nodeHstFmt) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("rowId", rowId);
        Map<String, Object> cells = new LinkedHashMap<>();
        cells.put("desk", cell(desk, null));
        cells.put("impact", cell(impact, impactFmt));
        cells.put("grp_int_var", cell(grpIntVar, grpIntVarFmt));
        cells.put("node_int_var", cell(nodeIntVar, nodeIntVarFmt));
        cells.put("node_reg_var", cell(nodeRegVar, nodeRegVarFmt));
        cells.put("node_dyn_svar", cell(nodeDynSvar, nodeDynSvarFmt));
        cells.put("node_hst", cell(nodeHst, nodeHstFmt));
        row.put("cells", cells);
        return row;
    }

    // ========================================================================
    // Cell helper
    // ========================================================================

    private static Map<String, Object> cell(String value, String formatToken) {
        Map<String, Object> cell = new LinkedHashMap<>();
        cell.put("value", value);
        if (formatToken != null) {
            cell.put("formatToken", formatToken);
        }
        return cell;
    }
}
