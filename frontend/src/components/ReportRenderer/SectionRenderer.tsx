import React from 'react';
import type { ReportSection, ContentBlock } from '../../types/renderedReport';
import { MetricBlockRenderer } from './MetricBlockRenderer';
import { TextBlockRenderer } from './TextBlockRenderer';
import { TableBlockRenderer } from './TableBlockRenderer';
import styles from './SectionRenderer.module.scss';

interface SectionRendererProps {
  section: ReportSection;
}

function renderContentBlock(block: ContentBlock): React.ReactNode {
  switch (block.blockType) {
    case 'metric':
      return <MetricBlockRenderer key={block.metricKey} block={block} />;
    case 'text':
      return <TextBlockRenderer key={block.textKey} block={block} />;
    case 'table':
      return <TableBlockRenderer key={block.tableKey} block={block} />;
    default:
      return null;
  }
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({ section }) => {
  const sortedBlocks = [...section.contentBlocks].sort((a, b) => a.order - b.order);

  return (
    <div className={styles.section}>
      <div className={styles.contentBlocks}>
        {sortedBlocks.map((block) => renderContentBlock(block))}
      </div>
    </div>
  );
};

export default SectionRenderer;
