import React from 'react';
import { Text } from '@fluentui/react-components';
import type { TextBlock } from '../../types/renderedReport';
import styles from './TextBlockRenderer.module.scss';

interface TextBlockRendererProps {
  block: TextBlock;
}

export const TextBlockRenderer: React.FC<TextBlockRendererProps> = ({ block }) => {
  return (
    <div className={styles.textBlock} data-testid={`text-block-${block.textKey}`}>
      <Text>{block.content}</Text>
    </div>
  );
};

export default TextBlockRenderer;
