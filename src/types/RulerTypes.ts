/**
 * Types for Ruler plugins
 */

/**
 * Guide line on the ruler
 */
export interface RulerGuide {
  /** Coordinate in world units */
  worldCoord: number;
  /** Guide name (optional) */
  name?: string;
  /** Line thickness (optional) */
  strokeWidth?: number;
  /** Line color (optional) */
  stroke?: string;
}

/**
 * Guide type (horizontal or vertical)
 */
export type RulerGuideType = 'h' | 'v';

/**
 * Active guide information
 */
export interface ActiveGuideInfo {
  type: RulerGuideType;
  coord: number;
}
