// State encapsulated in an object for clarity and easier management
const state = {
  initialized: false,
  handleTouchStart: null as ((e: TouchEvent) => void) | null,
  handleTouchEnd: null as ((e: TouchEvent) => void) | null,
};

function initSwipeNavigation() {
  if (state.initialized) return;

  const prevLink = document.querySelector('.prev-link') as HTMLAnchorElement;
  const nextLink = document.querySelector('.next-link') as HTMLAnchorElement;

  if (!prevLink && !nextLink) {
    state.initialized = true;
    return;
  }

  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  const swipeThreshold = 75;
  const verticalThreshold = 30;

  state.handleTouchStart = function (e: TouchEvent) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  };

  state.handleTouchEnd = function (e: TouchEvent) {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  };

  function handleSwipe() {
    const horizontalDiff = touchStartX - touchEndX;
    const verticalDiff = touchStartY - touchEndY;

    if (Math.abs(verticalDiff) > verticalThreshold) return;

    if (horizontalDiff > swipeThreshold && nextLink) {
      nextLink.click();
    } else if (horizontalDiff < -swipeThreshold && prevLink) {
      prevLink.click();
    }
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    state.initialized = true;
    return;
  }

  document.addEventListener('touchstart', state.handleTouchStart, { passive: true });
  document.addEventListener('touchend', state.handleTouchEnd, { passive: true });

  state.initialized = true;
}

export function cleanupSwipeNavigation() {
  if (state.handleTouchStart) {
    document.removeEventListener('touchstart', state.handleTouchStart);
    state.handleTouchStart = null;
  }
  if (state.handleTouchEnd) {
    document.removeEventListener('touchend', state.handleTouchEnd);
    state.handleTouchEnd = null;
  }
  state.initialized = false;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSwipeNavigation, { once: true });
} else {
  initSwipeNavigation();
}
