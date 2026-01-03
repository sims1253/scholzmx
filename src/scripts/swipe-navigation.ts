let initialized = false;
let handleTouchStart: ((e: TouchEvent) => void) | null = null;
let handleTouchEnd: ((e: TouchEvent) => void) | null = null;

function initSwipeNavigation() {
  if (initialized) return;

  const prevLink = document.querySelector('.prev-link') as HTMLAnchorElement;
  const nextLink = document.querySelector('.next-link') as HTMLAnchorElement;

  if (!prevLink && !nextLink) {
    initialized = true;
    return;
  }

  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchEndY = 0;
  const swipeThreshold = 75;
  const verticalThreshold = 30;

  handleTouchStart = function (e: TouchEvent) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  };

  handleTouchEnd = function (e: TouchEvent) {
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
    initialized = true;
    return;
  }

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });

  initialized = true;
}

export function cleanupSwipeNavigation() {
  if (handleTouchStart) {
    document.removeEventListener('touchstart', handleTouchStart);
    handleTouchStart = null;
  }
  if (handleTouchEnd) {
    document.removeEventListener('touchend', handleTouchEnd);
    handleTouchEnd = null;
  }
  initialized = false;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSwipeNavigation, { once: true });
} else {
  initSwipeNavigation();
}
