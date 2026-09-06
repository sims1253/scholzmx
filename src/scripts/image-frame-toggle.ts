// Toggles between primary and alternate images on clickable image frames.
// Bundled by Astro (minified, deduped to a single script per page);
// the window guard additionally protects against any double inclusion.
function toggleImage(frame: HTMLElement) {
  const isNowAlt = frame.classList.toggle('show-alternate');
  if (frame.hasAttribute('aria-pressed')) {
    frame.setAttribute('aria-pressed', isNowAlt ? 'true' : 'false');
  }
  const primary = frame.querySelector('.primary-image');
  const alternate = frame.querySelector('.alternate-image');
  if (primary && alternate) {
    primary.setAttribute('aria-hidden', isNowAlt ? 'true' : 'false');
    alternate.setAttribute('aria-hidden', isNowAlt ? 'false' : 'true');
  }
}

export function initImageFrameToggle(root: ParentNode = document) {
  const frames = root.querySelectorAll<HTMLElement>('.image-frame.clickable');
  frames.forEach((frame) => {
    frame.addEventListener('click', () => toggleImage(frame));
    frame.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleImage(frame);
      }
    });
  });
}

const w = window as Window & { __imageFrameToggleInited?: boolean };
if (!w.__imageFrameToggleInited) {
  w.__imageFrameToggleInited = true;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initImageFrameToggle());
  } else {
    initImageFrameToggle();
  }
}
