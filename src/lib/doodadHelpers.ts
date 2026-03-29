import { createSeededRng } from '../scripts/seeded';
import { doodadCategories } from '../config/doodadConfig';
import { processDoodadCategories, extractDoodadsByKind } from '../lib/doodadProcessor';
import type { DoodadResults } from '../config/doodadConfig';
import type { DoodadResult } from '../types/doodads';

/**
 * Helper function to process doodads and return DoodadResult for StackedCard
 *
 * This function handles all the doodad selection and prop extraction logic,
 * decoupling it from the StackedCard component.
 *
 * @param seed - The seed string for deterministic RNG
 * @param isSheet - Whether this is a single-sheet card (not stacked)
 * @param allowBookmark - Whether bookmark ribbon doodads are allowed
 * @param allowTape - Whether tape corner doodads are allowed
 * @param ornament - Whether ornament doodads are allowed
 * @param layoutRng - The seeded RNG for layout-specific values
 * @returns A DoodadResult object with all processed doodad data
 */
export function createDoodadResult(
  seed: string,
  isSheet: boolean,
  allowBookmark: boolean,
  allowTape: boolean,
  ornament: boolean,
  layoutRng: ReturnType<typeof createSeededRng>
): DoodadResult {
  // Create doodad RNG stream
  const doodadRng = createSeededRng(seed, 'stackedcard-v3:doodads');

  // Generate doodads using the unified processor
  const doodads: DoodadResults = processDoodadCategories(
    doodadCategories,
    isSheet,
    allowBookmark,
    allowTape,
    ornament,
    {
      random: doodadRng.random,
      pick: doodadRng.chance,
      map: doodadRng.between,
      betweenInt: doodadRng.betweenInt,
    }
  );

  // Extract doodads by type
  const svgDoodles = extractDoodadsByKind(doodads, doodadCategories, 'svg');
  const backgroundDoodles = extractDoodadsByKind(doodads, doodadCategories, 'background');

  // Find background effects
  const washEffect = backgroundDoodles.find((d) => d.id === 'washSubtle' || d.id === 'washBold');
  const ringEffect = backgroundDoodles.find((d) => d.id === 'ringEffect');

  // Extract element doodad results
  const bookmarkRibbon = {
    active: !!doodads.bookmarkRibbon?.active,
    side: doodads.bookmarkRibbon?.side || 'right',
  };
  const tapeCorners = { active: !!doodads.tapeCorners?.active };
  const tab = { active: !!doodads.tab?.active };
  const spriteOrnament = {
    active: !!doodads.spriteOrnament?.active,
    variant: doodads.spriteOrnament?.variant || 0,
  };
  const leafDoodle = { active: !!doodads.leafDoodle?.active };
  const circleBookmark = { active: !!doodads.circleBookmark?.active };
  const stickerTR = { active: !!doodads.stickerTR?.active };
  const stickerBL = { active: !!doodads.stickerBL?.active };

  // Build wash result
  const wash = {
    active: !!washEffect,
    cssVars: {
      '--wash-x': `${washEffect?.props.washX || 50}%`,
      '--wash-y': `${washEffect?.props.washY || 50}%`,
      '--wash-alpha': String(washEffect?.props.washAlpha || 0),
      '--wash-tx': `${washEffect?.props.washTx || 0}px`,
      '--wash-ty': `${washEffect?.props.washTy || 0}px`,
      '--wash-bleed': `${washEffect?.props.washBleed || 120}%`,
      '--wash-r1': `${washEffect?.props.washR1 || 0}px`,
      '--wash-r2': `${washEffect?.props.washR2 || 0}px`,
      '--wash2-x': `${washEffect?.props.washX2 || 50}%`,
      '--wash2-y': `${washEffect?.props.washY2 || 50}%`,
    },
  };

  // Build ring result
  const ring = {
    active: !!ringEffect,
    cssVars: {
      '--ring-scale': String(ringEffect?.props.ringScale || layoutRng.between(0.6, 0.9)),
      '--ring-alpha': String(ringEffect?.props.ringAlpha || 0),
    },
  };

  // Build SVG doodles result
  const svgDoodlesResult = svgDoodles
    .filter((doodle) => doodle.definition.kind === 'svg' && doodle.definition.src)
    .map((doodle) => ({
      id: doodle.id,
      src: doodle.definition.src!,
      defaultSize: doodle.definition.defaultSize,
      position: doodle.props.position || doodle.definition.positions?.[0] || 'center',
      scale: doodle.props.scale,
      rotation: doodle.props.rotation,
    }));

  return {
    wash,
    ring,
    bookmarkRibbon,
    tapeCorners,
    tab,
    spriteOrnament,
    leafDoodle,
    circleBookmark,
    stickerTR,
    stickerBL,
    svgDoodles: svgDoodlesResult,
  };
}
