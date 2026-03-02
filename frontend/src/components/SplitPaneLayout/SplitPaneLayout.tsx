import { useRef, useState, useCallback, useEffect } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button } from '@fluentui/react-components';
import { ChevronRight24Regular } from '@fluentui/react-icons';
import { useAppSelector } from '../../store/hooks';
import styles from './SplitPaneLayout.module.scss';

export interface SplitPaneLayoutProps {
  lhs: React.ReactNode | ((onCollapse: () => void) => React.ReactNode);
  rhs: React.ReactNode;
}

export const SplitPaneLayout: React.FC<SplitPaneLayoutProps> = ({ lhs, rhs }) => {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Read external collapse command from Redux
  const lhsCollapsed = useAppSelector((state) => state.scenarios.lhsCollapsed);

  useEffect(() => {
    if (lhsCollapsed) {
      panelRef.current?.collapse();
    } else {
      panelRef.current?.expand();
    }
  }, [lhsCollapsed]);

  const handleCollapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  const handleExpandClick = useCallback(() => {
    panelRef.current?.expand();
  }, []);

  const handleCollapseClick = useCallback(() => {
    panelRef.current?.collapse();
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
            typeof lhs === 'function' ? lhs(handleCollapseClick) : lhs
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
