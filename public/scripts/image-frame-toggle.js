// Image frame toggle functionality
document.addEventListener('DOMContentLoaded', function () {
  const clickableFrames = document.querySelectorAll('.image-frame.clickable');

  clickableFrames.forEach(function (frame) {
    const toggleImage = function () {
      const isNowAlt = frame.classList.toggle('show-alternate');
      const pressed = frame.getAttribute('aria-pressed');
      if (pressed !== null) {
        frame.setAttribute('aria-pressed', isNowAlt ? 'true' : 'false');
      }
      // Toggle aria-hidden on layers for screen readers
      const primary = frame.querySelector('.primary-image');
      const alternate = frame.querySelector('.alternate-image');
      if (primary && alternate) {
        if (isNowAlt) {
          primary.setAttribute('aria-hidden', 'true');
          alternate.setAttribute('aria-hidden', 'false');
        } else {
          primary.setAttribute('aria-hidden', 'false');
          alternate.setAttribute('aria-hidden', 'true');
        }
      }
    };

    // Click handler
    frame.addEventListener('click', toggleImage);

    // Keyboard handler for accessibility
    frame.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleImage();
      }
    });
  });
});
