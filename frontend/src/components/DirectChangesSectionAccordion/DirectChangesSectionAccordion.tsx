import {
  Accordion,
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
        if (section.groupByEntityIdColumn) {
          return renderGroupedBody();
        }
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

  const renderGroupedBody = () => {
    const rows = section.data ?? [];
    const entityCol = section.columnDefinitions.find((col) => col.isEntityId);
    if (!entityCol) {
      // Fallback to flat table if no entityId column found
      return (
        <DirectChangesTable
          columnDefinitions={section.columnDefinitions}
          rows={rows}
        />
      );
    }

    const entityAttr = entityCol.dataAttribute;
    const title = section.dataTypeTitle || section.dataType;

    // Group rows by entity value preserving insertion order
    const groupMap = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const key = String(row[entityAttr] ?? 'Unknown');
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(row);
    }

    const groups = Array.from(groupMap.entries());

    return (
      <Accordion multiple collapsible>
        {groups.map(([entityValue, entityRows]) => (
          <AccordionItem key={entityValue} value={entityValue}>
            <div className={styles.subHeaderWrapper}>
              <AccordionHeader className={styles.subAccordionHeader}>
                {title} {entityValue} has {entityRows.length} change{entityRows.length !== 1 ? 's' : ''}
              </AccordionHeader>
              {section.externalLink && (
                <div
                  className={styles.subExternalLinkWrapper}
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
              <DirectChangesTable
                columnDefinitions={section.columnDefinitions}
                rows={entityRows}
              />
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    );
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
