/**
 * Doodad System Types
 *
 * Centralized type definitions for the StackedCard doodad system.
 * These types are used across the application for consistent doodad handling.
 */

/**
 * Pre-calculated doodad data passed to StackedCard and related components.
 * This interface decouples doodad selection logic from rendering components.
 */
export interface DoodadResult {
  // Background effects
  wash: {
    active: boolean;
    cssVars: {
      '--wash-x': string;
      '--wash-y': string;
      '--wash-alpha': string;
      '--wash-tx': string;
      '--wash-ty': string;
      '--wash-bleed': string;
      '--wash-r1': string;
      '--wash-r2': string;
      '--wash2-x': string;
      '--wash2-y': string;
    };
  };
  ring: {
    active: boolean;
    cssVars: {
      '--ring-scale': string;
      '--ring-alpha': string;
    };
  };
  // Element doodads
  bookmarkRibbon: { active: boolean; side?: 'left' | 'right' };
  tapeCorners: { active: boolean };
  tab: { active: boolean };
  spriteOrnament: { active: boolean; variant?: number };
  leafDoodle: { active: boolean };
  circleBookmark: { active: boolean };
  stickerTR: { active: boolean };
  stickerBL: { active: boolean };
  // SVG doodles to render
  svgDoodles: Array<{
    id: string;
    src: string;
    defaultSize?: string;
    position?: string;
    scale?: number;
    rotation?: number;
  }>;
}
