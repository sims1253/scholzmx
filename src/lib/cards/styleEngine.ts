import { LAYER_THRESHOLDS } from '../../config/doodadConfig';
import { createSeededRng } from '../../scripts/seeded';
import type { DoodadResult } from '../../types/doodads';
import { createDoodadResult } from '../doodadHelpers';
import { profileConfig } from './doodadRegistry';
import type { CardStyleProfile } from './types';

type LayerCount = 1 | 2 | 3 | 4;

export interface CardStyleResult {
  cssVars: Record<string, string>;
  layers: LayerCount;
  doodads: DoodadResult;
}

function toLayerCount(value: number): LayerCount {
  if (value < LAYER_THRESHOLDS.SINGLE) return 1;
  if (value < LAYER_THRESHOLDS.DOUBLE) return 2;
  if (value < LAYER_THRESHOLDS.TRIPLE) return 3;
  return 4;
}

function roundPx(value: number): number {
  return Math.round(value);
}

function mergeCssVars(
  baseVars: Record<string, string>,
  doodads: DoodadResult
): Record<string, string> {
  return {
    ...baseVars,
    ...(doodads.ring.active ? doodads.ring.cssVars : {}),
    ...(doodads.wash.active ? doodads.wash.cssVars : {}),
  };
}

export function createCardStyle(seed: string, profile: CardStyleProfile): CardStyleResult {
  const config = profileConfig[profile];
  const layoutRng = createSeededRng(seed, 'stackedcard-v3:layout');
  const doodadLayoutRng = createSeededRng(seed, 'stackedcard-v3:layout');

  const offx = roundPx(layoutRng.between(config.offsetX[0], config.offsetX[1]));
  const offy = roundPx(layoutRng.between(config.offsetY[0], config.offsetY[1]));
  const layers = config.fixedLayers ?? toLayerCount(layoutRng.random());

  const rotA = layoutRng.between(config.rotA.min, config.rotA.max).toFixed(2);
  const rotB = layoutRng.between(config.rotB.min, config.rotB.max).toFixed(2);
  const rotC = layoutRng.between(config.rotC.min, config.rotC.max).toFixed(2);

  const doodads = createDoodadResult(
    seed,
    layers === 1,
    config.allowBookmark,
    config.allowTape,
    config.ornament,
    doodadLayoutRng
  );

  const baseVars: Record<string, string> = {
    '--offx': `${offx}px`,
    '--offy': `${offy}px`,
    '--rot-a': `${rotA}deg`,
    '--rot-b': `${rotB}deg`,
    '--rot-c': `${rotC}deg`,
  };

  return {
    cssVars: mergeCssVars(baseVars, doodads),
    layers,
    doodads,
  };
}
