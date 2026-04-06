import type { DataMode } from '../store/scenariosSlice';
import { createLogger } from './logger';

const logger = createLogger('normalizeMode');

/**
 * Normalizes legacy mode values to the new EXTERNAL|INTERNAL enum.
 * Accepts both old (LINK_OUT, GRID) and new (EXTERNAL, INTERNAL) values
 * for backward compatibility during the transition period.
 */
export function normalizeMode(mode: string): DataMode {
  switch (mode) {
    case 'LINK_OUT':
    case 'EXTERNAL':
      return 'EXTERNAL';
    case 'GRID':
    case 'INTERNAL':
      return 'INTERNAL';
    default:
      logger.warn(`Unknown scenario mode "${mode}", defaulting to EXTERNAL`);
      return 'EXTERNAL';
  }
}
