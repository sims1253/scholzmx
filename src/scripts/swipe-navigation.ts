// Swipe-to-navigate between blog posts (prev/next) on touch devices.
// Respects prefers-reduced-motion. Astro is a multi-page app, so there is no
// client-side route teardown to handle — listeners live for the page lifetime.

let initialized = false;

function isIgnorableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('a, button, input, select, textarea, [role="button"], [tabindex]'))
    return true;
  if (target.closest('pre, code, table, .toc-container, .pagefind-ui, details')) return true;
  const overflowEl = target.closest('[style*="overflow"]') as HTMLElement | null;
  return overflowEl !== null && window.getComputedStyle(overflowEl).overflowX === 'auto';
}

function initSwipeNavigation(): void {
  if (initialized) return;

  const prevLink = document.querySelector('.prev-link') as HTMLAnchorElement;
  const nextLink = document.querySelector('.next-link') as HTMLAnchorElement;

  if (!prevLink && !nextLink) {
    initialized = true;
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    initialized = true;
    return;
  }

  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  const swipeThreshold = 75;
  const verticalThreshold = 30;

  const handleTouchStart = (e: TouchEvent) => {
    if (isIgnorableTarget(e.target)) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;

    const horizontalDiff = touchStartX - touchEndX;
    const verticalDiff = touchStartY - touchEndY;

    if (Math.abs(verticalDiff) > verticalThreshold) return;

    if (horizontalDiff > swipeThreshold && nextLink) {
      nextLink.click();
    } else if (horizontalDiff < -swipeThreshold && prevLink) {
      prevLink.click();
    }
  };

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });

  initialized = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSwipeNavigation, { once: true });
} else {
  initSwipeNavigation();
}
