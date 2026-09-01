/**
 * Back to top button functionality
 * Handles scroll visibility, smooth scrolling, and keyboard accessibility
 */

import { bootstrapComponent } from './client-bootstrap';

bootstrapComponent('back-to-top', () => {
  const backToTopButton = document.getElementById('back-to-top');
  if (!backToTopButton) return;

  let isVisible = false;
  let ticking = false;

  // Threshold for showing the button (300px scroll)
  const showThreshold = 300;

  // Throttled scroll handler for performance
  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        const shouldShow = scrollPosition > showThreshold;

        if (shouldShow !== isVisible) {
          isVisible = shouldShow;
          backToTopButton.classList.toggle('visible', isVisible);
        }

        ticking = false;
      });
      ticking = true;
    }
  };

  // Smooth scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Keyboard handler (Enter and Space)
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      scrollToTop();
    }
  };

  // Click handler
  backToTopButton.addEventListener('click', scrollToTop);

  // Keyboard handler
  backToTopButton.addEventListener('keydown', handleKeydown);

  // Scroll listener with passive option for performance
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Initial check in case page is already scrolled
  handleScroll();

  // Return cleanup function
  return () => {
    window.removeEventListener('scroll', handleScroll);
    backToTopButton.removeEventListener('click', scrollToTop);
    backToTopButton.removeEventListener('keydown', handleKeydown);
  };
});
