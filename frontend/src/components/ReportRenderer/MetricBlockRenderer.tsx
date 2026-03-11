import React from 'react';
import type { MetricBlock } from '../../types/renderedReport';
import { getFormatTokenClass } from '../../utils/formatTokenStyles';
import styles from './MetricBlockRenderer.module.scss';

interface MetricBlockRendererProps {
  block: MetricBlock;
}

function formatDeltaPct(deltaPct: number | string): string {
  if (typeof deltaPct === 'string') {
    if (deltaPct === 'N/A') return 'N/A';
    return deltaPct;
  }
  const sign = deltaPct >= 0 ? '+' : '';
  return `${sign}${deltaPct.toFixed(2)}%`;
}

export const MetricBlockRenderer: React.FC<MetricBlockRendererProps> = ({ block }) => {
  const isProductionNA = block.productionValue === 'N/A';
  const isScenarioNA = block.scenarioValue === 'N/A';
  const isDeltaNA = block.deltaValue === 'N/A';
  const formatTokenClass = getFormatTokenClass(block.formatToken);

  return (
    <div className={styles.metricRow} data-testid={`metric-block-${block.metricKey}`}>
      <div className={styles.label}>{block.label}</div>
      <div className={styles.value}>
        <div className={styles.valueLabel}>Production</div>
        <span className={isProductionNA ? styles.naValue : undefined}>
          {isProductionNA ? 'N/A' : block.formattedProductionValue}
        </span>
      </div>
      <div className={styles.value}>
        <div className={styles.valueLabel}>Scenario</div>
        <span className={isScenarioNA ? styles.naValue : undefined}>
          {isScenarioNA ? 'N/A' : block.formattedScenarioValue}
        </span>
      </div>
      <div className={styles.delta}>
        <div className={styles.valueLabel}>Delta</div>
        <span className={isDeltaNA ? styles.naValue : formatTokenClass}>
          {isDeltaNA ? 'N/A' : block.formattedDelta}
        </span>
      </div>
      <div className={styles.delta}>
        <div className={styles.valueLabel}>Delta %</div>
        <span className={isDeltaNA ? styles.naValue : formatTokenClass}>
          {isDeltaNA ? 'N/A' : formatDeltaPct(block.deltaPct)}
        </span>
      </div>
    </div>
  );
};

export default MetricBlockRenderer;
