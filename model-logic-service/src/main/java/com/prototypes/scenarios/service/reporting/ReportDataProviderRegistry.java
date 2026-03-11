package com.prototypes.scenarios.service.reporting;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Registry that maps scenario type codes to their corresponding ReportDataProvider instances.
 * Providers are registered at construction time via constructor injection of individual stub beans.
 *
 * In a future increment, real providers can replace stubs by implementing
 * the same interface and registering under the same scenario type key.
 */
@Component
public class ReportDataProviderRegistry {

    private final Map<String, ReportDataProvider> providers;

    public ReportDataProviderRegistry(FrtbSaStubDataProvider frtbSaStubDataProvider,
                                      MarketDataStubDataProvider marketDataStubDataProvider,
                                      RiskFactorStubDataProvider riskFactorStubDataProvider) {
        this.providers = new HashMap<>();
        this.providers.put("FRTB_SA", frtbSaStubDataProvider);
        this.providers.put("MARKET_DATA", marketDataStubDataProvider);
        this.providers.put("RISK_FACTOR", riskFactorStubDataProvider);
    }

    /**
     * Returns the data provider for the given scenario type code.
     *
     * @param scenarioTypeCode the scenario type code (e.g., "FRTB_SA", "MARKET_DATA", "RISK_FACTOR")
     * @return an Optional containing the provider if registered, or empty if not
     */
    public Optional<ReportDataProvider> getProvider(String scenarioTypeCode) {
        return Optional.ofNullable(providers.get(scenarioTypeCode));
    }
}
