import { useEffect, useRef, useState, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { ChevronRight24Regular } from '@fluentui/react-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCvDefinitionsRequest } from '../../store/changeViewDefinitionAdminSlice';
import { ChangeViewDefinitionListPanel } from './ChangeViewDefinitionListPanel';
import { ChangeViewStructuredEditorPanel } from './ChangeViewStructuredEditorPanel';
import { ChangeViewPreviewPanel } from './ChangeViewPreviewPanel';
import styles from './ChangeViewDefinitionsTab.module.scss';

interface ChangeViewDefinitionsTabProps {
  scenarioTypeCode: string;
  directChangesMode: string;
  directChangesInternalRenderMode: string;
}

export const ChangeViewDefinitionsTab: React.FC<ChangeViewDefinitionsTabProps> = ({
  scenarioTypeCode,
  directChangesMode,
  directChangesInternalRenderMode,
}) => {
  const dispatch = useAppDispatch();
  const error = useAppSelector((state) => state.changeViewDefinitionAdmin.error);
  const selectedDefinition = useAppSelector(
    (state) => state.changeViewDefinitionAdmin.selectedDefinition
  );

  const listPanelRef = useRef<ImperativePanelHandle>(null);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [currentDefinitionJson, setCurrentDefinitionJson] = useState<string>('');

  useEffect(() => {
    dispatch(fetchCvDefinitionsRequest(scenarioTypeCode));
  }, [dispatch, scenarioTypeCode]);

  // Update the in-memory JSON when selected definition changes
  useEffect(() => {
    if (selectedDefinition?.definition) {
      setCurrentDefinitionJson(selectedDefinition.definition);
    } else {
      setCurrentDefinitionJson('');
    }
  }, [selectedDefinition]);

  const handleListCollapse = useCallback(() => {
    setIsListCollapsed(true);
  }, []);

  const handleListExpand = useCallback(() => {
    setIsListCollapsed(false);
  }, []);

  const handleExpandClick = useCallback(() => {
    listPanelRef.current?.expand();
  }, []);

  const handleDefinitionChange = useCallback((json: string) => {
    setCurrentDefinitionJson(json);
  }, []);

  return (
    <div className={styles.container} data-testid="change-view-definitions-tab">
      {/* Deployment Managed Badge */}
      <div className={styles.badgeContainer}>
        <span className={`${styles.badge} ${styles.badgeDeployment}`}>
          Deployment Managed
        </span>
        {directChangesMode === 'INTERNAL' && (
          <span
            className={`${styles.badge} ${styles.badgeDeployment}`}
            data-testid="internal-render-mode-badge"
            style={{ marginLeft: 8 }}
          >
            Internal Mode: {directChangesInternalRenderMode}
          </span>
        )}
      </div>

      {/* Warning banner when directChangesMode is EXTERNAL */}
      {directChangesMode === 'EXTERNAL' && (
        <div className={styles.warningBanner} data-testid="external-mode-warning">
          <MessageBar intent="warning">
            <MessageBarBody>
              Change View template definitions are not currently in use because Direct Changes Mode
              is set to EXTERNAL. Switch to INTERNAL in the Navigation &amp; View Mode tab to activate.
            </MessageBarBody>
          </MessageBar>
        </div>
      )}

      {/* Error display */}
      {error && <span className={styles.errorText}>{error}</span>}

      {/* Three-panel layout */}
      <PanelGroup direction="horizontal" className={styles.panelGroup}>
        {/* Left panel: Definition List */}
        <Panel
          ref={listPanelRef}
          defaultSize={20}
          minSize={10}
          collapsible={true}
          collapsedSize={2}
          onCollapse={handleListCollapse}
          onExpand={handleListExpand}
          order={1}
        >
          <div className={styles.listPanel}>
            {isListCollapsed ? (
              <div className={styles.collapsedContainer}>
                <Button
                  className={styles.expandButton}
                  appearance="subtle"
                  icon={<ChevronRight24Regular />}
                  onClick={handleExpandClick}
                  aria-label="Expand definition list"
                  data-testid="expand-list-panel-button"
                />
              </div>
            ) : (
              <ChangeViewDefinitionListPanel
                scenarioTypeCode={scenarioTypeCode}
                directChangesInternalRenderMode={directChangesInternalRenderMode}
              />
            )}
          </div>
        </Panel>

        <PanelResizeHandle className={styles.resizeHandle} data-testid="list-editor-resize-handle" />

        {/* Center panel: Editor */}
        <Panel
          defaultSize={45}
          minSize={20}
          order={2}
        >
          <div className={styles.editorPanel}>
            <ChangeViewStructuredEditorPanel
              definition={selectedDefinition}
              onDefinitionChange={handleDefinitionChange}
              scenarioTypeCode={scenarioTypeCode}
            />
          </div>
        </Panel>

        <PanelResizeHandle className={styles.resizeHandle} data-testid="editor-preview-resize-handle" />

        {/* Right panel: Preview */}
        <Panel
          defaultSize={35}
          minSize={15}
          order={3}
        >
          <div className={styles.previewPanel}>
            <ChangeViewPreviewPanel
              definitionJson={currentDefinitionJson}
              scenarioTypeCode={scenarioTypeCode}
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default ChangeViewDefinitionsTab;
