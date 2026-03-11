import React from 'react';
import type { RenderedReport } from '../../types/renderedReport';
import { SectionRenderer } from './SectionRenderer';
import styles from './ReportRenderer.module.scss';

interface ReportRendererProps {
  renderedReport: RenderedReport;
}

export const ReportRenderer: React.FC<ReportRendererProps> = ({ renderedReport }) => {
  const sortedSections = [...renderedReport.sections].sort((a, b) => a.order - b.order);

  return (
    <div className={styles.reportContainer}>
      <div className={styles.sectionsContainer}>
        {sortedSections.map((section) => (
          <SectionRenderer key={section.sectionKey} section={section} />
        ))}
      </div>
    </div>
  );
};

export default ReportRenderer;
