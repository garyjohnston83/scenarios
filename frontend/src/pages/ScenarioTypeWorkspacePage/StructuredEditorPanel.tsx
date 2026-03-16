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
  Dropdown,
  Option,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogTrigger,
} from '@fluentui/react-components';
import type { SpinButtonChangeEvent, SpinButtonOnChangeData, SelectionEvents, TabValue } from '@fluentui/react-components';
import { Delete24Regular, Add24Regular, ChevronDown24Regular, ChevronRight24Regular, Code24Regular, ChevronLeft24Regular } from '@fluentui/react-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createDefinitionRequest, deleteDefinitionRequest, updateSampleDataRequest, activateDefinitionRequest, deactivateDefinitionRequest } from '../../store/reportDefinitionAdminSlice';
import type { ImpactReportDefinitionDetail } from '../../services/reportDefinitionAdminApi';
import { formatDate } from '../../utils/formatDate';
import { MetricBlockEditor } from './MetricBlockEditor';
import { TextBlockEditor } from './TextBlockEditor';
import { TableBlockEditor } from './TableBlockEditor';
import { MonacoEditorPanel } from './MonacoEditorPanel';
import { SampleDataEditor } from './SampleDataEditor';
import styles from './StructuredEditorPanel.module.scss';

interface StructuredEditorPanelProps {
  definition: ImpactReportDefinitionDetail | null;
  onDefinitionChange: (json: string) => void;
  onSampleDataChange?: (sampleData: string) => void;
  onTemplateSaved?: (json: string) => void;
  onSampleDataSaved?: (sampleData: string) => void;
  onCollapse?: () => void;
}

interface DefinitionState {
  schema_version: string;
  report_key: string;
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
  // Support legacy metrics format
  metrics?: unknown[];
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
      report_key: parsed.report_key || '',
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
        ...(s.metrics ? { metrics: s.metrics as unknown[] } : {}),
      })),
    };
  } catch {
    return null;
  }
}

function serializeDefinition(state: DefinitionState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Pretty-formats a JSON string. Returns the original if parsing fails.
 */
function prettyFormatJson(jsonStr: string): string {
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * Strips `rows` from all table blocks in a definition JSON string.
 * Rows are data, not template -- they belong in sample data.
 */
function stripRowsFromJson(jsonStr: string): string {
  try {
    const def = JSON.parse(jsonStr);
    if (def.sections && Array.isArray(def.sections)) {
      for (const section of def.sections) {
        if (section.contentBlocks && Array.isArray(section.contentBlocks)) {
          for (const block of section.contentBlocks) {
            if (block.blockType === 'table' && 'rows' in block) {
              delete block.rows;
            }
          }
        }
      }
    }
    return JSON.stringify(def, null, 2);
  } catch {
    return jsonStr;
  }
}

/**
 * Extracts rows from table blocks in a definition JSON and returns
 * a sample data JSON structure: { tables: { tableKey: [...rows] } }
 */
function extractRowsAsSampleData(jsonStr: string): string | null {
  try {
    const def = JSON.parse(jsonStr);
    const tables: Record<string, unknown[]> = {};
    let hasRows = false;

    if (def.sections && Array.isArray(def.sections)) {
      for (const section of def.sections) {
        if (section.contentBlocks && Array.isArray(section.contentBlocks)) {
          for (const block of section.contentBlocks) {
            if (block.blockType === 'table' && block.rows && Array.isArray(block.rows) && block.rows.length > 0) {
              const tableKey = block.key as string;
              if (tableKey) {
                tables[tableKey] = block.rows;
                hasRows = true;
              }
            }
          }
        }
      }
    }

    if (!hasRows) return null;
    return JSON.stringify({ tables }, null, 2);
  } catch {
    return null;
  }
}

type EditorMode = 'structured' | 'json' | 'data';

export const StructuredEditorPanel: React.FC<StructuredEditorPanelProps> = ({
  definition,
  onDefinitionChange,
  onSampleDataChange,
  onTemplateSaved,
  onSampleDataSaved,
  onCollapse,
}) => {
  const dispatch = useAppDispatch();
  const saving = useAppSelector((state) => state.reportDefinitionAdmin.saving);
  const savingSampleData = useAppSelector((state) => state.reportDefinitionAdmin.savingSampleData);

  const [editorMode, setEditorMode] = useState<EditorMode>('structured');
  const [defState, setDefState] = useState<DefinitionState | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());

  // JSON editor state: holds the raw JSON string while in JSON mode
  const [jsonEditorValue, setJsonEditorValue] = useState<string>('');
  // Error message shown when switching from JSON to structured fails due to invalid JSON
  const [jsonSyncError, setJsonSyncError] = useState<string | null>(null);

  // Sample data state
  const [currentSampleData, setCurrentSampleData] = useState<string>('');

  // Track previous editor mode for transition logic
  const prevEditorModeRef = useRef<EditorMode>(editorMode);

  // Status change confirmation dialog state
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'active' | 'inactive' | null>(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Local status tracking for dropdown display
  const [localIsActive, setLocalIsActive] = useState<boolean>(false);

  // Initialize local status from definition
  useEffect(() => {
    if (definition) {
      setLocalIsActive(definition.isActive);
    }
  }, [definition]);

  // Initialize from definition prop
  useEffect(() => {
    if (definition?.definition) {
      // Strip rows from template -- rows are data, not template
      const cleanedJson = stripRowsFromJson(definition.definition);
      const parsed = parseDefinition(cleanedJson);
      setDefState(parsed);
      setCollapsedSections(new Set());
      setCollapsedBlocks(new Set());
      setJsonSyncError(null);
      // Also initialize the JSON editor value so it is ready if user switches
      if (parsed) {
        setJsonEditorValue(serializeDefinition(parsed));
      } else {
        setJsonEditorValue(cleanedJson);
      }
      // Initialize sample data: if definition has embedded rows and no sampleData,
      // extract rows into sample data automatically. Always pretty-format.
      if (definition.sampleData) {
        setCurrentSampleData(prettyFormatJson(definition.sampleData));
      } else {
        const extracted = extractRowsAsSampleData(definition.definition);
        setCurrentSampleData(extracted || '');
      }
    } else {
      setDefState(null);
      setJsonEditorValue('');
      setJsonSyncError(null);
      setCurrentSampleData('');
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

    // Strip rows from template before saving -- rows belong in sample data
    json = stripRowsFromJson(json);

    // Parse to extract scenario_type and report_key for the request
    let scenarioTypeCode: string;
    let reportKey: string;
    try {
      const parsed = JSON.parse(json);
      scenarioTypeCode = parsed.scenario_type || '';
      reportKey = parsed.report_key || '';
    } catch {
      // If JSON is invalid, cannot save
      setJsonSyncError('Cannot save: the JSON is not valid.');
      return;
    }

    dispatch(
      createDefinitionRequest({
        scenarioTypeCode,
        reportKey,
        definition: json,
        sampleData: definition.sampleData || undefined,
      })
    );

    // Notify parent so preview refreshes with the saved template
    onTemplateSaved?.(json);
  };

  const handleTabChange = (_event: SelectionEvents, data: { value: TabValue }) => {
    const newMode = data.value as EditorMode;
    const oldMode = prevEditorModeRef.current;

    if (newMode === oldMode) return;

    // Transition to data mode: always allowed
    if (newMode === 'data') {
      // If coming from structured mode, sync JSON editor value
      if (oldMode === 'structured' && defState) {
        setJsonEditorValue(serializeDefinition(defState));
      }
      setJsonSyncError(null);
      setEditorMode('data');
      prevEditorModeRef.current = 'data';
      return;
    }

    // Transition from data mode to structured or json
    if (oldMode === 'data') {
      if (newMode === 'structured') {
        // Parse current JSON to structured state
        const currentJson = jsonEditorValue || (defState ? serializeDefinition(defState) : '');
        try {
          const parsed = parseDefinition(currentJson);
          if (parsed) {
            setDefState(parsed);
            onDefinitionChange(serializeDefinition(parsed));
          }
        } catch {
          // Keep current state
        }
        setJsonSyncError(null);
        setEditorMode('structured');
        prevEditorModeRef.current = 'structured';
      } else if (newMode === 'json') {
        if (defState) {
          setJsonEditorValue(serializeDefinition(defState));
        }
        setJsonSyncError(null);
        setEditorMode('json');
        prevEditorModeRef.current = 'json';
      }
      return;
    }

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

  // Handle sample data changes
  const handleSampleDataChange = useCallback(
    (sampleData: string) => {
      setCurrentSampleData(sampleData);
      onSampleDataChange?.(sampleData);
    },
    [onSampleDataChange]
  );

  // Handle sample data save
  const handleSampleDataSave = useCallback(
    (sampleData: string) => {
      if (!definition) return;
      dispatch(
        updateSampleDataRequest({
          scenarioTypeCode: definition.scenarioTypeCode,
          id: definition.id,
          sampleData,
        })
      );

      // Notify parent so preview refreshes with the saved sample data
      onSampleDataSaved?.(sampleData);
    },
    [definition, dispatch, onSampleDataSaved]
  );

  // Format JSON in current editor mode
  const handleFormatJson = useCallback(() => {
    if (editorMode === 'json') {
      const formatted = prettyFormatJson(jsonEditorValue);
      setJsonEditorValue(formatted);
      onDefinitionChange(formatted);
    }
  }, [editorMode, jsonEditorValue, onDefinitionChange]);

  // --- Status change handlers ---
  const handleStatusDropdownChange = (_event: SelectionEvents, data: { optionValue?: string }) => {
    if (!definition) return;
    const newStatus = data.optionValue as 'active' | 'inactive';
    if (!newStatus) return;

    const currentlyActive = definition.isActive;
    const wantsActive = newStatus === 'active';

    if (currentlyActive === wantsActive) return;

    setPendingStatus(newStatus);
    setStatusChangeDialogOpen(true);
  };

  const handleStatusChangeConfirm = () => {
    if (!definition || !pendingStatus) return;

    if (pendingStatus === 'active') {
      dispatch(
        activateDefinitionRequest({
          scenarioTypeCode: definition.scenarioTypeCode,
          id: definition.id,
        })
      );
      setLocalIsActive(true);
    } else {
      dispatch(
        deactivateDefinitionRequest({
          scenarioTypeCode: definition.scenarioTypeCode,
          id: definition.id,
        })
      );
      setLocalIsActive(false);
    }

    setStatusChangeDialogOpen(false);
    setPendingStatus(null);
  };

  const handleStatusChangeCancel = () => {
    setStatusChangeDialogOpen(false);
    setPendingStatus(null);
  };

  const handleToggleActive = () => {
    if (!definition) return;
    setPendingStatus(definition.isActive ? 'inactive' : 'active');
    setStatusChangeDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!definition) return;
    dispatch(
      deleteDefinitionRequest({
        scenarioTypeCode: definition.scenarioTypeCode,
        id: definition.id,
      })
    );
    setDeleteDialogOpen(false);
  };

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
      case 'metric':
        newBlock = {
          blockType: 'metric',
          key: '',
          label: '',
          source_field: '',
          format: 'number',
          unit: '',
        };
        break;
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

  // Get current definition JSON for sample data editor
  const currentDefinitionJson = defState
    ? serializeDefinition(defState)
    : jsonEditorValue || '';

  if (!definition) {
    return (
      <div className={styles.container} data-testid="structured-editor-panel">
        <div className={styles.emptyState}>
          Select a definition to edit, or create a new one.
        </div>
      </div>
    );
  }

  if (!defState && editorMode === 'structured') {
    return (
      <div className={styles.container} data-testid="structured-editor-panel">
        <div className={styles.emptyState}>
          Unable to parse definition JSON.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="structured-editor-panel">
      {/* Toolbar: Collapse, Save and Mode Toggle */}
      <div className={styles.toolbar}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onCollapse && (
            <Button
              className={styles.collapseButton}
              appearance="subtle"
              icon={<ChevronLeft24Regular />}
              onClick={onCollapse}
              aria-label="Collapse editor panel"
              data-testid="collapse-editor-panel-button"
            />
          )}
          {editorMode !== 'data' && (
            <Button
              appearance="primary"
              size="small"
              disabled={saving}
              onClick={handleSave}
              data-testid="save-definition-button"
            >
              {saving ? 'Saving...' : 'Save (New Version)'}
            </Button>
          )}
          {editorMode !== 'data' && definition && (
            <>
              <Button
                appearance="outline"
                size="small"
                onClick={handleToggleActive}
                data-testid="toggle-active-button"
              >
                {localIsActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                appearance="subtle"
                size="small"
                onClick={() => setDeleteDialogOpen(true)}
                data-testid="delete-definition-button"
              >
                Delete
              </Button>
            </>
          )}
          {editorMode === 'json' && (
            <Button
              appearance="outline"
              size="small"
              icon={<Code24Regular />}
              onClick={handleFormatJson}
              data-testid="format-json-button"
            >
              Format JSON
            </Button>
          )}
        </div>

        <TabList
          selectedValue={editorMode}
          onTabSelect={handleTabChange}
          size="small"
          data-testid="editor-mode-tabs"
        >
          <Tab value="structured" data-testid="structured-mode-tab">Template - Structured</Tab>
          <Tab value="json" data-testid="json-mode-tab">Template - JSON</Tab>
          <Tab value="data" data-testid="data-mode-tab">Sample Data</Tab>
        </TabList>
      </div>

      {/* JSON sync error message */}
      {jsonSyncError && (
        <MessageBar intent="error" data-testid="json-sync-error">
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
                <label htmlFor="schema-version" className={styles.fieldLabel}>Schema Version</label>
                <span id="schema-version" className={styles.readOnlyValue}>
                  {defState.schema_version}
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="report-key" className={styles.fieldLabel}>Report Key</label>
                <span id="report-key" className={styles.readOnlyValue}>
                  {defState.report_key}
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="scenario-type" className={styles.fieldLabel}>Scenario Type</label>
                <span id="scenario-type" className={styles.readOnlyValue}>
                  {defState.scenario_type}
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="def-version" className={styles.fieldLabel}>Version</label>
                <span id="def-version" className={styles.readOnlyValue}>
                  {definition.version}
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="created-at" className={styles.fieldLabel}>Created At</label>
                <span id="created-at" className={styles.readOnlyValue}>
                  {formatDate(definition.createdAt)}
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="status-dropdown" className={styles.fieldLabel}>Status</label>
                <Dropdown
                  id="status-dropdown"
                  className={styles.statusDropdown}
                  value={localIsActive ? 'Active' : 'Inactive'}
                  selectedOptions={[localIsActive ? 'active' : 'inactive']}
                  onOptionSelect={handleStatusDropdownChange}
                  data-testid="status-dropdown"
                >
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                </Dropdown>
              </div>

              <div className={styles.field}>
                <label htmlFor="display-name" className={styles.fieldLabel}>Display Name</label>
                <Input
                  id="display-name"
                  value={defState.display_name}
                  onChange={(_e, data) =>
                    updateTopField('display_name', data.value)
                  }
                  data-testid="display-name-input"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="description" className={styles.fieldLabel}>Description</label>
                <Textarea
                  id="description"
                  value={defState.description}
                  onChange={(_e, data) =>
                    updateTopField('description', data.value)
                  }
                  resize="vertical"
                  data-testid="description-textarea"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="metadata-author" className={styles.fieldLabel}>Author</label>
                <Input
                  id="metadata-author"
                  value={defState.metadata.author}
                  onChange={(_e, data) =>
                    updateMetadataField('author', data.value)
                  }
                  data-testid="metadata-author-input"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="metadata-tags" className={styles.fieldLabel}>Tags</label>
                <Input
                  id="metadata-tags"
                  value={defState.metadata.tags.join(', ')}
                  onChange={(_e, data) =>
                    updateMetadataField('tags', data.value)
                  }
                  data-testid="metadata-tags-input"
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
                data-testid={`section-card-${sectionIdx}`}
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
                    data-testid={`remove-section-${sectionIdx}`}
                  />
                </div>

                {!isSectionCollapsed && (
                  <div className={styles.sectionCardBody}>
                    <div className={styles.fieldGrid}>
                      <div className={styles.field}>
                        <label htmlFor={`section-key-${sectionIdx}`} className={styles.fieldLabel}>Key</label>
                        <Input
                          id={`section-key-${sectionIdx}`}
                          value={section.key}
                          onChange={(_e, data) =>
                            handleUpdateSection(sectionIdx, 'key', data.value)
                          }
                          data-testid={`section-key-${sectionIdx}`}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor={`section-title-${sectionIdx}`} className={styles.fieldLabel}>Title</label>
                        <Input
                          id={`section-title-${sectionIdx}`}
                          value={section.title}
                          onChange={(_e, data) =>
                            handleUpdateSection(
                              sectionIdx,
                              'title',
                              data.value
                            )
                          }
                          data-testid={`section-title-${sectionIdx}`}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor={`section-order-${sectionIdx}`} className={styles.fieldLabel}>Order</label>
                        <SpinButton
                          id={`section-order-${sectionIdx}`}
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
                          data-testid={`section-order-${sectionIdx}`}
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
                            data-testid={`block-card-${sectionIdx}-${blockIdx}`}
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
                                {block.blockType === 'metric' && (
                                  <MetricBlockEditor
                                    block={block as ContentBlockState & { key: string; label: string; source_field: string; format: string; unit?: string; formatRules?: { min?: number | null; max?: number | null; token: string }[] }}
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
                                    block={block as ContentBlockState & { key: string; label: string; rowColumns: { key: string; header: string }[]; columnGroups: { groupLabel: string; columns: { key: string; header: string }[] }[] }}
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

                      {/* Add Block control */}
                      <div className={styles.addBlockRow}>
                        <Select
                          value={addBlockType[sectionIdx] || 'metric'}
                          onChange={(_e, data) =>
                            setAddBlockType((prev) => ({
                              ...prev,
                              [sectionIdx]: data.value,
                            }))
                          }
                          data-testid={`block-type-select-${sectionIdx}`}
                        >
                          <option value="metric">Metric</option>
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
                              addBlockType[sectionIdx] || 'metric'
                            )
                          }
                          data-testid={`add-block-${sectionIdx}`}
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
              data-testid="add-section-button"
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
      ) : editorMode === 'data' ? (
        <SampleDataEditor
          definitionJson={currentDefinitionJson}
          sampleData={currentSampleData}
          onChange={handleSampleDataChange}
          onSave={handleSampleDataSave}
          saving={savingSampleData}
        />
      ) : null}

      {/* Status Change Confirmation Dialog */}
      <Dialog
        open={statusChangeDialogOpen}
        onOpenChange={(_event, data) => {
          if (!data.open) {
            handleStatusChangeCancel();
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogContent>
              Are you sure you want to {pendingStatus === 'active' ? 'activate' : 'deactivate'} this definition?
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary" onClick={handleStatusChangeCancel}>Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleStatusChangeConfirm}>
                Confirm
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(_event, data) => {
          if (!data.open) {
            setDeleteDialogOpen(false);
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
              Are you sure you want to permanently delete this definition? This action cannot be undone.
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default StructuredEditorPanel;
