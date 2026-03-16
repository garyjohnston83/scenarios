import { useEffect, useRef, useState, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button } from '@fluentui/react-components';
import { ChevronRight24Regular } from '@fluentui/react-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchSpDefinitionsRequest,
  fetchFactTypesRequest,
  fetchRolesRequest,
} from '../../store/signoffPolicyDefinitionAdminSlice';
import { SignoffPolicyDefinitionListPanel } from './SignoffPolicyDefinitionListPanel';
import { SignoffPolicyEditorPanel } from './SignoffPolicyEditorPanel';
import { SignoffPolicySummaryPanel } from './SignoffPolicySummaryPanel';
import styles from './SignoffPolicyDefinitionsTab.module.scss';

interface SignoffPolicyDefinitionsTabProps {
  scenarioTypeCode: string;
}

export const SignoffPolicyDefinitionsTab: React.FC<SignoffPolicyDefinitionsTabProps> = ({
  scenarioTypeCode,
}) => {
  const dispatch = useAppDispatch();
  const error = useAppSelector((state) => state.signoffPolicyDefinitionAdmin.error);
  const selectedDefinition = useAppSelector(
    (state) => state.signoffPolicyDefinitionAdmin.selectedDefinition
  );
  const factTypes = useAppSelector(
    (state) => state.signoffPolicyDefinitionAdmin.factTypes
  );
  const roles = useAppSelector(
    (state) => state.signoffPolicyDefinitionAdmin.roles
  );

  const listPanelRef = useRef<ImperativePanelHandle>(null);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [currentDefinitionJson, setCurrentDefinitionJson] = useState<string>('');

  // Fetch definitions and catalogs on mount
  useEffect(() => {
    dispatch(fetchSpDefinitionsRequest(scenarioTypeCode));
    dispatch(fetchFactTypesRequest());
    dispatch(fetchRolesRequest());
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
    <div className={styles.container} data-testid="signoff-policy-definitions-tab">
      {/* Deployment Managed Badge */}
      <div className={styles.badgeContainer}>
        <span className={`${styles.badge} ${styles.badgeDeployment}`}>
          Deployment Managed
        </span>
      </div>

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
              <SignoffPolicyDefinitionListPanel scenarioTypeCode={scenarioTypeCode} />
            )}
          </div>
        </Panel>

        <PanelResizeHandle className={styles.resizeHandle} data-testid="list-editor-resize-handle" />

        {/* Center panel: Policy Editor */}
        <Panel
          defaultSize={45}
          minSize={20}
          order={2}
        >
          <div className={styles.editorPanel}>
            <SignoffPolicyEditorPanel
              definition={selectedDefinition}
              onDefinitionChange={handleDefinitionChange}
              scenarioTypeCode={scenarioTypeCode}
              factTypes={factTypes}
              roles={roles}
            />
          </div>
        </Panel>

        <PanelResizeHandle className={styles.resizeHandle} data-testid="editor-summary-resize-handle" />

        {/* Right panel: Read-only Summary */}
        <Panel
          defaultSize={35}
          minSize={15}
          order={3}
        >
          <div className={styles.summaryPanel}>
            <SignoffPolicySummaryPanel
              definitionJson={currentDefinitionJson}
              selectedDefinition={selectedDefinition}
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default SignoffPolicyDefinitionsTab;
