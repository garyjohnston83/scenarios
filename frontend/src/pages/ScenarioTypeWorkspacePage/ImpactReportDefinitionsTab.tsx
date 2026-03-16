import { useEffect, useRef, useState, useCallback } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { Button, Combobox, Option } from '@fluentui/react-components';
import { ChevronRight24Regular } from '@fluentui/react-icons';
import type { SelectionEvents, OptionOnSelectData } from '@fluentui/react-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchDefinitionsRequest, fetchDefinitionDetailRequest } from '../../store/reportDefinitionAdminSlice';
import { StructuredEditorPanel } from './StructuredEditorPanel';
import { PreviewPanel } from './PreviewPanel';
import { CreateDefinitionDialog } from './CreateDefinitionDialog';
import styles from './ImpactReportDefinitionsTab.module.scss';

interface ImpactReportDefinitionsTabProps {
  scenarioTypeCode: string;
}

export const ImpactReportDefinitionsTab: React.FC<ImpactReportDefinitionsTabProps> = ({
  scenarioTypeCode,
}) => {
  const dispatch = useAppDispatch();
  const error = useAppSelector((state) => state.reportDefinitionAdmin.error);
  const definitions = useAppSelector((state) => state.reportDefinitionAdmin.definitions);
  const selectedDefinition = useAppSelector(
    (state) => state.reportDefinitionAdmin.selectedDefinition
  );

  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Preview state -- updated only on save or when a new definition is selected
  const [previewDefinitionJson, setPreviewDefinitionJson] = useState<string>('');
  const [previewSampleData, setPreviewSampleData] = useState<string>('');

  useEffect(() => {
    dispatch(fetchDefinitionsRequest(scenarioTypeCode));
  }, [dispatch, scenarioTypeCode]);

  // Update preview state when selected definition changes
  useEffect(() => {
    setPreviewDefinitionJson(selectedDefinition?.definition || '');
    setPreviewSampleData(selectedDefinition?.sampleData || '');
  }, [selectedDefinition]);

  const handleEditorCollapse = useCallback(() => {
    setIsEditorCollapsed(true);
  }, []);

  const handleEditorExpand = useCallback(() => {
    setIsEditorCollapsed(false);
  }, []);

  const handleEditorExpandClick = useCallback(() => {
    editorPanelRef.current?.expand();
  }, []);

  const handleEditorCollapseClick = useCallback(() => {
    editorPanelRef.current?.collapse();
  }, []);

  // No-op: StructuredEditorPanel requires this callback but the parent
  // does not need to track live editing state (preview updates only on save)
  const handleDefinitionChange = useCallback((_json: string) => {}, []);

  // Save callbacks -- update preview state
  const handleTemplateSaved = useCallback((json: string) => {
    setPreviewDefinitionJson(json);
  }, []);

  const handleSampleDataSaved = useCallback((sampleData: string) => {
    setPreviewSampleData(sampleData);
  }, []);

  // Combobox: handle definition selection
  const handleDefinitionSelect = useCallback(
    (_event: SelectionEvents, data: OptionOnSelectData) => {
      if (data.optionValue) {
        dispatch(
          fetchDefinitionDetailRequest({
            scenarioTypeCode,
            id: data.optionValue,
          })
        );
      }
    },
    [dispatch, scenarioTypeCode]
  );

  // Build selected value for the combobox
  const comboboxSelectedValue = selectedDefinition
    ? `${selectedDefinition.displayName} (${selectedDefinition.reportKey})`
    : '';

  return (
    <div className={styles.container} data-testid="impact-report-definitions-tab">
      {/* Header row: Create New + Load Existing combobox */}
      <div className={styles.headerRow}>
        <Button
          appearance="primary"
          size="small"
          onClick={() => setCreateDialogOpen(true)}
          data-testid="create-definition-button"
        >
          Create New
        </Button>
        <span className={styles.loadExistingLabel}>Load Existing:</span>
        <Combobox
          className={styles.loadExistingCombobox}
          placeholder="Search definitions..."
          value={comboboxSelectedValue}
          selectedOptions={selectedDefinition ? [selectedDefinition.id] : []}
          onOptionSelect={handleDefinitionSelect}
          data-testid="load-existing-combobox"
        >
          {definitions.map((def) => (
            <Option key={def.id} value={def.id}>
              {`${def.displayName} (${def.reportKey})`}
            </Option>
          ))}
        </Combobox>
      </div>

      {/* Error display */}
      {error && <span className={styles.errorText}>{error}</span>}

      {/* Two-panel layout */}
      <PanelGroup direction="horizontal" className={styles.panelGroup}>
        {/* Left panel: Editor */}
        <Panel
          ref={editorPanelRef}
          defaultSize={55}
          minSize={20}
          collapsible={true}
          collapsedSize={2}
          onCollapse={handleEditorCollapse}
          onExpand={handleEditorExpand}
          order={1}
        >
          <div className={styles.editorPanel}>
            {isEditorCollapsed ? (
              <div className={styles.editorCollapsedContainer}>
                <Button
                  className={styles.editorExpandButton}
                  appearance="subtle"
                  icon={<ChevronRight24Regular />}
                  onClick={handleEditorExpandClick}
                  aria-label="Expand editor panel"
                  data-testid="expand-editor-panel-button"
                />
              </div>
            ) : (
              <StructuredEditorPanel
                definition={selectedDefinition}
                onDefinitionChange={handleDefinitionChange}
                onTemplateSaved={handleTemplateSaved}
                onSampleDataSaved={handleSampleDataSaved}
                onCollapse={handleEditorCollapseClick}
              />
            )}
          </div>
        </Panel>

        <PanelResizeHandle className={styles.resizeHandle} data-testid="editor-preview-resize-handle" />

        {/* Right panel: Preview */}
        <Panel
          defaultSize={45}
          minSize={15}
          order={2}
        >
          <div className={styles.previewPanel}>
            <PreviewPanel
              definitionJson={previewDefinitionJson}
              sampleData={previewSampleData}
            />
          </div>
        </Panel>
      </PanelGroup>

      {/* Create Definition Dialog */}
      <CreateDefinitionDialog
        open={createDialogOpen}
        onDismiss={() => setCreateDialogOpen(false)}
        scenarioTypeCode={scenarioTypeCode}
      />
    </div>
  );
};

export default ImpactReportDefinitionsTab;
