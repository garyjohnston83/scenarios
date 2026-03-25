import { useState } from 'react';
import { Accordion, Button } from '@fluentui/react-components';
import { DirectChangesSectionAccordion } from '../../components/DirectChangesSectionAccordion';
import type { DirectChangesDataSectionFe } from '../../types/directChanges';
import styles from './DeltaPreviewRenderer.module.scss';

interface DeltaPreviewRendererProps {
  sections: DirectChangesDataSectionFe[];
}

type RenderStateValue = 'ROWS' | 'OVERFLOW' | 'NO_DATA';

/**
 * Renders a DELTA_BY_UNIQUE_ID preview using Fluent UI Accordion wrapping
 * DirectChangesSectionAccordion for each section.
 *
 * Matches the DirectChangesDeltaView layout (lines 61-75) but adds per-section
 * state toggle buttons to let the admin preview each rendering state (ROWS,
 * OVERFLOW, NO_DATA).
 *
 * Section render states are managed in local useState so toggling a state
 * override does not mutate the incoming props.
 */
export const DeltaPreviewRenderer: React.FC<DeltaPreviewRendererProps> = ({
  sections,
}) => {
  // Local state to track per-section render state overrides.
  // Keyed by dataType string -> 'ROWS' | 'OVERFLOW' | 'NO_DATA'.
  const [sectionRenderStates, setSectionRenderStates] = useState<Record<string, RenderStateValue>>(() => {
    const initial: Record<string, RenderStateValue> = {};
    for (const section of sections) {
      initial[section.dataType] = section.renderState;
    }
    return initial;
  });

  const handleToggleState = (dataType: string, newState: RenderStateValue) => {
    setSectionRenderStates((prev) => ({
      ...prev,
      [dataType]: newState,
    }));
  };

  // Build effective sections with the local render state overrides applied.
  const effectiveSections = sections.map((section) => ({
    ...section,
    renderState: sectionRenderStates[section.dataType] ?? section.renderState,
  }));

  // Default open items: all sections open
  const defaultOpenItems = sections.map((s) => s.dataType);

  const renderStateOptions: RenderStateValue[] = ['ROWS', 'OVERFLOW', 'NO_DATA'];

  return (
    <div className={styles.container} data-testid="delta-preview-renderer">
      <Accordion multiple collapsible defaultOpenItems={defaultOpenItems}>
        {effectiveSections.map((section) => (
          <div key={section.dataType} className={styles.sectionWrapper}>
            {/* Per-section state toggle buttons */}
            <div
              className={styles.stateToggleGroup}
              data-testid={`state-toggle-${section.dataType}`}
            >
              <span className={styles.toggleLabel}>Preview state:</span>
              {renderStateOptions.map((state) => (
                <Button
                  key={state}
                  appearance={
                    sectionRenderStates[section.dataType] === state
                      ? 'primary'
                      : 'outline'
                  }
                  size="small"
                  onClick={() => handleToggleState(section.dataType, state)}
                  data-testid={`toggle-${state}-${section.dataType}`}
                  className={styles.toggleButton}
                >
                  {state}
                </Button>
              ))}
            </div>

            {/* Accordion section using the shared DirectChangesSectionAccordion */}
            <DirectChangesSectionAccordion
              section={section}
              value={section.dataType}
            />
          </div>
        ))}
      </Accordion>
    </div>
  );
};

export default DeltaPreviewRenderer;
