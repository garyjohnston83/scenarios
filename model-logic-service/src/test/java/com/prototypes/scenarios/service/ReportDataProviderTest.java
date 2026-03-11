package com.prototypes.scenarios.service;

import com.prototypes.scenarios.service.reporting.FrtbSaStubDataProvider;
import com.prototypes.scenarios.service.reporting.MarketDataStubDataProvider;
import com.prototypes.scenarios.service.reporting.ReportData;
import com.prototypes.scenarios.service.reporting.ReportDataProvider;
import com.prototypes.scenarios.service.reporting.ReportDataProviderRegistry;
import com.prototypes.scenarios.service.reporting.RiskFactorStubDataProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for ReportDataProvider interface, stub implementations, and registry.
 * Plain JUnit 5 -- no Spring context required.
 */
class ReportDataProviderTest {

    private FrtbSaStubDataProvider frtbSaProvider;
    private MarketDataStubDataProvider marketDataProvider;
    private RiskFactorStubDataProvider riskFactorProvider;
    private ReportDataProviderRegistry registry;

    private static final UUID TEST_SCENARIO_ID = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");

    @BeforeEach
    void setUp() {
        frtbSaProvider = new FrtbSaStubDataProvider();
        marketDataProvider = new MarketDataStubDataProvider();
        riskFactorProvider = new RiskFactorStubDataProvider();
        registry = new ReportDataProviderRegistry(frtbSaProvider, marketDataProvider, riskFactorProvider);
    }

    // ========================================================================
    // Test 1: FrtbSaStubDataProvider returns nested path risk_charges.girr.delta
    // ========================================================================

    @Test
    void frtbSaProvider_returnsNestedPathRiskChargesGirrDelta() {
        ReportData reportData = frtbSaProvider.getReportData(TEST_SCENARIO_ID, "FRTB_SA");

        assertNotNull(reportData);
        assertNotNull(reportData.productionData());
        assertNotNull(reportData.scenarioData());

        // Verify nested path: risk_charges.girr.delta exists in production data
        Object riskCharges = reportData.productionData().get("risk_charges");
        assertNotNull(riskCharges, "risk_charges should be present in production data");
        assertTrue(riskCharges instanceof Map, "risk_charges should be a Map");

        @SuppressWarnings("unchecked")
        Map<String, Object> riskChargesMap = (Map<String, Object>) riskCharges;
        Object girr = riskChargesMap.get("girr");
        assertNotNull(girr, "risk_charges.girr should be present");
        assertTrue(girr instanceof Map, "risk_charges.girr should be a Map");

        @SuppressWarnings("unchecked")
        Map<String, Object> girrMap = (Map<String, Object>) girr;
        Object delta = girrMap.get("delta");
        assertNotNull(delta, "risk_charges.girr.delta should be present");
        assertTrue(delta instanceof Number, "risk_charges.girr.delta should be a Number");

        // Verify all other FRTB_SA source_field paths exist
        assertNotNull(riskChargesMap.get("csr_nonsec"), "risk_charges.csr_nonsec should be present");
        assertNotNull(riskChargesMap.get("fx"), "risk_charges.fx should be present");
        assertNotNull(riskChargesMap.get("equity"), "risk_charges.equity should be present");
        assertNotNull(riskChargesMap.get("commodity"), "risk_charges.commodity should be present");
        assertNotNull(riskChargesMap.get("total_sa_charge"), "risk_charges.total_sa_charge should be present");
        assertNotNull(riskChargesMap.get("drc_charge"), "risk_charges.drc_charge should be present");
        assertNotNull(riskChargesMap.get("rrao_charge"), "risk_charges.rrao_charge should be present");

        // Verify vega and curvature sub-paths
        @SuppressWarnings("unchecked")
        Map<String, Object> fxMap = (Map<String, Object>) riskChargesMap.get("fx");
        assertNotNull(fxMap.get("delta"), "risk_charges.fx.delta should be present");
        assertNotNull(fxMap.get("vega"), "risk_charges.fx.vega should be present");
        assertNotNull(fxMap.get("curvature"), "risk_charges.fx.curvature should be present");

        assertNotNull(girrMap.get("vega"), "risk_charges.girr.vega should be present");
        assertNotNull(girrMap.get("curvature"), "risk_charges.girr.curvature should be present");

        @SuppressWarnings("unchecked")
        Map<String, Object> equityMap = (Map<String, Object>) riskChargesMap.get("equity");
        assertNotNull(equityMap.get("vega"), "risk_charges.equity.vega should be present");
    }

    // ========================================================================
    // Test 2: MarketDataStubDataProvider returns nested paths for market_risk and exposure
    // ========================================================================

    @Test
    void marketDataProvider_returnsNestedPathsVarAndExposure() {
        ReportData reportData = marketDataProvider.getReportData(TEST_SCENARIO_ID, "MARKET_DATA");

        assertNotNull(reportData);
        assertNotNull(reportData.productionData());
        assertNotNull(reportData.scenarioData());

        // Verify market_risk.var_99
        Object marketRisk = reportData.productionData().get("market_risk");
        assertNotNull(marketRisk, "market_risk should be present in production data");
        assertTrue(marketRisk instanceof Map, "market_risk should be a Map");

        @SuppressWarnings("unchecked")
        Map<String, Object> marketRiskMap = (Map<String, Object>) marketRisk;
        assertNotNull(marketRiskMap.get("var_99"), "market_risk.var_99 should be present");
        assertTrue(marketRiskMap.get("var_99") instanceof Number, "market_risk.var_99 should be a Number");
        assertNotNull(marketRiskMap.get("var_97_5"), "market_risk.var_97_5 should be present");
        assertNotNull(marketRiskMap.get("stressed_var"), "market_risk.stressed_var should be present");

        // Verify exposure.gross
        Object exposure = reportData.productionData().get("exposure");
        assertNotNull(exposure, "exposure should be present in production data");
        assertTrue(exposure instanceof Map, "exposure should be a Map");

        @SuppressWarnings("unchecked")
        Map<String, Object> exposureMap = (Map<String, Object>) exposure;
        assertNotNull(exposureMap.get("gross"), "exposure.gross should be present");
        assertTrue(exposureMap.get("gross") instanceof Number, "exposure.gross should be a Number");
        assertNotNull(exposureMap.get("net"), "exposure.net should be present");
        assertNotNull(exposureMap.get("notional"), "exposure.notional should be present");
    }

    // ========================================================================
    // Test 3: RiskFactorStubDataProvider returns nested paths for pnl and shifts
    // ========================================================================

    @Test
    void riskFactorProvider_returnsNestedPathsPnlAndShifts() {
        ReportData reportData = riskFactorProvider.getReportData(TEST_SCENARIO_ID, "RISK_FACTOR");

        assertNotNull(reportData);
        assertNotNull(reportData.productionData());
        assertNotNull(reportData.scenarioData());

        // Verify pnl.total_impact
        Object pnl = reportData.productionData().get("pnl");
        assertNotNull(pnl, "pnl should be present in production data");
        assertTrue(pnl instanceof Map, "pnl should be a Map");

        @SuppressWarnings("unchecked")
        Map<String, Object> pnlMap = (Map<String, Object>) pnl;
        assertNotNull(pnlMap.get("total_impact"), "pnl.total_impact should be present");
        assertTrue(pnlMap.get("total_impact") instanceof Number, "pnl.total_impact should be a Number");
        assertNotNull(pnlMap.get("first_order"), "pnl.first_order should be present");
        assertNotNull(pnlMap.get("second_order"), "pnl.second_order should be present");
        assertNotNull(pnlMap.get("unexplained"), "pnl.unexplained should be present");

        // Verify shifts.ir_shift
        Object shifts = reportData.productionData().get("shifts");
        assertNotNull(shifts, "shifts should be present in production data");
        assertTrue(shifts instanceof Map, "shifts should be a Map");

        @SuppressWarnings("unchecked")
        Map<String, Object> shiftsMap = (Map<String, Object>) shifts;
        assertNotNull(shiftsMap.get("ir_shift"), "shifts.ir_shift should be present");
        assertTrue(shiftsMap.get("ir_shift") instanceof Number, "shifts.ir_shift should be a Number");
        assertNotNull(shiftsMap.get("credit_spread"), "shifts.credit_spread should be present");
        assertNotNull(shiftsMap.get("fx_spot"), "shifts.fx_spot should be present");
        assertNotNull(shiftsMap.get("equity_price"), "shifts.equity_price should be present");
    }

    // ========================================================================
    // Test 4: Registry returns correct provider and empty for unknown types
    // ========================================================================

    @Test
    void registry_returnsProviderForRegisteredType_andEmptyForUnknown() {
        // FRTB_SA should return the FRTB SA provider
        Optional<ReportDataProvider> frtbProvider = registry.getProvider("FRTB_SA");
        assertTrue(frtbProvider.isPresent(), "FRTB_SA provider should be registered");
        assertTrue(frtbProvider.get() instanceof FrtbSaStubDataProvider,
                "FRTB_SA provider should be FrtbSaStubDataProvider");

        // MARKET_DATA should return the Market Data provider
        Optional<ReportDataProvider> mdProvider = registry.getProvider("MARKET_DATA");
        assertTrue(mdProvider.isPresent(), "MARKET_DATA provider should be registered");
        assertTrue(mdProvider.get() instanceof MarketDataStubDataProvider,
                "MARKET_DATA provider should be MarketDataStubDataProvider");

        // RISK_FACTOR should return the Risk Factor provider
        Optional<ReportDataProvider> rfProvider = registry.getProvider("RISK_FACTOR");
        assertTrue(rfProvider.isPresent(), "RISK_FACTOR provider should be registered");
        assertTrue(rfProvider.get() instanceof RiskFactorStubDataProvider,
                "RISK_FACTOR provider should be RiskFactorStubDataProvider");

        // NONEXISTENT should return empty
        Optional<ReportDataProvider> nonExistent = registry.getProvider("NONEXISTENT");
        assertTrue(nonExistent.isEmpty(), "NONEXISTENT type should return empty Optional");

        // null should return empty
        Optional<ReportDataProvider> nullType = registry.getProvider(null);
        assertTrue(nullType.isEmpty(), "null type should return empty Optional");
    }

    // ========================================================================
    // Test 5: All stub providers return both production and scenario data with numeric values
    // ========================================================================

    @Test
    void allProviders_returnBothProductionAndScenarioDataWithNumericValues() {
        // FRTB_SA
        ReportData frtbData = frtbSaProvider.getReportData(TEST_SCENARIO_ID, "FRTB_SA");
        assertNotNull(frtbData.productionData(), "FRTB_SA production data should not be null");
        assertNotNull(frtbData.scenarioData(), "FRTB_SA scenario data should not be null");
        assertProductionAndScenarioDiffer(frtbData, "risk_charges", "girr", "delta");

        // MARKET_DATA
        ReportData mdData = marketDataProvider.getReportData(TEST_SCENARIO_ID, "MARKET_DATA");
        assertNotNull(mdData.productionData(), "MARKET_DATA production data should not be null");
        assertNotNull(mdData.scenarioData(), "MARKET_DATA scenario data should not be null");
        assertProductionAndScenarioDiffer(mdData, "market_risk", "var_99", null);

        // RISK_FACTOR
        ReportData rfData = riskFactorProvider.getReportData(TEST_SCENARIO_ID, "RISK_FACTOR");
        assertNotNull(rfData.productionData(), "RISK_FACTOR production data should not be null");
        assertNotNull(rfData.scenarioData(), "RISK_FACTOR scenario data should not be null");
        assertProductionAndScenarioDiffer(rfData, "pnl", "total_impact", null);
    }

    /**
     * Helper to verify that production and scenario data both contain numeric values
     * at the given path and that those values differ (enabling meaningful delta calculation).
     */
    @SuppressWarnings("unchecked")
    private void assertProductionAndScenarioDiffer(ReportData data, String topKey, String secondKey, String thirdKey) {
        Map<String, Object> prodTop = (Map<String, Object>) data.productionData().get(topKey);
        Map<String, Object> scenTop = (Map<String, Object>) data.scenarioData().get(topKey);
        assertNotNull(prodTop, topKey + " should be present in production data");
        assertNotNull(scenTop, topKey + " should be present in scenario data");

        Number prodValue;
        Number scenValue;
        if (thirdKey != null) {
            Map<String, Object> prodSecond = (Map<String, Object>) prodTop.get(secondKey);
            Map<String, Object> scenSecond = (Map<String, Object>) scenTop.get(secondKey);
            prodValue = (Number) prodSecond.get(thirdKey);
            scenValue = (Number) scenSecond.get(thirdKey);
        } else {
            prodValue = (Number) prodTop.get(secondKey);
            scenValue = (Number) scenTop.get(secondKey);
        }

        assertNotNull(prodValue, "Production value should be numeric and not null");
        assertNotNull(scenValue, "Scenario value should be numeric and not null");
        assertTrue(prodValue.doubleValue() != scenValue.doubleValue(),
                "Production and scenario values should differ for meaningful delta calculation");
    }
}
