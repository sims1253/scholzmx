import type { CardLayout, CardStyleProfile } from './types';

type LayerCount = 1 | 2 | 3 | 4;

interface RotationRange {
  min: number;
  max: number;
}

export interface CardProfileConfig {
  fixedLayers?: LayerCount;
  allowBookmark: boolean;
  allowTape: boolean;
  ornament: boolean;
  offsetX: [number, number];
  offsetY: [number, number];
  rotA: RotationRange;
  rotB: RotationRange;
  rotC: RotationRange;
}

export const PROFILE_LAYOUTS: Record<CardStyleProfile, CardLayout> = {
  blog: 'stacked',
  recipes: 'stacked',
  research: 'stacked',
  projects: 'side',
  related: 'stacked',
};

export const profileConfig: Record<CardStyleProfile, CardProfileConfig> = {
  blog: {
    allowBookmark: true,
    allowTape: true,
    ornament: true,
    offsetX: [-8, 8],
    offsetY: [-6, 6],
    rotA: { min: -1.6, max: 1.2 },
    rotB: { min: -1.2, max: 1.6 },
    rotC: { min: -1.0, max: 1.0 },
  },
  recipes: {
    allowBookmark: true,
    allowTape: true,
    ornament: true,
    offsetX: [-7, 7],
    offsetY: [-5, 5],
    rotA: { min: -1.5, max: 1.1 },
    rotB: { min: -1.1, max: 1.5 },
    rotC: { min: -0.9, max: 0.9 },
  },
  related: {
    allowBookmark: true,
    allowTape: true,
    ornament: true,
    offsetX: [-7, 7],
    offsetY: [-5, 5],
    rotA: { min: -1.3, max: 1.0 },
    rotB: { min: -1.0, max: 1.3 },
    rotC: { min: -0.8, max: 0.8 },
  },
  projects: {
    fixedLayers: 3,
    allowBookmark: true,
    allowTape: true,
    ornament: true,
    offsetX: [-6, 6],
    offsetY: [-4, 4],
    rotA: { min: -1.3, max: 1.0 },
    rotB: { min: -1.0, max: 1.3 },
    rotC: { min: -0.8, max: 0.8 },
  },
  research: {
    fixedLayers: 1,
    allowBookmark: true,
    allowTape: true,
    ornament: false,
    offsetX: [-5, 5],
    offsetY: [-4, 4],
    rotA: { min: -1.2, max: 0.8 },
    rotB: { min: -0.8, max: 1.2 },
    rotC: { min: -0.7, max: 0.7 },
  },
};
