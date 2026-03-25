import {
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from '@fluentui/react-components';
import type { DirectChangesDataSectionFe } from '../../types/directChanges';
import { DirectChangesTable } from '../DirectChangesTable';
import styles from './DirectChangesSectionAccordion.module.scss';

interface DirectChangesSectionAccordionProps {
  section: DirectChangesDataSectionFe;
  value: string;
}

export const DirectChangesSectionAccordion: React.FC<DirectChangesSectionAccordionProps> = ({
  section,
  value,
}) => {
  const renderBody = () => {
    switch (section.renderState) {
      case 'ROWS':
        return (
          <DirectChangesTable
            columnDefinitions={section.columnDefinitions}
            rows={section.data ?? []}
          />
        );
      case 'OVERFLOW':
        return (
          <div className={styles.overflowMessage}>
            <span>Too many changes to display inline.</span>
            {section.externalLink && (
              <a
                href={section.externalLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in external view
              </a>
            )}
          </div>
        );
      case 'NO_DATA':
        return <div className={styles.noDataMessage}>Data changes not available here</div>;
      default:
        return null;
    }
  };

  return (
    <AccordionItem value={value}>
      <div className={styles.headerWrapper}>
        <AccordionHeader className={styles.accordionHeader}>
          {section.header}
        </AccordionHeader>
        {section.externalLink && (
          <div
            className={styles.externalLinkWrapper}
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <a
              href={section.externalLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in external view
            </a>
          </div>
        )}
      </div>
      <AccordionPanel>
        {renderBody()}
      </AccordionPanel>
    </AccordionItem>
  );
};

export default DirectChangesSectionAccordion;
