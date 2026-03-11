import styles from '../styles/formatTokens.module.scss';

/**
 * Maps format token strings to their corresponding CSS module class names.
 * To add a new token, add an entry here and a matching class in formatTokens.module.scss.
 */
export const FORMAT_TOKEN_CLASS_MAP: Record<string, string> = {
  neutral: styles.neutral,
  positive: styles.positive,
  negative: styles.negative,
  warning: styles.warning,
  breach: styles.breach,
};

/**
 * Returns the CSS class for a given format token.
 * Falls back to the `neutral` class for unknown tokens.
 */
export function getFormatTokenClass(token: string): string {
  return FORMAT_TOKEN_CLASS_MAP[token] ?? FORMAT_TOKEN_CLASS_MAP.neutral;
}
