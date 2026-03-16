import { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { OnChange } from '@monaco-editor/react';
import styles from './MonacoEditorPanel.module.scss';

interface MonacoEditorPanelProps {
  definitionJson: string;
  onChange: (json: string) => void;
  readOnly?: boolean;
}

export const MonacoEditorPanel: React.FC<MonacoEditorPanelProps> = ({
  definitionJson,
  onChange,
  readOnly = false,
}) => {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleEditorChange: OnChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;

      // Debounce onChange calls by ~300ms
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChange(value);
      }, 300);
    },
    [onChange]
  );

  return (
    <div className={styles.editorContainer} data-testid="monaco-editor-panel">
      <Editor
        height="100%"
        language="json"
        theme="vs-dark"
        value={definitionJson}
        onChange={handleEditorChange}
        options={{
          readOnly,
          minimap: { enabled: false },
          wordWrap: 'on',
          lineNumbers: 'on',
          formatOnPaste: true,
          formatOnType: true,
          autoClosingBrackets: 'always',
          matchBrackets: 'always',
          scrollBeyondLastLine: false,
          fontSize: 13,
          tabSize: 2,
          automaticLayout: true,
        }}
        loading={<div className={styles.loadingState}>Loading editor...</div>}
      />
    </div>
  );
};

export default MonacoEditorPanel;
