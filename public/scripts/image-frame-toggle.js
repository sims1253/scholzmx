// Image frame toggle functionality with graceful error handling
(() => {
  'use strict';

  const initImageFrameToggle = () => {
    const clickableFrames = document.querySelectorAll('.image-frame.clickable');

    clickableFrames.forEach((frame) => {
      if (frame.dataset.toggleInitialized) return;
      frame.dataset.toggleInitialized = 'true';

      const toggleImage = () => {
        const isNowAlt = frame.classList.toggle('show-alternate');
        frame.setAttribute('aria-pressed', isNowAlt ? 'true' : 'false');

        const primary = frame.querySelector('.primary-image');
        const alternate = frame.querySelector('.alternate-image');
        if (primary && alternate) {
          primary.setAttribute('aria-hidden', String(isNowAlt));
          alternate.setAttribute('aria-hidden', String(!isNowAlt));
        }
      };

      frame.addEventListener('click', toggleImage);

      frame.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleImage();
        }
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageFrameToggle);
  } else {
    initImageFrameToggle();
  }
})();
