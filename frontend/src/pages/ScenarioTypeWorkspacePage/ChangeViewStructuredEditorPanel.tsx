import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Input,
  Textarea,
  Select,
  SpinButton,
  TabList,
  Tab,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import type { SpinButtonChangeEvent, SpinButtonOnChangeData, SelectionEvents, TabValue } from '@fluentui/react-components';
import { Delete24Regular, Add24Regular, ChevronDown24Regular, ChevronRight24Regular } from '@fluentui/react-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createCvDefinitionRequest } from '../../store/changeViewDefinitionAdminSlice';
import type { ChangeViewDefinitionDetail } from '../../services/changeViewDefinitionAdminApi';
import { TextBlockEditor } from './TextBlockEditor';
import { TableBlockEditor } from './TableBlockEditor';
import { MonacoEditorPanel } from './MonacoEditorPanel';
import styles from './ChangeViewStructuredEditorPanel.module.scss';

interface ChangeViewStructuredEditorPanelProps {
  definition: ChangeViewDefinitionDetail | null;
  onDefinitionChange: (json: string) => void;
  scenarioTypeCode: string;
}

interface DefinitionState {
  schema_version: string;
  template_key: string;
  scenario_type: string;
  display_name: string;
  description: string;
  metadata: {
    author: string;
    tags: string[];
  };
  sections: SectionState[];
  [key: string]: unknown;
}

interface SectionState {
  key: string;
  title: string;
  order: number;
  contentBlocks: ContentBlockState[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ContentBlockState {
  blockType: string;
  [key: string]: unknown;
}

function parseDefinition(jsonString: string): DefinitionState | null {
  try {
    const parsed = JSON.parse(jsonString);
    return {
      schema_version: parsed.schema_version || '1.0',
      template_key: parsed.template_key || '',
      scenario_type: parsed.scenario_type || '',
      display_name: parsed.display_name || '',
      description: parsed.description || '',
      metadata: {
        author: parsed.metadata?.author || '',
        tags: parsed.metadata?.tags || [],
      },
      sections: (parsed.sections || []).map((s: Record<string, unknown>) => ({
        key: (s.key as string) || '',
        title: (s.title as string) || '',
        order: (s.order as number) || 1,
        contentBlocks: (s.contentBlocks as ContentBlockState[]) || [],
      })),
    };
  } catch {
    return null;
  }
}

function serializeDefinition(state: DefinitionState): string {
  return JSON.stringify(state, null, 2);
}

export const ChangeViewStructuredEditorPanel: React.FC<ChangeViewStructuredEditorPanelProps> = ({
  definition,
  onDefinitionChange,
  scenarioTypeCode,
}) => {
  const dispatch = useAppDispatch();
  const saving = useAppSelector((state) => state.changeViewDefinitionAdmin.saving);

  const [editorMode, setEditorMode] = useState<'structured' | 'json'>('structured');
  const [defState, setDefState] = useState<DefinitionState | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());

  // JSON editor state: holds the raw JSON string while in JSON mode
  const [jsonEditorValue, setJsonEditorValue] = useState<string>('');
  // Error message shown when switching from JSON to structured fails due to invalid JSON
  const [jsonSyncError, setJsonSyncError] = useState<string | null>(null);

  // Track previous editor mode for transition logic
  const prevEditorModeRef = useRef<'structured' | 'json'>(editorMode);

  // Initialize from definition prop
  useEffect(() => {
    if (definition?.definition) {
      const parsed = parseDefinition(definition.definition);
      setDefState(parsed);
      setCollapsedSections(new Set());
      setCollapsedBlocks(new Set());
      setJsonSyncError(null);
      // Also initialize the JSON editor value so it is ready if user switches
      if (parsed) {
        setJsonEditorValue(serializeDefinition(parsed));
      } else {
        setJsonEditorValue(definition.definition);
      }
    } else {
      setDefState(null);
      setJsonEditorValue('');
      setJsonSyncError(null);
    }
  }, [definition]);

  // Propagate changes upward
  const updateState = useCallback(
    (newState: DefinitionState) => {
      setDefState(newState);
      onDefinitionChange(serializeDefinition(newState));
    },
    [onDefinitionChange]
  );

  const handleSave = () => {
    if (!definition) return;

    let json: string;
    if (editorMode === 'json') {
      // Save from JSON mode: use the raw JSON editor value
      json = jsonEditorValue;
    } else {
      // Save from structured mode
      if (!defState) return;
      json = serializeDefinition(defState);
    }

    // Parse to extract scenario_type and template_key for the request
    let extractedScenarioTypeCode: string;
    let templateKey: string;
    try {
      const parsed = JSON.parse(json);
      extractedScenarioTypeCode = parsed.scenario_type || '';
      templateKey = parsed.template_key || '';
    } catch {
      // If JSON is invalid, cannot save
      setJsonSyncError('Cannot save: the JSON is not valid.');
      return;
    }

    dispatch(
      createCvDefinitionRequest({
        scenarioTypeCode: extractedScenarioTypeCode || scenarioTypeCode,
        templateKey,
        definition: json,
      })
    );
  };

  const handleTabChange = (_event: SelectionEvents, data: { value: TabValue }) => {
    const newMode = data.value as 'structured' | 'json';
    const oldMode = prevEditorModeRef.current;

    if (newMode === oldMode) return;

    if (oldMode === 'structured' && newMode === 'json') {
      // Structured -> JSON: serialize the in-memory definition to pretty-printed JSON
      if (defState) {
        const serialized = serializeDefinition(defState);
        setJsonEditorValue(serialized);
      }
      setJsonSyncError(null);
      setEditorMode('json');
      prevEditorModeRef.current = 'json';
    } else if (oldMode === 'json' && newMode === 'structured') {
      // JSON -> Structured: parse JSON; if valid, update defState; if invalid, show error and stay in JSON
      try {
        const parsed = parseDefinition(jsonEditorValue);
        if (parsed === null) {
          setJsonSyncError('Invalid JSON: unable to parse. Please fix the JSON before switching to Structured mode.');
          return; // Stay in JSON mode
        }
        setDefState(parsed);
        onDefinitionChange(serializeDefinition(parsed));
        setJsonSyncError(null);
        setEditorMode('structured');
        prevEditorModeRef.current = 'structured';
      } catch {
        setJsonSyncError('Invalid JSON: unable to parse. Please fix the JSON before switching to Structured mode.');
        // Stay in JSON mode - do not change editorMode
      }
    }
  };

  // Handle changes from the Monaco editor (debounced by MonacoEditorPanel)
  const handleJsonEditorChange = useCallback(
    (json: string) => {
      setJsonEditorValue(json);
      setJsonSyncError(null);
      // Propagate the raw JSON upward to the parent (for preview, etc.)
      onDefinitionChange(json);
    },
    [onDefinitionChange]
  );

  // --- Top-level field handlers ---
  const updateTopField = (field: string, value: string) => {
    if (!defState) return;
    updateState({ ...defState, [field]: value });
  };

  const updateMetadataField = (field: string, value: string) => {
    if (!defState) return;
    if (field === 'tags') {
      const tags = value.split(',').map((t) => t.trim()).filter((t) => t);
      updateState({
        ...defState,
        metadata: { ...defState.metadata, tags },
      });
    } else {
      updateState({
        ...defState,
        metadata: { ...defState.metadata, [field]: value },
      });
    }
  };

  // --- Section handlers ---
  const handleAddSection = () => {
    if (!defState) return;
    const newOrder =
      defState.sections.length > 0
        ? Math.max(...defState.sections.map((s) => s.order)) + 1
        : 1;
    const newSection: SectionState = {
      key: `section_${newOrder}`,
      title: `Section ${newOrder}`,
      order: newOrder,
      contentBlocks: [],
    };
    updateState({ ...defState, sections: [...defState.sections, newSection] });
  };

  const handleRemoveSection = (sectionIdx: number) => {
    if (!defState) return;
    const sections = [...defState.sections];
    sections.splice(sectionIdx, 1);
    updateState({ ...defState, sections });
  };

  const handleUpdateSection = (
    sectionIdx: number,
    field: string,
    value: string | number
  ) => {
    if (!defState) return;
    const sections = [...defState.sections];
    sections[sectionIdx] = { ...sections[sectionIdx], [field]: value };
    updateState({ ...defState, sections });
  };

  // --- Content block handlers ---
  const handleAddBlock = (sectionIdx: number, blockType: string) => {
    if (!defState) return;
    const sections = [...defState.sections];
    const section = { ...sections[sectionIdx] };
    const blocks = [...(section.contentBlocks || [])];

    let newBlock: ContentBlockState;
    switch (blockType) {
      case 'text':
        newBlock = {
          blockType: 'text',
          key: '',
          content: '',
        };
        break;
      case 'table':
        newBlock = {
          blockType: 'table',
          key: '',
          label: '',
          rowColumns: [{ key: '', header: '' }],
          columnGroups: [
            {
              groupLabel: '',
              columns: [{ key: '', header: '' }],
            },
          ],
          rows: [],
        };
        break;
      default:
        return;
    }

    blocks.push(newBlock);
    section.contentBlocks = blocks;
    sections[sectionIdx] = section;
    updateState({ ...defState, sections });
  };

  const handleUpdateBlock = (
    sectionIdx: number,
    blockIdx: number,
    // Accept any block shape from sub-editors and treat it as ContentBlockState
    updatedBlock: Record<string, unknown> & { blockType: string }
  ) => {
    if (!defState) return;
    const sections = [...defState.sections];
    const section = { ...sections[sectionIdx] };
    const blocks = [...(section.contentBlocks || [])];
    blocks[blockIdx] = updatedBlock as ContentBlockState;
    section.contentBlocks = blocks;
    sections[sectionIdx] = section;
    updateState({ ...defState, sections });
  };

  const handleRemoveBlock = (sectionIdx: number, blockIdx: number) => {
    if (!defState) return;
    const sections = [...defState.sections];
    const section = { ...sections[sectionIdx] };
    const blocks = [...(section.contentBlocks || [])];
    blocks.splice(blockIdx, 1);
    section.contentBlocks = blocks;
    sections[sectionIdx] = section;
    updateState({ ...defState, sections });
  };

  // --- Collapse toggle helpers ---
  const toggleSection = (idx: number) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleBlock = (key: string) => {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // --- Add block type selector state per section ---
  const [addBlockType, setAddBlockType] = useState<Record<number, string>>({});

  if (!definition) {
    return (
      <div className={styles.container} data-testid="cv-structured-editor-panel">
        <div className={styles.emptyState}>
          Select a definition to edit, or create a new one.
        </div>
      </div>
    );
  }

  if (!defState && editorMode === 'structured') {
    return (
      <div className={styles.container} data-testid="cv-structured-editor-panel">
        <div className={styles.emptyState}>
          Unable to parse definition JSON.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="cv-structured-editor-panel">
      {/* Toolbar: Save and Mode Toggle */}
      <div className={styles.toolbar}>
        <Button
          appearance="primary"
          size="small"
          disabled={saving}
          onClick={handleSave}
          data-testid="cv-save-definition-button"
        >
          {saving ? 'Saving...' : 'Save (New Version)'}
        </Button>

        <TabList
          selectedValue={editorMode}
          onTabSelect={handleTabChange}
          size="small"
          data-testid="cv-editor-mode-tabs"
        >
          <Tab value="structured" data-testid="cv-structured-mode-tab">Structured</Tab>
          <Tab value="json" data-testid="cv-json-mode-tab">JSON</Tab>
        </TabList>
      </div>

      {/* JSON sync error message */}
      {jsonSyncError && (
        <MessageBar intent="error" data-testid="cv-json-sync-error">
          <MessageBarBody>{jsonSyncError}</MessageBarBody>
        </MessageBar>
      )}

      {editorMode === 'structured' && defState ? (
        <div className={styles.formContent}>
          {/* Top-level fields */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionTitle}>Definition Properties</div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="cv-schema-version" className={styles.fieldLabel}>Schema Version</label>
                <span id="cv-schema-version" className={styles.readOnlyValue} data-testid="cv-schema-version">
                  {defState.schema_version}
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="cv-template-key" className={styles.fieldLabel}>Template Key</label>
                <span id="cv-template-key" className={styles.readOnlyValue} data-testid="cv-template-key">
                  {defState.template_key}
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="cv-scenario-type" className={styles.fieldLabel}>Scenario Type</label>
                <span id="cv-scenario-type" className={styles.readOnlyValue} data-testid="cv-scenario-type">
                  {defState.scenario_type}
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="cv-display-name" className={styles.fieldLabel}>Display Name</label>
                <Input
                  id="cv-display-name"
                  value={defState.display_name}
                  onChange={(_e, data) =>
                    updateTopField('display_name', data.value)
                  }
                  data-testid="cv-display-name-input"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="cv-description" className={styles.fieldLabel}>Description</label>
                <Textarea
                  id="cv-description"
                  value={defState.description}
                  onChange={(_e, data) =>
                    updateTopField('description', data.value)
                  }
                  resize="vertical"
                  data-testid="cv-description-textarea"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="cv-metadata-author" className={styles.fieldLabel}>Author</label>
                <Input
                  id="cv-metadata-author"
                  value={defState.metadata.author}
                  onChange={(_e, data) =>
                    updateMetadataField('author', data.value)
                  }
                  data-testid="cv-metadata-author-input"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="cv-metadata-tags" className={styles.fieldLabel}>Tags (comma-separated)</label>
                <Input
                  id="cv-metadata-tags"
                  value={defState.metadata.tags.join(', ')}
                  onChange={(_e, data) =>
                    updateMetadataField('tags', data.value)
                  }
                  data-testid="cv-metadata-tags-input"
                />
              </div>
            </div>
          </div>

          {/* Sections list */}
          <div className={styles.sectionsHeader}>
            <span className={styles.sectionTitle}>Sections</span>
          </div>

          {defState.sections.map((section, sectionIdx) => {
            const isSectionCollapsed = collapsedSections.has(sectionIdx);
            return (
              <div
                key={sectionIdx}
                className={styles.sectionCard}
                data-testid={`cv-section-card-${sectionIdx}`}
              >
                <div
                  className={styles.sectionCardHeader}
                  onClick={() => toggleSection(sectionIdx)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSection(sectionIdx); }}
                  role="button"
                  tabIndex={0}
                >
                  {isSectionCollapsed ? (
                    <ChevronRight24Regular className={styles.collapseIcon} />
                  ) : (
                    <ChevronDown24Regular className={styles.collapseIcon} />
                  )}
                  <span className={styles.sectionCardTitle}>
                    {section.title || section.key || `Section ${sectionIdx + 1}`}
                  </span>
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={<Delete24Regular />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSection(sectionIdx);
                    }}
                    title="Remove section"
                    data-testid={`cv-remove-section-${sectionIdx}`}
                  />
                </div>

                {!isSectionCollapsed && (
                  <div className={styles.sectionCardBody}>
                    <div className={styles.fieldGrid}>
                      <div className={styles.field}>
                        <label htmlFor={`cv-section-key-${sectionIdx}`} className={styles.fieldLabel}>Key</label>
                        <Input
                          id={`cv-section-key-${sectionIdx}`}
                          value={section.key}
                          onChange={(_e, data) =>
                            handleUpdateSection(sectionIdx, 'key', data.value)
                          }
                          data-testid={`cv-section-key-${sectionIdx}`}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor={`cv-section-title-${sectionIdx}`} className={styles.fieldLabel}>Title</label>
                        <Input
                          id={`cv-section-title-${sectionIdx}`}
                          value={section.title}
                          onChange={(_e, data) =>
                            handleUpdateSection(
                              sectionIdx,
                              'title',
                              data.value
                            )
                          }
                          data-testid={`cv-section-title-${sectionIdx}`}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor={`cv-section-order-${sectionIdx}`} className={styles.fieldLabel}>Order</label>
                        <SpinButton
                          id={`cv-section-order-${sectionIdx}`}
                          value={section.order}
                          min={1}
                          onChange={(
                            _e: SpinButtonChangeEvent,
                            data: SpinButtonOnChangeData
                          ) =>
                            handleUpdateSection(
                              sectionIdx,
                              'order',
                              data.value ?? 1
                            )
                          }
                          data-testid={`cv-section-order-${sectionIdx}`}
                        />
                      </div>
                    </div>

                    {/* Content Blocks */}
                    <div className={styles.blocksContainer}>
                      <span className={styles.blocksTitle}>Content Blocks</span>

                      {(section.contentBlocks || []).map((block, blockIdx) => {
                        const blockKey = `${sectionIdx}-${blockIdx}`;
                        const isBlockCollapsed = collapsedBlocks.has(blockKey);
                        return (
                          <div
                            key={blockIdx}
                            className={styles.blockCard}
                            data-testid={`cv-block-card-${sectionIdx}-${blockIdx}`}
                          >
                            <div
                              className={styles.blockCardHeader}
                              onClick={() => toggleBlock(blockKey)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleBlock(blockKey); }}
                              role="button"
                              tabIndex={0}
                            >
                              {isBlockCollapsed ? (
                                <ChevronRight24Regular
                                  className={styles.collapseIcon}
                                />
                              ) : (
                                <ChevronDown24Regular
                                  className={styles.collapseIcon}
                                />
                              )}
                              <span className={styles.blockTypeBadge}>
                                {block.blockType}
                              </span>
                              <span className={styles.blockKeyLabel}>
                                {(block.key as string) || '(no key)'}
                              </span>
                            </div>

                            {!isBlockCollapsed && (
                              <div className={styles.blockCardBody}>
                                {block.blockType === 'text' && (
                                  <TextBlockEditor
                                    block={block as ContentBlockState & { key: string; content: string }}
                                    onChange={(updated) =>
                                      handleUpdateBlock(
                                        sectionIdx,
                                        blockIdx,
                                        updated as unknown as Record<string, unknown> & { blockType: string }
                                      )
                                    }
                                    onRemove={() =>
                                      handleRemoveBlock(sectionIdx, blockIdx)
                                    }
                                  />
                                )}
                                {block.blockType === 'table' && (
                                  <TableBlockEditor
                                    block={block as ContentBlockState & { key: string; label: string; rowColumns: { key: string; header: string }[]; columnGroups: { groupLabel: string; columns: { key: string; header: string }[] }[]; rows: { rowId: string; cells: Record<string, { value: string; formatToken?: string }> }[] }}
                                    onChange={(updated) =>
                                      handleUpdateBlock(
                                        sectionIdx,
                                        blockIdx,
                                        updated as unknown as Record<string, unknown> & { blockType: string }
                                      )
                                    }
                                    onRemove={() =>
                                      handleRemoveBlock(sectionIdx, blockIdx)
                                    }
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add Block control -- only Text and Table options */}
                      <div className={styles.addBlockRow}>
                        <Select
                          value={addBlockType[sectionIdx] || 'text'}
                          onChange={(_e, data) =>
                            setAddBlockType((prev) => ({
                              ...prev,
                              [sectionIdx]: data.value,
                            }))
                          }
                          data-testid={`cv-block-type-select-${sectionIdx}`}
                        >
                          <option value="text">Text</option>
                          <option value="table">Table</option>
                        </Select>
                        <Button
                          appearance="subtle"
                          size="small"
                          icon={<Add24Regular />}
                          onClick={() =>
                            handleAddBlock(
                              sectionIdx,
                              addBlockType[sectionIdx] || 'text'
                            )
                          }
                          data-testid={`cv-add-block-${sectionIdx}`}
                        >
                          Add Block
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className={styles.addSectionRow}>
            <Button
              appearance="outline"
              size="small"
              icon={<Add24Regular />}
              onClick={handleAddSection}
              data-testid="cv-add-section-button"
            >
              Add Section
            </Button>
          </div>
        </div>
      ) : editorMode === 'json' ? (
        <MonacoEditorPanel
          definitionJson={jsonEditorValue}
          onChange={handleJsonEditorChange}
        />
      ) : null}
    </div>
  );
};

export default ChangeViewStructuredEditorPanel;
