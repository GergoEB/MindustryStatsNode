import { apiConfig } from '../context.js';

const HOURS_BACK: Record<string, number> = {
  '7d': 168,
  '14d': 336,
  '3m': 2190,
  '12m': 8760,
};

/** Parses a numeric query string param, returning undefined for empty/invalid input. */
export function parseTimestamp(value?: string): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return isNaN(n) ? undefined : n;
}

/**
 * Resolves a `range` shorthand (or an explicit startDate/endDate window) into
 * hoursBack + bucketMinutes, sized against GRAPH_MAX_POINTS.
 */
export function resolveRange(range?: string, startDate?: number, endDate?: number): { hoursBack: number; bucketMinutes: number } {
  if (startDate && endDate) {
    const hoursBack = Math.ceil((endDate - startDate) / (1000 * 60 * 60));
    const bucketMinutes = Math.max(1, Math.round((hoursBack * 60) / apiConfig.GRAPH_MAX_POINTS));
    return { hoursBack, bucketMinutes };
  }

  const hoursBack = (range && HOURS_BACK[range]) || 24;
  const bucketMinutes = Math.max(1, Math.round((hoursBack * 60) / apiConfig.GRAPH_MAX_POINTS));
  return { hoursBack, bucketMinutes };
}
