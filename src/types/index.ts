/**
 * Shared Types
 *
 * Centralized type definitions used across the application.
 * Import from this file instead of defining inline types.
 */

import type { ImageMetadata } from 'astro';

// ============================================
// Content Types
// ============================================

/**
 * Hero image input type - can be a URL string or Astro image asset
 */
export type HeroImageInput = string | ImageMetadata | null | undefined;

/**
 * Normalized hero image for internal use
 */
export interface NormalizedHeroImage {
  kind: 'url' | 'asset';
  src: string | ImageMetadata;
  scale: number;
  posX: number;
  posY: number;
}

// ============================================
// Image Types
// ============================================

export type ImageLayout = 'constrained' | 'fixed' | 'full-width' | 'none';

export type FrameStyle =
  | 'botanical'
  | 'polaroid'
  | 'gentle-oval'
  | 'watercolor'
  | 'hero'
  | 'simple';

export type FrameSize = 'small' | 'medium' | 'large' | 'custom';

// ============================================
// Navigation Types
// ============================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ============================================
// Date/Time Types
// ============================================

export interface DateInfo {
  written: Date;
  updated?: Date;
  formatted: string;
}
