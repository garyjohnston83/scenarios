import { useState, useCallback, useMemo } from 'react';
import { Button } from '@fluentui/react-components';
import { ArrowSync24Regular, Code24Regular } from '@fluentui/react-icons';
import { MonacoEditorPanel } from './MonacoEditorPanel';
import styles from './SampleDataEditor.module.scss';

interface SampleDataEditorProps {
  definitionJson: string;
  sampleData: string;
  onChange: (sampleData: string) => void;
  onSave: (sampleData: string) => void;
  saving: boolean;
}

/**
 * Generates a skeleton/template JSON structure for sample data based on the
 * current definition. Extracts metric source_fields and table column layouts
 * to create the expected sample data shape.
 */
function generateSampleDataTemplate(definitionJson: string): string {
  try {
    const def = JSON.parse(definitionJson);
    const sections = def.sections || [];

    const metrics: Record<string, string> = {};
    const tables: Record<string, Array<Record<string, string>>> = {};

    sections.forEach((section: Record<string, unknown>) => {
      const contentBlocks = (section.contentBlocks as Array<Record<string, unknown>>) || [];
      const legacyMetrics = (section.metrics as Array<Record<string, unknown>>) || [];

      // Process contentBlocks format
      contentBlocks.forEach((block) => {
        const blockType = block.blockType as string;

        if (blockType === 'metric') {
          const sourceField = block.source_field as string;
          if (sourceField) {
            metrics[sourceField] = '0';
          }
        } else if (blockType === 'table') {
          const tableKey = block.key as string;
          if (tableKey) {
            const allColumnKeys: string[] = [];

            const rowColumns = (block.rowColumns as Array<Record<string, string>>) || [];
            rowColumns.forEach((rc) => {
              if (rc.key) allColumnKeys.push(rc.key);
            });

            const columnGroups = (block.columnGroups as Array<Record<string, unknown>>) || [];
            columnGroups.forEach((group) => {
              const cols = (group.columns as Array<Record<string, string>>) || [];
              cols.forEach((col) => {
                if (col.key) allColumnKeys.push(col.key);
              });
            });

            // Create one sample row with all columns
            if (allColumnKeys.length > 0) {
              const sampleRow: Record<string, string> = {};
              allColumnKeys.forEach((key) => {
                sampleRow[key] = 'Sample';
              });
              tables[tableKey] = [sampleRow];
            }
          }
        }
      });

      // Process legacy metrics format
      legacyMetrics.forEach((metric) => {
        const sourceField = metric.source_field as string;
        if (sourceField) {
          metrics[sourceField] = '0';
        }
      });
    });

    const template: Record<string, unknown> = {};
    if (Object.keys(metrics).length > 0) {
      template.metrics = metrics;
    }
    if (Object.keys(tables).length > 0) {
      template.tables = tables;
    }

    return JSON.stringify(template, null, 2);
  } catch {
    return '{\n  "metrics": {},\n  "tables": {}\n}';
  }
}

export const SampleDataEditor: React.FC<SampleDataEditorProps> = ({
  definitionJson,
  sampleData,
  onChange,
  onSave,
  saving,
}) => {
  const [localValue, setLocalValue] = useState<string>(sampleData || '');

  // Update local value when sampleData prop changes (e.g. after save/reload)
  // We use a key based on the definition id to reset when a different definition is selected
  const handleEditorChange = useCallback(
    (json: string) => {
      setLocalValue(json);
      onChange(json);
    },
    [onChange]
  );

  const handleGenerateTemplate = useCallback(() => {
    const template = generateSampleDataTemplate(definitionJson);
    setLocalValue(template);
    onChange(template);
  }, [definitionJson, onChange]);

  const handleSave = useCallback(() => {
    onSave(localValue);
  }, [onSave, localValue]);

  const handleFormatJson = useCallback(() => {
    try {
      const formatted = JSON.stringify(JSON.parse(localValue), null, 2);
      setLocalValue(formatted);
      onChange(formatted);
    } catch {
      // If JSON is invalid, do nothing
    }
  }, [localValue, onChange]);

  // Compute a summary of what the definition expects
  const definitionSummary = useMemo(() => {
    try {
      const def = JSON.parse(definitionJson);
      const sections = def.sections || [];
      let metricCount = 0;
      let tableCount = 0;

      sections.forEach((section: Record<string, unknown>) => {
        const contentBlocks = (section.contentBlocks as Array<Record<string, unknown>>) || [];
        const legacyMetrics = (section.metrics as Array<Record<string, unknown>>) || [];

        contentBlocks.forEach((block) => {
          if (block.blockType === 'metric') metricCount++;
          if (block.blockType === 'table') tableCount++;
        });

        metricCount += legacyMetrics.length;
      });

      return { metricCount, tableCount };
    } catch {
      return { metricCount: 0, tableCount: 0 };
    }
  }, [definitionJson]);

  return (
    <div className={styles.container} data-testid="sample-data-editor">
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button
            appearance="primary"
            size="small"
            disabled={saving}
            onClick={handleSave}
            data-testid="save-sample-data-button"
          >
            {saving ? 'Saving...' : 'Save Sample Data'}
          </Button>
          <Button
            appearance="outline"
            size="small"
            icon={<Code24Regular />}
            onClick={handleFormatJson}
            data-testid="format-sample-data-button"
          >
            Format JSON
          </Button>
          <Button
            appearance="outline"
            size="small"
            icon={<ArrowSync24Regular />}
            onClick={handleGenerateTemplate}
            data-testid="generate-template-button"
          >
            Generate Template
          </Button>
        </div>
        <span className={styles.summary}>
          {definitionSummary.metricCount} metric(s), {definitionSummary.tableCount} table(s)
        </span>
      </div>

      <div className={styles.hint}>
        <p>
          Edit the sample data JSON below. This data is used to populate the preview with realistic values instead of placeholders.
        </p>
        <p>
          <strong>Structure:</strong> <code>{'{ "metrics": { "source_field": "value" }, "tables": { "table_key": [{ "col_key": "cell_value" }] } }'}</code>
        </p>
      </div>

      <div className={styles.editorWrapper}>
        <MonacoEditorPanel
          definitionJson={localValue}
          onChange={handleEditorChange}
        />
      </div>
    </div>
  );
};

export default SampleDataEditor;
