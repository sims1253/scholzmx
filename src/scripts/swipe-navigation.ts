function initSwipeNavigation() {
  const prevLink = document.querySelector('.prev-link') as HTMLAnchorElement;
  const nextLink = document.querySelector('.next-link') as HTMLAnchorElement;

  if (!prevLink && !nextLink) return;

  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 75;

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.changedTouches[0].screenX;
  }

  function handleTouchEnd(e: TouchEvent) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }

  function handleSwipe() {
    const diff = touchStartX - touchEndX;

    if (diff > swipeThreshold && nextLink) {
      nextLink.click();
    } else if (diff < -swipeThreshold && prevLink) {
      prevLink.click();
    }
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) return;

  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSwipeNavigation);
} else {
  initSwipeNavigation();
}
