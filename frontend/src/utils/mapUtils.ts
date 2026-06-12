/**
 * Shared map utilities
 *
 * Constants and helpers used by both the Dashboard (field list swatches)
 * and FarmMap (polygon rendering) so the colours stay in sync.
 */

/**
 * Colour palette for named field polygons and swatches.
 * Index cycles when a farm has more fields than palette entries.
 */
export const FIELD_COLORS: readonly string[] = [
  '#10b981', // emerald
  '#f97316', // orange
  '#6366f1', // indigo
  '#eab308', // yellow
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#a855f7', // purple
] as const;
