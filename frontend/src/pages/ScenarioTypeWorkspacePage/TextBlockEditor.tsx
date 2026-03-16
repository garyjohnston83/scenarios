import {
  Button,
  Input,
  Textarea,
} from '@fluentui/react-components';
import { Delete24Regular } from '@fluentui/react-icons';
import styles from './TextBlockEditor.module.scss';

interface TextBlock {
  blockType: string;
  key: string;
  content: string;
}

interface TextBlockEditorProps {
  block: TextBlock;
  onChange: (updated: TextBlock) => void;
  onRemove: () => void;
}

export const TextBlockEditor: React.FC<TextBlockEditorProps> = ({
  block,
  onChange,
  onRemove,
}) => {
  const isKeyEmpty = !block.key?.trim();
  const isContentEmpty = !block.content?.trim();

  return (
    <div className={styles.container} data-testid="text-block-editor">
      <div className={styles.blockHeader}>
        <span className={styles.typeBadge}>Text</span>
        <Button
          appearance="subtle"
          size="small"
          icon={<Delete24Regular />}
          onClick={onRemove}
          title="Remove block"
          data-testid="remove-text-block"
        />
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="text-key" className={styles.fieldLabel}>Key *</label>
          <Input
            id="text-key"
            value={block.key || ''}
            onChange={(_e, data) => onChange({ ...block, key: data.value })}
            className={isKeyEmpty ? styles.invalidInput : undefined}
            data-testid="text-key-input"
          />
          {isKeyEmpty && (
            <span className={styles.validationError}>Key is required</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="text-content" className={styles.fieldLabel}>Content *</label>
          <Textarea
            id="text-content"
            value={block.content || ''}
            onChange={(_e, data) => onChange({ ...block, content: data.value })}
            resize="vertical"
            className={isContentEmpty ? styles.invalidInput : undefined}
            data-testid="text-content-textarea"
          />
          {isContentEmpty && (
            <span className={styles.validationError}>Content is required</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextBlockEditor;
