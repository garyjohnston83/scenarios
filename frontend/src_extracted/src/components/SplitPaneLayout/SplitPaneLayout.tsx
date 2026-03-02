import { useRef, useState, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button } from '@fluentui/react-components';
import { ChevronRight24Regular } from '@fluentui/react-icons';
import styles from './SplitPaneLayout.module.scss';

export interface SplitPaneLayoutProps {
  lhs: React.ReactNode;
  rhs: React.ReactNode;
}

export const SplitPaneLayout: React.FC<SplitPaneLayoutProps> = ({ lhs, rhs }) => {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCollapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  const handleExpandClick = useCallback(() => {
    panelRef.current?.expand();
  }, []);

  return (
    <PanelGroup direction="horizontal" className={styles.panelGroup}>
      <Panel
        ref={panelRef}
        defaultSize={15}
        minSize={10}
        collapsible={true}
        collapsedSize={2}
        onCollapse={handleCollapse}
        onExpand={handleExpand}
        order={1}
      >
        <div className={styles.lhsPanel}>
          {isCollapsed ? (
            <div className={styles.collapsedContainer}>
              <Button
                className={styles.expandButton}
                appearance="subtle"
                icon={<ChevronRight24Regular />}
                onClick={handleExpandClick}
                aria-label="Expand panel"
                data-testid="expand-panel-button"
              />
            </div>
          ) : (
            lhs
          )}
        </div>
      </Panel>
      <PanelResizeHandle className={styles.resizeHandle} data-testid="resize-handle" />
      <Panel order={2}>
        <div className={styles.rhsPanel}>
          {rhs}
        </div>
      </Panel>
    </PanelGroup>
  );
};

export default SplitPaneLayout;
