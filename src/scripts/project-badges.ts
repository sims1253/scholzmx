// A project's badge on its tag (src/pages/projects.astro): as a mouse or a pen crosses the
// tag, the badge turns a few degrees toward it and the light runs across its face. A finger
// brings no light to follow, so for touch the badge keeps its resting light and its set.

// How far a badge turns, in degrees, when the pointer is a whole badge's length from its
// middle. Beyond that it turns no further.
const TURN = 7;
const PROPERTIES = ['--light-x', '--light-y', '--badge-tip', '--badge-turn-to'] as const;

function initProjectBadges(): void {
  for (const badge of document.querySelectorAll<HTMLElement>('.project-badge')) {
    const tag = badge.closest<HTMLElement>('.sc-card');
    if (!tag) continue;
    tag.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      // Where the pointer stands from the badge's corner, in lengths of the badge. Half is
      // its middle; it may lie outside it, over the rest of the tag.
      const box = badge.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      const turn = (offset: number) =>
        `${(Math.max(-0.75, Math.min(0.75, offset)) * TURN).toFixed(2)}deg`;
      badge.style.setProperty('--light-x', `${(x * 100).toFixed(1)}%`);
      badge.style.setProperty('--light-y', `${(y * 100).toFixed(1)}%`);
      badge.style.setProperty('--badge-tip', turn(y - 0.5));
      badge.style.setProperty('--badge-turn-to', turn(0.5 - x));
    });
    tag.addEventListener('pointerleave', () => {
      for (const property of PROPERTIES) badge.style.removeProperty(property);
    });
  }
}

initProjectBadges();
